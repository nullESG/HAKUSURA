import type { ClassDefinition } from '../core/types/character';

/**
 * クラス定義(仕様 §3。初期5種、データ駆動で追加可能)。
 * 基礎値・初期ステータスは仕様に数値指定がないため仮置き(ブロックA報告参照)。
 * 合計値は全クラス同一(基礎 36pt)でクラス間の初期格差を作らない。
 */
export const CLASS_DEFINITIONS: readonly ClassDefinition[] = [
  {
    id: 'warrior',
    name: 'ウォリアー',
    description: '物理近接・高VIT。前線で耐えながら武器で叩き潰す。',
    base: { baseHP: 60, baseMP: 10, baseSpeed: 8 },
    startingStats: { str: 12, dex: 5, int: 3, vit: 11, luk: 5 },
  },
  {
    id: 'mage',
    name: 'メイジ',
    description: '属性魔法・高INT。耐久を犠牲に高火力の魔法を放つ。',
    base: { baseHP: 35, baseMP: 30, baseSpeed: 9 },
    startingStats: { str: 3, dex: 6, int: 14, vit: 6, luk: 7 },
  },
  {
    id: 'ranger',
    name: 'レンジャー',
    description: '命中・クリティカル・高DEX。手数と急所狙いで削り切る。',
    base: { baseHP: 45, baseMP: 15, baseSpeed: 12 },
    startingStats: { str: 6, dex: 14, int: 4, vit: 5, luk: 7 },
  },
  {
    id: 'cleric',
    name: 'クレリック',
    description: '回復・補助・状態異常。パーティの生存を支える。',
    base: { baseHP: 50, baseMP: 25, baseSpeed: 8 },
    startingStats: { str: 5, dex: 5, int: 11, vit: 9, luk: 6 },
  },
  {
    id: 'summoner',
    name: 'サモナー',
    description: '召喚・継続ダメージ。下僕と毒で戦場を支配する。',
    base: { baseHP: 40, baseMP: 28, baseSpeed: 9 },
    startingStats: { str: 3, dex: 6, int: 13, vit: 6, luk: 8 },
  },
] as const;

export function getClassById(classId: string): ClassDefinition {
  const def = CLASS_DEFINITIONS.find((c) => c.id === classId);
  if (!def) throw new Error(`Unknown classId: ${classId}`);
  return def;
}
