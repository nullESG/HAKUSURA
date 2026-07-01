import { describe, expect, it } from 'vitest';
import { GAME_CONSTANTS } from '../core/constants';
import { RARITIES, STAT_IDS } from '../core/types/enums';
import {
  AFFIX_DEFINITIONS,
  getAffixById,
  STAT_T1_VALUES,
  TOTAL_ROLLABLE_AFFIX_COUNT,
} from './affixes';

const C = GAME_CONSTANTS;

describe('アフィックスマスタ(仕様 §5-4, §8)', () => {
  it('全500種(50定義 × 10Tier)である', () => {
    expect(AFFIX_DEFINITIONS.length).toBe(50);
    expect(TOTAL_ROLLABLE_AFFIX_COUNT).toBe(500);
  });

  it('ID・グループはユニークで、getAffixById で引ける', () => {
    const ids = new Set(AFFIX_DEFINITIONS.map((d) => d.id));
    const groups = new Set(AFFIX_DEFINITIONS.map((d) => d.group));
    expect(ids.size).toBe(AFFIX_DEFINITIONS.length);
    expect(groups.size).toBe(AFFIX_DEFINITIONS.length);
    for (const def of AFFIX_DEFINITIONS) {
      expect(getAffixById(def.id)).toBe(def);
    }
    expect(() => getAffixById('no_such_affix')).toThrow();
  });

  it('全定義が有効な stat / itemTypes / weight / name テンプレートを持つ', () => {
    const statIds = new Set<string>(STAT_IDS);
    for (const def of AFFIX_DEFINITIONS) {
      expect(def.allowedItemTypes.length).toBeGreaterThan(0);
      expect(def.weight).toBeGreaterThan(0);
      expect(def.name).toContain('{tier}');
      for (const tier of def.tiers) {
        for (const range of tier.stats) {
          expect(statIds.has(range.stat)).toBe(true);
        }
      }
      if (def.minRarity) {
        expect(RARITIES).toContain(def.minRarity);
      }
    }
  });

  it('Tier は 1〜10 の昇順で、minILvl = ceil((tier-1) * 9.4) に従う(§8)', () => {
    for (const def of AFFIX_DEFINITIONS) {
      expect(def.tiers.length).toBe(C.affixTierCount);
      def.tiers.forEach((tierDef, i) => {
        expect(tierDef.tier).toBe(i + 1);
        expect(tierDef.minILvl).toBe(Math.ceil(i * C.affixTierILvlStep));
      });
    }
  });

  it('全 Tier のロール範囲が中央値 ±10% を逸脱しない(丸め誤差は最小単位まで許容)', () => {
    for (const def of AFFIX_DEFINITIONS) {
      const isHybrid = def.tiers[0]!.stats.length > 1;
      for (const tierDef of def.tiers) {
        const scale = Math.pow(C.affixTierGrowth, tierDef.tier - 1);
        for (const range of tierDef.stats) {
          const unit = range.stat.endsWith('_flat') ? 1 : 0.1;
          const trueMid = STAT_T1_VALUES[range.stat] * (isHybrid ? C.hybridBudgetRatio : 1) * scale;
          expect(range.min).toBeLessThanOrEqual(range.max);
          // 上限は ±10% を超えない(最小単位の下限保証のみ例外)
          expect(range.max).toBeLessThanOrEqual(Math.max(unit, trueMid * 1.1) + 1e-9);
          expect(range.min).toBeGreaterThanOrEqual(Math.min(unit, trueMid * 0.9) - 1e-9);
          // 丸め後の幅が ±10% 幅(=中央値の 20%)を超えて広がらない
          expect(range.max - range.min).toBeLessThanOrEqual(trueMid * 0.2 + 1e-9);
        }
      }
    }
  });

  it('budget 検証: 各 Tier の合計コストが budget(tier) = 4 * 1.25^(tier-1) を超えない(§8)', () => {
    // コスト = Σ_stat (実中央値 / その stat の Tier1 等価値) を budget 単位に正規化。
    // 純粋アフィックスは 1.0、ハイブリッドは 0.6 * stat 数まで。丸めによる超過は 8% まで許容。
    const ROUNDING_SLACK = 0.08;
    for (const def of AFFIX_DEFINITIONS) {
      for (const tierDef of def.tiers) {
        const scale = Math.pow(C.affixTierGrowth, tierDef.tier - 1);
        let normalizedCost = 0;
        for (const range of tierDef.stats) {
          const mid = (range.min + range.max) / 2;
          normalizedCost += mid / (STAT_T1_VALUES[range.stat] * scale);
        }
        const limit =
          tierDef.stats.length > 1 ? C.hybridBudgetRatio * tierDef.stats.length : 1.0;
        expect(
          normalizedCost,
          `${def.id} T${tierDef.tier}: cost=${normalizedCost.toFixed(3)} > limit=${limit}`,
        ).toBeLessThanOrEqual(limit + ROUNDING_SLACK);
      }
    }
  });

  it('ハイブリッド複合は stat 2 種・legendary 限定(§8)', () => {
    const hybrids = AFFIX_DEFINITIONS.filter((d) => d.tiers[0]!.stats.length > 1);
    expect(hybrids.length).toBeGreaterThan(0);
    for (const def of hybrids) {
      expect(def.minRarity).toBe('legendary');
      for (const tierDef of def.tiers) {
        expect(tierDef.stats.length).toBe(2);
      }
    }
  });

  it('Tier が上がるほど各 stat の中央値が単調増加する', () => {
    for (const def of AFFIX_DEFINITIONS) {
      const statCount = def.tiers[0]!.stats.length;
      for (let s = 0; s < statCount; s++) {
        let prevMid = -Infinity;
        for (const tierDef of def.tiers) {
          const range = tierDef.stats[s]!;
          const mid = (range.min + range.max) / 2;
          expect(mid).toBeGreaterThanOrEqual(prevMid);
          prevMid = mid;
        }
      }
    }
  });
});
