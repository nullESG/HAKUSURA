import type { ItemSetDefinition, UniqueItemDefinition } from '../core/types';

/** セット部位 = 固定アフィックス付きアイテム定義 + 所属セットID。 */
export type SetPieceDefinition = UniqueItemDefinition & { readonly setId: string };

/**
 * セット装備5種(仕様 §5-6)。各セット6部位、2/4/6部位で段階ボーナス。
 * specialEffectId は戦闘エンジンのエフェクトハンドラが解釈する。
 */
export const SET_PIECES: readonly SetPieceDefinition[] = [
  // ===== 炎帝(火力) =====
  { setId: 'set_flame_emperor', id: 'setp_flame_helm', name: '炎帝の宝冠', baseItemId: 'base_helmet_5_1', fixedAffixes: [{ affixId: 'flat_life_helmet', tier: 5 }, { affixId: 'fire_res_helmet', tier: 5 }] },
  { setId: 'set_flame_emperor', id: 'setp_flame_armor', name: '炎帝の戦衣', baseItemId: 'base_armor_6_1', fixedAffixes: [{ affixId: 'flat_def_armor', tier: 6 }, { affixId: 'fire_res_armor', tier: 5 }] },
  { setId: 'set_flame_emperor', id: 'setp_flame_gloves', name: '炎帝の手甲', baseItemId: 'base_gloves_7_1', fixedAffixes: [{ affixId: 'flat_fire_gloves', tier: 6 }] },
  { setId: 'set_flame_emperor', id: 'setp_flame_boots', name: '炎帝の足甲', baseItemId: 'base_boots_8_1', fixedAffixes: [{ affixId: 'speed_boots', tier: 5 }] },
  { setId: 'set_flame_emperor', id: 'setp_flame_sword', name: '炎帝の御剣', baseItemId: 'base_weapon1h_0_1', fixedAffixes: [{ affixId: 'flat_fire_weapon1h', tier: 7 }, { affixId: 'inc_fire_weapon1h', tier: 6 }] },
  { setId: 'set_flame_emperor', id: 'setp_flame_ring', name: '炎帝の玉璽', baseItemId: 'base_ring_10_1', fixedAffixes: [{ affixId: 'inc_fire_ring', tier: 6 }] },
  // ===== 永久凍土(凍結コントロール) =====
  { setId: 'set_permafrost', id: 'setp_frost_helm', name: '凍土の面甲', baseItemId: 'base_helmet_5_1', fixedAffixes: [{ affixId: 'ice_res_helmet', tier: 6 }] },
  { setId: 'set_permafrost', id: 'setp_frost_armor', name: '凍土の鎧殻', baseItemId: 'base_armor_6_1', fixedAffixes: [{ affixId: 'flat_life_armor', tier: 6 }, { affixId: 'ice_res_armor', tier: 5 }] },
  { setId: 'set_permafrost', id: 'setp_frost_staff', name: '凍土の氷杖', baseItemId: 'base_weapon2h_3_1', fixedAffixes: [{ affixId: 'flat_ice_weapon2h', tier: 7 }, { affixId: 'freeze_apply_weapon2h', tier: 5 }] },
  { setId: 'set_permafrost', id: 'setp_frost_amulet', name: '凍土の頸飾', baseItemId: 'base_amulet_9_1', fixedAffixes: [{ affixId: 'inc_ice_amulet', tier: 6 }] },
  { setId: 'set_permafrost', id: 'setp_frost_belt', name: '凍土の腰帯', baseItemId: 'base_belt_11_1', fixedAffixes: [{ affixId: 'flat_mana_belt', tier: 5 }] },
  { setId: 'set_permafrost', id: 'setp_frost_boots', name: '凍土の沓', baseItemId: 'base_boots_8_1', fixedAffixes: [{ affixId: 'evasion_boots', tier: 5 }] },
  // ===== 死霊侯(召喚・毒) =====
  { setId: 'set_necrolord', id: 'setp_necro_crown', name: '死霊侯の角冠', baseItemId: 'base_helmet_5_1', fixedAffixes: [{ affixId: 'summon_power_helmet', tier: 6 }] },
  { setId: 'set_necrolord', id: 'setp_necro_robe', name: '死霊侯の屍衣', baseItemId: 'base_armor_6_1', fixedAffixes: [{ affixId: 'flat_mana_armor', tier: 6 }, { affixId: 'poison_ail_res_armor', tier: 5 }] },
  { setId: 'set_necrolord', id: 'setp_necro_staff', name: '死霊侯の骨杖', baseItemId: 'base_weapon2h_3_1', fixedAffixes: [{ affixId: 'flat_poison_weapon2h', tier: 6 }, { affixId: 'summon_power_weapons', tier: 6 }] },
  { setId: 'set_necrolord', id: 'setp_necro_gloves', name: '死霊侯の腐手', baseItemId: 'base_gloves_7_1', fixedAffixes: [{ affixId: 'poison_apply_gloves', tier: 5 }] },
  { setId: 'set_necrolord', id: 'setp_necro_amulet', name: '死霊侯の喉骨', baseItemId: 'base_amulet_9_1', fixedAffixes: [{ affixId: 'poison_effect_amulet', tier: 6 }] },
  { setId: 'set_necrolord', id: 'setp_necro_ring', name: '死霊侯の骨環', baseItemId: 'base_ring_10_1', fixedAffixes: [{ affixId: 'flat_mana_ring', tier: 5 }] },
  // ===== 風走り(速度・回避) =====
  { setId: 'set_windrunner', id: 'setp_wind_hood', name: '風走りの頭巾', baseItemId: 'base_helmet_5_1', fixedAffixes: [{ affixId: 'evasion_helmet', tier: 5 }] },
  { setId: 'set_windrunner', id: 'setp_wind_vest', name: '風走りの胴衣', baseItemId: 'base_armor_6_1', fixedAffixes: [{ affixId: 'evasion_armor', tier: 6 }] },
  { setId: 'set_windrunner', id: 'setp_wind_boots', name: '風走りの韋靴', baseItemId: 'base_boots_8_1', fixedAffixes: [{ affixId: 'speed_boots', tier: 6 }, { affixId: 'move_speed_boots', tier: 5 }] },
  { setId: 'set_windrunner', id: 'setp_wind_gloves', name: '風走りの指貫', baseItemId: 'base_gloves_7_1', fixedAffixes: [{ affixId: 'atk_speed_gloves', tier: 6 }] },
  { setId: 'set_windrunner', id: 'setp_wind_blade', name: '風走りの細剣', baseItemId: 'base_weapon1h_0_1', fixedAffixes: [{ affixId: 'flat_phys_weapon1h', tier: 6 }, { affixId: 'crit_chance_weapon1h', tier: 5 }] },
  { setId: 'set_windrunner', id: 'setp_wind_belt', name: '風走りの飾帯', baseItemId: 'base_belt_11_1', fixedAffixes: [{ affixId: 'speed_belt', tier: 5 }] },
  // ===== 宝堀り(ファーミング) =====
  { setId: 'set_prospector', id: 'setp_gold_helm', name: '宝堀りの灯兜', baseItemId: 'base_helmet_5_0', fixedAffixes: [{ affixId: 'magic_find_helmet', tier: 5 }] },
  { setId: 'set_prospector', id: 'setp_gold_gloves', name: '宝堀りの軍手', baseItemId: 'base_gloves_7_0', fixedAffixes: [{ affixId: 'gold_find_gloves', tier: 5 }] },
  { setId: 'set_prospector', id: 'setp_gold_boots', name: '宝堀りの長靴', baseItemId: 'base_boots_8_0', fixedAffixes: [{ affixId: 'exp_gain_boots', tier: 5 }] },
  { setId: 'set_prospector', id: 'setp_gold_belt', name: '宝堀りの道具帯', baseItemId: 'base_belt_11_0', fixedAffixes: [{ affixId: 'gold_find_belt', tier: 5 }] },
  { setId: 'set_prospector', id: 'setp_gold_amulet', name: '宝堀りの羅針盤', baseItemId: 'base_amulet_9_0', fixedAffixes: [{ affixId: 'magic_find_amulet', tier: 6 }] },
  { setId: 'set_prospector', id: 'setp_gold_ring', name: '宝堀りの印章', baseItemId: 'base_ring_10_0', fixedAffixes: [{ affixId: 'magic_find_ring', tier: 5 }] },
];

/** セット定義(段階ボーナス)。 */
export const ITEM_SETS: readonly ItemSetDefinition[] = [
  {
    id: 'set_flame_emperor', name: '炎帝',
    pieceIds: SET_PIECES.filter((p) => p.setId === 'set_flame_emperor').map((p) => p.id),
    bonuses: [
      { requiredPieces: 2, stats: { fireDmg_pct: 30 } },
      { requiredPieces: 4, stats: {}, specialEffectId: 'all_attacks_fire' },
      { requiredPieces: 6, stats: { fireDmg_pct: 60 }, specialEffectId: 'fire_explosion_on_kill' },
    ],
  },
  {
    id: 'set_permafrost', name: '永久凍土',
    pieceIds: SET_PIECES.filter((p) => p.setId === 'set_permafrost').map((p) => p.id),
    bonuses: [
      { requiredPieces: 2, stats: { iceDmg_pct: 25, iceRes_pct: 20 } },
      { requiredPieces: 4, stats: { freezeApply_pct: 15 } },
      { requiredPieces: 6, stats: {}, specialEffectId: 'shatter_frozen' },
    ],
  },
  {
    id: 'set_necrolord', name: '死霊侯',
    pieceIds: SET_PIECES.filter((p) => p.setId === 'set_necrolord').map((p) => p.id),
    bonuses: [
      { requiredPieces: 2, stats: { summonPower_pct: 25 } },
      { requiredPieces: 4, stats: { poisonEffect_pct: 30 } },
      { requiredPieces: 6, stats: {}, specialEffectId: 'summon_army' },
    ],
  },
  {
    id: 'set_windrunner', name: '風走り',
    pieceIds: SET_PIECES.filter((p) => p.setId === 'set_windrunner').map((p) => p.id),
    bonuses: [
      { requiredPieces: 2, stats: { speed_pct: 12, evasion_pct: 8 } },
      { requiredPieces: 4, stats: { atkSpeed_pct: 15 } },
      { requiredPieces: 6, stats: {}, specialEffectId: 'first_strike' },
    ],
  },
  {
    id: 'set_prospector', name: '宝堀り',
    pieceIds: SET_PIECES.filter((p) => p.setId === 'set_prospector').map((p) => p.id),
    bonuses: [
      { requiredPieces: 2, stats: { gold_pct: 30 } },
      { requiredPieces: 4, stats: { rarity_pct: 25 } },
      { requiredPieces: 6, stats: { exp_pct: 25 }, specialEffectId: 'treasure_goblin_chance' },
    ],
  },
];

export const SET_PIECE_BY_ID: ReadonlyMap<string, SetPieceDefinition> = new Map(
  SET_PIECES.map((p) => [p.id, p]),
);
export const SET_BY_ID: ReadonlyMap<string, ItemSetDefinition> = new Map(
  ITEM_SETS.map((s) => [s.id, s]),
);
