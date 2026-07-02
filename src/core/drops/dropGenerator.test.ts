import { describe, expect, it } from 'vitest';
import { GAME_CONSTANTS } from '../constants';
import { AFFIX_BY_ID } from '../../data/affixes';
import { buildDropTables } from '../../data/dropTables';
import { GameRandom } from '../rng/gameRandom';
import { generateDrop, rollRarity } from './dropGenerator';

const tables = buildDropTables();

function makeIdGen(): () => string {
  let n = 0;
  return () => `item-${n++}`;
}

function drop(itemLevel: number, magicFind: number, rng: GameRandom) {
  return generateDrop({ itemLevel, magicFind, rng, tables, makeId: makeIdGen() });
}

describe('generateDrop(仕様 §5-7)', () => {
  it('同一シードなら同一の結果(再現性)', () => {
    const a = drop(50, 30, new GameRandom(777));
    const b = drop(50, 30, new GameRandom(777));
    expect(a).toEqual(b);
  });

  it('レアリティごとのアフィックス数が仕様 §5-1 の範囲に収まる', () => {
    const rng = new GameRandom(1);
    const ranges = {
      common: [0, 0], magic: [1, 2], rare: [3, 5], epic: [5, 6], legendary: [6, 6],
    } as const;
    for (let i = 0; i < 2000; i++) {
      const item = drop(90, 0, rng);
      if (item.rarity === 'unique' || item.rarity === 'set') continue;
      const [min, max] = ranges[item.rarity];
      expect(item.affixes.length, `${item.rarity}`).toBeGreaterThanOrEqual(min);
      expect(item.affixes.length, `${item.rarity}`).toBeLessThanOrEqual(max);
    }
  });

  it('同一グループ排他と prefix3/suffix3 上限を守る', () => {
    const rng = new GameRandom(2);
    for (let i = 0; i < 1000; i++) {
      const item = drop(90, 200, rng);
      const groups = new Set<string>();
      let prefixes = 0;
      let suffixes = 0;
      for (const r of item.affixes) {
        const def = AFFIX_BY_ID.get(r.affixId);
        expect(def).toBeDefined();
        if (!def) continue;
        if (item.uniqueId === undefined) {
          expect(groups.has(def.group), `dup group ${def.group}`).toBe(false);
        }
        groups.add(def.group);
        if (def.type === 'prefix') prefixes++;
        else suffixes++;
      }
      if (item.uniqueId === undefined) {
        expect(prefixes).toBeLessThanOrEqual(GAME_CONSTANTS.maxPrefixes);
        expect(suffixes).toBeLessThanOrEqual(GAME_CONSTANTS.maxSuffixes);
      }
    }
  });

  it('iLvl 条件: 出現 Tier の minILvl が itemLevel 以下、値は min〜max 内', () => {
    const rng = new GameRandom(3);
    for (const iLvl of [1, 15, 40, 90]) {
      for (let i = 0; i < 300; i++) {
        const item = drop(iLvl, 100, rng);
        for (const r of item.affixes) {
          const def = AFFIX_BY_ID.get(r.affixId);
          const tier = def?.tiers.find((t) => t.tier === r.tier);
          expect(tier, `${r.affixId} T${r.tier}`).toBeDefined();
          if (!tier || !def) continue;
          if (item.uniqueId === undefined) {
            expect(tier.minILvl, `${r.affixId} T${r.tier} @iLvl${iLvl}`).toBeLessThanOrEqual(iLvl);
          }
          for (const s of tier.stats) {
            const v = r.values[s.stat];
            expect(v).toBeDefined();
            if (v === undefined) continue;
            expect(v).toBeGreaterThanOrEqual(s.min);
            expect(v).toBeLessThanOrEqual(s.max);
          }
        }
      }
    }
  });

  it('ハイブリッドアフィックスは Legendary 以上にのみ付く(仕様 §8)', () => {
    const rng = new GameRandom(4);
    for (let i = 0; i < 3000; i++) {
      const item = drop(90, 300, rng);
      if (item.uniqueId !== undefined) continue;
      for (const r of item.affixes) {
        const def = AFFIX_BY_ID.get(r.affixId);
        if (def?.minRarity === 'legendary') {
          expect(item.rarity, r.affixId).toBe('legendary');
        }
      }
    }
  });

  it('ユニーク/セット当選時は事前定義(固定アフィックス・setId)が適用される', () => {
    const rng = new GameRandom(5);
    let uniques = 0;
    let sets = 0;
    for (let i = 0; i < 30000 && (uniques === 0 || sets === 0); i++) {
      const item = drop(90, 2000, rng);
      if (item.rarity === 'unique') {
        uniques++;
        expect(item.uniqueId).toBeDefined();
        expect(item.affixes.length).toBeGreaterThan(0);
      }
      if (item.rarity === 'set') {
        sets++;
        expect(item.uniqueId).toBeDefined();
        expect(item.setId).toBeDefined();
      }
    }
    expect(uniques).toBeGreaterThan(0);
    expect(sets).toBeGreaterThan(0);
  });

  it('低 iLvl では高グレードのベースアイテムが出ない', () => {
    const rng = new GameRandom(6);
    for (let i = 0; i < 500; i++) {
      const item = drop(10, 0, rng);
      const base = tables.baseItemById.get(item.baseItemId);
      expect(base).toBeDefined();
      expect(base?.minILvl ?? 99).toBeLessThanOrEqual(10);
    }
  });
});

describe('rollRarity(magicFind 補正)', () => {
  function rarePlusRatio(magicFind: number): number {
    const rng = new GameRandom(42);
    let rarePlus = 0;
    const trials = 50000;
    for (let i = 0; i < trials; i++) {
      const r = rollRarity(magicFind, rng, tables);
      if (r !== 'common' && r !== 'magic') rarePlus++;
    }
    return rarePlus / trials;
  }

  it('magicFind が高いほどレア以上の出現率が上がる(仕様 §5-7 手順2)', () => {
    const mf0 = rarePlusRatio(0);
    const mf100 = rarePlusRatio(100);
    const mf300 = rarePlusRatio(300);
    expect(mf100).toBeGreaterThan(mf0 * 1.5);
    expect(mf300).toBeGreaterThan(mf100);
  });
});
