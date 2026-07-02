import type { EquipSlot } from './enums';

/** 一次ステータス(仕様 §2)。 */
export interface PrimaryStats {
  readonly str: number;
  readonly dex: number;
  readonly int: number;
  readonly vit: number;
  readonly luk: number;
}

/** クラスの基礎値(二次ステータス導出の baseHP / baseMP / baseSpeed)。 */
export interface ClassBaseStats {
  readonly baseHP: number;
  readonly baseMP: number;
  readonly baseSpeed: number;
}

/** クラス定義(仕様 §3)。初期5種、データ駆動で追加可能。 */
export interface ClassDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly base: ClassBaseStats;
  /** レベル1時点の一次ステータス。 */
  readonly startingStats: PrimaryStats;
}

/**
 * プレイヤーキャラクター(セーブ対象)。
 *
 * HP/MP の現在値や戦闘中バフは戦闘エンジン側の一時状態とし、
 * このモデルは永続化される「成長と所持」だけを持つ。
 * 二次ステータスは保存せず、常に statCalculator で導出する。
 */
export interface Character {
  readonly id: string;
  readonly name: string;
  /** クラスはデータ駆動(仕様 §3)。src/data/classes の ID を参照。 */
  readonly classId: string;
  readonly level: number;
  readonly exp: number;
  /** クラス初期値+レベルアップで割り振った一次ステータスの合計。 */
  readonly baseStats: PrimaryStats;
  /** 未割り振りステータスポイント(レベルアップごとに+5、仕様 §2)。 */
  readonly unspentStatPoints: number;
  /** 未割り振りスキルポイント(仕様 §3)。 */
  readonly unspentSkillPoints: number;
  /** 取得済みスキルツリーノードの ID(仕様 §3)。 */
  readonly learnedNodeIds: readonly string[];
  /**
   * 装備スロット → 装備中の ItemInstance.instanceId。
   * 実体はインベントリ側が持ち、ここは参照のみ(二重保存を避ける)。
   */
  readonly equipment: Partial<Record<EquipSlot, string>>;
}
