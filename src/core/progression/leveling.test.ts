import { describe, expect, it } from 'vitest';
import { expRequiredForLevel } from '../stats/statCalculator';
import type { Character } from '../types/character';
import { allocateStatPoint, gainExp } from './leveling';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ch1',
    name: 'テスト',
    classId: 'warrior',
    level: 1,
    exp: 0,
    baseStats: { str: 12, dex: 5, int: 3, vit: 11, luk: 5 },
    unspentStatPoints: 0,
    unspentSkillPoints: 0,
    learnedNodeIds: [],
    equipment: {},
    ...overrides,
  };
}

describe('レベリング(仕様 §2)', () => {
  it('必要経験値に達するとレベルアップし、ステポ+5/スキルポ+1', () => {
    const need = expRequiredForLevel(1); // 100
    const result = gainExp(makeCharacter(), need);
    expect(result.levelsGained).toBe(1);
    expect(result.character.level).toBe(2);
    expect(result.character.exp).toBe(0);
    expect(result.character.unspentStatPoints).toBe(5);
    expect(result.character.unspentSkillPoints).toBe(1);
  });

  it('大量EXPで複数レベル一気に上がる', () => {
    const total = expRequiredForLevel(1) + expRequiredForLevel(2) + expRequiredForLevel(3) + 50;
    const result = gainExp(makeCharacter(), total);
    expect(result.levelsGained).toBe(3);
    expect(result.character.level).toBe(4);
    expect(result.character.exp).toBe(50);
    expect(result.character.unspentStatPoints).toBe(15);
  });

  it('不足分は蓄積される', () => {
    const result = gainExp(makeCharacter(), 99);
    expect(result.levelsGained).toBe(0);
    expect(result.character.exp).toBe(99);
  });

  it('ステータス割り振りはポイントを消費し、0なら不可', () => {
    const ch = makeCharacter({ unspentStatPoints: 2 });
    const once = allocateStatPoint(ch, 'str')!;
    expect(once.baseStats.str).toBe(13);
    expect(once.unspentStatPoints).toBe(1);
    const twice = allocateStatPoint(once, 'vit')!;
    expect(twice.baseStats.vit).toBe(12);
    expect(allocateStatPoint({ ...twice, unspentStatPoints: 0 }, 'str')).toBeUndefined();
  });
});
