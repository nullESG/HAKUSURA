import type { StatId } from '../../core/types';

/**
 * stat → budget 換算レート(仕様 §8「予算によるバランス保証」)。
 * 「あるstatの実数 = budget(tier) × 換算レート」の唯一の定義箇所。
 *
 * 仕様に明記のないレートは以下の方針で補完(ブロックB報告参照):
 * - 属性別ダメージ%/スキル威力% = 増加ダメージ%と同じ 1.0
 * - 詠唱速度/移動速度/MP消費減 = 攻撃速度と同じ 0.7
 * - 属性別クリ率/クリダメ = 全体クリと同レート
 * - 全耐性% = 6属性に効くため属性耐性の半分 0.65
 * - 物理軽減% = 回避/ブロックと同じ 0.8
 * - 状態異常耐性% = 属性耐性と同じ 1.3
 * - 状態異常付与率% = クリ率と同じ 0.5 / 効果値% = 1.0
 * - HP回復 = 1.2 / MP回復 = 0.8(フラットHP/MPの1/10)
 * - ゴールド% = MFの2倍値 1.2(仕様 §9)/ 経験値% = 0.7(仕様 §9)
 */
export const BUDGET_RATES: Readonly<Record<StatId, number>> = {
  // フラット加算
  maxHP_flat: 12,
  maxMP_flat: 8,
  physATK_flat: 2.5,
  magicATK_flat: 2.5,
  fireATK_flat: 2.5,
  iceATK_flat: 2.5,
  lightningATK_flat: 2.5,
  poisonATK_flat: 2.5,
  lightATK_flat: 2.5,
  darkATK_flat: 2.5,
  armorDEF_flat: 3,
  hpRegen_flat: 1.2,
  mpRegen_flat: 0.8,
  // 増加%
  dmg_pct: 1.0,
  physDmg_pct: 1.0,
  magicDmg_pct: 1.0,
  fireDmg_pct: 1.0,
  iceDmg_pct: 1.0,
  lightningDmg_pct: 1.0,
  poisonDmg_pct: 1.0,
  lightDmg_pct: 1.0,
  darkDmg_pct: 1.0,
  atkSpeed_pct: 0.7,
  castSpeed_pct: 0.7,
  speed_pct: 0.7,
  moveSpeed_pct: 0.7,
  // クリティカル
  critChance_pct: 0.5,
  critDmg_pct: 1.2,
  fireCritChance_pct: 0.5,
  iceCritChance_pct: 0.5,
  lightningCritChance_pct: 0.5,
  poisonCritChance_pct: 0.5,
  lightCritChance_pct: 0.5,
  darkCritChance_pct: 0.5,
  fireCritDmg_pct: 1.2,
  iceCritDmg_pct: 1.2,
  lightningCritDmg_pct: 1.2,
  poisonCritDmg_pct: 1.2,
  lightCritDmg_pct: 1.2,
  darkCritDmg_pct: 1.2,
  // 防御
  fireRes_pct: 1.3,
  iceRes_pct: 1.3,
  lightningRes_pct: 1.3,
  poisonRes_pct: 1.3,
  lightRes_pct: 1.3,
  darkRes_pct: 1.3,
  allRes_pct: 0.65,
  evasion_pct: 0.8,
  block_pct: 0.8,
  physReduction_pct: 0.8,
  poisonAilRes_pct: 1.3,
  paralysisAilRes_pct: 1.3,
  burnAilRes_pct: 1.3,
  freezeAilRes_pct: 1.3,
  silenceAilRes_pct: 1.3,
  // 状態異常付与
  poisonApply_pct: 0.5,
  paralysisApply_pct: 0.5,
  burnApply_pct: 0.5,
  freezeApply_pct: 0.5,
  silenceApply_pct: 0.5,
  poisonEffect_pct: 1.0,
  paralysisEffect_pct: 1.0,
  burnEffect_pct: 1.0,
  freezeEffect_pct: 1.0,
  silenceEffect_pct: 1.0,
  // ユーティリティ
  rarity_pct: 0.6,
  exp_pct: 0.7,
  gold_pct: 1.2,
  // スキル強化
  attackPower_pct: 1.0,
  healPower_pct: 1.0,
  buffPower_pct: 1.0,
  debuffPower_pct: 1.0,
  summonPower_pct: 1.0,
  attackMpCost_pct: 0.7,
  healMpCost_pct: 0.7,
  buffMpCost_pct: 0.7,
  debuffMpCost_pct: 0.7,
  summonMpCost_pct: 0.7,
  fireSkillPower_pct: 1.0,
  iceSkillPower_pct: 1.0,
  lightningSkillPower_pct: 1.0,
  poisonSkillPower_pct: 1.0,
  lightSkillPower_pct: 1.0,
  darkSkillPower_pct: 1.0,
  mpCost_pct: 0.7,
};
