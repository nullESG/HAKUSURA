/**
 * クラフトシステム(仕様 §5 のクラフト。オーブ方式)。
 *
 * 5 種のクラフト操作を純粋関数として提供する。UI・所持通貨の消費は呼び出し側
 * (ストア層)の責務で、ここでは「アイテムがどう変化するか」だけを扱う。
 * コスト表は src/data/economy.ts に置く。
 *
 * 操作対象の制限(仮定):
 * - unique / set は固定アフィックスのため「値の再ロール」のみ可能
 * - アフィックス追加はレアリティ規定の最大個数まで
 * - 除去でレアリティ規定の最小個数を下回ることは許容(クラフト中間状態)
 */
import type { DropMasterData } from '../drops/dropGenerator';
import { rollAffixes, rollAffixValues } from '../drops/dropGenerator';
import type { GameRandom } from '../rng/gameRandom';
import type { RolledAffix } from '../types/affix';
import type { Rarity } from '../types/enums';
import type { ItemInstance } from '../types/item';

/** クラフト操作の種類。 */
export const CRAFT_OPERATIONS = [
  'reroll_affixes', // 混沌: アフィックスを個数から全て再ロール
  'add_affix', // 高貴: アフィックスを1つ追加
  'reroll_values', // 神聖: Tier を保ったまま値のみ再ロール
  'upgrade_rarity', // 昇華: レアリティを1段階上げ、不足アフィックスを補充
  'remove_affix', // 消去: ランダムに1つ除去
] as const;
export type CraftOperation = (typeof CRAFT_OPERATIONS)[number];

export type CraftFailReason =
  | 'unique_immutable' // unique/set には値再ロール以外は使えない
  | 'no_affixes' // 対象アフィックスがない
  | 'affixes_full' // これ以上追加できない
  | 'no_affix_available' // プールが尽きて追加できるアフィックスがない
  | 'rarity_cap' // これ以上レアリティを上げられない
  | 'not_craftable'; // このレアリティには適用できない

export type CraftResult =
  | { readonly ok: true; readonly item: ItemInstance }
  | { readonly ok: false; readonly reason: CraftFailReason };

const fail = (reason: CraftFailReason): CraftResult => ({ ok: false, reason });

/** unique / set 以外の「クラフトでレアリティ操作できる」階層(common〜legendary)。 */
const NORMAL_RARITIES: readonly Rarity[] = ['common', 'magic', 'rare', 'epic', 'legendary'];

function isUniqueLike(item: ItemInstance): boolean {
  return item.uniqueId !== undefined;
}

/** アフィックスを個数決定からやり直して全て再ロールする。 */
function rerollAffixes(rng: GameRandom, item: ItemInstance, data: DropMasterData): CraftResult {
  if (isUniqueLike(item)) return fail('unique_immutable');
  const range = data.affixCountByRarity[item.rarity];
  if (range.max === 0) return fail('not_craftable');
  const base = data.baseItems.find((b) => b.id === item.baseItemId);
  if (!base) throw new Error(`Unknown baseItemId: ${item.baseItemId}`);
  const count = range.max > range.min ? rng.nextIntInRange(range.min, range.max) : range.min;
  const affixes = rollAffixes(
    rng,
    { itemType: base.itemType, rarity: item.rarity, itemLevel: item.itemLevel, existing: [], count },
    data,
  );
  return { ok: true, item: { ...item, affixes } };
}

/** アフィックスを1つ追加する(レアリティ規定の最大個数まで)。 */
function addAffix(rng: GameRandom, item: ItemInstance, data: DropMasterData): CraftResult {
  if (isUniqueLike(item)) return fail('unique_immutable');
  const range = data.affixCountByRarity[item.rarity];
  if (range.max === 0) return fail('not_craftable');
  if (item.affixes.length >= range.max) return fail('affixes_full');
  const base = data.baseItems.find((b) => b.id === item.baseItemId);
  if (!base) throw new Error(`Unknown baseItemId: ${item.baseItemId}`);
  const added = rollAffixes(
    rng,
    {
      itemType: base.itemType,
      rarity: item.rarity,
      itemLevel: item.itemLevel,
      existing: item.affixes,
      count: 1,
    },
    data,
  );
  if (added.length === 0) return fail('no_affix_available');
  return { ok: true, item: { ...item, affixes: [...item.affixes, ...added] } };
}

/** Tier を保ったまま全アフィックスの値だけ再ロールする(unique/set にも使える)。 */
function rerollValues(rng: GameRandom, item: ItemInstance, data: DropMasterData): CraftResult {
  if (item.affixes.length === 0) return fail('no_affixes');
  const affixById = new Map(data.affixes.map((a) => [a.id, a]));
  const affixes: RolledAffix[] = item.affixes.map((rolled) => {
    const def = affixById.get(rolled.affixId);
    const tierDef = def?.tiers.find((t) => t.tier === rolled.tier);
    if (!def || !tierDef) throw new Error(`Unknown affix ${rolled.affixId} T${rolled.tier}`);
    return { ...rolled, values: rollAffixValues(rng, tierDef) };
  });
  return { ok: true, item: { ...item, affixes } };
}

/** レアリティを1段階上げ、新レアリティの個数規定までアフィックスを補充する。 */
function upgradeRarity(rng: GameRandom, item: ItemInstance, data: DropMasterData): CraftResult {
  if (isUniqueLike(item)) return fail('unique_immutable');
  const rank = NORMAL_RARITIES.indexOf(item.rarity);
  if (rank < 0) return fail('not_craftable');
  if (rank >= NORMAL_RARITIES.length - 1) return fail('rarity_cap');
  const nextRarity = NORMAL_RARITIES[rank + 1]!;
  const range = data.affixCountByRarity[nextRarity];
  const target = Math.max(
    item.affixes.length,
    range.max > range.min ? rng.nextIntInRange(range.min, range.max) : range.min,
  );
  const base = data.baseItems.find((b) => b.id === item.baseItemId);
  if (!base) throw new Error(`Unknown baseItemId: ${item.baseItemId}`);
  const added = rollAffixes(
    rng,
    {
      itemType: base.itemType,
      rarity: nextRarity,
      itemLevel: item.itemLevel,
      existing: item.affixes,
      count: target - item.affixes.length,
    },
    data,
  );
  return {
    ok: true,
    item: { ...item, rarity: nextRarity, affixes: [...item.affixes, ...added] },
  };
}

/** ランダムにアフィックスを1つ除去する。 */
function removeAffix(rng: GameRandom, item: ItemInstance): CraftResult {
  if (isUniqueLike(item)) return fail('unique_immutable');
  if (item.affixes.length === 0) return fail('no_affixes');
  const index = rng.nextInt(item.affixes.length);
  const affixes = item.affixes.filter((_, i) => i !== index);
  return { ok: true, item: { ...item, affixes } };
}

/**
 * クラフト操作のエントリポイント。
 * 成功時は同一 instanceId のまま変化後のアイテムを返す(不変データとして新規生成)。
 */
export function craftItem(
  rng: GameRandom,
  item: ItemInstance,
  operation: CraftOperation,
  data: DropMasterData,
): CraftResult {
  switch (operation) {
    case 'reroll_affixes':
      return rerollAffixes(rng, item, data);
    case 'add_affix':
      return addAffix(rng, item, data);
    case 'reroll_values':
      return rerollValues(rng, item, data);
    case 'upgrade_rarity':
      return upgradeRarity(rng, item, data);
    case 'remove_affix':
      return removeAffix(rng, item);
  }
}

/** クラフト昇格の次のレアリティ(昇格不能なら undefined)。UI の事前判定用。 */
export function nextCraftableRarity(rarity: Rarity): Rarity | undefined {
  const rank = NORMAL_RARITIES.indexOf(rarity);
  if (rank < 0 || rank >= NORMAL_RARITIES.length - 1) return undefined;
  return NORMAL_RARITIES[rank + 1];
}
