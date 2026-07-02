import type { CraftOperation } from '../core/craft/crafting';

/**
 * クラフトコスト表(仮置き。仕様に数値指定がないためブロックB報告参照)。
 * 消費処理はストア層(ブロックC/D)が行い、core のクラフト関数は関与しない。
 * コストはアイテムレベルに比例してスケールする: cost = base * (1 + iLvl / 10)
 */
export const CRAFT_BASE_GOLD_COSTS: Readonly<Record<CraftOperation, number>> = {
  reroll_affixes: 200,
  add_affix: 500,
  reroll_values: 150,
  upgrade_rarity: 400,
  remove_affix: 100,
};

/** アイテムレベルを加味した実コスト。 */
export function craftGoldCost(operation: CraftOperation, itemLevel: number): number {
  return Math.floor(CRAFT_BASE_GOLD_COSTS[operation] * (1 + Math.max(0, itemLevel) / 10));
}
