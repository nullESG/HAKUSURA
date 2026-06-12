/**
 * ゲーム全体の定数。
 * 仕様書の「システムの形を決める固定値」だけを置く。
 * バランス調整で動く値(アフィックス数値・敵ステータス等)は src/data/ 側に置く。
 */
export const GAME_CONSTANTS = {
  /** パーティ最大人数。1 にすれば単独主人公制に切替可能(仕様 §2) */
  maxPartySize: 4,
  /** 敵グループ最大数(仕様 §4) */
  maxEnemyGroupSize: 6,
  /** レベルアップごとのステータスポイント(仕様 §2) */
  statPointsPerLevel: 5,
  /** 必要経験値 = floor(expBase * level^expExponent)(仕様 §2) */
  expBase: 100,
  expExponent: 2.2,
  /** クリティカル率の上限%(仕様 §2) */
  critChanceCapPct: 75,
  /** 回避率の上限%(仕様 §2) */
  evasionCapPct: 60,
  /** クリティカルダメージ倍率の基礎値(仕様 §2) */
  baseCritMultiplier: 1.5,
  /** 命中率の基礎値%(仕様 §2) */
  baseHitChancePct: 90,
  /** 装備ごとの Prefix / Suffix 上限(仕様 §5-4) */
  maxPrefixes: 3,
  maxSuffixes: 3,
  /** アフィックス Tier 数(仕様 §8) */
  affixTierCount: 10,
  /** Tier スケーリング: value(tier) = base * growth^(tier-1)(仕様 §8) */
  affixTierGrowth: 1.25,
  /** Tier1 の budget。budget(tier) = 4 * 1.25^(tier-1)(仕様 §8) */
  affixBudgetT1: 4,
  /** Tier 出現 iLvl: minILvl(tier) = ceil((tier-1) * 9.4)(仕様 §8) */
  affixTierILvlStep: 9.4,
  /** ハイブリッドアフィックスの stat あたり budget 配分(仕様 §8) */
  hybridBudgetRatio: 0.6,
  /** ダメージ式のランダム変動幅(仕様 §4) */
  damageRandomMin: 0.9,
  damageRandomMax: 1.1,
  /** 防御コマンドの被ダメージ軽減率(仕様 §4) */
  guardDamageReduction: 0.5,
  /** 無限ダンジョン難易度の指数の底(仕様 §6) */
  dungeonDepthGrowth: 1.08,
} as const;
