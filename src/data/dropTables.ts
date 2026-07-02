import type { DropTables } from '../core/drops/dropGenerator';
import { AFFIX_BY_ID, ALL_AFFIXES } from './affixes';
import { BASE_ITEMS, BASE_ITEM_BY_ID } from './baseItems';
import { RARITY_TABLE } from './rarities';
import { SET_PIECES } from './sets';
import { UNIQUE_ITEMS } from './uniques';

/** 本番用のドロップテーブル一式を組み立てる。 */
export function buildDropTables(): DropTables {
  return {
    affixes: ALL_AFFIXES,
    affixById: AFFIX_BY_ID,
    baseItems: BASE_ITEMS,
    baseItemById: BASE_ITEM_BY_ID,
    uniques: UNIQUE_ITEMS,
    setPieces: SET_PIECES,
    rarityTable: RARITY_TABLE,
  };
}
