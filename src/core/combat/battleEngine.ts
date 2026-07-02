/**
 * ターン制戦闘エンジン(仕様 §4)。
 *
 * すべて純粋関数: (BattleState, GameRandom, 入力) → (新 BattleState, イベント列)。
 * 乱数は GameRandom 経由のみ(決定論・リプレイ・セーブ復元対応)。
 *
 * ダメージ式(§4 の骨格 + 仮定):
 *   afterDef = max(1, 参照ATK(+属性フラット) * skillMultiplier - 実効DEF * 0.5)
 *   damage   = afterDef × rand(0.9〜1.1) × クリ倍率 × (1 + バフdmg%/100)
 *              × キーストーン補正 × (1 - 属性耐性/100) × 防御0.5 × ブロック0.5
 *   floor して、耐性100%未満なら最低1
 * 命中 = 攻撃側基礎命中% - 防御側回避%(5〜100 にクランプ)
 * 状態異常付与 = (スキル付与率 + 装備付与率) - 対象耐性(§4)
 */
import { GAME_CONSTANTS } from '../constants';
import type { GameRandom } from '../rng/gameRandom';
import type { EnemyDefinition } from '../types/enemy';
import type { AilmentType } from '../types/enums';
import { AILMENT_TYPES } from '../types/enums';
import type { AilmentApplication, SkillDefinition } from '../types/skill';
import { ailmentResistance, effectiveValues } from './combatStats';
import type {
  ActionResult,
  ActiveAilment,
  BattleEvent,
  BattlePhase,
  BattleState,
  CombatAction,
  CombatantState,
} from './combatTypes';
import { buildEnemyCombatant } from './enemyScaling';

const C = GAME_CONSTANTS;

/** 戦闘エンジンが参照する静的マスタ。 */
export interface CombatMasterData {
  readonly skills: readonly SkillDefinition[];
  readonly enemies: readonly EnemyDefinition[];
}

/** 通常攻撃(データ側に basic_attack が無い場合のフォールバック)。 */
const BASIC_ATTACK: SkillDefinition = {
  id: 'basic_attack',
  name: '通常攻撃',
  kind: 'attack',
  mpCost: 0,
  multiplier: 1.0,
  element: 'physical',
  scope: 'singleEnemy',
  ailments: [],
};

/** 装備由来の状態異常付与に使う既定値(スキル側に指定が無い場合)。 */
const DEFAULT_AILMENT_PARAMS: Readonly<Record<AilmentType, { duration: number; value: number }>> = {
  poison: { duration: 2, value: 5 },
  burn: { duration: 2, value: 5 },
  freeze: { duration: 2, value: 30 },
  paralysis: { duration: 1, value: 0 },
  silence: { duration: 2, value: 0 },
};

// ---------------------------------------------------------------------------
// 状態の生成・参照
// ---------------------------------------------------------------------------

export function createBattleState(
  party: readonly CombatantState[],
  enemies: readonly CombatantState[],
): BattleState {
  if (party.length === 0) throw new Error('createBattleState: party is empty');
  if (enemies.length === 0 || enemies.length > C.maxEnemyGroupSize) {
    throw new Error(`createBattleState: enemy count must be 1..${C.maxEnemyGroupSize}`);
  }
  const all = [...party, ...enemies];
  const ids = new Set(all.map((c) => c.id));
  if (ids.size !== all.length) throw new Error('createBattleState: duplicate combatant id');
  return { round: 1, phase: 'active', combatants: all, actedThisRound: [] };
}

export function getCombatant(state: BattleState, id: string): CombatantState | undefined {
  return state.combatants.find((c) => c.id === id);
}

export function isAlive(combatant: CombatantState): boolean {
  return combatant.currentHP > 0;
}

/** 実効速度の降順の行動順(同速は配列順で安定)。凍結・速度バフを反映して都度計算。 */
export function turnOrder(state: BattleState): readonly string[] {
  return state.combatants
    .filter(isAlive)
    .map((c, index) => ({ id: c.id, speed: effectiveValues(c).speed, index }))
    .sort((a, b) => b.speed - a.speed || a.index - b.index)
    .map((entry) => entry.id);
}

/** 次に行動すべき combatant の ID(全員行動済みなら undefined)。 */
export function nextActorId(state: BattleState): string | undefined {
  if (state.phase !== 'active') return undefined;
  const acted = new Set(state.actedThisRound);
  return turnOrder(state).find((id) => !acted.has(id));
}

function replaceCombatant(
  state: BattleState,
  id: string,
  update: (c: CombatantState) => CombatantState,
): BattleState {
  return {
    ...state,
    combatants: state.combatants.map((c) => (c.id === id ? update(c) : c)),
  };
}

// ---------------------------------------------------------------------------
// ダメージ適用(divine_guardian 込み)
// ---------------------------------------------------------------------------

function applyDamageTo(
  state: BattleState,
  targetId: string,
  amount: number,
  events: BattleEvent[],
): BattleState {
  let next = state;
  const target = getCombatant(next, targetId);
  if (!target || !isAlive(target)) return next;
  let newHP = target.currentHP - amount;
  if (
    newHP <= 0 &&
    target.keystoneEffectIds.includes('divine_guardian') &&
    !target.divineGuardianUsed
  ) {
    newHP = 1;
    next = replaceCombatant(next, targetId, (c) => ({ ...c, divineGuardianUsed: true }));
    events.push({ type: 'divine_guardian', targetId });
  }
  next = replaceCombatant(next, targetId, (c) => ({ ...c, currentHP: Math.max(0, newHP) }));
  if (newHP <= 0) events.push({ type: 'defeated', targetId });
  return next;
}

// ---------------------------------------------------------------------------
// 攻撃・状態異常
// ---------------------------------------------------------------------------

function resolveAttackOnTarget(
  state: BattleState,
  rng: GameRandom,
  actorId: string,
  targetId: string,
  skill: SkillDefinition,
  events: BattleEvent[],
): BattleState {
  let next = state;
  const actor = getCombatant(next, actorId)!;
  const target = getCombatant(next, targetId)!;
  const actorEff = effectiveValues(actor);
  const targetEff = effectiveValues(target);
  const deadlyPrecision = actor.keystoneEffectIds.includes('deadly_precision');

  // 命中判定
  const hitChance = deadlyPrecision
    ? 100
    : Math.min(100, Math.max(5, actor.stats.baseHitChancePct - targetEff.evasionPct));
  if (!rng.roll(hitChance)) {
    events.push({ type: 'miss', actorId, targetId });
    return next;
  }

  // 基礎値と倍率
  const source = skill.attackSource ?? (skill.element === 'physical' ? 'phys' : 'magic');
  const baseAtk =
    (source === 'phys' ? actor.stats.physATK : actor.stats.magicATK) +
    actor.stats.elementAtkFlat[skill.element];
  const afterDef = Math.max(1, baseAtk * skill.multiplier - targetEff.defense * 0.5);

  // クリティカル
  const critChance = Math.min(
    C.critChanceCapPct,
    actorEff.critChancePct + (deadlyPrecision ? 25 : 0),
  );
  const crit = rng.roll(critChance);

  let damage = afterDef * rng.nextDoubleInRange(C.damageRandomMin, C.damageRandomMax);
  if (crit) damage *= actor.stats.critMultiplier;
  damage *= 1 + actorEff.dmgPctBonus / 100;

  // キーストーン補正
  if (
    actor.keystoneEffectIds.includes('berserker') &&
    actor.currentHP <= actor.stats.maxHP * 0.5
  ) {
    damage *= 1.5;
  }
  if (actor.keystoneEffectIds.includes('elemental_overload') && skill.element !== 'physical') {
    damage *= 1.3;
  }
  if (target.keystoneEffectIds.includes('elemental_overload')) {
    damage *= 1.15;
  }

  // 属性耐性(マイナスは弱点)
  const resPct = Math.min(100, target.stats.elementResPct[skill.element]);
  damage *= 1 - resPct / 100;

  // 防御コマンド・ブロック
  if (target.guarding) damage *= C.guardDamageReduction;
  const blocked = target.stats.blockPct > 0 && rng.roll(target.stats.blockPct);
  if (blocked) damage *= 0.5;

  const finalDamage = resPct >= 100 ? 0 : Math.max(1, Math.floor(damage));
  events.push({
    type: 'damage',
    actorId,
    targetId,
    amount: finalDamage,
    element: skill.element,
    crit,
    blocked,
  });
  next = applyDamageTo(next, targetId, finalDamage, events);

  // 反射(物理のみ)
  if (finalDamage > 0 && skill.element === 'physical' && target.stats.thornsFlat > 0) {
    events.push({ type: 'thorns', targetId: actorId, amount: target.stats.thornsFlat });
    next = applyDamageTo(next, actorId, target.stats.thornsFlat, events);
  }

  // 吸収
  if (finalDamage > 0 && (actor.stats.lifeLeechPct > 0 || actor.stats.manaLeechPct > 0)) {
    const hpLeech = Math.floor((finalDamage * actor.stats.lifeLeechPct) / 100);
    const mpLeech = Math.floor((finalDamage * actor.stats.manaLeechPct) / 100);
    if (hpLeech > 0 || mpLeech > 0) {
      next = replaceCombatant(next, actorId, (c) => ({
        ...c,
        currentHP: Math.min(c.stats.maxHP, c.currentHP + hpLeech),
        currentMP: Math.min(c.stats.maxMP, c.currentMP + mpLeech),
      }));
      events.push({ type: 'leech', actorId, hp: hpLeech, mp: mpLeech });
    }
  }

  // 状態異常付与(スキル付与率 + 装備付与率 - 対象耐性、§4)
  if (finalDamage > 0) {
    next = applyAilments(next, rng, actorId, targetId, skill, events);
  }
  return next;
}

function applyAilments(
  state: BattleState,
  rng: GameRandom,
  actorId: string,
  targetId: string,
  skill: SkillDefinition,
  events: BattleEvent[],
): BattleState {
  let next = state;
  const actor = getCombatant(next, actorId)!;
  for (const type of AILMENT_TYPES) {
    const fromSkill: AilmentApplication | undefined = skill.ailments.find((a) => a.type === type);
    const gearChance = actor.stats.ailmentChancePct[type] ?? 0;
    const totalChance = (fromSkill?.chancePercent ?? 0) + gearChance;
    if (totalChance <= 0) continue;
    const target = getCombatant(next, targetId);
    if (!target || !isAlive(target)) break;
    const effective = totalChance - ailmentResistance(target, type);
    if (effective <= 0 || !rng.roll(effective)) continue;
    const params = DEFAULT_AILMENT_PARAMS[type];
    const applied: ActiveAilment = {
      type,
      remainingTurns: fromSkill?.durationTurns ?? params.duration,
      value: fromSkill?.value ?? params.value,
    };
    next = replaceCombatant(next, targetId, (c) => ({
      ...c,
      // 同種は上書き(残りターンの長い方を採用)
      ailments: [
        ...c.ailments.filter((a) => a.type !== type),
        c.ailments.find((a) => a.type === type && a.remainingTurns > applied.remainingTurns) ??
          applied,
      ],
    }));
    events.push({ type: 'ailment_applied', targetId, ailment: type, turns: applied.remainingTurns });
  }
  return next;
}

// ---------------------------------------------------------------------------
// ターン実行
// ---------------------------------------------------------------------------

function resolveTargets(
  state: BattleState,
  actor: CombatantState,
  skill: SkillDefinition,
  targetId: string | undefined,
): readonly string[] | 'invalid' {
  const enemies = state.combatants.filter((c) => c.side !== actor.side && isAlive(c));
  const allies = state.combatants.filter((c) => c.side === actor.side && isAlive(c));
  switch (skill.scope) {
    case 'singleEnemy': {
      const target = enemies.find((c) => c.id === targetId);
      return target ? [target.id] : 'invalid';
    }
    case 'allEnemies':
      return enemies.map((c) => c.id);
    case 'self':
      return [actor.id];
    case 'singleAlly': {
      const target = allies.find((c) => c.id === (targetId ?? actor.id));
      return target ? [target.id] : 'invalid';
    }
    case 'allAllies':
      return allies.map((c) => c.id);
  }
}

function checkPhase(state: BattleState): BattlePhase {
  const partyAlive = state.combatants.some((c) => c.side === 'party' && !c.isSummon && isAlive(c));
  const enemiesAlive = state.combatants.some((c) => c.side === 'enemy' && isAlive(c));
  if (!partyAlive) return 'defeat';
  if (!enemiesAlive) return 'victory';
  return 'active';
}

function summonLimit(actor: CombatantState): number {
  return 1 + (actor.keystoneEffectIds.includes('master_summoner') ? 1 : 0);
}

/**
 * 1 行動を実行する。actorId は nextActorId() の返す ID であること
 * (順序の強制はしないが、行動済み・死亡は拒否する)。
 */
export function executeTurn(
  state: BattleState,
  rng: GameRandom,
  actorId: string,
  action: CombatAction,
  data: CombatMasterData,
): ActionResult {
  if (state.phase !== 'active') return { ok: false, reason: 'battle_over' };
  const actor = getCombatant(state, actorId);
  if (!actor || !isAlive(actor) || state.actedThisRound.includes(actorId)) {
    return { ok: false, reason: 'actor_cannot_act' };
  }

  const events: BattleEvent[] = [];
  // 自分の行動開始時に前ターンの防御を解除
  let next = actor.guarding
    ? replaceCombatant(state, actorId, (c) => ({ ...c, guarding: false }))
    : state;

  // 麻痺: 行動不能(§4)
  if (actor.ailments.some((a) => a.type === 'paralysis')) {
    events.push({ type: 'paralyzed', actorId });
    return finishTurn(next, actorId, events);
  }

  if (action.type === 'guard') {
    next = replaceCombatant(next, actorId, (c) => ({ ...c, guarding: true }));
    events.push({ type: 'guard', actorId });
    return finishTurn(next, actorId, events);
  }

  // スキル解決(通常攻撃は basic_attack 扱い)
  const skill =
    action.type === 'attack'
      ? (data.skills.find((s) => s.id === BASIC_ATTACK.id) ?? BASIC_ATTACK)
      : data.skills.find((s) => s.id === action.skillId);
  if (!skill) return { ok: false, reason: 'unknown_skill' };
  if (action.type === 'skill' && skill.id !== BASIC_ATTACK.id && !actor.skillIds.includes(skill.id)) {
    return { ok: false, reason: 'not_learned' };
  }

  // 沈黙: MP消費スキル(詠唱)不可(§4 の仮定)
  if (skill.mpCost > 0 && actor.ailments.some((a) => a.type === 'silence')) {
    return { ok: false, reason: 'silenced' };
  }
  // MP 消費(maxMP 0 のユニット=敵・召喚はMP管理外とする仮定)
  let mpCost = 0;
  if (skill.mpCost > 0 && actor.stats.maxMP > 0) {
    mpCost = Math.max(0, Math.floor(skill.mpCost * (1 - actor.stats.mpCostReductionPct / 100)));
    if (actor.currentMP < mpCost) return { ok: false, reason: 'not_enough_mp' };
  }

  const targets = resolveTargets(next, actor, skill, action.targetId);
  if (targets === 'invalid' || targets.length === 0) {
    if (skill.kind !== 'summon') return { ok: false, reason: 'invalid_target' };
  }

  // 召喚上限チェック
  if (skill.kind === 'summon') {
    const activeSummons = next.combatants.filter(
      (c) => c.side === actor.side && c.isSummon && isAlive(c),
    ).length;
    if (activeSummons >= summonLimit(actor)) return { ok: false, reason: 'summon_limit' };
    if (!skill.summonEnemyId || !data.enemies.some((e) => e.id === skill.summonEnemyId)) {
      return { ok: false, reason: 'unknown_skill' };
    }
  }

  if (mpCost > 0) {
    next = replaceCombatant(next, actorId, (c) => ({ ...c, currentMP: c.currentMP - mpCost }));
  }

  switch (skill.kind) {
    case 'attack': {
      for (const id of targets as string[]) {
        if (getCombatant(next, actorId) && isAlive(getCombatant(next, actorId)!)) {
          next = resolveAttackOnTarget(next, rng, actorId, id, skill, events);
        }
      }
      break;
    }
    case 'heal': {
      const healer = getCombatant(next, actorId)!;
      for (const id of targets as string[]) {
        const amount = Math.floor(
          healer.stats.magicATK *
            skill.multiplier *
            rng.nextDoubleInRange(C.damageRandomMin, C.damageRandomMax),
        );
        next = replaceCombatant(next, id, (c) => ({
          ...c,
          currentHP: Math.min(c.stats.maxHP, c.currentHP + amount),
        }));
        events.push({ type: 'heal', actorId, targetId: id, amount });
      }
      break;
    }
    case 'buff':
    case 'debuff': {
      const buff = skill.buff;
      if (!buff) break;
      for (const id of targets as string[]) {
        next = replaceCombatant(next, id, (c) => ({
          ...c,
          buffs: [...c.buffs, { stats: buff.stats, remainingTurns: buff.durationTurns }],
        }));
        events.push({
          type: 'buff_applied',
          actorId,
          targetId: id,
          stats: buff.stats,
          turns: buff.durationTurns,
        });
      }
      break;
    }
    case 'summon': {
      const def = data.enemies.find((e) => e.id === skill.summonEnemyId)!;
      const mult = actor.keystoneEffectIds.includes('master_summoner') ? 1.5 : 1;
      const summonId = `summon_${actorId}_${next.combatants.length}`;
      const summon = buildEnemyCombatant(def, Math.max(0, actor.level - 1), summonId, {
        isSummon: true,
        side: actor.side,
        statMultiplier: mult,
      });
      next = { ...next, combatants: [...next.combatants, summon] };
      events.push({ type: 'summon', actorId, summonId, name: summon.name });
      break;
    }
  }

  return finishTurn(next, actorId, events);
}

/** 行動後処理: 行動済み記録 → 勝敗判定 → ラウンド終了処理。 */
function finishTurn(
  state: BattleState,
  actorId: string,
  events: BattleEvent[],
): ActionResult {
  let next: BattleState = { ...state, actedThisRound: [...state.actedThisRound, actorId] };

  let phase = checkPhase(next);
  if (phase !== 'active') {
    events.push({ type: 'battle_end', result: phase === 'victory' ? 'victory' : 'defeat' });
    return { ok: true, state: { ...next, phase }, events };
  }

  // 生存者全員が行動済みならラウンド終了
  const acted = new Set(next.actedThisRound);
  const allActed = next.combatants.filter(isAlive).every((c) => acted.has(c.id));
  if (allActed) {
    next = endRound(next, events);
    phase = checkPhase(next);
    if (phase !== 'active') {
      events.push({ type: 'battle_end', result: phase === 'victory' ? 'victory' : 'defeat' });
      return { ok: true, state: { ...next, phase }, events };
    }
  }
  return { ok: true, state: next, events };
}

/** ラウンド終了処理: 継続ダメージ → リジェネ → 効果時間の減少。 */
function endRound(state: BattleState, events: BattleEvent[]): BattleState {
  let next = state;
  for (const combatant of state.combatants) {
    const current = getCombatant(next, combatant.id)!;
    if (!isAlive(current)) continue;

    // 毒・火傷: 最大HP比%の継続ダメージ(§4 の value 解釈)
    for (const ailment of current.ailments) {
      if (ailment.type !== 'poison' && ailment.type !== 'burn') continue;
      const tick = Math.max(1, Math.floor((current.stats.maxHP * ailment.value) / 100));
      events.push({ type: 'ailment_tick', targetId: current.id, ailment: ailment.type, amount: tick });
      next = applyDamageTo(next, current.id, tick, events);
    }

    const afterDot = getCombatant(next, combatant.id)!;
    if (!isAlive(afterDot)) continue;

    // リジェネ
    const hpRegen = Math.min(afterDot.stats.hpRegenFlat, afterDot.stats.maxHP - afterDot.currentHP);
    const mpRegen = Math.min(afterDot.stats.mpRegenFlat, afterDot.stats.maxMP - afterDot.currentMP);
    if (hpRegen > 0 || mpRegen > 0) {
      next = replaceCombatant(next, combatant.id, (c) => ({
        ...c,
        currentHP: c.currentHP + Math.max(0, hpRegen),
        currentMP: c.currentMP + Math.max(0, mpRegen),
      }));
      events.push({ type: 'regen', targetId: combatant.id, hp: Math.max(0, hpRegen), mp: Math.max(0, mpRegen) });
    }

    // 効果時間の減少
    next = replaceCombatant(next, combatant.id, (c) => {
      const remainingAilments = c.ailments
        .map((a) => ({ ...a, remainingTurns: a.remainingTurns - 1 }))
        .filter((a) => a.remainingTurns > 0);
      for (const expired of c.ailments.filter((a) => a.remainingTurns - 1 <= 0)) {
        events.push({ type: 'ailment_expired', targetId: c.id, ailment: expired.type });
      }
      return {
        ...c,
        ailments: remainingAilments,
        buffs: c.buffs
          .map((b) => ({ ...b, remainingTurns: b.remainingTurns - 1 }))
          .filter((b) => b.remainingTurns > 0),
      };
    });
  }
  events.push({ type: 'round_end', round: state.round });
  return { ...next, round: state.round + 1, actedThisRound: [] };
}

// ---------------------------------------------------------------------------
// 自動行動(敵AI・召喚ユニット)
// ---------------------------------------------------------------------------

/**
 * 敵・召喚ユニットの行動選択(単純AI、仮定):
 * 1. HP50%未満で回復スキルを持てば使う
 * 2. 60% でランダムなスキル、外れたら通常攻撃
 * 3. 対象は敵対側の生存者から等確率
 */
export function chooseAutoAction(
  state: BattleState,
  rng: GameRandom,
  actorId: string,
  data: CombatMasterData,
): CombatAction {
  const actor = getCombatant(state, actorId);
  if (!actor) return { type: 'guard' };
  const opponents = state.combatants.filter((c) => c.side !== actor.side && isAlive(c));
  if (opponents.length === 0) return { type: 'guard' };
  const pickOpponent = (): string => opponents[rng.nextInt(opponents.length)]!.id;

  const skills = actor.skillIds
    .map((id) => data.skills.find((s) => s.id === id))
    .filter((s): s is SkillDefinition => s !== undefined && s.kind !== 'summon');

  const healSkill = skills.find((s) => s.kind === 'heal');
  if (healSkill && actor.currentHP < actor.stats.maxHP * 0.5) {
    return { type: 'skill', skillId: healSkill.id, targetId: actor.id };
  }

  if (skills.length > 0 && rng.roll(60)) {
    const skill = skills[rng.nextInt(skills.length)]!;
    if (skill.scope === 'singleEnemy') {
      return { type: 'skill', skillId: skill.id, targetId: pickOpponent() };
    }
    if (skill.scope === 'singleAlly') {
      return { type: 'skill', skillId: skill.id, targetId: actor.id };
    }
    return { type: 'skill', skillId: skill.id };
  }
  return { type: 'attack', targetId: pickOpponent() };
}

// ---------------------------------------------------------------------------
// 報酬
// ---------------------------------------------------------------------------

export interface BattleRewards {
  readonly exp: number;
  readonly gold: number;
  /** 撃破した敵(ドロップ抽選用: 敵定義IDとドロップ率補正)。 */
  readonly defeatedEnemies: readonly { enemyDefId: string; dropRateMultiplier: number }[];
}

/** 勝利時の報酬を集計する(victory 以外では空)。 */
export function computeBattleRewards(state: BattleState): BattleRewards {
  if (state.phase !== 'victory') return { exp: 0, gold: 0, defeatedEnemies: [] };
  const defeated = state.combatants.filter((c) => c.side === 'enemy' && !isAlive(c));
  return {
    exp: defeated.reduce((acc, c) => acc + (c.expReward ?? 0), 0),
    gold: defeated.reduce((acc, c) => acc + (c.goldReward ?? 0), 0),
    defeatedEnemies: defeated.map((c) => ({
      enemyDefId: c.enemyDefId ?? 'unknown',
      dropRateMultiplier: c.dropRateMultiplier ?? 1,
    })),
  };
}
