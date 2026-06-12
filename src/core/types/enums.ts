/** 属性(仕様 §4)。 */
export const ELEMENT_TYPES = [
  'physical',
  'fire',
  'ice',
  'lightning',
  'poison',
  'light',
  'dark',
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

/** レアリティ階層(仕様 §5-1)。ドロップ重み等の数値は src/data/ 側で定義する。 */
export const RARITIES = [
  'common',
  'magic',
  'rare',
  'epic',
  'legendary',
  'unique',
  'set',
] as const;
export type Rarity = (typeof RARITIES)[number];

/** ベースアイテム種別。アフィックスの allowedItemTypes もこれを使う(仕様 §5-3, §5-4)。 */
export const ITEM_TYPES = [
  'weapon1h',
  'weapon2h',
  'shield',
  'helmet',
  'armor',
  'gloves',
  'boots',
  'amulet',
  'ring',
  'belt',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/**
 * 装備スロット(仕様 §5-3)。
 * 武器+盾+兜+鎧+手+足+アミュレット+指輪×2+ベルト = 10 スロット。
 * ※仕様には「計11」とあるが列挙すると10のため、10で実装(仮定として報告済み)。
 */
export const EQUIP_SLOTS = [
  'mainHand',
  'offHand', // 盾。両手武器装備時は使用不可
  'helmet',
  'armor',
  'gloves',
  'boots',
  'amulet',
  'ring1',
  'ring2',
  'belt',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** アフィックスの接頭辞 / 接尾辞(仕様 §5-4)。 */
export type AffixType = 'prefix' | 'suffix';

/**
 * アフィックスや装備が変化させるステータスのキー(仕様 §9 の stat 列に準拠)。
 * ブロックB(500種生成)で状態異常付与系・スキル強化系のキーを追加する。
 */
export const STAT_IDS = [
  // --- フラット加算 ---
  'maxHP_flat',
  'maxMP_flat',
  'physATK_flat',
  'magicATK_flat',
  'fireATK_flat',
  'iceATK_flat',
  'lightningATK_flat',
  'poisonATK_flat',
  'lightATK_flat',
  'darkATK_flat',
  'armorDEF_flat',
  // --- 増加% ---
  'dmg_pct',
  'atkSpeed_pct',
  'speed_pct',
  'critChance_pct',
  'critDmg_pct',
  // --- 防御系 ---
  'fireRes_pct',
  'iceRes_pct',
  'lightningRes_pct',
  'poisonRes_pct',
  'lightRes_pct',
  'darkRes_pct',
  'evasion_pct',
  'block_pct',
  // --- ユーティリティ ---
  'rarity_pct', // magic find
  'exp_pct',
  'gold_pct',
] as const;
export type StatId = (typeof STAT_IDS)[number];

/** stat → 数値の集計マップ。装備・パッシブ・バフの合算に使う。 */
export type StatMap = Partial<Record<StatId, number>>;

/** 状態異常(仕様 §4)。 */
export const AILMENT_TYPES = ['poison', 'paralysis', 'burn', 'freeze', 'silence'] as const;
export type AilmentType = (typeof AILMENT_TYPES)[number];

/** スキルの種別(仕様 §3)。 */
export type SkillKind = 'attack' | 'heal' | 'buff' | 'debuff' | 'summon';

/** スキルの効果範囲(仕様 §3)。 */
export type TargetScope = 'singleEnemy' | 'allEnemies' | 'self' | 'singleAlly' | 'allAllies';

/** スキルツリーのノード種別(仕様 §3)。 */
export type SkillNodeType = 'active' | 'passive' | 'keystone';
