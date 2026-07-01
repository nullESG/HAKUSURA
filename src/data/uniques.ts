import type { ItemSetDefinition, UniqueItemDefinition } from '../core/types/item';

/**
 * ユニーク装備マスタ(仕様 §5-5)。
 * 固定アフィックス(affixId + tier 固定)を持ち、値のみ Tier レンジ内でロールされる。
 * 数式化できない固有効果は specialEffectId で戦闘エンジン(ブロックC)に委譲する。
 */
export const UNIQUE_ITEM_DEFINITIONS: readonly UniqueItemDefinition[] = [
  {
    id: 'ring_of_greed',
    name: '貪欲の指輪',
    baseItemId: 'copper_ring',
    fixedAffixes: [
      { affixId: 'gold', tier: 5 },
      { affixId: 'rarity', tier: 5 },
    ],
    specialEffectId: 'greed_double_gold', // 戦闘勝利時ゴールド2倍
    flavorText: '持ち主の欲望は、底なしの財布よりも深い。',
  },
  {
    id: 'flame_cleaver',
    name: '焔断ちの大斧',
    baseItemId: 'battle_axe',
    fixedAffixes: [
      { affixId: 'fire_atk', tier: 6 },
      { affixId: 'burn_chance', tier: 5 },
      { affixId: 'dmg_pct', tier: 4 },
    ],
    flavorText: '斬られた傷口は、決して冷めることがない。',
  },
  {
    id: 'frost_ward',
    name: '霜の護り',
    baseItemId: 'kite_shield',
    fixedAffixes: [
      { affixId: 'ice_res', tier: 7 },
      { affixId: 'block', tier: 5 },
      { affixId: 'hp_flat', tier: 4 },
    ],
    flavorText: '氷壁は砕けるたびに、より硬く凍り直す。',
  },
  {
    id: 'arcanist_crown',
    name: '大魔導師の宝冠',
    baseItemId: 'iron_helm',
    fixedAffixes: [
      { affixId: 'int', tier: 6 },
      { affixId: 'skill_level', tier: 3 },
      { affixId: 'mp_cost', tier: 5 },
    ],
    flavorText: '知識の重みに耐えられる者だけが戴ける。',
  },
  {
    id: 'vampire_fang',
    name: '吸血鬼の牙',
    baseItemId: 'short_sword',
    fixedAffixes: [
      { affixId: 'life_leech', tier: 6 },
      { affixId: 'phys_atk', tier: 5 },
      { affixId: 'poison_chance', tier: 3 },
    ],
    flavorText: '刃が渇くと、鞘の中で疼きだす。',
  },
  {
    id: 'storm_striders',
    name: '嵐渡りの長靴',
    baseItemId: 'leather_boots',
    fixedAffixes: [
      { affixId: 'speed', tier: 6 },
      { affixId: 'lightning_res', tier: 5 },
      { affixId: 'evasion', tier: 4 },
    ],
    flavorText: '雷鳴より速く駆けた者の伝説が残る。',
  },
  {
    id: 'titan_heart',
    name: '巨人の心臓',
    baseItemId: 'plate_armor',
    fixedAffixes: [
      { affixId: 'hp_flat', tier: 8 },
      { affixId: 'vit', tier: 6 },
      { affixId: 'thorns', tier: 5 },
    ],
    flavorText: '鼓動のひとつひとつが、大地を揺らす。',
  },
  {
    id: 'moonlit_charm',
    name: '月光の護符',
    baseItemId: 'jade_amulet',
    fixedAffixes: [
      { affixId: 'mp_flat', tier: 6 },
      { affixId: 'mp_regen', tier: 5 },
      { affixId: 'magic_atk', tier: 4 },
    ],
    flavorText: '満ちては欠ける月のように、魔力は巡る。',
  },
  // ===== セット部位(仕様 §5-6。セットはユニークの一種として実装) =====
  {
    id: 'hunter_hood',
    name: '影狩りの頭巾',
    baseItemId: 'leather_cap',
    fixedAffixes: [
      { affixId: 'dex', tier: 4 },
      { affixId: 'crit_chance', tier: 3 },
    ],
  },
  {
    id: 'hunter_garb',
    name: '影狩りの装束',
    baseItemId: 'cloth_robe',
    fixedAffixes: [
      { affixId: 'evasion', tier: 4 },
      { affixId: 'hp_flat', tier: 3 },
    ],
  },
  {
    id: 'hunter_treads',
    name: '影狩りの足具',
    baseItemId: 'leather_boots',
    fixedAffixes: [
      { affixId: 'speed', tier: 4 },
      { affixId: 'dex', tier: 3 },
    ],
  },
  {
    id: 'sage_circlet',
    name: '大賢者の額冠',
    baseItemId: 'leather_cap',
    fixedAffixes: [
      { affixId: 'int', tier: 4 },
      { affixId: 'mp_regen', tier: 3 },
    ],
  },
  {
    id: 'sage_robe',
    name: '大賢者の法衣',
    baseItemId: 'cloth_robe',
    fixedAffixes: [
      { affixId: 'mp_flat', tier: 4 },
      { affixId: 'magic_atk', tier: 3 },
    ],
  },
  {
    id: 'sage_orb',
    name: '大賢者の宝珠',
    baseItemId: 'copper_amulet',
    fixedAffixes: [
      { affixId: 'int', tier: 4 },
      { affixId: 'mp_cost', tier: 3 },
    ],
  },
] as const;

/** セット定義(仕様 §5-6)。部位数に応じた段階ボーナス。 */
export const ITEM_SET_DEFINITIONS: readonly ItemSetDefinition[] = [
  {
    id: 'shadow_hunter_set',
    name: '影狩りの三具',
    pieceIds: ['hunter_hood', 'hunter_garb', 'hunter_treads'],
    bonuses: [
      { requiredPieces: 2, stats: { dex_flat: 15, critChance_pct: 5 } },
      {
        requiredPieces: 3,
        stats: { atkSpeed_pct: 15, dmg_pct: 20 },
        specialEffectId: 'hunter_double_strike', // 通常攻撃が2回攻撃になる
      },
    ],
  },
  {
    id: 'grand_sage_set',
    name: '大賢者の三宝',
    pieceIds: ['sage_circlet', 'sage_robe', 'sage_orb'],
    bonuses: [
      { requiredPieces: 2, stats: { int_flat: 15, maxMP_flat: 40 } },
      {
        requiredPieces: 3,
        stats: { mpCost_pct: 20 },
        specialEffectId: 'sage_free_cast', // 一定確率でMP消費なしで詠唱
      },
    ],
  },
] as const;

const UNIQUE_BY_ID = new Map(UNIQUE_ITEM_DEFINITIONS.map((def) => [def.id, def]));
const SET_BY_ID = new Map(ITEM_SET_DEFINITIONS.map((def) => [def.id, def]));

/** セット部位アイテムID → 所属セット定義。 */
const SET_BY_PIECE_ID = new Map(
  ITEM_SET_DEFINITIONS.flatMap((set) => set.pieceIds.map((pieceId) => [pieceId, set] as const)),
);

export function getUniqueById(uniqueId: string): UniqueItemDefinition {
  const def = UNIQUE_BY_ID.get(uniqueId);
  if (!def) throw new Error(`Unknown uniqueId: ${uniqueId}`);
  return def;
}

export function getSetById(setId: string): ItemSetDefinition {
  const def = SET_BY_ID.get(setId);
  if (!def) throw new Error(`Unknown setId: ${setId}`);
  return def;
}

/** ユニークIDがセット部位なら所属セットを返す(通常ユニークなら undefined)。 */
export function findSetByPieceId(pieceId: string): ItemSetDefinition | undefined {
  return SET_BY_PIECE_ID.get(pieceId);
}

/** セット部位を除いた「純ユニーク」の定義一覧。 */
export const PURE_UNIQUE_DEFINITIONS: readonly UniqueItemDefinition[] =
  UNIQUE_ITEM_DEFINITIONS.filter((def) => !SET_BY_PIECE_ID.has(def.id));

/** セット部位の定義一覧。 */
export const SET_PIECE_DEFINITIONS: readonly UniqueItemDefinition[] =
  UNIQUE_ITEM_DEFINITIONS.filter((def) => SET_BY_PIECE_ID.has(def.id));
