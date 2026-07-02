import { describe, expect, it } from 'vitest';
import { MASTER_DATA } from '../../data';
import { getAffixById } from '../../data/affixes';
import { getBaseItemById } from '../../data/baseItems';
import { GAME_CONSTANTS } from '../constants';
import { GameRandom } from '../rng/gameRandom';
import { RARITIES } from '../types/enums';
import type { ItemInstance } from '../types/item';
import {
  applyMagicFindToWeights,
  generateItem,
  instantiateUnique,
  rarityRank,
  rollAffixes,
  rollAffixTier,
} from './dropGenerator';

const C = GAME_CONSTANTS;

/** テスト用にまとめて生成する。 */
function generateMany(seed: number, count: number, itemLevel: number, mf = 0): ItemInstance[] {
  const rng = new GameRandom(seed);
  return Array.from({ length: count }, () =>
    generateItem(rng, { itemLevel, magicFindPct: mf }, MASTER_DATA),
  );
}

describe('ドロップ生成器(仕様 §5-7)', () => {
  it('同一シードから同一のドロップ列が再現される(決定論)', () => {
    const a = generateMany(12345, 200, 50);
    const b = generateMany(12345, 200, 50);
    expect(a).toEqual(b);
  });

  it('異なるシードでは異なるドロップ列になる', () => {
    const a = generateMany(1, 50, 50);
    const b = generateMany(2, 50, 50);
    expect(a).not.toEqual(b);
  });

  it('インスタンスIDは重複しない', () => {
    const items = generateMany(777, 500, 50);
    const ids = new Set(items.map((i) => i.instanceId));
    expect(ids.size).toBe(items.length);
  });

  it('ベースアイテムは iLvl 制限を満たす', () => {
    for (const item of generateMany(42, 300, 5)) {
      expect(getBaseItemById(item.baseItemId).minILvl).toBeLessThanOrEqual(5);
    }
  });

  it('アフィックス個数がレアリティごとの規定範囲に収まる', () => {
    const items = generateMany(999, 1000, 85);
    for (const item of items) {
      if (item.uniqueId) continue; // ユニーク/セットは fixedAffixes 準拠
      const range = MASTER_DATA.affixCountByRarity[item.rarity];
      expect(item.affixes.length).toBeGreaterThanOrEqual(range.min);
      expect(item.affixes.length).toBeLessThanOrEqual(range.max);
    }
    // 高 iLvl・大量生成なら全通常レアリティが一度は出る
    const seen = new Set(items.map((i) => i.rarity));
    for (const rarity of ['common', 'magic', 'rare', 'epic', 'legendary'] as const) {
      expect(seen.has(rarity), `${rarity} が一度も出ていない`).toBe(true);
    }
  });

  it('付与アフィックスが部位制限・グループ排他・Prefix/Suffix上限・Tier iLvl制限を満たす', () => {
    for (const item of generateMany(31337, 600, 60)) {
      const base = getBaseItemById(item.baseItemId);
      const groups = new Set<string>();
      let prefixes = 0;
      let suffixes = 0;
      for (const rolled of item.affixes) {
        const def = getAffixById(rolled.affixId);
        if (!item.uniqueId) {
          expect(def.allowedItemTypes).toContain(base.itemType);
          if (def.minRarity) {
            expect(rarityRank(item.rarity)).toBeGreaterThanOrEqual(rarityRank(def.minRarity));
          }
        }
        expect(groups.has(def.group), `グループ重複: ${def.group}`).toBe(false);
        groups.add(def.group);
        if (def.type === 'prefix') prefixes++;
        else suffixes++;

        const tierDef = def.tiers.find((t) => t.tier === rolled.tier)!;
        if (!item.uniqueId) {
          expect(tierDef.minILvl).toBeLessThanOrEqual(item.itemLevel);
        }
        // ロール値が Tier レンジ内
        for (const range of tierDef.stats) {
          const value = rolled.values[range.stat];
          expect(value).toBeDefined();
          expect(value!).toBeGreaterThanOrEqual(range.min - 1e-9);
          expect(value!).toBeLessThanOrEqual(range.max + 1e-9);
        }
        expect(Object.keys(rolled.values).length).toBe(tierDef.stats.length);
      }
      expect(prefixes).toBeLessThanOrEqual(C.maxPrefixes);
      expect(suffixes).toBeLessThanOrEqual(C.maxSuffixes);
    }
  });

  it('低 iLvl では高 Tier のアフィックスが出ない(§8)', () => {
    for (const item of generateMany(555, 400, 1)) {
      for (const rolled of item.affixes) {
        if (item.uniqueId) continue;
        expect(rolled.tier).toBe(1); // iLvl 1 では T1(minILvl 0)のみ
      }
    }
  });

  it('Magic Find で common 率が下がり、他レアリティの相対重みは不変', () => {
    const boosted = applyMagicFindToWeights(MASTER_DATA.rarityWeights, 100);
    expect(boosted.common).toBe(MASTER_DATA.rarityWeights.common);
    expect(boosted.rare).toBeCloseTo(MASTER_DATA.rarityWeights.rare * 2, 10);
    // 負の MF は 0 扱い
    const negative = applyMagicFindToWeights(MASTER_DATA.rarityWeights, -50);
    expect(negative.magic).toBe(MASTER_DATA.rarityWeights.magic);

    // 統計的検証: MF 300% で common 率が明確に下がる
    const noMf = generateMany(2024, 2000, 50, 0);
    const highMf = generateMany(2024, 2000, 50, 300);
    const commonRate = (items: ItemInstance[]): number =>
      items.filter((i) => i.rarity === 'common').length / items.length;
    expect(commonRate(highMf)).toBeLessThan(commonRate(noMf));
  });

  it('ユニーク/セットが正しく生成される(固定アフィックス・ID参照・レアリティ)', () => {
    const items = generateMany(9000, 5000, 85, 500);
    const uniques = items.filter((i) => i.rarity === 'unique');
    const sets = items.filter((i) => i.rarity === 'set');
    expect(uniques.length).toBeGreaterThan(0);
    expect(sets.length).toBeGreaterThan(0);
    for (const item of [...uniques, ...sets]) {
      expect(item.uniqueId).toBeDefined();
      const def = MASTER_DATA.uniques.find((u) => u.id === item.uniqueId)!;
      expect(def).toBeDefined();
      expect(item.baseItemId).toBe(def.baseItemId);
      expect(item.affixes.map((a) => ({ affixId: a.affixId, tier: a.tier }))).toEqual(
        def.fixedAffixes.map((f) => ({ affixId: f.affixId, tier: f.tier })),
      );
      if (item.rarity === 'set') {
        expect(item.setId).toBeDefined();
        expect(
          MASTER_DATA.sets.find((s) => s.id === item.setId)?.pieceIds,
        ).toContain(item.uniqueId);
      } else {
        expect(item.setId).toBeUndefined();
      }
    }
  });

  it('instantiateUnique は固定 Tier で値のみロールする', () => {
    const rng = new GameRandom(1);
    const def = MASTER_DATA.uniques.find((u) => u.id === 'titan_heart')!;
    const item = instantiateUnique(rng, def, 85, MASTER_DATA);
    expect(item.rarity).toBe('unique');
    expect(item.uniqueId).toBe('titan_heart');
    for (const [i, rolled] of item.affixes.entries()) {
      expect(rolled.tier).toBe(def.fixedAffixes[i]!.tier);
    }
  });

  it('rollAffixes は既存アフィックスのグループを避けて追加する(クラフト用)', () => {
    const rng = new GameRandom(7);
    const first = rollAffixes(
      rng,
      { itemType: 'weapon1h', rarity: 'rare', itemLevel: 50, existing: [], count: 3 },
      MASTER_DATA,
    );
    expect(first.length).toBe(3);
    const added = rollAffixes(
      rng,
      { itemType: 'weapon1h', rarity: 'rare', itemLevel: 50, existing: first, count: 3 },
      MASTER_DATA,
    );
    const allGroups = [...first, ...added].map((r) => getAffixById(r.affixId).group);
    expect(new Set(allGroups).size).toBe(allGroups.length);
    expect(first.length + added.length).toBeLessThanOrEqual(C.maxPrefixes + C.maxSuffixes);
  });

  it('rollAffixTier は iLvl 超過 Tier を返さない', () => {
    const rng = new GameRandom(3);
    const def = getAffixById('hp_flat');
    for (let i = 0; i < 200; i++) {
      expect(rollAffixTier(rng, def, 20).minILvl).toBeLessThanOrEqual(20);
    }
  });

  it('レアリティ序列が RARITIES の定義順に一致する', () => {
    expect(rarityRank('common')).toBe(0);
    expect(rarityRank('set')).toBe(RARITIES.length - 1);
    expect(rarityRank('legendary')).toBeLessThan(rarityRank('unique'));
  });
});
