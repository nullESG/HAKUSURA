/**
 * セットボーナス解決(仕様 §5-6)。
 * 装備中アイテムからセットごとの部位数を数え、達成済みの段階ボーナスを合算する。
 * 結果の StatMap は statCalculator の mods にそのまま合成できる。
 */
import type { StatMap } from '../types/enums';
import type { ItemInstance, ItemSetDefinition } from '../types/item';
import { mergeStatMaps } from './statCalculator';

export interface ResolvedSetBonuses {
  /** 達成済みボーナスの数値合計。 */
  readonly stats: StatMap;
  /** 達成済みボーナスの特殊効果 ID(戦闘エンジンが解釈)。 */
  readonly specialEffectIds: readonly string[];
  /** セット ID → 装備中の部位数(UI 表示用)。 */
  readonly equippedPieces: Readonly<Record<string, number>>;
}

export function resolveSetBonuses(
  equipped: readonly ItemInstance[],
  sets: readonly ItemSetDefinition[],
): ResolvedSetBonuses {
  // 同一部位を複数装備しても 1 部位として数える(uniqueId で重複排除)
  const piecesBySet = new Map<string, Set<string>>();
  for (const item of equipped) {
    if (item.rarity !== 'set' || !item.setId || !item.uniqueId) continue;
    const pieces = piecesBySet.get(item.setId) ?? new Set<string>();
    pieces.add(item.uniqueId);
    piecesBySet.set(item.setId, pieces);
  }

  const statMaps: StatMap[] = [];
  const specialEffectIds: string[] = [];
  const equippedPieces: Record<string, number> = {};
  for (const set of sets) {
    const count = piecesBySet.get(set.id)?.size ?? 0;
    if (count === 0) continue;
    equippedPieces[set.id] = count;
    for (const bonus of set.bonuses) {
      if (count < bonus.requiredPieces) continue;
      statMaps.push(bonus.stats);
      if (bonus.specialEffectId) specialEffectIds.push(bonus.specialEffectId);
    }
  }
  return { stats: mergeStatMaps(...statMaps), specialEffectIds, equippedPieces };
}
