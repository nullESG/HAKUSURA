/**
 * 敵の深度スケーリング(仕様 §6)。
 * 階層難易度 = floor(baseStats * 1.08^depth)。経験値・ゴールドも同式で伸びる。
 */
import { GAME_CONSTANTS } from '../constants';
import type { EnemyBaseStats, EnemyDefinition } from '../types/enemy';
import { combatStatsFromEnemy } from './combatStats';
import type { CombatantState } from './combatTypes';

const C = GAME_CONSTANTS;

export function depthMultiplier(depth: number): number {
  return Math.pow(C.dungeonDepthGrowth, Math.max(0, depth));
}

/** 基準値を深度でスケーリングする(全項目 floor、最低1)。 */
export function scaleEnemyStats(base: EnemyBaseStats, depth: number): EnemyBaseStats {
  const m = depthMultiplier(depth);
  const scale = (v: number): number => Math.max(1, Math.floor(v * m));
  return {
    maxHP: scale(base.maxHP),
    physATK: scale(base.physATK),
    magicATK: base.magicATK > 0 ? scale(base.magicATK) : 0,
    defense: Math.floor(base.defense * m),
    speed: base.speed, // 速度は深度で伸ばさない(行動順が壊れるため。仮定)
    evasionPct: base.evasionPct,
    critChancePct: base.critChancePct,
  };
}

/** 敵定義から戦闘参加者を生成する。id は同種複数体のために呼び出し側が一意化する。 */
export function buildEnemyCombatant(
  def: EnemyDefinition,
  depth: number,
  id: string,
  options: { isSummon?: boolean; side?: 'party' | 'enemy'; statMultiplier?: number } = {},
): CombatantState {
  const scaled = scaleEnemyStats(def.baseStats, depth);
  const mult = options.statMultiplier ?? 1;
  const boosted: EnemyBaseStats =
    mult === 1
      ? scaled
      : {
          ...scaled,
          maxHP: Math.floor(scaled.maxHP * mult),
          physATK: Math.floor(scaled.physATK * mult),
          magicATK: Math.floor(scaled.magicATK * mult),
          defense: Math.floor(scaled.defense * mult),
        };
  const stats = combatStatsFromEnemy(def, boosted);
  const m = depthMultiplier(depth);
  return {
    id,
    name: def.name,
    side: options.side ?? 'enemy',
    level: depth + 1,
    stats,
    currentHP: stats.maxHP,
    currentMP: 0,
    ailments: [],
    buffs: [],
    guarding: false,
    skillIds: def.skillIds,
    keystoneEffectIds: [],
    isSummon: options.isSummon ?? false,
    divineGuardianUsed: false,
    enemyDefId: def.id,
    expReward: Math.floor(def.baseExp * m),
    goldReward: Math.floor(def.baseGold * m),
    dropRateMultiplier: def.dropRateMultiplier,
  };
}
