import type { AilmentType, ElementType } from './enums';

/** 敵の戦闘基準ステータス。一次ステータスを持たず二次相当値を直接定義する。 */
export interface EnemyBaseStats {
  readonly maxHP: number;
  readonly physATK: number;
  readonly magicATK: number;
  readonly defense: number;
  readonly speed: number;
  readonly evasionPct: number;
  readonly critChancePct: number;
}

/**
 * 敵定義(静的マスタ)。データ駆動でコード直書き禁止(仕様 §5 実装指示)。
 *
 * ここにあるのは基準値。実際の戦闘では
 * 階層難易度 = floor(baseStats * 1.08^depth)(仕様 §6)で
 * スケーリングした戦闘用インスタンス(ブロックCで定義)を生成する。
 */
export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly baseStats: EnemyBaseStats;
  /** 属性 → 耐性%(マイナスは弱点、仕様 §4)。未指定の属性は 0。 */
  readonly resistances: Partial<Record<ElementType, number>>;
  /** 状態異常 → 耐性%(付与判定 = 付与率 - 耐性、仕様 §4)。 */
  readonly ailmentResistances: Partial<Record<AilmentType, number>>;
  /** 使用スキル(src/data/skills の ID)。 */
  readonly skillIds: readonly string[];
  /** 経験値・ゴールドの基準値(深度スケーリング前)。 */
  readonly baseExp: number;
  readonly baseGold: number;
  /** ボス階層用の固有ボスか(仕様 §6)。 */
  readonly isBoss: boolean;
  /** ドロップ率補正(ボスの特別ドロップ等。magicFind とは別系統)。 */
  readonly dropRateMultiplier: number;
}
