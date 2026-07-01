import type { DropMasterData } from '../core/drops/dropGenerator';
import { AFFIX_DEFINITIONS } from './affixes';
import { BASE_ITEM_DEFINITIONS } from './baseItems';
import { AFFIX_COUNT_BY_RARITY, RARITY_DOWNGRADE, RARITY_WEIGHTS } from './dropTables';
import { ITEM_SET_DEFINITIONS, UNIQUE_ITEM_DEFINITIONS } from './uniques';

/** 本番用マスタデータ一式。core 層の生成器・クラフトへ注入する。 */
export const MASTER_DATA: DropMasterData = {
  baseItems: BASE_ITEM_DEFINITIONS,
  affixes: AFFIX_DEFINITIONS,
  uniques: UNIQUE_ITEM_DEFINITIONS,
  sets: ITEM_SET_DEFINITIONS,
  rarityWeights: RARITY_WEIGHTS,
  affixCountByRarity: AFFIX_COUNT_BY_RARITY,
  rarityDowngrade: RARITY_DOWNGRADE,
};
