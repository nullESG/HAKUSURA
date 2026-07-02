/**
 * アフィックス全500種(仕様 §8〜10)。
 * すべて builder の統一式(value = rate × 4 × 1.25^(tier-1)、±10%)から生成する。
 * 内訳(仕様 §10): 基本60 / 増加%70 / クリ40 / 防御90 / 状態異常50 /
 * ユーティリティ60 / スキル強化60 / ハイブリッド70 = 500
 */
import type { AffixDefinition, AilmentType, ItemType, NonPhysElement, SkillKind, StatId } from '../../core/types';
import { makeAffix, makeVariants } from './builder';

const ELEMS: readonly NonPhysElement[] = ['fire', 'ice', 'lightning', 'poison', 'light', 'dark'];
const AILMENTS: readonly AilmentType[] = ['poison', 'paralysis', 'burn', 'freeze', 'silence'];
const KINDS: readonly SkillKind[] = ['attack', 'heal', 'buff', 'debuff', 'summon'];

const ELEM_JA: Record<NonPhysElement, string> = {
  fire: '火', ice: '氷', lightning: '雷', poison: '毒', light: '光', dark: '闇',
};
const AIL_JA: Record<AilmentType, string> = {
  poison: '毒', paralysis: '麻痺', burn: '火傷', freeze: '凍結', silence: '沈黙',
};
const KIND_JA: Record<SkillKind, string> = {
  attack: '攻撃', heal: '回復', buff: '強化', debuff: '弱体', summon: '召喚',
};

// 装備タイプ集合
const WEAPONS: readonly ItemType[] = ['weapon1h', 'weapon2h'];
const JEWELRY: readonly ItemType[] = ['amulet', 'ring'];
type V = readonly (readonly [string, readonly ItemType[]])[];
const t = (x: ItemType): readonly [string, readonly ItemType[]] => [x, [x]];

// ============================================================
// A. 基本stat系(60)
// ============================================================
const DEFENSIVE_6: V = [t('armor'), t('helmet'), t('shield'), t('belt'), t('amulet'), t('ring')];
const DEF_SLOTS_6: V = [t('armor'), t('helmet'), t('gloves'), t('boots'), t('shield'), t('belt')];
const ATK_SLOTS_6: V = [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet'), t('belt')];
const ELEM_ATK_5: V = [t('weapon1h'), t('weapon2h'), t('ring'), t('amulet'), t('gloves')];

const basicFlat: AffixDefinition[] = [
  ...makeVariants(
    { idBase: 'flat_life', group: 'life', type: 'prefix', name: '生命の (T{tier})', stats: ['maxHP_flat'] },
    DEFENSIVE_6,
  ),
  ...makeVariants(
    { idBase: 'flat_mana', group: 'mana', type: 'prefix', name: '魔力の (T{tier})', stats: ['maxMP_flat'] },
    DEFENSIVE_6,
  ),
  ...makeVariants(
    { idBase: 'flat_def', group: 'armor_flat', type: 'prefix', name: '守護の (T{tier})', stats: ['armorDEF_flat'] },
    DEF_SLOTS_6,
  ),
  ...makeVariants(
    { idBase: 'flat_phys', group: 'phys_flat', type: 'prefix', name: '剛力の (T{tier})', stats: ['physATK_flat'] },
    ATK_SLOTS_6,
  ),
  ...makeVariants(
    { idBase: 'flat_magic', group: 'magic_flat', type: 'prefix', name: '叡智の (T{tier})', stats: ['magicATK_flat'] },
    ATK_SLOTS_6,
  ),
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `flat_${e}`,
        group: `${e}_flat`,
        type: 'prefix',
        name: `${ELEM_JA[e]}撃の (T{tier})`,
        stats: [`${e}ATK_flat` as StatId],
      },
      ELEM_ATK_5,
    ),
  ),
];

// ============================================================
// B. 増加%系(70)
// ============================================================
// boots を含めるのは「prefix プールが armor_flat のみ」になるのを防ぐため
const INC_DMG_6: V = [t('weapon1h'), t('weapon2h'), t('amulet'), t('ring'), t('gloves'), t('boots')];
const INC_DMG_5: V = [t('weapon1h'), t('weapon2h'), t('amulet'), t('ring'), t('gloves')];
const SPEED_6: V = [t('boots'), t('belt'), t('helmet'), t('amulet'), t('ring'), t('armor')];

const increasedPct: AffixDefinition[] = [
  ...makeVariants(
    { idBase: 'inc_dmg', group: 'inc_dmg', type: 'prefix', name: '破壊の (T{tier})', stats: ['dmg_pct'] },
    INC_DMG_6,
  ),
  ...makeVariants(
    { idBase: 'inc_phys', group: 'inc_phys', type: 'prefix', name: '武勇の (T{tier})', stats: ['physDmg_pct'] },
    INC_DMG_5,
  ),
  ...makeVariants(
    { idBase: 'inc_magic', group: 'inc_magic', type: 'prefix', name: '秘術の (T{tier})', stats: ['magicDmg_pct'] },
    INC_DMG_5,
  ),
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `inc_${e}`,
        group: `inc_${e}`,
        type: 'prefix',
        name: `${ELEM_JA[e]}威の (T{tier})`,
        stats: [`${e}Dmg_pct` as StatId],
      },
      INC_DMG_6,
    ),
  ),
  ...makeVariants(
    { idBase: 'atk_speed', group: 'atk_speed', type: 'suffix', name: '迅撃 (T{tier})', stats: ['atkSpeed_pct'] },
    ATK_SLOTS_6,
  ),
  ...makeVariants(
    { idBase: 'cast_speed', group: 'cast_speed', type: 'suffix', name: '速詠 (T{tier})', stats: ['castSpeed_pct'] },
    ATK_SLOTS_6,
  ),
  ...makeVariants(
    { idBase: 'speed', group: 'speed', type: 'suffix', name: '俊足 (T{tier})', stats: ['speed_pct'] },
    SPEED_6,
  ),
];

// ============================================================
// C. クリティカル系(40)
// ============================================================
const CRIT_5: V = [t('weapon1h'), t('weapon2h'), t('ring'), t('amulet'), t('gloves')];

const critical: AffixDefinition[] = [
  ...makeVariants(
    { idBase: 'crit_chance', group: 'crit_chance', type: 'suffix', name: '鋭眼 (T{tier})', stats: ['critChance_pct'] },
    CRIT_5,
  ),
  ...makeVariants(
    { idBase: 'crit_dmg', group: 'crit_dmg', type: 'suffix', name: '急所 (T{tier})', stats: ['critDmg_pct'] },
    CRIT_5,
  ),
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `${e}_crit_chance`,
        group: `${e}_crit_chance`,
        type: 'suffix',
        name: `${ELEM_JA[e]}の鋭眼 (T{tier})`,
        stats: [`${e}CritChance_pct` as StatId],
      },
      [['weapons', WEAPONS], ['jewelry', JEWELRY]],
    ),
  ),
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `${e}_crit_dmg`,
        group: `${e}_crit_dmg`,
        type: 'suffix',
        name: `${ELEM_JA[e]}の急所 (T{tier})`,
        stats: [`${e}CritDmg_pct` as StatId],
      },
      [['weapons', WEAPONS], ['jewelry', JEWELRY], t('gloves')],
    ),
  ),
];

// ============================================================
// D. 防御系(90)
// ============================================================
const RES_7: V = [t('armor'), t('helmet'), t('shield'), t('boots'), t('belt'), t('amulet'), t('ring')];

const defense: AffixDefinition[] = [
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `${e}_res`,
        group: `${e}_res`,
        type: 'suffix',
        name: `${ELEM_JA[e]}耐性 (T{tier})`,
        stats: [`${e}Res_pct` as StatId],
      },
      RES_7,
    ),
  ),
  ...makeVariants(
    { idBase: 'all_res', group: 'all_res', type: 'suffix', name: '全耐性 (T{tier})', stats: ['allRes_pct'], weight: 40 },
    [t('amulet'), t('ring'), t('shield')],
  ),
  ...makeVariants(
    { idBase: 'evasion', group: 'evasion', type: 'suffix', name: '回避 (T{tier})', stats: ['evasion_pct'] },
    [t('armor'), t('helmet'), t('gloves'), t('boots'), t('belt'), t('amulet')],
  ),
  makeAffix({
    id: 'block_shield', group: 'block', type: 'suffix', name: '防塞 (T{tier})', stats: ['block_pct'], allowed: ['shield'],
  }),
  ...makeVariants(
    { idBase: 'phys_red', group: 'phys_red', type: 'suffix', name: '物理軽減 (T{tier})', stats: ['physReduction_pct'], weight: 60 },
    [t('armor'), t('shield'), t('belt')],
  ),
  ...AILMENTS.flatMap((a) =>
    makeVariants(
      {
        idBase: `${a}_ail_res`,
        group: `${a}_ail_res`,
        type: 'suffix',
        name: `${AIL_JA[a]}耐性 (T{tier})`,
        stats: [`${a}AilRes_pct` as StatId],
      },
      RES_7,
    ),
  ),
];

// ============================================================
// E. 状態異常付与系(50)
// ============================================================
const ailment: AffixDefinition[] = [
  ...AILMENTS.flatMap((a) =>
    makeVariants(
      {
        idBase: `${a}_apply`,
        group: `${a}_apply`,
        type: 'prefix',
        name: `${AIL_JA[a]}付与 (T{tier})`,
        stats: [`${a}Apply_pct` as StatId],
      },
      CRIT_5,
    ),
  ),
  ...AILMENTS.flatMap((a) =>
    makeVariants(
      {
        idBase: `${a}_effect`,
        group: `${a}_effect`,
        type: 'suffix',
        name: `${AIL_JA[a]}強化 (T{tier})`,
        stats: [`${a}Effect_pct` as StatId],
      },
      CRIT_5,
    ),
  ),
];

// ============================================================
// F. ユーティリティ系(60)
// ============================================================
const ALL_TYPES: readonly ItemType[] = [
  'weapon1h', 'weapon2h', 'shield', 'helmet', 'armor', 'gloves', 'boots', 'amulet', 'ring', 'belt',
];
const EACH_TYPE: V = ALL_TYPES.map((x) => t(x));

const utilSpecs: readonly { idBase: string; group: string; name: string; stat: StatId; weight: number }[] = [
  { idBase: 'magic_find', group: 'magic_find', name: '富貴 (T{tier})', stat: 'rarity_pct', weight: 50 },
  { idBase: 'exp_gain', group: 'exp', name: '修練 (T{tier})', stat: 'exp_pct', weight: 50 },
  { idBase: 'gold_find', group: 'gold', name: '蓄財 (T{tier})', stat: 'gold_pct', weight: 70 },
  { idBase: 'hp_regen', group: 'hp_regen', name: '再生 (T{tier})', stat: 'hpRegen_flat', weight: 100 },
  { idBase: 'mp_regen', group: 'mp_regen', name: '湧泉 (T{tier})', stat: 'mpRegen_flat', weight: 100 },
  { idBase: 'move_speed', group: 'move_speed', name: '駿行 (T{tier})', stat: 'moveSpeed_pct', weight: 60 },
];

const utility: AffixDefinition[] = utilSpecs.flatMap((u) =>
  makeVariants(
    { idBase: u.idBase, group: u.group, type: 'suffix', name: u.name, stats: [u.stat], weight: u.weight },
    EACH_TYPE,
  ),
);

// ============================================================
// G. スキル強化系(60)
// ============================================================
const SKILL_4: V = [['weapons', WEAPONS], t('amulet'), t('ring'), t('helmet')];

const skillBoost: AffixDefinition[] = [
  ...KINDS.flatMap((k) =>
    makeVariants(
      {
        idBase: `${k}_power`,
        group: `${k}_power`,
        type: 'prefix',
        name: `${KIND_JA[k]}スキル威力 (T{tier})`,
        stats: [`${k}Power_pct` as StatId],
      },
      SKILL_4,
    ),
  ),
  ...KINDS.flatMap((k) =>
    makeVariants(
      {
        idBase: `${k}_mpcost`,
        group: `${k}_mpcost`,
        type: 'suffix',
        name: `${KIND_JA[k]}スキル省魔 (T{tier})`,
        stats: [`${k}MpCost_pct` as StatId],
      },
      SKILL_4,
    ),
  ),
  ...ELEMS.flatMap((e) =>
    makeVariants(
      {
        idBase: `${e}_skill_power`,
        group: `${e}_skill_power`,
        type: 'prefix',
        name: `${ELEM_JA[e]}スキル威力 (T{tier})`,
        stats: [`${e}SkillPower_pct` as StatId],
      },
      [['weapons', WEAPONS], t('amulet'), t('ring')],
    ),
  ),
  ...makeVariants(
    { idBase: 'mp_cost_all', group: 'mp_cost_all', type: 'suffix', name: '省魔 (T{tier})', stats: ['mpCost_pct'], weight: 40 },
    [t('helmet'), t('amulet')],
  ),
];

// ============================================================
// H. ハイブリッド複合系(70 / Legendary以上限定 / 各stat budget×0.6)
// ============================================================
const hybridCombos: readonly {
  key: string; name: string; stats: readonly [StatId, StatId]; slots: V;
}[] = [
  { key: 'life_mana', name: '生命と魔力 (T{tier})', stats: ['maxHP_flat', 'maxMP_flat'], slots: [t('armor'), t('helmet'), t('belt'), t('amulet'), t('ring')] },
  { key: 'life_def', name: '生命と守護 (T{tier})', stats: ['maxHP_flat', 'armorDEF_flat'], slots: [t('armor'), t('helmet'), t('shield'), t('belt'), t('boots')] },
  { key: 'life_evasion', name: '生命と回避 (T{tier})', stats: ['maxHP_flat', 'evasion_pct'], slots: [t('armor'), t('helmet'), t('gloves'), t('boots'), t('belt')] },
  { key: 'mana_cast', name: '魔力と速詠 (T{tier})', stats: ['maxMP_flat', 'castSpeed_pct'], slots: [t('helmet'), t('amulet'), t('ring'), t('belt'), t('armor')] },
  { key: 'phys_crit', name: '剛力と鋭眼 (T{tier})', stats: ['physATK_flat', 'critChance_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'phys_aspd', name: '剛力と迅撃 (T{tier})', stats: ['physATK_flat', 'atkSpeed_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'magic_cast', name: '叡智と速詠 (T{tier})', stats: ['magicATK_flat', 'castSpeed_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'magic_mana', name: '叡智と魔力 (T{tier})', stats: ['magicATK_flat', 'maxMP_flat'], slots: [t('weapon1h'), t('weapon2h'), t('helmet'), t('ring'), t('amulet')] },
  { key: 'dmg_critdmg', name: '破壊と急所 (T{tier})', stats: ['dmg_pct', 'critDmg_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'fire_atk_dmg', name: '火撃と火威 (T{tier})', stats: ['fireATK_flat', 'fireDmg_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'ice_atk_dmg', name: '氷撃と氷威 (T{tier})', stats: ['iceATK_flat', 'iceDmg_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'lightning_atk_dmg', name: '雷撃と雷威 (T{tier})', stats: ['lightningATK_flat', 'lightningDmg_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'crit_full', name: '鋭眼と急所 (T{tier})', stats: ['critChance_pct', 'critDmg_pct'], slots: [t('weapon1h'), t('weapon2h'), t('gloves'), t('ring'), t('amulet')] },
  { key: 'mf_gold', name: '富貴と蓄財 (T{tier})', stats: ['rarity_pct', 'gold_pct'], slots: [t('helmet'), t('gloves'), t('boots'), t('ring'), t('amulet')] },
];

const hybrid: AffixDefinition[] = hybridCombos.flatMap((c) =>
  makeVariants(
    { idBase: `hyb_${c.key}`, group: `hyb_${c.key}`, type: 'prefix', name: c.name, stats: c.stats, weight: 30, hybrid: true },
    c.slots,
  ),
);

// ============================================================
// 集約
// ============================================================
export const AFFIX_CATEGORIES = {
  basicFlat,
  increasedPct,
  critical,
  defense,
  ailment,
  utility,
  skillBoost,
  hybrid,
} as const;

/** 全アフィックス(500種)。 */
export const ALL_AFFIXES: readonly AffixDefinition[] = Object.values(AFFIX_CATEGORIES).flat();

/** id → 定義の索引。 */
export const AFFIX_BY_ID: ReadonlyMap<string, AffixDefinition> = new Map(
  ALL_AFFIXES.map((a) => [a.id, a]),
);

export { TIER_MIN_ILVLS, budgetOfTier } from './builder';
export { BUDGET_RATES } from './budgetRates';
