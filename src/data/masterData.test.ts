import { describe, expect, it } from 'vitest';
import { GAME_CONSTANTS } from '../core/constants';
import { ITEM_TYPES, RARITIES, STAT_IDS } from '../core/types/enums';
import { getAffixById } from './affixes';
import { BASE_ITEM_DEFINITIONS, getBaseItemById } from './baseItems';
import { AFFIX_COUNT_BY_RARITY, RARITY_DOWNGRADE, RARITY_WEIGHTS } from './dropTables';
import {
  findSetByPieceId,
  getUniqueById,
  ITEM_SET_DEFINITIONS,
  PURE_UNIQUE_DEFINITIONS,
  SET_PIECE_DEFINITIONS,
  UNIQUE_ITEM_DEFINITIONS,
} from './uniques';

describe('ベースアイテムマスタ(仕様 §5-3)', () => {
  it('IDがユニークで、全10部位をカバーする', () => {
    const ids = new Set(BASE_ITEM_DEFINITIONS.map((d) => d.id));
    expect(ids.size).toBe(BASE_ITEM_DEFINITIONS.length);
    const coveredTypes = new Set(BASE_ITEM_DEFINITIONS.map((d) => d.itemType));
    for (const itemType of ITEM_TYPES) {
      expect(coveredTypes.has(itemType), `部位 ${itemType} のベースがない`).toBe(true);
    }
  });

  it('武器は攻撃基礎値・防具/盾は防御基礎値を持ち、weight > 0', () => {
    for (const def of BASE_ITEM_DEFINITIONS) {
      expect(def.weight).toBeGreaterThan(0);
      expect(def.minILvl).toBeGreaterThanOrEqual(0);
      if (def.itemType === 'weapon1h' || def.itemType === 'weapon2h') {
        expect((def.weaponAtk ?? 0) + (def.weaponMatk ?? 0)).toBeGreaterThan(0);
      }
      if (['shield', 'helmet', 'armor', 'gloves', 'boots'].includes(def.itemType)) {
        expect(def.armorDef ?? 0).toBeGreaterThan(0);
      }
    }
    expect(getBaseItemById('short_sword').itemType).toBe('weapon1h');
    expect(() => getBaseItemById('no_such_item')).toThrow();
  });

  it('各部位に iLvl 0 から出現するベースが存在する(序盤ドロップの保証)', () => {
    for (const itemType of ITEM_TYPES) {
      const starters = BASE_ITEM_DEFINITIONS.filter(
        (d) => d.itemType === itemType && d.minILvl === 0,
      );
      expect(starters.length, `部位 ${itemType} に iLvl 0 のベースがない`).toBeGreaterThan(0);
    }
  });
});

describe('ユニーク・セットマスタ(仕様 §5-5, §5-6)', () => {
  it('IDがユニークで、参照(ベース・アフィックス・Tier)がすべて解決できる', () => {
    const ids = new Set(UNIQUE_ITEM_DEFINITIONS.map((d) => d.id));
    expect(ids.size).toBe(UNIQUE_ITEM_DEFINITIONS.length);
    for (const def of UNIQUE_ITEM_DEFINITIONS) {
      expect(() => getBaseItemById(def.baseItemId)).not.toThrow();
      expect(def.fixedAffixes.length).toBeGreaterThan(0);
      for (const fixed of def.fixedAffixes) {
        const affix = getAffixById(fixed.affixId);
        expect(
          affix.tiers.some((t) => t.tier === fixed.tier),
          `${def.id}: ${fixed.affixId} に T${fixed.tier} がない`,
        ).toBe(true);
      }
    }
    expect(() => getUniqueById('no_such_unique')).toThrow();
  });

  it('1装備内で固定アフィックスのグループが重複しない(グループ排他 §5-4)', () => {
    for (const def of UNIQUE_ITEM_DEFINITIONS) {
      const groups = def.fixedAffixes.map((f) => getAffixById(f.affixId).group);
      expect(new Set(groups).size).toBe(groups.length);
    }
  });

  it('セットの pieceIds はユニーク定義を参照し、ボーナスは部位数の昇順で妥当', () => {
    const statIds = new Set<string>(STAT_IDS);
    for (const set of ITEM_SET_DEFINITIONS) {
      expect(set.pieceIds.length).toBeGreaterThanOrEqual(2);
      for (const pieceId of set.pieceIds) {
        expect(() => getUniqueById(pieceId)).not.toThrow();
        expect(findSetByPieceId(pieceId)?.id).toBe(set.id);
      }
      let prev = 1;
      for (const bonus of set.bonuses) {
        expect(bonus.requiredPieces).toBeGreaterThan(prev);
        expect(bonus.requiredPieces).toBeLessThanOrEqual(set.pieceIds.length);
        prev = bonus.requiredPieces;
        for (const stat of Object.keys(bonus.stats)) {
          expect(statIds.has(stat), `${set.id}: 不明な stat ${stat}`).toBe(true);
        }
      }
    }
  });

  it('純ユニークとセット部位は互いに素で、全ユニーク定義を分割する', () => {
    const pureIds = new Set(PURE_UNIQUE_DEFINITIONS.map((d) => d.id));
    const pieceIds = new Set(SET_PIECE_DEFINITIONS.map((d) => d.id));
    expect(pureIds.size + pieceIds.size).toBe(UNIQUE_ITEM_DEFINITIONS.length);
    for (const id of pieceIds) expect(pureIds.has(id)).toBe(false);
    expect(PURE_UNIQUE_DEFINITIONS.length).toBeGreaterThan(0);
    expect(SET_PIECE_DEFINITIONS.length).toBeGreaterThan(0);
  });
});

describe('ドロップテーブル(仕様 §5-1, §5-2)', () => {
  it('全レアリティに正の重みと妥当なアフィックス個数が定義されている', () => {
    const C = GAME_CONSTANTS;
    for (const rarity of RARITIES) {
      expect(RARITY_WEIGHTS[rarity]).toBeGreaterThan(0);
      const count = AFFIX_COUNT_BY_RARITY[rarity];
      expect(count.min).toBeGreaterThanOrEqual(0);
      expect(count.max).toBeGreaterThanOrEqual(count.min);
      expect(count.max).toBeLessThanOrEqual(C.maxPrefixes + C.maxSuffixes);
    }
    // レアリティ階層順に重みが単調減少(上位ほど稀少)
    for (let i = 1; i < RARITIES.length; i++) {
      expect(RARITY_WEIGHTS[RARITIES[i]!]).toBeLessThan(RARITY_WEIGHTS[RARITIES[i - 1]!]);
    }
  });

  it('降格チェーンは unique/set から通常レアリティへ到達する', () => {
    expect(RARITY_DOWNGRADE.set).toBe('unique');
    expect(RARITY_DOWNGRADE.unique).toBe('legendary');
    expect(RARITY_DOWNGRADE.legendary).toBeUndefined();
  });
});
