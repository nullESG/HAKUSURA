import { describe, expect, it } from 'vitest';
import { GameRandom } from './gameRandom';

describe('GameRandom', () => {
  it('同一シードは同一系列を生成する(再現性)', () => {
    const a = new GameRandom(12345);
    const b = new GameRandom(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a.nextUint32()).toBe(b.nextUint32());
    }
  });

  it('異なるシードは異なる系列を生成する', () => {
    const a = new GameRandom(1);
    const b = new GameRandom(2);
    const seqA = Array.from({ length: 10 }, () => a.nextUint32());
    const seqB = Array.from({ length: 10 }, () => b.nextUint32());
    expect(seqA).not.toEqual(seqB);
  });

  it('状態の保存・復元で系列が継続する(セーブ復元)', () => {
    const original = new GameRandom(999);
    for (let i = 0; i < 50; i++) original.nextDouble();
    const restored = GameRandom.fromState(original.state);
    for (let i = 0; i < 1000; i++) {
      expect(restored.nextUint32()).toBe(original.nextUint32());
    }
  });

  it('nextDouble は [0, 1) を返す', () => {
    const rng = new GameRandom(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng.nextDouble();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextIntInRange は両端を含む範囲の全値を返す', () => {
    const rng = new GameRandom(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextIntInRange(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('weightedIndex は重みに比例した分布を返す(レアリティ抽選の土台)', () => {
    const rng = new GameRandom(42);
    // 仕様 §5-1 のレアリティ重み
    const weights = [1000, 400, 120, 30, 6, 1, 1];
    const total = weights.reduce((a, b) => a + b, 0);
    const counts = new Array<number>(weights.length).fill(0);
    const trials = 200000;
    for (let i = 0; i < trials; i++) {
      const idx = rng.weightedIndex(weights);
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    weights.forEach((w, i) => {
      expect((counts[i] ?? 0) / trials).toBeCloseTo(w / total, 1.7); // 誤差 ~2%
    });
  });

  it('weightedIndex: 重み 0 の要素は選ばれない', () => {
    const rng = new GameRandom(5);
    for (let i = 0; i < 1000; i++) {
      expect(rng.weightedIndex([0, 1, 0])).toBe(1);
    }
  });

  it('不正引数は例外を投げる', () => {
    const rng = new GameRandom(1);
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextIntInRange(5, 1)).toThrow(RangeError);
    expect(() => rng.weightedIndex([0, 0])).toThrow(RangeError);
  });
});
