import { describe, expect, it } from 'vitest';
import type { PrimaryStats } from '../types/character';
import {
  calculateDerivedStats,
  expRequiredForLevel,
  mergeStatMaps,
  statOf,
  type StatCalcInput,
} from './statCalculator';

const ZERO_PRIMARY: PrimaryStats = { str: 0, dex: 0, int: 0, vit: 0, luk: 0 };

function makeInput(overrides: Partial<StatCalcInput> = {}): StatCalcInput {
  return {
    level: 1,
    primary: ZERO_PRIMARY,
    classBase: { baseHP: 0, baseMP: 0, baseSpeed: 0 },
    weaponAtk: 0,
    weaponMatk: 0,
    armorDef: 0,
    mods: {},
    ...overrides,
  };
}

describe('calculateDerivedStats(仕様 §2 の式)', () => {
  it('最大HP = baseHP + VIT*8 + level*5 + フラット補正', () => {
    const derived = calculateDerivedStats(
      makeInput({
        level: 10,
        primary: { ...ZERO_PRIMARY, vit: 25 },
        classBase: { baseHP: 50, baseMP: 0, baseSpeed: 0 },
        mods: { maxHP_flat: 48 },
      }),
    );
    // 50 + 25*8 + 10*5 + 48 = 348
    expect(derived.maxHP).toBe(348);
  });

  it('最大MP = baseMP + INT*4 + level*2 + フラット補正', () => {
    const derived = calculateDerivedStats(
      makeInput({
        level: 5,
        primary: { ...ZERO_PRIMARY, int: 14 },
        classBase: { baseHP: 0, baseMP: 30, baseSpeed: 0 },
      }),
    );
    // 30 + 14*4 + 5*2 = 96
    expect(derived.maxMP).toBe(96);
  });

  it('物理攻撃力 = (STR*1.5 + weaponATK + フラット) * (1 + ダメージ%)', () => {
    const derived = calculateDerivedStats(
      makeInput({
        primary: { ...ZERO_PRIMARY, str: 30 },
        weaponAtk: 10,
        mods: { physATK_flat: 5, dmg_pct: 20 },
      }),
    );
    // (45 + 10 + 5) * 1.2 = 72
    expect(derived.physATK).toBeCloseTo(72);
  });

  it('魔法攻撃力 = (INT*1.5 + weaponMATK + フラット) * (1 + ダメージ%)', () => {
    const derived = calculateDerivedStats(
      makeInput({
        primary: { ...ZERO_PRIMARY, int: 20 },
        weaponMatk: 15,
        mods: { magicATK_flat: 5, dmg_pct: 10 },
      }),
    );
    // (30 + 15 + 5) * 1.1 = 55
    expect(derived.magicATK).toBeCloseTo(55);
  });

  it('物理防御 = armorDEF + VIT*0.5 + フラット補正', () => {
    const derived = calculateDerivedStats(
      makeInput({
        primary: { ...ZERO_PRIMARY, vit: 20 },
        armorDef: 30,
        mods: { armorDEF_flat: 12 },
      }),
    );
    // 30 + 10 + 12 = 52
    expect(derived.defense).toBeCloseTo(52);
  });

  it('行動速度 = (baseSpeed + DEX*0.3) * (1 + 速度%)', () => {
    const derived = calculateDerivedStats(
      makeInput({
        primary: { ...ZERO_PRIMARY, dex: 20 },
        classBase: { baseHP: 0, baseMP: 0, baseSpeed: 10 },
        mods: { speed_pct: 25 },
      }),
    );
    // (10 + 6) * 1.25 = 20
    expect(derived.speed).toBeCloseTo(20);
  });

  it('クリティカル率 = 5 + DEX*0.1 + 装備補正、上限75%', () => {
    const noCap = calculateDerivedStats(
      makeInput({ primary: { ...ZERO_PRIMARY, dex: 100 }, mods: { critChance_pct: 15 } }),
    );
    // 5 + 10 + 15 = 30
    expect(noCap.critChancePct).toBeCloseTo(30);

    const capped = calculateDerivedStats(makeInput({ primary: { ...ZERO_PRIMARY, dex: 1000 } }));
    // 5 + 100 = 105 → 上限 75
    expect(capped.critChancePct).toBe(75);
  });

  it('クリダメ倍率 = 1.5 + LUK*0.005 + 装備補正', () => {
    const derived = calculateDerivedStats(
      makeInput({ primary: { ...ZERO_PRIMARY, luk: 100 }, mods: { critDmg_pct: 36 } }),
    );
    // 1.5 + 0.5 + 0.36 = 2.36
    expect(derived.critMultiplier).toBeCloseTo(2.36);
  });

  it('命中率の基礎値 = 90 + DEX*0.2(敵回避は戦闘時に減算)', () => {
    const derived = calculateDerivedStats(makeInput({ primary: { ...ZERO_PRIMARY, dex: 50 } }));
    expect(derived.baseHitChancePct).toBeCloseTo(100);
  });

  it('回避率 = DEX*0.15 + 装備補正、上限60%', () => {
    const noCap = calculateDerivedStats(
      makeInput({ primary: { ...ZERO_PRIMARY, dex: 100 }, mods: { evasion_pct: 10 } }),
    );
    expect(noCap.evasionPct).toBeCloseTo(25);

    const capped = calculateDerivedStats(
      makeInput({ primary: { ...ZERO_PRIMARY, dex: 200 }, mods: { evasion_pct: 50 } }),
    );
    // 30 + 50 = 80 → 上限 60
    expect(capped.evasionPct).toBe(60);
  });

  it('属性耐性・ユーティリティ系が StatMap から取り出される', () => {
    const derived = calculateDerivedStats(
      makeInput({
        mods: { fireRes_pct: 39, rarity_pct: 20, exp_pct: 10, gold_pct: 40, block_pct: 24 },
      }),
    );
    expect(derived.elementResPct.fire).toBe(39);
    expect(derived.elementResPct.ice).toBe(0);
    expect(derived.magicFindPct).toBe(20);
    expect(derived.expGainPct).toBe(10);
    expect(derived.goldGainPct).toBe(40);
    expect(derived.blockPct).toBe(24);
  });
});

describe('expRequiredForLevel(仕様 §2: floor(100 * level^2.2))', () => {
  it('既知の値と一致する', () => {
    expect(expRequiredForLevel(1)).toBe(100);
    expect(expRequiredForLevel(2)).toBe(Math.floor(100 * Math.pow(2, 2.2))); // 459
    expect(expRequiredForLevel(10)).toBe(15848);
    expect(expRequiredForLevel(100)).toBe(Math.floor(100 * Math.pow(100, 2.2)));
  });

  it('単調増加する(無限育成カーブ)', () => {
    let prev = 0;
    for (let level = 1; level <= 1000; level += 7) {
      const required = expRequiredForLevel(level);
      expect(required).toBeGreaterThan(prev);
      prev = required;
    }
  });

  it('level < 1 は例外', () => {
    expect(() => expRequiredForLevel(0)).toThrow(RangeError);
  });
});

describe('StatMap ユーティリティ', () => {
  it('statOf は未定義キーで 0 を返す', () => {
    expect(statOf({}, 'maxHP_flat')).toBe(0);
    expect(statOf({ maxHP_flat: 48 }, 'maxHP_flat')).toBe(48);
  });

  it('mergeStatMaps は同一キーを加算合成する(装備+パッシブ+セット)', () => {
    const merged = mergeStatMaps(
      { maxHP_flat: 48, dmg_pct: 4 },
      { maxHP_flat: 60, fireRes_pct: 13 },
      { dmg_pct: 8 },
    );
    expect(merged).toEqual({ maxHP_flat: 108, dmg_pct: 12, fireRes_pct: 13 });
  });
});
