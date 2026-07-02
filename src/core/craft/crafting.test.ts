import { describe, expect, it } from 'vitest';
import { AFFIX_BY_ID } from '../../data/affixes';
import { buildDropTables } from '../../data/dropTables';
import type { ItemInstance } from '../types';
import { GameRandom } from '../rng/gameRandom';
import {
  applyAlchemy,
  applyBlessed,
  applyChaos,
  applyTransmute,
  CraftError,
} from './crafting';

const tables = buildDropTables();

const commonItem: ItemInstance = {
  instanceId: 'i1',
  baseItemId: 'base_weapon1h_0_0',
  rarity: 'common',
  itemLevel: 50,
  affixes: [],
};

function ctx(seed: number) {
  return { rng: new GameRandom(seed), tables };
}

describe('クラフト通貨(仕様 §5-8)', () => {
  it('転送のオーブ: Common→Magic、アフィックス1〜2', () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = applyTransmute(commonItem, ctx(seed));
      expect(result.rarity).toBe('magic');
      expect(result.affixes.length).toBeGreaterThanOrEqual(1);
      expect(result.affixes.length).toBeLessThanOrEqual(2);
      expect(result.baseItemId).toBe(commonItem.baseItemId);
      expect(result.itemLevel).toBe(commonItem.itemLevel);
    }
    expect(commonItem.rarity).toBe('common'); // 元は不変
  });

  it('錬金のオーブ: Common→Rare、アフィックス3〜5', () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = applyAlchemy(commonItem, ctx(seed));
      expect(result.rarity).toBe('rare');
      expect(result.affixes.length).toBeGreaterThanOrEqual(3);
      expect(result.affixes.length).toBeLessThanOrEqual(5);
    }
  });

  it('混沌のオーブ: Rare のアフィックスを全再ロール(構成が変わり得る)', () => {
    const rare = applyAlchemy(commonItem, ctx(1));
    const rerolled = applyChaos(rare, ctx(99));
    expect(rerolled.rarity).toBe('rare');
    expect(rerolled.affixes.length).toBeGreaterThanOrEqual(3);
    expect(rerolled.affixes.length).toBeLessThanOrEqual(5);
    // 同一シードでなければ高確率で構成が変わる(決定的シードで差分確認)
    expect(JSON.stringify(rerolled.affixes)).not.toBe(JSON.stringify(rare.affixes));
  });

  it('祝福のオーブ: affixId/Tier を保ち数値のみ再ロール、範囲内', () => {
    const rare = applyAlchemy(commonItem, ctx(2));
    const blessed = applyBlessed(rare, ctx(123));
    expect(blessed.affixes.map((a) => a.affixId)).toEqual(rare.affixes.map((a) => a.affixId));
    expect(blessed.affixes.map((a) => a.tier)).toEqual(rare.affixes.map((a) => a.tier));
    for (const r of blessed.affixes) {
      const tier = AFFIX_BY_ID.get(r.affixId)?.tiers.find((t) => t.tier === r.tier);
      expect(tier).toBeDefined();
      for (const s of tier?.stats ?? []) {
        const v = r.values[s.stat];
        expect(v).toBeDefined();
        if (v === undefined) continue;
        expect(v).toBeGreaterThanOrEqual(s.min);
        expect(v).toBeLessThanOrEqual(s.max);
      }
    }
  });

  it('レアリティ条件違反・ユニークへの使用はエラー', () => {
    const rare = applyAlchemy(commonItem, ctx(3));
    expect(() => applyTransmute(rare, ctx(0))).toThrow(CraftError);
    expect(() => applyAlchemy(rare, ctx(0))).toThrow(CraftError);
    expect(() => applyChaos(commonItem, ctx(0))).toThrow(CraftError);
    expect(() => applyBlessed(commonItem, ctx(0))).toThrow(CraftError);

    const unique: ItemInstance = { ...commonItem, uniqueId: 'uniq_greed_ring' };
    expect(() => applyChaos({ ...unique, rarity: 'rare' }, ctx(0))).toThrow(CraftError);
  });
});
