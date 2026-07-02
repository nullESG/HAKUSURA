/**
 * 経験値とレベルアップ(仕様 §2)。
 * 必要経験値 = floor(100 * level^2.2)、レベルアップごとにステータスポイント+5。
 * スキルポイントはレベルアップごとに+1(仕様 §3 に数値指定がないため仮定)。
 */
import { GAME_CONSTANTS } from '../constants';
import { expRequiredForLevel } from '../stats/statCalculator';
import type { Character } from '../types/character';

const C = GAME_CONSTANTS;

/** レベルアップごとのスキルポイント(仮定)。 */
export const SKILL_POINTS_PER_LEVEL = 1;

export interface ExpGainResult {
  readonly character: Character;
  /** 今回の付与で上がったレベル数。 */
  readonly levelsGained: number;
}

/**
 * 経験値を付与し、必要量を超えるたびにレベルアップする。
 * exp はレベルアップ時に必要量を差し引く方式(現在レベル内の蓄積値)。
 */
export function gainExp(character: Character, amount: number): ExpGainResult {
  if (amount < 0) throw new RangeError(`gainExp: amount must be >= 0, got ${amount}`);
  let { level, exp, unspentStatPoints, unspentSkillPoints } = character;
  let levelsGained = 0;
  exp += amount;
  while (exp >= expRequiredForLevel(level)) {
    exp -= expRequiredForLevel(level);
    level += 1;
    levelsGained += 1;
    unspentStatPoints += C.statPointsPerLevel;
    unspentSkillPoints += SKILL_POINTS_PER_LEVEL;
  }
  return {
    character: { ...character, level, exp, unspentStatPoints, unspentSkillPoints },
    levelsGained,
  };
}

/** ステータスポイントの割り振り(仕様 §2)。 */
export function allocateStatPoint(
  character: Character,
  stat: keyof Character['baseStats'],
): Character | undefined {
  if (character.unspentStatPoints < 1) return undefined;
  return {
    ...character,
    unspentStatPoints: character.unspentStatPoints - 1,
    baseStats: { ...character.baseStats, [stat]: character.baseStats[stat] + 1 },
  };
}
