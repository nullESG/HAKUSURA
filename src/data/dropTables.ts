import type { Rarity } from '../core/types/enums';

/**
 * ドロップテーブル(仕様 §5-1, §5-2)。
 * レアリティ出現重みと付与アフィックス個数。数値は仕様に明記がないため
 * 仮置き(ブロックB報告参照)。バランス調整はこのファイルだけで完結する。
 */

/** レアリティ抽選の基礎重み(仕様 §5-1 の階層順)。 */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 100,
  magic: 60,
  rare: 20,
  epic: 6,
  legendary: 2,
  unique: 0.8,
  set: 0.4,
};

/** レアリティごとの付与アフィックス個数(min〜max を等確率でロール)。 */
export const AFFIX_COUNT_BY_RARITY: Readonly<Record<Rarity, { min: number; max: number }>> = {
  common: { min: 0, max: 0 },
  magic: { min: 1, max: 2 },
  rare: { min: 3, max: 4 },
  epic: { min: 4, max: 5 },
  legendary: { min: 5, max: 6 },
  // unique / set は定義側の fixedAffixes を使うため 0
  unique: { min: 0, max: 0 },
  set: { min: 0, max: 0 },
};

/**
 * ユニーク/セット当選時に対象ベースの定義が存在しない場合の降格先。
 * レアリティ階層(§5-1)を 1 段ずつ下る。
 */
export const RARITY_DOWNGRADE: Readonly<Partial<Record<Rarity, Rarity>>> = {
  set: 'unique',
  unique: 'legendary',
};
