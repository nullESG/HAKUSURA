/** UI 表示用の日本語ラベル。ロジックからは参照しない(表示専用)。 */
import type { AilmentType, EquipSlot, Rarity, StatId } from '../core/types/enums';
import type { ItemInstance } from '../core/types/item';
import { getAffixById } from '../data/affixes';
import { getBaseItemById } from '../data/baseItems';
import { getUniqueById } from '../data/uniques';

export const STAT_LABELS: Readonly<Record<StatId, string>> = {
  maxHP_flat: '最大HP',
  maxMP_flat: '最大MP',
  physATK_flat: '物理攻撃',
  magicATK_flat: '魔法攻撃',
  fireATK_flat: '火属性攻撃',
  iceATK_flat: '氷属性攻撃',
  lightningATK_flat: '雷属性攻撃',
  poisonATK_flat: '毒属性攻撃',
  lightATK_flat: '聖属性攻撃',
  darkATK_flat: '闇属性攻撃',
  armorDEF_flat: '防御力',
  str_flat: 'STR',
  dex_flat: 'DEX',
  int_flat: 'INT',
  vit_flat: 'VIT',
  luk_flat: 'LUK',
  dmg_pct: 'ダメージ%',
  atkSpeed_pct: '攻撃速度%',
  speed_pct: '行動速度%',
  critChance_pct: 'クリティカル率%',
  critDmg_pct: 'クリティカルダメージ%',
  fireRes_pct: '火耐性%',
  iceRes_pct: '氷耐性%',
  lightningRes_pct: '雷耐性%',
  poisonRes_pct: '毒耐性%',
  lightRes_pct: '聖耐性%',
  darkRes_pct: '闇耐性%',
  evasion_pct: '回避%',
  block_pct: 'ブロック%',
  ailmentRes_pct: '状態異常耐性%',
  thorns_flat: '反射ダメージ',
  hpRegen_flat: 'HP自動回復',
  mpRegen_flat: 'MP自動回復',
  lifeLeech_pct: 'HP吸収%',
  manaLeech_pct: 'MP吸収%',
  poisonChance_pct: '毒付与%',
  paralysisChance_pct: '麻痺付与%',
  burnChance_pct: '火傷付与%',
  freezeChance_pct: '凍結付与%',
  silenceChance_pct: '沈黙付与%',
  allSkillLevel_flat: '全スキルレベル',
  mpCost_pct: 'MP消費軽減%',
  rarity_pct: 'アイテム発見%',
  exp_pct: '経験値%',
  gold_pct: 'ゴールド%',
};

export const RARITY_LABELS: Readonly<Record<Rarity, string>> = {
  common: 'コモン',
  magic: 'マジック',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
  unique: 'ユニーク',
  set: 'セット',
};

/** レアリティの表示色(Tailwind クラス)。 */
export const RARITY_TEXT_CLASS: Readonly<Record<Rarity, string>> = {
  common: 'text-zinc-300',
  magic: 'text-sky-400',
  rare: 'text-yellow-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
  unique: 'text-rose-400',
  set: 'text-emerald-400',
};

export const AILMENT_LABELS: Readonly<Record<AilmentType, string>> = {
  poison: '毒',
  paralysis: '麻痺',
  burn: '火傷',
  freeze: '凍結',
  silence: '沈黙',
};

export const SLOT_LABELS: Readonly<Record<EquipSlot, string>> = {
  mainHand: '武器',
  offHand: '盾',
  helmet: '兜',
  armor: '鎧',
  gloves: '手',
  boots: '足',
  amulet: '首飾り',
  ring1: '指輪1',
  ring2: '指輪2',
  belt: 'ベルト',
};

/** アイテムの表示名(ユニークは固有名、それ以外はベース名)。 */
export function itemDisplayName(item: ItemInstance): string {
  if (item.uniqueId) return getUniqueById(item.uniqueId).name;
  return getBaseItemById(item.baseItemId).name;
}

/** ロール済みアフィックスを「毒付与% +4.2 (T3)」形式の行に変換する。 */
export function formatAffix(affix: ItemInstance['affixes'][number]): string {
  const def = getAffixById(affix.affixId);
  const parts = Object.entries(affix.values).map(
    ([stat, value]) => `${STAT_LABELS[stat as StatId]} +${value}`,
  );
  return `${parts.join(' / ')} (${def.name.replace('{tier}', String(affix.tier))})`;
}
