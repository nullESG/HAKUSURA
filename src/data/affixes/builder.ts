import { GAME_CONSTANTS } from '../../core/constants';
import type {
  AffixDefinition,
  AffixTierDef,
  AffixType,
  ItemType,
  StatId,
} from '../../core/types';
import { BUDGET_RATES } from './budgetRates';

/**
 * Tier 出現 iLvl(仕様 §8: minILvl(tier)=ceil((tier-1)*9.4) の「実質」列挙
 * 1,10,19,29,38,48,57,67,76,86 をそのまま正とする)。
 */
export const TIER_MIN_ILVLS = [1, 10, 19, 29, 38, 48, 57, 67, 76, 86] as const;

/** budget(tier) = 4 * 1.25^(tier-1)(仕様 §8)。 */
export function budgetOfTier(tier: number): number {
  return GAME_CONSTANTS.affixBudgetT1 * Math.pow(GAME_CONSTANTS.affixTierGrowth, tier - 1);
}

/**
 * Tier1〜10 を生成する(仕様 §8)。
 * 中央値 = round(rate × budget(tier) × ratio)、min/max = round(中央値の±10%)。
 * 仕様 §9 の見本テーブルはこの手順(中央値を先に丸める)で再現される。
 */
export function buildTiers(stats: readonly StatId[], ratio: number): AffixTierDef[] {
  return TIER_MIN_ILVLS.map((minILvl, i) => ({
    tier: i + 1,
    minILvl,
    stats: stats.map((stat) => {
      const mid = Math.round(BUDGET_RATES[stat] * budgetOfTier(i + 1) * ratio);
      return { stat, min: Math.round(mid * 0.9), max: Math.round(mid * 1.1) };
    }),
  }));
}

export interface AffixSpec {
  readonly id: string;
  readonly group: string;
  readonly type: AffixType;
  readonly name: string;
  readonly stats: readonly StatId[];
  readonly allowed: readonly ItemType[];
  readonly weight?: number;
  /** ハイブリッド: 各statにbudget×0.6、Legendary以上限定(仕様 §8)。 */
  readonly hybrid?: boolean;
}

export function makeAffix(spec: AffixSpec): AffixDefinition {
  return {
    id: spec.id,
    group: spec.group,
    type: spec.type,
    name: spec.name,
    weight: spec.weight ?? 100,
    allowedItemTypes: spec.allowed,
    tiers: buildTiers(spec.stats, spec.hybrid ? GAME_CONSTANTS.hybridBudgetRatio : 1),
    ...(spec.hybrid ? { minRarity: 'legendary' as const } : {}),
  };
}

/**
 * 装備タイプ別バリアント展開ヘルパ。
 * variants の各要素 [接尾キー, 許可タイプ] ごとに1アフィックスを生成する。
 * 同一 stat のバリアントは同じ group を共有する(グループ排他)。
 */
export function makeVariants(
  base: Omit<AffixSpec, 'allowed' | 'id'> & { idBase: string },
  variants: readonly (readonly [string, readonly ItemType[]])[],
): AffixDefinition[] {
  return variants.map(([key, allowed]) =>
    makeAffix({
      id: `${base.idBase}_${key}`,
      group: base.group,
      type: base.type,
      name: base.name,
      stats: base.stats,
      allowed,
      ...(base.weight !== undefined ? { weight: base.weight } : {}),
      ...(base.hybrid !== undefined ? { hybrid: base.hybrid } : {}),
    }),
  );
}
