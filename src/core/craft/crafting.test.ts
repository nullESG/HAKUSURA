import { describe, expect, it } from 'vitest';
import { MASTER_DATA } from '../../data';
import { getAffixById } from '../../data/affixes';
import { craftGoldCost } from '../../data/economy';
import { GAME_CONSTANTS } from '../constants';
import { generateItem, instantiateUnique } from '../drops/dropGenerator';
import { GameRandom } from '../rng/gameRandom';
import type { ItemInstance } from '../types/item';
import { craftItem, nextCraftableRarity } from './crafting';

const C = GAME_CONSTANTS;

/** 指定レアリティのアイテムが出るまで生成する(テスト用)。 */
function generateWithRarity(rng: GameRandom, rarity: ItemInstance['rarity']): ItemInstance {
  for (let i = 0; i < 100000; i++) {
    const item = generateItem(rng, { itemLevel: 60, magicFindPct: 200 }, MASTER_DATA);
    if (item.rarity === rarity) return item;
  }
  throw new Error(`rarity ${rarity} が出なかった`);
}

describe('クラフトシステム(仕様 §5)', () => {
  it('reroll_affixes: レアリティと instanceId を保ったままアフィックスが再ロールされる', () => {
    const rng = new GameRandom(100);
    const item = generateWithRarity(rng, 'rare');
    const result = craftItem(rng, item, 'reroll_affixes', MASTER_DATA);
    if (!result.ok) throw new Error(result.reason);
    expect(result.item.instanceId).toBe(item.instanceId);
    expect(result.item.rarity).toBe(item.rarity);
    expect(result.item.baseItemId).toBe(item.baseItemId);
    const range = MASTER_DATA.affixCountByRarity.rare;
    expect(result.item.affixes.length).toBeGreaterThanOrEqual(range.min);
    expect(result.item.affixes.length).toBeLessThanOrEqual(range.max);
  });

  it('add_affix: 1つ増え、上限到達で affixes_full になる', () => {
    const rng = new GameRandom(200);
    let item = generateWithRarity(rng, 'magic');
    const max = MASTER_DATA.affixCountByRarity.magic.max;
    while (item.affixes.length < max) {
      const result = craftItem(rng, item, 'add_affix', MASTER_DATA);
      if (!result.ok) throw new Error(result.reason);
      expect(result.item.affixes.length).toBe(item.affixes.length + 1);
      item = result.item;
    }
    const full = craftItem(rng, item, 'add_affix', MASTER_DATA);
    expect(full).toEqual({ ok: false, reason: 'affixes_full' });
  });

  it('add_affix: 既存とグループが重複しない', () => {
    const rng = new GameRandom(300);
    for (let i = 0; i < 30; i++) {
      const item = generateWithRarity(rng, 'magic');
      const result = craftItem(rng, item, 'add_affix', MASTER_DATA);
      if (!result.ok) continue;
      const groups = result.item.affixes.map((a) => getAffixById(a.affixId).group);
      expect(new Set(groups).size).toBe(groups.length);
    }
  });

  it('reroll_values: affixId と Tier は不変で値だけ変わり、レンジ内に収まる', () => {
    const rng = new GameRandom(400);
    const item = generateWithRarity(rng, 'epic');
    const result = craftItem(rng, item, 'reroll_values', MASTER_DATA);
    if (!result.ok) throw new Error(result.reason);
    expect(result.item.affixes.map((a) => [a.affixId, a.tier])).toEqual(
      item.affixes.map((a) => [a.affixId, a.tier]),
    );
    for (const rolled of result.item.affixes) {
      const tierDef = getAffixById(rolled.affixId).tiers.find((t) => t.tier === rolled.tier)!;
      for (const range of tierDef.stats) {
        expect(rolled.values[range.stat]!).toBeGreaterThanOrEqual(range.min - 1e-9);
        expect(rolled.values[range.stat]!).toBeLessThanOrEqual(range.max + 1e-9);
      }
    }
  });

  it('upgrade_rarity: common→magic→rare→epic→legendary と昇格し、個数規定を満たす', () => {
    const rng = new GameRandom(500);
    let item = generateWithRarity(rng, 'common');
    const chain = ['magic', 'rare', 'epic', 'legendary'] as const;
    for (const expected of chain) {
      expect(nextCraftableRarity(item.rarity)).toBe(expected);
      const result = craftItem(rng, item, 'upgrade_rarity', MASTER_DATA);
      if (!result.ok) throw new Error(result.reason);
      item = result.item;
      expect(item.rarity).toBe(expected);
      expect(item.affixes.length).toBeGreaterThanOrEqual(
        MASTER_DATA.affixCountByRarity[expected].min,
      );
      expect(item.affixes.length).toBeLessThanOrEqual(C.maxPrefixes + C.maxSuffixes);
    }
    const capped = craftItem(rng, item, 'upgrade_rarity', MASTER_DATA);
    expect(capped).toEqual({ ok: false, reason: 'rarity_cap' });
    expect(nextCraftableRarity('legendary')).toBeUndefined();
  });

  it('remove_affix: 1つ減り、0個で no_affixes になる', () => {
    const rng = new GameRandom(600);
    let item = generateWithRarity(rng, 'magic');
    while (item.affixes.length > 0) {
      const result = craftItem(rng, item, 'remove_affix', MASTER_DATA);
      if (!result.ok) throw new Error(result.reason);
      expect(result.item.affixes.length).toBe(item.affixes.length - 1);
      item = result.item;
    }
    expect(craftItem(rng, item, 'remove_affix', MASTER_DATA)).toEqual({
      ok: false,
      reason: 'no_affixes',
    });
  });

  it('unique/set には値の再ロールだけが許され、他は unique_immutable', () => {
    const rng = new GameRandom(700);
    const unique = instantiateUnique(
      rng,
      MASTER_DATA.uniques.find((u) => u.id === 'flame_cleaver')!,
      60,
      MASTER_DATA,
    );
    for (const op of ['reroll_affixes', 'add_affix', 'upgrade_rarity', 'remove_affix'] as const) {
      expect(craftItem(rng, unique, op, MASTER_DATA)).toEqual({
        ok: false,
        reason: 'unique_immutable',
      });
    }
    const rerolled = craftItem(rng, unique, 'reroll_values', MASTER_DATA);
    expect(rerolled.ok).toBe(true);
    if (rerolled.ok) {
      expect(rerolled.item.uniqueId).toBe('flame_cleaver');
      expect(rerolled.item.affixes.map((a) => a.tier)).toEqual(unique.affixes.map((a) => a.tier));
    }
  });

  it('同一シード・同一アイテムなら結果が再現される(決定論)', () => {
    const item = generateWithRarity(new GameRandom(800), 'rare');
    const a = craftItem(new GameRandom(9), item, 'reroll_affixes', MASTER_DATA);
    const b = craftItem(new GameRandom(9), item, 'reroll_affixes', MASTER_DATA);
    expect(a).toEqual(b);
  });

  it('クラフトコストは iLvl に比例して増える', () => {
    expect(craftGoldCost('reroll_affixes', 0)).toBe(200);
    expect(craftGoldCost('reroll_affixes', 50)).toBe(1200);
    expect(craftGoldCost('add_affix', 10)).toBe(1000);
    expect(craftGoldCost('remove_affix', -5)).toBe(100);
  });
});
