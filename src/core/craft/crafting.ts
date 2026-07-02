/**
 * クラフト通貨アイテム(仕様 §5-8、PoE式)。
 * - 転送のオーブ: Common→Magic化
 * - 錬金のオーブ: Common→Rare化
 * - 混沌のオーブ: Rareのアフィックスを全再ロール
 * - 祝福のオーブ: 既存アフィックスの数値を再ロール
 * すべて純粋関数。元の ItemInstance は変更せず新しいインスタンスを返す。
 */
import type { DropTables } from '../drops/dropGenerator';
import type { ItemInstance } from '../types';
import type { GameRandom } from '../rng/gameRandom';
import { rollAffixSet, rollTierValues } from '../drops/affixRoller';

export type CraftOrbId = 'orb_transmute' | 'orb_alchemy' | 'orb_chaos' | 'orb_blessed';

export interface CraftOrbDefinition {
  readonly id: CraftOrbId;
  readonly name: string;
  readonly description: string;
}

/** クラフト通貨の定義(表示用データ)。 */
export const CRAFT_ORBS: readonly CraftOrbDefinition[] = [
  { id: 'orb_transmute', name: '転送のオーブ', description: 'コモン装備をマジックに変質させる' },
  { id: 'orb_alchemy', name: '錬金のオーブ', description: 'コモン装備をレアに変質させる' },
  { id: 'orb_chaos', name: '混沌のオーブ', description: 'レア装備のアフィックスをすべて再抽選する' },
  { id: 'orb_blessed', name: '祝福のオーブ', description: 'アフィックスの数値を再ロールする' },
];

export class CraftError extends Error {}

interface CraftCtx {
  readonly rng: GameRandom;
  readonly tables: DropTables;
}

function rerollAffixes(item: ItemInstance, count: number, ctx: CraftCtx): ItemInstance {
  const base = ctx.tables.baseItemById.get(item.baseItemId);
  if (!base) throw new CraftError(`unknown base item: ${item.baseItemId}`);
  const affixes = rollAffixSet({
    pool: ctx.tables.affixes,
    itemType: base.itemType,
    itemLevel: item.itemLevel,
    rarity: item.rarity,
    count,
    rng: ctx.rng,
  });
  return { ...item, affixes };
}

function assertCraftable(item: ItemInstance): void {
  if (item.uniqueId !== undefined || item.setId !== undefined) {
    throw new CraftError('ユニーク/セット装備はクラフトできない');
  }
}

/** 転送のオーブ: Common → Magic(アフィックス1〜2)。 */
export function applyTransmute(item: ItemInstance, ctx: CraftCtx): ItemInstance {
  assertCraftable(item);
  if (item.rarity !== 'common') throw new CraftError('転送のオーブはコモンにのみ使用できる');
  const rule = ctx.tables.rarityTable.magic;
  const upgraded: ItemInstance = { ...item, rarity: 'magic' };
  return rerollAffixes(upgraded, ctx.rng.nextIntInRange(rule.affixMin, rule.affixMax), ctx);
}

/** 錬金のオーブ: Common → Rare(アフィックス3〜5)。 */
export function applyAlchemy(item: ItemInstance, ctx: CraftCtx): ItemInstance {
  assertCraftable(item);
  if (item.rarity !== 'common') throw new CraftError('錬金のオーブはコモンにのみ使用できる');
  const rule = ctx.tables.rarityTable.rare;
  const upgraded: ItemInstance = { ...item, rarity: 'rare' };
  return rerollAffixes(upgraded, ctx.rng.nextIntInRange(rule.affixMin, rule.affixMax), ctx);
}

/** 混沌のオーブ: Rare のアフィックスを全再ロール。 */
export function applyChaos(item: ItemInstance, ctx: CraftCtx): ItemInstance {
  assertCraftable(item);
  if (item.rarity !== 'rare') throw new CraftError('混沌のオーブはレアにのみ使用できる');
  const rule = ctx.tables.rarityTable.rare;
  return rerollAffixes(item, ctx.rng.nextIntInRange(rule.affixMin, rule.affixMax), ctx);
}

/** 祝福のオーブ: アフィックス構成(id/Tier)を保ったまま数値のみ再ロール。 */
export function applyBlessed(item: ItemInstance, ctx: CraftCtx): ItemInstance {
  if (item.affixes.length === 0) throw new CraftError('アフィックスのない装備には使用できない');
  const affixes = item.affixes.map((rolled) => {
    const def = ctx.tables.affixById.get(rolled.affixId);
    if (!def) throw new CraftError(`unknown affix: ${rolled.affixId}`);
    const tierDef = def.tiers.find((t) => t.tier === rolled.tier);
    if (!tierDef) throw new CraftError(`affix ${rolled.affixId} has no tier ${rolled.tier}`);
    return { ...rolled, values: rollTierValues(tierDef, ctx.rng) };
  });
  return { ...item, affixes };
}

/** オーブIDから適用関数を引く。 */
export function applyOrb(orb: CraftOrbId, item: ItemInstance, ctx: CraftCtx): ItemInstance {
  switch (orb) {
    case 'orb_transmute':
      return applyTransmute(item, ctx);
    case 'orb_alchemy':
      return applyAlchemy(item, ctx);
    case 'orb_chaos':
      return applyChaos(item, ctx);
    case 'orb_blessed':
      return applyBlessed(item, ctx);
  }
}
