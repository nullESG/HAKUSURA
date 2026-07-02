import { GAME_CONSTANTS } from '../core/constants';
import type { AffixDefinition, AffixTierDef, AffixTierStatRange } from '../core/types/affix';
import type { AffixType, ItemType, Rarity, StatId } from '../core/types/enums';

/**
 * アフィックスマスタ(仕様 §5-4, §8)。
 *
 * 「全500種」= 50 定義 × 10 Tier のロール可能アフィックス総数、と解釈して実装
 * (§8 の Tier 数 10 と整合。ブロックB報告の仮定参照)。
 *
 * 手書きするのは 50 行の宣言的テーブルのみで、Tier ごとの数値は §8 の式から機械生成する:
 * - value(tier) = t1Value * 1.25^(tier-1)
 * - budget(tier) = 4 * 1.25^(tier-1)(t1Value は「budget 4 で買える量」として定義)
 * - ロール幅 = 中央値 ±10%
 * - minILvl(tier) = ceil((tier-1) * 9.4)
 * - ハイブリッドは stat あたり 0.6 倍配分・legendary 以上限定
 */

const C = GAME_CONSTANTS;

/**
 * stat ごとの Tier1 中央値 =「budget 4 と等価な量」(仕様 §8 の正規化)。
 * 強い stat ほど 1 budget で買える量を小さくする(バランス調整はここで行う)。
 */
export const STAT_T1_VALUES: Readonly<Record<StatId, number>> = {
  maxHP_flat: 10,
  maxMP_flat: 5,
  physATK_flat: 3,
  magicATK_flat: 3,
  fireATK_flat: 4,
  iceATK_flat: 4,
  lightningATK_flat: 4,
  poisonATK_flat: 4,
  lightATK_flat: 4,
  darkATK_flat: 4,
  armorDEF_flat: 4,
  str_flat: 2,
  dex_flat: 2,
  int_flat: 2,
  vit_flat: 2,
  luk_flat: 2,
  dmg_pct: 3,
  atkSpeed_pct: 2,
  speed_pct: 2,
  critChance_pct: 1.5,
  critDmg_pct: 5,
  fireRes_pct: 3,
  iceRes_pct: 3,
  lightningRes_pct: 3,
  poisonRes_pct: 3,
  lightRes_pct: 3,
  darkRes_pct: 3,
  evasion_pct: 1.5,
  block_pct: 2,
  ailmentRes_pct: 3,
  thorns_flat: 3,
  hpRegen_flat: 2,
  mpRegen_flat: 1,
  lifeLeech_pct: 0.5,
  manaLeech_pct: 0.3,
  poisonChance_pct: 4,
  paralysisChance_pct: 2.5,
  burnChance_pct: 4,
  freezeChance_pct: 2.5,
  silenceChance_pct: 3,
  allSkillLevel_flat: 1,
  mpCost_pct: 1.5,
  rarity_pct: 4,
  exp_pct: 3,
  gold_pct: 5,
};

// --- allowedItemTypes の部位グループ ---
const WEAPONS: readonly ItemType[] = ['weapon1h', 'weapon2h'];
const ARMORS: readonly ItemType[] = ['helmet', 'armor', 'gloves', 'boots'];
const JEWELRY: readonly ItemType[] = ['amulet', 'ring', 'belt'];
const SHIELD: readonly ItemType[] = ['shield'];
const ALL_TYPES: readonly ItemType[] = [...WEAPONS, ...ARMORS, ...JEWELRY, ...SHIELD];

/** テーブル1行 = アフィックス1定義(数値は式から生成するため持たない)。 */
interface AffixRow {
  readonly id: string;
  readonly type: AffixType;
  readonly name: string;
  readonly stats: readonly StatId[];
  readonly itemTypes: readonly ItemType[];
  readonly weight: number;
  readonly minRarity?: Rarity;
}

/**
 * 宣言的アフィックステーブル(50 定義)。
 * group は 1 定義 = 1 グループ(同系 stat の重複付与は stat 自体が同じ定義に
 * 集約されているため、グループ排他 = 同一アフィックスの重複禁止として機能する)。
 */
const AFFIX_TABLE: readonly AffixRow[] = [
  // ===== Prefix: フラット・資源系(19) =====
  { id: 'hp_flat', type: 'prefix', name: '生命の', stats: ['maxHP_flat'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 100 },
  { id: 'mp_flat', type: 'prefix', name: '精神の', stats: ['maxMP_flat'], itemTypes: [...ARMORS, ...JEWELRY], weight: 80 },
  { id: 'phys_atk', type: 'prefix', name: '剛撃の', stats: ['physATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 100 },
  { id: 'magic_atk', type: 'prefix', name: '魔撃の', stats: ['magicATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 100 },
  { id: 'fire_atk', type: 'prefix', name: '業火の', stats: ['fireATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 70 },
  { id: 'ice_atk', type: 'prefix', name: '氷結の', stats: ['iceATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 70 },
  { id: 'lightning_atk', type: 'prefix', name: '雷鳴の', stats: ['lightningATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 70 },
  { id: 'poison_atk', type: 'prefix', name: '猛毒の', stats: ['poisonATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 70 },
  { id: 'light_atk', type: 'prefix', name: '聖光の', stats: ['lightATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 50 },
  { id: 'dark_atk', type: 'prefix', name: '闇夜の', stats: ['darkATK_flat'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 50 },
  { id: 'armor_def', type: 'prefix', name: '守護の', stats: ['armorDEF_flat'], itemTypes: [...ARMORS, ...SHIELD], weight: 100 },
  { id: 'str', type: 'prefix', name: '腕力の', stats: ['str_flat'], itemTypes: ALL_TYPES, weight: 60 },
  { id: 'dex', type: 'prefix', name: '俊敏の', stats: ['dex_flat'], itemTypes: ALL_TYPES, weight: 60 },
  { id: 'int', type: 'prefix', name: '知力の', stats: ['int_flat'], itemTypes: ALL_TYPES, weight: 60 },
  { id: 'vit', type: 'prefix', name: '体力の', stats: ['vit_flat'], itemTypes: ALL_TYPES, weight: 60 },
  { id: 'luk', type: 'prefix', name: '幸運の', stats: ['luk_flat'], itemTypes: ALL_TYPES, weight: 50 },
  { id: 'hp_regen', type: 'prefix', name: '再生の', stats: ['hpRegen_flat'], itemTypes: [...ARMORS, ...JEWELRY], weight: 60 },
  { id: 'mp_regen', type: 'prefix', name: '瞑想の', stats: ['mpRegen_flat'], itemTypes: [...ARMORS, ...JEWELRY], weight: 60 },
  { id: 'thorns', type: 'prefix', name: '茨の', stats: ['thorns_flat'], itemTypes: [...ARMORS, ...SHIELD], weight: 40 },
  // ===== Prefix: ハイブリッド複合(§8、legendary 限定)(3) =====
  { id: 'hyb_hp_vit', type: 'prefix', name: '巨人の', stats: ['maxHP_flat', 'vit_flat'], itemTypes: [...ARMORS], weight: 15, minRarity: 'legendary' },
  { id: 'hyb_phys_crit', type: 'prefix', name: '殺戮の', stats: ['physATK_flat', 'critChance_pct'], itemTypes: [...WEAPONS], weight: 15, minRarity: 'legendary' },
  { id: 'hyb_magic_mp', type: 'prefix', name: '大魔導の', stats: ['magicATK_flat', 'maxMP_flat'], itemTypes: [...WEAPONS], weight: 15, minRarity: 'legendary' },
  // ===== Suffix: 増加%・防御%・ユーティリティ系(26) =====
  { id: 'dmg_pct', type: 'suffix', name: '破壊', stats: ['dmg_pct'], itemTypes: [...WEAPONS], weight: 80 },
  { id: 'atk_speed', type: 'suffix', name: '迅速', stats: ['atkSpeed_pct'], itemTypes: [...WEAPONS, 'gloves'], weight: 70 },
  { id: 'speed', type: 'suffix', name: '疾風', stats: ['speed_pct'], itemTypes: ['boots', ...JEWELRY], weight: 70 },
  { id: 'crit_chance', type: 'suffix', name: '会心', stats: ['critChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 70 },
  { id: 'crit_dmg', type: 'suffix', name: '痛撃', stats: ['critDmg_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 60 },
  { id: 'fire_res', type: 'suffix', name: '耐火', stats: ['fireRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 90 },
  { id: 'ice_res', type: 'suffix', name: '耐氷', stats: ['iceRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 90 },
  { id: 'lightning_res', type: 'suffix', name: '耐雷', stats: ['lightningRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 90 },
  { id: 'poison_res', type: 'suffix', name: '耐毒', stats: ['poisonRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 90 },
  { id: 'light_res', type: 'suffix', name: '耐聖', stats: ['lightRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 60 },
  { id: 'dark_res', type: 'suffix', name: '耐闇', stats: ['darkRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 60 },
  { id: 'ailment_res', type: 'suffix', name: '不屈', stats: ['ailmentRes_pct'], itemTypes: [...ARMORS, ...JEWELRY, ...SHIELD], weight: 60 },
  { id: 'evasion', type: 'suffix', name: '回避', stats: ['evasion_pct'], itemTypes: [...ARMORS, ...JEWELRY], weight: 60 },
  { id: 'block', type: 'suffix', name: '鉄壁', stats: ['block_pct'], itemTypes: [...SHIELD], weight: 80 },
  { id: 'life_leech', type: 'suffix', name: '吸血', stats: ['lifeLeech_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 40 },
  { id: 'mana_leech', type: 'suffix', name: '吸魔', stats: ['manaLeech_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 40 },
  { id: 'mp_cost', type: 'suffix', name: '節約', stats: ['mpCost_pct'], itemTypes: ['helmet', ...JEWELRY], weight: 40 },
  { id: 'skill_level', type: 'suffix', name: '練達', stats: ['allSkillLevel_flat'], itemTypes: [...WEAPONS, 'amulet'], weight: 10, minRarity: 'epic' },
  { id: 'poison_chance', type: 'suffix', name: '毒牙', stats: ['poisonChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 30 },
  { id: 'paralysis_chance', type: 'suffix', name: '麻痺', stats: ['paralysisChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 25 },
  { id: 'burn_chance', type: 'suffix', name: '灼熱', stats: ['burnChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 30 },
  { id: 'freeze_chance', type: 'suffix', name: '凍結', stats: ['freezeChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 25 },
  { id: 'silence_chance', type: 'suffix', name: '沈黙', stats: ['silenceChance_pct'], itemTypes: [...WEAPONS, ...JEWELRY], weight: 20 },
  { id: 'rarity', type: 'suffix', name: '強欲', stats: ['rarity_pct'], itemTypes: ['helmet', ...JEWELRY], weight: 30 },
  { id: 'exp', type: 'suffix', name: '研鑽', stats: ['exp_pct'], itemTypes: [...JEWELRY], weight: 25 },
  { id: 'gold', type: 'suffix', name: '蓄財', stats: ['gold_pct'], itemTypes: [...JEWELRY], weight: 40 },
  // ===== Suffix: ハイブリッド複合(legendary 限定)(2) =====
  { id: 'hyb_crit_critdmg', type: 'suffix', name: '刺客', stats: ['critChance_pct', 'critDmg_pct'], itemTypes: [...JEWELRY], weight: 12, minRarity: 'legendary' },
  { id: 'hyb_speed_eva', type: 'suffix', name: '幻影', stats: ['speed_pct', 'evasion_pct'], itemTypes: ['boots', 'amulet', 'ring'], weight: 12, minRarity: 'legendary' },
];

/** stat の最小単位(フラット系は整数、%系は小数1桁)。 */
function statUnit(stat: StatId): number {
  return stat.endsWith('_flat') ? 1 : 0.1;
}

/**
 * 中央値 ±10% のロール範囲を stat の最小単位に丸める。
 * min は切り上げ・max は切り捨てにすることで、丸め後も ±10% 幅と budget を超えない。
 * 範囲内に丸め単位の値が存在しない粗い stat(スキルレベル等)は、
 * 中央値の切り捨て値による一点ロールとする(budget 内に収まる側へ倒す)。
 */
function roundRange(stat: StatId, mid: number): { min: number; max: number } {
  const unit = statUnit(stat);
  const lo = Math.ceil((mid * 0.9) / unit - 1e-9);
  const hi = Math.floor((mid * 1.1) / unit + 1e-9);
  const fix = (v: number): number => Math.round(Math.max(1, v) * unit * 10) / 10;
  if (lo > hi) {
    const point = fix(Math.floor(mid / unit + 1e-9));
    return { min: point, max: point };
  }
  return { min: fix(lo), max: fix(hi) };
}

/** Tier ごとの数値レンジを §8 の式から生成する。 */
function buildTiers(stats: readonly StatId[], isHybrid: boolean): AffixTierDef[] {
  const tiers: AffixTierDef[] = [];
  for (let tier = 1; tier <= C.affixTierCount; tier++) {
    const scale = Math.pow(C.affixTierGrowth, tier - 1);
    const ranges: AffixTierStatRange[] = stats.map((stat) => {
      const mid = STAT_T1_VALUES[stat] * (isHybrid ? C.hybridBudgetRatio : 1) * scale;
      const { min, max } = roundRange(stat, mid);
      return { stat, min, max };
    });
    tiers.push({
      tier,
      minILvl: Math.ceil((tier - 1) * C.affixTierILvlStep),
      stats: ranges,
    });
  }
  return tiers;
}

function buildDefinition(row: AffixRow): AffixDefinition {
  const isHybrid = row.stats.length > 1;
  return {
    id: row.id,
    group: row.id, // 1 定義 = 1 グループ(同一アフィックスの重複付与を排他)
    type: row.type,
    name: `${row.name} T{tier}`,
    weight: row.weight,
    allowedItemTypes: row.itemTypes,
    tiers: buildTiers(row.stats, isHybrid),
    ...(row.minRarity ? { minRarity: row.minRarity } : {}),
  };
}

/** 全アフィックス定義(50 定義 × 10 Tier = 500 種)。 */
export const AFFIX_DEFINITIONS: readonly AffixDefinition[] = AFFIX_TABLE.map(buildDefinition);

const AFFIX_BY_ID = new Map(AFFIX_DEFINITIONS.map((def) => [def.id, def]));

export function getAffixById(affixId: string): AffixDefinition {
  const def = AFFIX_BY_ID.get(affixId);
  if (!def) throw new Error(`Unknown affixId: ${affixId}`);
  return def;
}

/** ロール可能なアフィックス総数(定義 × Tier)。仕様の「全500種」に対応。 */
export const TOTAL_ROLLABLE_AFFIX_COUNT = AFFIX_DEFINITIONS.reduce(
  (acc, def) => acc + def.tiers.length,
  0,
);
