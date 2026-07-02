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

/** 物理以外の属性(属性別アフィックスの派生に使う)。 */
export type NonPhysElement = Exclude<ElementType, 'physical'>;

/**
 * アフィックスや装備が変化させるステータスのキー(仕様 §9 の stat 列に準拠)。
 * 属性別・状態異常別はテンプレートリテラル型で派生する
 * (例: `fireATK_flat`, `poisonApply_pct`)。
 */
export type StatId =
  // --- フラット加算 ---
  | 'maxHP_flat'
  | 'maxMP_flat'
  | 'physATK_flat'
  | 'magicATK_flat'
  | `${NonPhysElement}ATK_flat`
  | 'armorDEF_flat'
  | 'hpRegen_flat'
  | 'mpRegen_flat'
  // --- 増加% ---
  | 'dmg_pct'
  | 'physDmg_pct'
  | 'magicDmg_pct'
  | `${NonPhysElement}Dmg_pct`
  | 'atkSpeed_pct'
  | 'castSpeed_pct'
  | 'speed_pct'
  | 'moveSpeed_pct'
  // --- クリティカル系 ---
  | 'critChance_pct'
  | 'critDmg_pct'
  | `${NonPhysElement}CritChance_pct`
  | `${NonPhysElement}CritDmg_pct`
  // --- 防御系 ---
  | `${NonPhysElement}Res_pct`
  | 'allRes_pct'
  | 'evasion_pct'
  | 'block_pct'
  | 'physReduction_pct'
  | `${AilmentType}AilRes_pct`
  // --- 状態異常付与系 ---
  | `${AilmentType}Apply_pct`
  | `${AilmentType}Effect_pct`
  // --- ユーティリティ ---
  | 'rarity_pct' // magic find
  | 'exp_pct'
  | 'gold_pct'
  // --- スキル強化系 ---
  | `${SkillKind}Power_pct`
  | `${SkillKind}MpCost_pct`
  | `${NonPhysElement}SkillPower_pct`
  | 'mpCost_pct';

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
