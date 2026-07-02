import type { Rarity } from '../core/types';

export { rarityOrder } from '../core/drops/affixRoller';

/** レアリティごとのドロップ重み・アフィックス数(仕様 §5-1)。 */
export interface RarityRule {
  readonly weight: number;
  readonly affixMin: number;
  readonly affixMax: number;
  /** magicFind の重み補正対象か(仕様 §5-7「レア以上」)。 */
  readonly boostedByMagicFind: boolean;
}

export const RARITY_TABLE: Readonly<Record<Rarity, RarityRule>> = {
  common: { weight: 1000, affixMin: 0, affixMax: 0, boostedByMagicFind: false },
  magic: { weight: 400, affixMin: 1, affixMax: 2, boostedByMagicFind: false },
  rare: { weight: 120, affixMin: 3, affixMax: 5, boostedByMagicFind: true },
  epic: { weight: 30, affixMin: 5, affixMax: 6, boostedByMagicFind: true },
  // 仕様は Legendary 6〜7 だが prefix3+suffix3=6 が上限のため 6 で頭打ち(仮定)
  legendary: { weight: 6, affixMin: 6, affixMax: 6, boostedByMagicFind: true },
  unique: { weight: 1, affixMin: 0, affixMax: 0, boostedByMagicFind: true },
  set: { weight: 1, affixMin: 0, affixMax: 0, boostedByMagicFind: true },
};
