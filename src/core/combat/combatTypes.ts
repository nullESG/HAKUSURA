/**
 * 戦闘の状態型(仕様 §4)。
 * BattleState はプレーンなデータのみで構成し、そのままシリアライズできる
 * (戦闘中セーブ対応、仕様 §7)。ロジックは battleEngine.ts の純粋関数が持つ。
 */
import type { AilmentType, ElementType, StatMap } from '../types/enums';

/** 戦闘中の実効ステータススナップショット(バフ適用前の基準値)。 */
export interface CombatStats {
  readonly maxHP: number;
  readonly maxMP: number;
  readonly physATK: number;
  readonly magicATK: number;
  readonly defense: number;
  readonly speed: number;
  readonly critChancePct: number;
  readonly critMultiplier: number;
  readonly baseHitChancePct: number;
  readonly evasionPct: number;
  readonly blockPct: number;
  /** 攻撃速度%。通常攻撃時の追撃発動率になる(ブロックD磨き込みの仮定)。 */
  readonly atkSpeedPct: number;
  readonly elementAtkFlat: Readonly<Record<ElementType, number>>;
  readonly elementResPct: Readonly<Record<ElementType, number>>;
  /** 攻撃時の状態異常付与%(装備・パッシブ由来。スキル分は加算)。 */
  readonly ailmentChancePct: Readonly<Partial<Record<AilmentType, number>>>;
  /** 状態異常耐性%(全種共通 + 種類別)。 */
  readonly ailmentResPct: number;
  readonly ailmentResByType: Readonly<Partial<Record<AilmentType, number>>>;
  readonly lifeLeechPct: number;
  readonly manaLeechPct: number;
  readonly thornsFlat: number;
  readonly hpRegenFlat: number;
  readonly mpRegenFlat: number;
  /** MP消費軽減%(正の値で軽減)。 */
  readonly mpCostReductionPct: number;
}

/** 戦闘中の状態異常(仕様 §4)。 */
export interface ActiveAilment {
  readonly type: AilmentType;
  readonly remainingTurns: number;
  /** poison/burn: 毎ターン最大HP比%ダメージ、freeze: 速度低下%。 */
  readonly value: number;
}

/** 戦闘中のバフ/デバフ。 */
export interface ActiveBuff {
  readonly stats: StatMap;
  readonly remainingTurns: number;
}

export type CombatSide = 'party' | 'enemy';

/** 戦闘参加者(プレーンデータ。シリアライズ可能)。 */
export interface CombatantState {
  readonly id: string;
  readonly name: string;
  readonly side: CombatSide;
  readonly level: number;
  readonly stats: CombatStats;
  readonly currentHP: number;
  readonly currentMP: number;
  readonly ailments: readonly ActiveAilment[];
  readonly buffs: readonly ActiveBuff[];
  /** 防御コマンド中(次の自分の行動まで被ダメージ半減、仕様 §4)。 */
  readonly guarding: boolean;
  readonly skillIds: readonly string[];
  readonly keystoneEffectIds: readonly string[];
  /** 召喚ユニットか(パーティ枠と別計上)。 */
  readonly isSummon: boolean;
  /** divine_guardian の発動済みフラグ(戦闘ごとに1回)。 */
  readonly divineGuardianUsed: boolean;
  /** 参照元(報酬計算・UI 用)。 */
  readonly characterId?: string;
  readonly enemyDefId?: string;
  /** 撃破時報酬(深度スケーリング済み。敵のみ)。 */
  readonly expReward?: number;
  readonly goldReward?: number;
  readonly dropRateMultiplier?: number;
}

export type BattlePhase = 'active' | 'victory' | 'defeat';

/** 戦闘全体の状態(プレーンデータ。シリアライズ可能)。 */
export interface BattleState {
  /** 経過ラウンド数(1 始まり)。 */
  readonly round: number;
  readonly phase: BattlePhase;
  readonly combatants: readonly CombatantState[];
  /** このラウンドで行動済みの combatant ID。 */
  readonly actedThisRound: readonly string[];
}

/** プレイヤーが選択する行動。 */
export type CombatAction =
  | { readonly type: 'attack'; readonly targetId: string }
  | { readonly type: 'skill'; readonly skillId: string; readonly targetId?: string }
  | { readonly type: 'guard' };

/** UI 表示・ログ用の戦闘イベント。 */
export type BattleEvent =
  | { type: 'damage'; actorId: string; targetId: string; amount: number; element: ElementType; crit: boolean; blocked: boolean }
  | { type: 'miss'; actorId: string; targetId: string }
  | { type: 'heal'; actorId: string; targetId: string; amount: number }
  | { type: 'guard'; actorId: string }
  | { type: 'buff_applied'; actorId: string; targetId: string; stats: StatMap; turns: number }
  | { type: 'ailment_applied'; targetId: string; ailment: AilmentType; turns: number }
  | { type: 'ailment_tick'; targetId: string; ailment: AilmentType; amount: number }
  | { type: 'ailment_expired'; targetId: string; ailment: AilmentType }
  | { type: 'regen'; targetId: string; hp: number; mp: number }
  | { type: 'paralyzed'; actorId: string }
  | { type: 'followup'; actorId: string }
  | { type: 'thorns'; targetId: string; amount: number }
  | { type: 'leech'; actorId: string; hp: number; mp: number }
  | { type: 'summon'; actorId: string; summonId: string; name: string }
  | { type: 'defeated'; targetId: string }
  | { type: 'divine_guardian'; targetId: string }
  | { type: 'round_end'; round: number }
  | { type: 'battle_end'; result: 'victory' | 'defeat' };

/** 行動の失敗理由(UI が再入力を促す)。 */
export type ActionFailReason =
  | 'battle_over'
  | 'actor_cannot_act' // 死亡・行動済み
  | 'unknown_skill'
  | 'not_learned'
  | 'silenced'
  | 'not_enough_mp'
  | 'invalid_target'
  | 'summon_limit';

export type ActionResult =
  | { readonly ok: true; readonly state: BattleState; readonly events: readonly BattleEvent[] }
  | { readonly ok: false; readonly reason: ActionFailReason };
