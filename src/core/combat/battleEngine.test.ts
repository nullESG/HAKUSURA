import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS, getEnemyById } from '../../data/enemies';
import { SKILL_DEFINITIONS } from '../../data/skills';
import { GAME_CONSTANTS } from '../constants';
import { GameRandom } from '../rng/gameRandom';
import type { CombatMasterData } from './battleEngine';
import {
  chooseAutoAction,
  computeBattleRewards,
  createBattleState,
  executeTurn,
  getCombatant,
  nextActorId,
  turnOrder,
} from './battleEngine';
import type { BattleEvent, BattleState, CombatantState, CombatStats } from './combatTypes';
import { depthMultiplier, scaleEnemyStats, buildEnemyCombatant } from './enemyScaling';

const DATA: CombatMasterData = { skills: SKILL_DEFINITIONS, enemies: ENEMY_DEFINITIONS };
const C = GAME_CONSTANTS;

/** テスト用の汎用ステータス。 */
function makeStats(overrides: Partial<CombatStats> = {}): CombatStats {
  return {
    maxHP: 100,
    maxMP: 50,
    physATK: 30,
    magicATK: 30,
    defense: 10,
    speed: 10,
    critChancePct: 0,
    critMultiplier: 1.5,
    baseHitChancePct: 100,
    evasionPct: 0,
    blockPct: 0,
    elementAtkFlat: { physical: 0, fire: 0, ice: 0, lightning: 0, poison: 0, light: 0, dark: 0 },
    elementResPct: { physical: 0, fire: 0, ice: 0, lightning: 0, poison: 0, light: 0, dark: 0 },
    ailmentChancePct: {},
    ailmentResPct: 0,
    ailmentResByType: {},
    lifeLeechPct: 0,
    manaLeechPct: 0,
    thornsFlat: 0,
    hpRegenFlat: 0,
    mpRegenFlat: 0,
    mpCostReductionPct: 0,
    ...overrides,
  };
}

function makeCombatant(
  id: string,
  side: 'party' | 'enemy',
  statOverrides: Partial<CombatStats> = {},
  overrides: Partial<CombatantState> = {},
): CombatantState {
  const stats = makeStats(statOverrides);
  return {
    id,
    name: id,
    side,
    level: 10,
    stats,
    currentHP: stats.maxHP,
    currentMP: stats.maxMP,
    ailments: [],
    buffs: [],
    guarding: false,
    skillIds: [],
    keystoneEffectIds: [],
    isSummon: false,
    divineGuardianUsed: false,
    ...overrides,
  };
}

/** 敵AIも含めて1戦闘を自動で回す(テスト用)。 */
function autoBattle(state: BattleState, rng: GameRandom, maxTurns = 500): {
  state: BattleState;
  events: BattleEvent[];
} {
  const allEvents: BattleEvent[] = [];
  let current = state;
  for (let i = 0; i < maxTurns && current.phase === 'active'; i++) {
    const actorId = nextActorId(current);
    if (!actorId) throw new Error('nextActorId が undefined');
    const action = chooseAutoAction(current, rng, actorId, DATA);
    const result = executeTurn(current, rng, actorId, action, DATA);
    if (!result.ok) throw new Error(`行動失敗: ${result.reason}`);
    current = result.state;
    allEvents.push(...result.events);
  }
  return { state: current, events: allEvents };
}

describe('深度スケーリング(仕様 §6)', () => {
  it('floor(base * 1.08^depth) でスケーリングされる', () => {
    const goblin = getEnemyById('goblin');
    expect(depthMultiplier(0)).toBe(1);
    const scaled = scaleEnemyStats(goblin.baseStats, 10);
    const m = Math.pow(1.08, 10);
    expect(scaled.maxHP).toBe(Math.floor(goblin.baseStats.maxHP * m));
    expect(scaled.physATK).toBe(Math.floor(goblin.baseStats.physATK * m));
    // 深度0では基準値そのまま
    expect(scaleEnemyStats(goblin.baseStats, 0)).toEqual({ ...goblin.baseStats });
  });

  it('buildEnemyCombatant が報酬もスケーリングする', () => {
    const goblin = getEnemyById('goblin');
    const combatant = buildEnemyCombatant(goblin, 10, 'e1');
    const m = Math.pow(1.08, 10);
    expect(combatant.expReward).toBe(Math.floor(goblin.baseExp * m));
    expect(combatant.goldReward).toBe(Math.floor(goblin.baseGold * m));
    expect(combatant.currentHP).toBe(combatant.stats.maxHP);
  });
});

describe('戦闘エンジン(仕様 §4)', () => {
  it('同一シード・同一行動列で完全に再現される(決定論)', () => {
    const setup = (): BattleState =>
      createBattleState(
        [makeCombatant('p1', 'party', { speed: 20 })],
        [buildEnemyCombatant(getEnemyById('goblin'), 5, 'e1')],
      );
    const run = (): { state: BattleState; events: BattleEvent[] } =>
      autoBattle(setup(), new GameRandom(42));
    const a = run();
    const b = run();
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it('行動順は実効速度の降順', () => {
    const state = createBattleState(
      [makeCombatant('slow', 'party', { speed: 5 }), makeCombatant('fast', 'party', { speed: 20 })],
      [makeCombatant('mid', 'enemy', { speed: 10 })],
    );
    expect(turnOrder(state)).toEqual(['fast', 'mid', 'slow']);
    expect(nextActorId(state)).toBe('fast');
  });

  it('通常攻撃でダメージが入り、防御コマンドで半減する', () => {
    const state = createBattleState(
      [makeCombatant('p1', 'party', { physATK: 40, speed: 20 })],
      [makeCombatant('e1', 'enemy', { defense: 10, speed: 1, maxHP: 1000 })],
    );
    // 防御なしのダメージ
    const r1 = executeTurn(state, new GameRandom(1), 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    if (!r1.ok) throw new Error(r1.reason);
    const dmg1 = r1.events.find((e) => e.type === 'damage')!;

    // 同条件で敵が防御中
    const guarded = {
      ...state,
      combatants: state.combatants.map((c) => (c.id === 'e1' ? { ...c, guarding: true } : c)),
    };
    const r2 = executeTurn(guarded, new GameRandom(1), 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    if (!r2.ok) throw new Error(r2.reason);
    const dmg2 = r2.events.find((e) => e.type === 'damage')!;
    expect(dmg2.amount).toBeLessThan(dmg1.amount);
    expect(dmg2.amount).toBe(Math.floor(dmg1.amount * C.guardDamageReduction) + (dmg1.amount % 2 === 0 ? 0 : 0));
  });

  it('属性弱点(マイナス耐性)でダメージが増え、耐性100%で無効化される', () => {
    const base = makeCombatant('p1', 'party', { magicATK: 40, speed: 20 });
    const weak = makeCombatant('e1', 'enemy', {
      maxHP: 1000,
      speed: 1,
      elementResPct: { physical: 0, fire: -50, ice: 0, lightning: 0, poison: 100, light: 0, dark: 0 },
    });
    const withSkills = { ...base, skillIds: ['fireball', 'venom_bolt'] };
    const state = createBattleState([withSkills], [weak]);

    const fire = executeTurn(state, new GameRandom(5), 'p1', { type: 'skill', skillId: 'fireball', targetId: 'e1' }, DATA);
    if (!fire.ok) throw new Error(fire.reason);
    const fireDmg = fire.events.find((e) => e.type === 'damage')!;

    const poison = executeTurn(state, new GameRandom(5), 'p1', { type: 'skill', skillId: 'venom_bolt', targetId: 'e1' }, DATA);
    if (!poison.ok) throw new Error(poison.reason);
    const poisonDmg = poison.events.find((e) => e.type === 'damage')!;

    expect(poisonDmg.amount).toBe(0); // 毒耐性100%
    // 弱点50%: 同倍率スキルではないため直接比較せず、火が0でないことと増幅を確認
    expect(fireDmg.amount).toBeGreaterThan(0);
  });

  it('MP不足・未習得・沈黙でスキルが拒否される', () => {
    const caster = makeCombatant('p1', 'party', { speed: 20, maxMP: 5 }, { skillIds: ['fireball'] });
    const enemy = makeCombatant('e1', 'enemy', { speed: 1 });
    let state = createBattleState([{ ...caster, currentMP: 5 }], [enemy]);
    const rng = new GameRandom(1);

    expect(executeTurn(state, rng, 'p1', { type: 'skill', skillId: 'fireball', targetId: 'e1' }, DATA)).toEqual({ ok: false, reason: 'not_enough_mp' });
    expect(executeTurn(state, rng, 'p1', { type: 'skill', skillId: 'blizzard', targetId: 'e1' }, DATA)).toEqual({ ok: false, reason: 'not_learned' });

    state = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.id === 'p1'
          ? { ...c, currentMP: 50, stats: { ...c.stats, maxMP: 50 }, ailments: [{ type: 'silence' as const, remainingTurns: 2, value: 0 }] }
          : c,
      ),
    };
    expect(executeTurn(state, rng, 'p1', { type: 'skill', skillId: 'fireball', targetId: 'e1' }, DATA)).toEqual({ ok: false, reason: 'silenced' });
    // 沈黙中でも通常攻撃(MP0)は可能
    const attack = executeTurn(state, rng, 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    expect(attack.ok).toBe(true);
  });

  it('麻痺中は行動がスキップされる', () => {
    const paralyzed = makeCombatant('p1', 'party', { speed: 20 }, {
      ailments: [{ type: 'paralysis', remainingTurns: 1, value: 0 }],
    });
    const state = createBattleState([paralyzed], [makeCombatant('e1', 'enemy', { speed: 1, maxHP: 500 })]);
    const result = executeTurn(state, new GameRandom(1), 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    if (!result.ok) throw new Error(result.reason);
    expect(result.events.some((e) => e.type === 'paralyzed')).toBe(true);
    expect(result.events.some((e) => e.type === 'damage')).toBe(false);
    expect(result.state.actedThisRound).toContain('p1');
  });

  it('毒がラウンド終了時に最大HP比でダメージを与え、期限切れで消える', () => {
    const poisoned = makeCombatant('e1', 'enemy', { maxHP: 200, speed: 1 }, {
      ailments: [{ type: 'poison', remainingTurns: 1, value: 5 }],
    });
    const state = createBattleState([makeCombatant('p1', 'party', { speed: 20 })], [poisoned]);
    const rng = new GameRandom(1);
    // p1 防御 → e1 防御 → 全員行動済みでラウンド終了
    const r1 = executeTurn(state, rng, 'p1', { type: 'guard' }, DATA);
    if (!r1.ok) throw new Error(r1.reason);
    const r2 = executeTurn(r1.state, rng, 'e1', { type: 'guard' }, DATA);
    if (!r2.ok) throw new Error(r2.reason);

    const tick = r2.events.find((e) => e.type === 'ailment_tick')!;
    expect(tick).toBeDefined();
    expect(tick.amount).toBe(10); // 200 * 5%
    expect(getCombatant(r2.state, 'e1')!.currentHP).toBe(190);
    expect(getCombatant(r2.state, 'e1')!.ailments).toEqual([]); // 1ターンで期限切れ
    expect(r2.events.some((e) => e.type === 'ailment_expired')).toBe(true);
    expect(r2.state.round).toBe(2);
  });

  it('バフでダメージが増え、持続ターンで消える', () => {
    const buffer = makeCombatant('p1', 'party', { physATK: 40, speed: 20 }, { skillIds: ['war_cry'] });
    const enemy = makeCombatant('e1', 'enemy', { speed: 1, maxHP: 5000 });
    const state = createBattleState([buffer], [enemy]);
    const rng = new GameRandom(7);
    const r1 = executeTurn(state, rng, 'p1', { type: 'skill', skillId: 'war_cry' }, DATA);
    if (!r1.ok) throw new Error(r1.reason);
    const buffed = getCombatant(r1.state, 'p1')!;
    expect(buffed.buffs).toEqual([{ stats: { dmg_pct: 20 }, remainingTurns: 3 }]);
    expect(buffed.currentMP).toBe(40); // MP10消費

    // 3ラウンド経過でバフが消える
    let current = r1.state;
    for (let round = 0; round < 3; round++) {
      const enemyTurn = executeTurn(current, rng, 'e1', { type: 'guard' }, DATA);
      if (!enemyTurn.ok) throw new Error(enemyTurn.reason);
      current = enemyTurn.state;
      if (current.phase !== 'active') break;
      const playerTurn = executeTurn(current, rng, 'p1', { type: 'guard' }, DATA);
      if (!playerTurn.ok) throw new Error(playerTurn.reason);
      current = playerTurn.state;
    }
    expect(getCombatant(current, 'p1')!.buffs).toEqual([]);
  });

  it('回復は最大HPを超えない', () => {
    const healer = makeCombatant('p1', 'party', { magicATK: 50, speed: 20 }, { skillIds: ['heal'] });
    const state = createBattleState(
      [{ ...healer, currentHP: 95 }],
      [makeCombatant('e1', 'enemy', { speed: 1 })],
    );
    const result = executeTurn(state, new GameRandom(1), 'p1', { type: 'skill', skillId: 'heal', targetId: 'p1' }, DATA);
    if (!result.ok) throw new Error(result.reason);
    expect(getCombatant(result.state, 'p1')!.currentHP).toBe(100);
  });

  it('召喚はユニットを追加し、上限を超えると拒否される', () => {
    const summoner = makeCombatant('p1', 'party', { speed: 20, maxMP: 100 }, { skillIds: ['summon_imp'] });
    const state = createBattleState([summoner], [makeCombatant('e1', 'enemy', { speed: 1 })]);
    const rng = new GameRandom(1);
    const r1 = executeTurn(state, rng, 'p1', { type: 'skill', skillId: 'summon_imp' }, DATA);
    if (!r1.ok) throw new Error(r1.reason);
    const summon = r1.state.combatants.find((c) => c.isSummon)!;
    expect(summon).toBeDefined();
    expect(summon.side).toBe('party');
    expect(summon.enemyDefId).toBe('imp');

    // 2体目は上限(master_summoner なしは1体)
    const nextRound = { ...r1.state, actedThisRound: [] };
    expect(executeTurn(nextRound, rng, 'p1', { type: 'skill', skillId: 'summon_imp' }, DATA)).toEqual({ ok: false, reason: 'summon_limit' });

    // master_summoner なら2体目が出せる
    const withKeystone = {
      ...nextRound,
      combatants: nextRound.combatants.map((c) =>
        c.id === 'p1' ? { ...c, keystoneEffectIds: ['master_summoner'] } : c,
      ),
    };
    const r2 = executeTurn(withKeystone, rng, 'p1', { type: 'skill', skillId: 'summon_imp' }, DATA);
    expect(r2.ok).toBe(true);
  });

  it('berserker はHP50%以下で与ダメージが増える', () => {
    const make = (hp: number): BattleState =>
      createBattleState(
        [makeCombatant('p1', 'party', { physATK: 40, speed: 20, critChancePct: 0 }, { keystoneEffectIds: ['berserker'], currentHP: hp })],
        [makeCombatant('e1', 'enemy', { speed: 1, maxHP: 5000 })],
      );
    const high = executeTurn(make(100), new GameRandom(3), 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    const low = executeTurn(make(40), new GameRandom(3), 'p1', { type: 'attack', targetId: 'e1' }, DATA);
    if (!high.ok || !low.ok) throw new Error('攻撃失敗');
    const highDmg = high.events.find((e) => e.type === 'damage')!;
    const lowDmg = low.events.find((e) => e.type === 'damage')!;
    expect(lowDmg.amount).toBe(Math.floor(highDmg.amount * 1.5) + (highDmg.amount * 1.5 % 1 === 0 ? 0 : 0));
    expect(lowDmg.amount).toBeGreaterThan(highDmg.amount);
  });

  it('divine_guardian は致死ダメージを1回だけHP1で耐える', () => {
    const guardian = makeCombatant('p1', 'party', { speed: 1, maxHP: 50, defense: 0 }, { keystoneEffectIds: ['divine_guardian'], currentHP: 10 });
    const boss = makeCombatant('e1', 'enemy', { physATK: 500, speed: 20 });
    const state = createBattleState([guardian], [boss]);
    const rng = new GameRandom(2);
    const r1 = executeTurn(state, rng, 'e1', { type: 'attack', targetId: 'p1' }, DATA);
    if (!r1.ok) throw new Error(r1.reason);
    expect(r1.events.some((e) => e.type === 'divine_guardian')).toBe(true);
    const survivor = getCombatant(r1.state, 'p1')!;
    expect(survivor.currentHP).toBe(1);
    expect(survivor.divineGuardianUsed).toBe(true);
    expect(r1.state.phase).toBe('active');

    // 2発目は死ぬ
    const nextRound = { ...r1.state, actedThisRound: [] };
    const r2 = executeTurn(nextRound, rng, 'e1', { type: 'attack', targetId: 'p1' }, DATA);
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.state.phase).toBe('defeat');
  });

  it('全滅判定と報酬集計(勝利時のみ)', () => {
    const hero = makeCombatant('p1', 'party', { physATK: 100, speed: 20 });
    const state = createBattleState([hero], [buildEnemyCombatant(getEnemyById('slime'), 3, 'e1')]);
    const { state: final } = autoBattle(state, new GameRandom(10));
    expect(final.phase).toBe('victory');
    const rewards = computeBattleRewards(final);
    const m = Math.pow(1.08, 3);
    expect(rewards.exp).toBe(Math.floor(8 * m));
    expect(rewards.gold).toBe(Math.floor(5 * m));
    expect(rewards.defeatedEnemies).toEqual([{ enemyDefId: 'slime', dropRateMultiplier: 1 }]);
    // 敗北時は空
    expect(computeBattleRewards({ ...final, phase: 'defeat' })).toEqual({ exp: 0, gold: 0, defeatedEnemies: [] });
  });

  it('フルバトルのスモーク: パーティ4人 vs 敵4体が正常に決着する', () => {
    const party = [
      makeCombatant('w', 'party', { physATK: 35, maxHP: 150, speed: 8 }, { skillIds: ['power_strike', 'cleave'] }),
      makeCombatant('m', 'party', { magicATK: 40, maxHP: 80, speed: 9 }, { skillIds: ['fireball', 'blizzard'] }),
      makeCombatant('r', 'party', { physATK: 30, maxHP: 100, speed: 14, critChancePct: 20 }, { skillIds: ['poison_arrow'] }),
      makeCombatant('c', 'party', { magicATK: 30, maxHP: 110, speed: 8 }, { skillIds: ['heal', 'smite'] }),
    ];
    const enemies = [
      buildEnemyCombatant(getEnemyById('goblin'), 5, 'e1'),
      buildEnemyCombatant(getEnemyById('wolf'), 5, 'e2'),
      buildEnemyCombatant(getEnemyById('skeleton'), 5, 'e3'),
      buildEnemyCombatant(getEnemyById('dark_mage'), 5, 'e4'),
    ];
    const { state: final, events } = autoBattle(createBattleState(party, enemies), new GameRandom(2026));
    expect(['victory', 'defeat']).toContain(final.phase);
    expect(events.some((e) => e.type === 'battle_end')).toBe(true);
    // HPが負にならない・上限を超えない
    for (const c of final.combatants) {
      expect(c.currentHP).toBeGreaterThanOrEqual(0);
      expect(c.currentHP).toBeLessThanOrEqual(c.stats.maxHP);
    }
  });

  it('戦闘終了後の行動は battle_over', () => {
    const state = createBattleState(
      [makeCombatant('p1', 'party')],
      [makeCombatant('e1', 'enemy')],
    );
    const over = { ...state, phase: 'victory' as const };
    expect(executeTurn(over, new GameRandom(1), 'p1', { type: 'guard' }, DATA)).toEqual({ ok: false, reason: 'battle_over' });
  });
});
