import { describe, expect, it } from 'vitest';
import { GAME_CONSTANTS } from '../../core/constants';
import type { AffixDefinition } from '../../core/types';
import { BASE_ITEM_BY_ID } from '../baseItems';
import { SET_PIECES, ITEM_SETS, SET_PIECE_BY_ID } from '../sets';
import { UNIQUE_ITEMS } from '../uniques';
import { AFFIX_BY_ID, AFFIX_CATEGORIES, ALL_AFFIXES, BUDGET_RATES, TIER_MIN_ILVLS, budgetOfTier } from './index';

describe('アフィックス500種の生成(仕様 §10)', () => {
  it('総数はちょうど500、カテゴリ内訳は仕様の配分どおり', () => {
    expect(AFFIX_CATEGORIES.basicFlat).toHaveLength(60);
    expect(AFFIX_CATEGORIES.increasedPct).toHaveLength(70);
    expect(AFFIX_CATEGORIES.critical).toHaveLength(40);
    expect(AFFIX_CATEGORIES.defense).toHaveLength(90);
    expect(AFFIX_CATEGORIES.ailment).toHaveLength(50);
    expect(AFFIX_CATEGORIES.utility).toHaveLength(60);
    expect(AFFIX_CATEGORIES.skillBoost).toHaveLength(60);
    expect(AFFIX_CATEGORIES.hybrid).toHaveLength(70);
    expect(ALL_AFFIXES).toHaveLength(500);
  });

  it('id は一意', () => {
    expect(AFFIX_BY_ID.size).toBe(500);
  });

  it('全アフィックスが Tier1〜10 を持ち、minILvl は規定の列(仕様 §8)', () => {
    for (const a of ALL_AFFIXES) {
      expect(a.tiers, a.id).toHaveLength(10);
      a.tiers.forEach((t, i) => {
        expect(t.tier).toBe(i + 1);
        expect(t.minILvl).toBe(TIER_MIN_ILVLS[i]);
        expect(t.stats.length).toBeGreaterThan(0);
        for (const s of t.stats) {
          expect(s.min).toBeLessThanOrEqual(s.max);
          expect(s.min).toBeGreaterThanOrEqual(0);
        }
      });
      expect(a.allowedItemTypes.length).toBeGreaterThan(0);
      expect(a.group.length).toBeGreaterThan(0);
      expect(['prefix', 'suffix']).toContain(a.type);
    }
  });

  it('ハイブリッドは2stat・Legendary以上限定、非ハイブリッドは1stat', () => {
    for (const a of AFFIX_CATEGORIES.hybrid) {
      expect(a.minRarity).toBe('legendary');
      for (const t of a.tiers) expect(t.stats).toHaveLength(2);
    }
    const nonHybrid = (Object.entries(AFFIX_CATEGORIES) as [string, readonly AffixDefinition[]][])
      .filter(([k]) => k !== 'hybrid')
      .flatMap(([, v]) => v);
    for (const a of nonHybrid) {
      expect(a.minRarity).toBeUndefined();
      for (const t of a.tiers) expect(t.stats).toHaveLength(1);
    }
  });

  it('Tier10時点の総budgetが全500種で±5%以内に揃う(仕様 §10 生成規則7)', () => {
    const expectedT10 = budgetOfTier(10); // ≈29.80
    for (const a of ALL_AFFIXES) {
      const t10 = a.tiers[9];
      expect(t10).toBeDefined();
      if (!t10) continue;
      const isHybrid = a.minRarity === 'legendary';
      const expected = isHybrid ? expectedT10 * GAME_CONSTANTS.hybridBudgetRatio * 2 : expectedT10;
      const actual = t10.stats.reduce((sum, s) => {
        const mid = (s.min + s.max) / 2;
        return sum + mid / BUDGET_RATES[s.stat];
      }, 0);
      const deviation = Math.abs(actual - expected) / expected;
      expect(deviation, `${a.id}: budget=${actual.toFixed(2)} expected=${expected.toFixed(2)}`)
        .toBeLessThanOrEqual(0.05);
    }
  });
});

describe('仕様 §9 の完全数値テーブルとの一致(式の正しさの見本検証)', () => {
  function tierTable(affixId: string): [number, number, number][] {
    const a = AFFIX_BY_ID.get(affixId);
    expect(a, affixId).toBeDefined();
    return (a?.tiers ?? []).map((t) => {
      const s = t.stats[0];
      return [t.minILvl, s?.min ?? -1, s?.max ?? -1];
    });
  }

  // ※仕様§9の見本は life T6(147)・mana T10(239)で §8 の式の丸め結果
  //  (146.48→146 / 238.42→238)と1ずれている。§10「§8の数式が唯一の基準」に従い式を正とする。
  it('flat_max_life(12HP/budget)', () => {
    expect(tierTable('flat_life_armor')).toEqual([
      [1, 43, 53], [10, 54, 66], [19, 68, 83], [29, 85, 103], [38, 105, 129],
      [48, 131, 161], [57, 165, 201], [67, 206, 252], [76, 257, 315], [86, 322, 394],
    ]);
  });

  it('flat_max_mana(8MP/budget)', () => {
    expect(tierTable('flat_mana_ring')).toEqual([
      [1, 29, 35], [10, 36, 44], [19, 45, 55], [29, 57, 69], [38, 70, 86],
      [48, 88, 108], [57, 110, 134], [67, 138, 168], [76, 172, 210], [86, 214, 262],
    ]);
  });

  it('flat_physical_attack(2.5/budget)', () => {
    expect(tierTable('flat_phys_weapon1h')).toEqual([
      [1, 9, 11], [10, 12, 14], [19, 14, 18], [29, 18, 22], [38, 22, 26],
      [48, 28, 34], [57, 34, 42], [67, 43, 53], [76, 54, 66], [86, 68, 83],
    ]);
  });

  it('flat_defense(3/budget)', () => {
    expect(tierTable('flat_def_armor')).toEqual([
      [1, 11, 13], [10, 14, 17], [19, 17, 21], [29, 21, 25], [38, 26, 32],
      [48, 33, 41], [57, 41, 51], [67, 51, 63], [76, 65, 79], [86, 80, 98],
    ]);
  });

  it('critical_chance(0.5%/budget)・evasion(0.8%/budget)・magic_find(0.6%/budget)の中央値列', () => {
    const mids = (id: string) =>
      (AFFIX_BY_ID.get(id)?.tiers ?? []).map((t) =>
        Math.round(BUDGET_RATES[t.stats[0]?.stat ?? 'dmg_pct'] * budgetOfTier(t.tier)),
      );
    expect(mids('crit_chance_ring')).toEqual([2, 3, 3, 4, 5, 6, 8, 10, 12, 15]);
    expect(mids('evasion_armor')).toEqual([3, 4, 5, 6, 8, 10, 12, 15, 19, 24]);
    // ※仕様§9のMF見本はT6以降レート0.6と乖離(実質0.67)。§8のレート0.6を正とする。
    expect(mids('magic_find_ring')).toEqual([2, 3, 4, 5, 6, 7, 9, 11, 14, 18]);
  });
});

describe('ユニーク・セット定義の整合性(仕様 §5-5, §5-6)', () => {
  it('ユニークは30種、うち10種が specialEffectId 付き', () => {
    expect(UNIQUE_ITEMS).toHaveLength(30);
    expect(UNIQUE_ITEMS.filter((u) => u.specialEffectId !== undefined)).toHaveLength(10);
  });

  it('セットは5種、各6部位、2/4/6部位ボーナスを持つ', () => {
    expect(ITEM_SETS).toHaveLength(5);
    expect(SET_PIECES).toHaveLength(30);
    for (const s of ITEM_SETS) {
      expect(s.pieceIds).toHaveLength(6);
      expect(s.bonuses.map((b) => b.requiredPieces)).toEqual([2, 4, 6]);
      for (const pid of s.pieceIds) expect(SET_PIECE_BY_ID.get(pid)?.setId).toBe(s.id);
    }
  });

  it('固定アフィックス・ベースアイテムの参照がすべて実在する', () => {
    for (const def of [...UNIQUE_ITEMS, ...SET_PIECES]) {
      expect(BASE_ITEM_BY_ID.get(def.baseItemId), `${def.id}: ${def.baseItemId}`).toBeDefined();
      for (const f of def.fixedAffixes) {
        const affix = AFFIX_BY_ID.get(f.affixId);
        expect(affix, `${def.id}: ${f.affixId}`).toBeDefined();
        expect(f.tier).toBeGreaterThanOrEqual(1);
        expect(f.tier).toBeLessThanOrEqual(10);
      }
    }
  });
});
