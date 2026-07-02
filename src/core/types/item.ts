import type { RolledAffix } from './affix';
import type { ItemType, Rarity, StatMap } from './enums';

/** ベースアイテム定義(仕様 §5-7 手順1で抽選される「種」)。静的マスタ。 */
export interface BaseItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly itemType: ItemType;
  /** ベース抽選の重み。 */
  readonly weight: number;
  /** この種が出現し始めるアイテムレベル。 */
  readonly minILvl: number;
  /** 武器の基礎物理攻撃(weaponATK、仕様 §2)。 */
  readonly weaponAtk?: number;
  /** 武器の基礎魔法攻撃(weaponMATK、仕様 §2)。 */
  readonly weaponMatk?: number;
  /** 防具の基礎防御(armorDEF、仕様 §2)。 */
  readonly armorDef?: number;
  /** 装備に必要な STR(装備重量上限の表現、仕様 §2)。 */
  readonly requiredStr?: number;
}

/** ユニーク装備定義(仕様 §5-5)。 */
export interface UniqueItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly baseItemId: string;
  /** 固定アフィックス(affixId と tier を固定、値は min〜max でロール)。 */
  readonly fixedAffixes: readonly { affixId: string; tier: number }[];
  /**
   * 「貪欲の指輪」のような数式化できない固有効果は効果 ID で参照し、
   * 戦闘エンジン側のエフェクトハンドラが解釈する。
   */
  readonly specialEffectId?: string;
  readonly flavorText?: string;
}

/** セットの段階ボーナス1段分(仕様 §5-6)。 */
export interface SetBonus {
  readonly requiredPieces: number;
  /** 数値ボーナスは stat → 値。 */
  readonly stats: StatMap;
  /** 「全攻撃に火属性付与」のような特殊効果は効果 ID で参照。 */
  readonly specialEffectId?: string;
}

/** セット装備定義(仕様 §5-6)。 */
export interface ItemSetDefinition {
  readonly id: string;
  readonly name: string;
  /** セットを構成するユニーク(セット部位)アイテムの ID。 */
  readonly pieceIds: readonly string[];
  /** 装備部位数 → ボーナス(2/4/6 部位など)。 */
  readonly bonuses: readonly SetBonus[];
}

/**
 * ドロップ・所持される実アイテム(セーブ対象)。
 * 静的マスタへの参照とロール結果だけを持つ軽量構造にし、
 * 大量インベントリのシリアライズ性能を確保する(仕様 §7)。
 */
export interface ItemInstance {
  /** インベントリ内で一意な ID。 */
  readonly instanceId: string;
  readonly baseItemId: string;
  readonly rarity: Rarity;
  readonly itemLevel: number;
  /** ロール済みアフィックス(prefix / suffix 混在。型は定義側が持つ)。 */
  readonly affixes: readonly RolledAffix[];
  /** ユニーク当選時のみ。 */
  readonly uniqueId?: string;
  /** セットアイテムの場合のみ。 */
  readonly setId?: string;
}
