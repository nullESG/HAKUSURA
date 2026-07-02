/**
 * CombatStats の構築とバフ適用後の実効値計算。
 * プレイヤーは statCalculator の DerivedStats + mods(StatMap)から、
 * 敵は深度スケーリング済みの EnemyDefinition から変換する。
 */
import { statOf } from '../stats/statCalculator';
import type { DerivedStats } from '../stats/statCalculator';
import type { EnemyDefinition } from '../types/enemy';
import type { AilmentType, ElementType, StatMap } from '../types/enums';
import { ELEMENT_TYPES } from '../types/enums';
import type { ActiveBuff, CombatantState, CombatStats } from './combatTypes';

/** プレイヤーの導出ステータス + 装備/パッシブ StatMap から戦闘スナップショットを作る。 */
export function combatStatsFromDerived(derived: DerivedStats, mods: StatMap): CombatStats {
  return {
    maxHP: derived.maxHP,
    maxMP: derived.maxMP,
    physATK: derived.physATK,
    magicATK: derived.magicATK,
    defense: derived.defense,
    speed: derived.speed,
    critChancePct: derived.critChancePct,
    critMultiplier: derived.critMultiplier,
    baseHitChancePct: derived.baseHitChancePct,
    evasionPct: derived.evasionPct,
    blockPct: derived.blockPct,
    elementAtkFlat: derived.elementAtkFlat,
    elementResPct: derived.elementResPct,
    ailmentChancePct: {
      poison: statOf(mods, 'poisonChance_pct'),
      paralysis: statOf(mods, 'paralysisChance_pct'),
      burn: statOf(mods, 'burnChance_pct'),
      freeze: statOf(mods, 'freezeChance_pct'),
      silence: statOf(mods, 'silenceChance_pct'),
    },
    ailmentResPct: statOf(mods, 'ailmentRes_pct'),
    ailmentResByType: {},
    lifeLeechPct: statOf(mods, 'lifeLeech_pct'),
    manaLeechPct: statOf(mods, 'manaLeech_pct'),
    thornsFlat: statOf(mods, 'thorns_flat'),
    hpRegenFlat: statOf(mods, 'hpRegen_flat'),
    mpRegenFlat: statOf(mods, 'mpRegen_flat'),
    mpCostReductionPct: statOf(mods, 'mpCost_pct'),
  };
}

const zeroElementMap = (): Record<ElementType, number> => {
  const map = {} as Record<ElementType, number>;
  for (const element of ELEMENT_TYPES) map[element] = 0;
  return map;
};

/** 敵定義(スケーリング済み基準値)から戦闘スナップショットを作る。 */
export function combatStatsFromEnemy(
  def: EnemyDefinition,
  scaledStats: EnemyDefinition['baseStats'],
): CombatStats {
  const res = zeroElementMap();
  for (const [element, value] of Object.entries(def.resistances)) {
    res[element as ElementType] = value ?? 0;
  }
  return {
    maxHP: scaledStats.maxHP,
    maxMP: 0, // 敵はMP無制限でスキルを使う(EnemyBaseStats にMPが無いため。仮定)
    physATK: scaledStats.physATK,
    magicATK: scaledStats.magicATK,
    defense: scaledStats.defense,
    speed: scaledStats.speed,
    critChancePct: scaledStats.critChancePct,
    critMultiplier: 1.5,
    baseHitChancePct: 90,
    evasionPct: scaledStats.evasionPct,
    blockPct: 0,
    elementAtkFlat: zeroElementMap(),
    elementResPct: res,
    ailmentChancePct: {},
    ailmentResPct: 0,
    ailmentResByType: def.ailmentResistances,
    lifeLeechPct: 0,
    manaLeechPct: 0,
    thornsFlat: 0,
    hpRegenFlat: 0,
    mpRegenFlat: 0,
    mpCostReductionPct: 0,
  };
}

/** バフ/デバフの合算 StatMap。 */
function buffMods(buffs: readonly ActiveBuff[]): StatMap {
  const merged: StatMap = {};
  for (const buff of buffs) {
    for (const [key, value] of Object.entries(buff.stats) as [keyof StatMap, number][]) {
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

/**
 * バフ・状態異常適用後の実効値。
 * 戦闘中バフが影響するのは §4 の戦闘計算で使う代表値のみ(仮定):
 * dmg_pct / armorDEF_flat / critChance_pct / speed_pct / evasion_pct / ailmentRes_pct。
 */
export interface EffectiveCombatValues {
  readonly dmgPctBonus: number;
  readonly defense: number;
  readonly critChancePct: number;
  readonly speed: number;
  readonly evasionPct: number;
  readonly ailmentResPct: number;
}

export function effectiveValues(combatant: CombatantState): EffectiveCombatValues {
  const mods = buffMods(combatant.buffs);
  const freeze = combatant.ailments.find((a) => a.type === 'freeze');
  const freezeFactor = freeze ? Math.max(0, 1 - freeze.value / 100) : 1;
  return {
    dmgPctBonus: statOf(mods, 'dmg_pct'),
    defense: Math.max(0, combatant.stats.defense + statOf(mods, 'armorDEF_flat')),
    critChancePct: combatant.stats.critChancePct + statOf(mods, 'critChance_pct'),
    speed:
      combatant.stats.speed * (1 + statOf(mods, 'speed_pct') / 100) * freezeFactor,
    evasionPct: combatant.stats.evasionPct + statOf(mods, 'evasion_pct'),
    ailmentResPct: combatant.stats.ailmentResPct + statOf(mods, 'ailmentRes_pct'),
  };
}

/** 種類別も含めた状態異常耐性%。 */
export function ailmentResistance(combatant: CombatantState, type: AilmentType): number {
  return effectiveValues(combatant).ailmentResPct + (combatant.stats.ailmentResByType[type] ?? 0);
}
