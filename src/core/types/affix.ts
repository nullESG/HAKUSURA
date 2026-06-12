import type { AffixType, ItemType, Rarity, StatId, StatMap } from './enums';

/**
 * 1 stat 分のロール範囲(min〜max は仕様 §8 の ±10% 幅)。
 */
export interface AffixTierStatRange {
  readonly stat: StatId;
  readonly min: number;
  readonly max: number;
}

/** アフィックスの 1 Tier 分の定義(仕様 §5-4 の tiers 要素)。 */
export interface AffixTierDef {
  readonly tier: number;
  /** この Tier の出現に必要な最低アイテムレベル(仕様 §5-2, §8)。 */
  readonly minILvl: number;
  /**
   * stat ごとの数値レンジ。単一 stat なら要素1。
   * ハイブリッド複合(仕様 §8)は要素2以上になるため、
   * 仕様 §5-4 の単一 stat JSON を配列に一般化した形で持つ。
   */
  readonly stats: readonly AffixTierStatRange[];
}

/** アフィックス定義(仕様 §5-4)。データ駆動の静的マスタ。 */
export interface AffixDefinition {
  readonly id: string;
  /** 同一グループは1装備に1つまで(グループ排他、仕様 §5-4)。 */
  readonly group: string;
  readonly type: AffixType;
  /** 表示名テンプレート。`{tier}` を Tier 表示に置換する。 */
  readonly name: string;
  /** アフィックスプール抽選の重み(仕様 §5-7)。 */
  readonly weight: number;
  readonly allowedItemTypes: readonly ItemType[];
  /** Tier1〜10。tier 昇順で格納する。 */
  readonly tiers: readonly AffixTierDef[];
  /** 出現に必要な最低レアリティ。ハイブリッドは 'legendary'(仕様 §8)。省略時は制限なし。 */
  readonly minRarity?: Rarity;
}

/**
 * 装備インスタンスに付与された「ロール済み」アフィックス(仕様 §5-7 手順5〜6)。
 * 定義への参照(affixId + tier)と実ロール値だけを持つ軽量構造(セーブ対象)。
 */
export interface RolledAffix {
  readonly affixId: string;
  readonly tier: number;
  /** stat → ロールされた実数値。 */
  readonly values: StatMap;
}
