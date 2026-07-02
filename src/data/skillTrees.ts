import type { SkillNode } from '../core/types/skill';

/**
 * スキルツリーマスタ(仕様 §3)。クラスごとに 10 ノード:
 * ルート(基本アクティブ)→ 2 分岐(パッシブ→アクティブ→強化)→ キーストーン。
 * keystoneEffectId は戦闘エンジン / statCalculator のエフェクトハンドラが解釈する。
 * position はスキルツリー UI の論理座標(x: 分岐列, y: 深さ)。
 */
export const SKILL_TREE_NODES: readonly SkillNode[] = [
  // ===== ウォリアー =====
  { id: 'w_root', classId: 'warrior', nodeType: 'active', name: 'パワーストライク', requiredNodeIds: [], cost: 1, skillId: 'power_strike', position: { x: 0, y: 0 } },
  { id: 'w_str1', classId: 'warrior', nodeType: 'passive', name: '筋力強化 I', requiredNodeIds: ['w_root'], cost: 1, passiveStats: { str_flat: 5 }, position: { x: -1, y: 1 } },
  { id: 'w_vit1', classId: 'warrior', nodeType: 'passive', name: '生命力強化 I', requiredNodeIds: ['w_root'], cost: 1, passiveStats: { maxHP_flat: 30 }, position: { x: 1, y: 1 } },
  { id: 'w_cleave', classId: 'warrior', nodeType: 'active', name: 'クリーヴ', requiredNodeIds: ['w_str1'], cost: 2, skillId: 'cleave', position: { x: -1, y: 2 } },
  { id: 'w_bash', classId: 'warrior', nodeType: 'active', name: 'シールドバッシュ', requiredNodeIds: ['w_vit1'], cost: 2, skillId: 'shield_bash', position: { x: 1, y: 2 } },
  { id: 'w_str2', classId: 'warrior', nodeType: 'passive', name: '筋力強化 II', requiredNodeIds: ['w_cleave'], cost: 2, passiveStats: { str_flat: 8, dmg_pct: 5 }, position: { x: -1, y: 3 } },
  { id: 'w_def1', classId: 'warrior', nodeType: 'passive', name: '守りの構え', requiredNodeIds: ['w_bash'], cost: 2, passiveStats: { armorDEF_flat: 15, vit_flat: 5 }, position: { x: 1, y: 3 } },
  { id: 'w_cry', classId: 'warrior', nodeType: 'active', name: 'ウォークライ', requiredNodeIds: ['w_str2'], cost: 2, skillId: 'war_cry', position: { x: -1, y: 4 } },
  { id: 'w_vit2', classId: 'warrior', nodeType: 'passive', name: '生命力強化 II', requiredNodeIds: ['w_def1'], cost: 2, passiveStats: { maxHP_flat: 60, hpRegen_flat: 2 }, position: { x: 1, y: 4 } },
  { id: 'w_keystone', classId: 'warrior', nodeType: 'keystone', name: '狂戦士', requiredNodeIds: ['w_cry'], cost: 3, keystoneEffectId: 'berserker', position: { x: 0, y: 5 } },
  // ===== メイジ =====
  { id: 'm_root', classId: 'mage', nodeType: 'active', name: 'ファイアボール', requiredNodeIds: [], cost: 1, skillId: 'fireball', position: { x: 0, y: 0 } },
  { id: 'm_int1', classId: 'mage', nodeType: 'passive', name: '知力強化 I', requiredNodeIds: ['m_root'], cost: 1, passiveStats: { int_flat: 5 }, position: { x: -1, y: 1 } },
  { id: 'm_mp1', classId: 'mage', nodeType: 'passive', name: '魔力の泉 I', requiredNodeIds: ['m_root'], cost: 1, passiveStats: { maxMP_flat: 20 }, position: { x: 1, y: 1 } },
  { id: 'm_thunder', classId: 'mage', nodeType: 'active', name: 'サンダーボルト', requiredNodeIds: ['m_int1'], cost: 2, skillId: 'thunder_bolt', position: { x: -1, y: 2 } },
  { id: 'm_blizzard', classId: 'mage', nodeType: 'active', name: 'ブリザード', requiredNodeIds: ['m_mp1'], cost: 2, skillId: 'blizzard', position: { x: 1, y: 2 } },
  { id: 'm_dmg1', classId: 'mage', nodeType: 'passive', name: '魔法増幅', requiredNodeIds: ['m_thunder'], cost: 2, passiveStats: { dmg_pct: 10 }, position: { x: -1, y: 3 } },
  { id: 'm_eff1', classId: 'mage', nodeType: 'passive', name: '詠唱効率', requiredNodeIds: ['m_blizzard'], cost: 2, passiveStats: { mpRegen_flat: 3, mpCost_pct: 10 }, position: { x: 1, y: 3 } },
  { id: 'm_focus', classId: 'mage', nodeType: 'active', name: 'アーケインフォーカス', requiredNodeIds: ['m_dmg1'], cost: 2, skillId: 'arcane_focus', position: { x: -1, y: 4 } },
  { id: 'm_int2', classId: 'mage', nodeType: 'passive', name: '知力強化 II', requiredNodeIds: ['m_eff1'], cost: 2, passiveStats: { int_flat: 8, critDmg_pct: 15 }, position: { x: 1, y: 4 } },
  { id: 'm_keystone', classId: 'mage', nodeType: 'keystone', name: '元素過負荷', requiredNodeIds: ['m_focus'], cost: 3, keystoneEffectId: 'elemental_overload', position: { x: 0, y: 5 } },
  // ===== レンジャー =====
  { id: 'r_root', classId: 'ranger', nodeType: 'active', name: 'プレサイスショット', requiredNodeIds: [], cost: 1, skillId: 'precise_shot', position: { x: 0, y: 0 } },
  { id: 'r_dex1', classId: 'ranger', nodeType: 'passive', name: '俊敏強化 I', requiredNodeIds: ['r_root'], cost: 1, passiveStats: { dex_flat: 5 }, position: { x: -1, y: 1 } },
  { id: 'r_eva1', classId: 'ranger', nodeType: 'passive', name: '身のこなし', requiredNodeIds: ['r_root'], cost: 1, passiveStats: { evasion_pct: 5 }, position: { x: 1, y: 1 } },
  { id: 'r_poison', classId: 'ranger', nodeType: 'active', name: 'ポイズンアロー', requiredNodeIds: ['r_dex1'], cost: 2, skillId: 'poison_arrow', position: { x: -1, y: 2 } },
  { id: 'r_rain', classId: 'ranger', nodeType: 'active', name: 'アローレイン', requiredNodeIds: ['r_eva1'], cost: 2, skillId: 'arrow_rain', position: { x: 1, y: 2 } },
  { id: 'r_crit1', classId: 'ranger', nodeType: 'passive', name: '急所知識', requiredNodeIds: ['r_poison'], cost: 2, passiveStats: { critChance_pct: 5, critDmg_pct: 10 }, position: { x: -1, y: 3 } },
  { id: 'r_spd1', classId: 'ranger', nodeType: 'passive', name: '疾走', requiredNodeIds: ['r_rain'], cost: 2, passiveStats: { speed_pct: 10, atkSpeed_pct: 8 }, position: { x: 1, y: 3 } },
  { id: 'r_focus', classId: 'ranger', nodeType: 'active', name: 'ハンターズフォーカス', requiredNodeIds: ['r_crit1'], cost: 2, skillId: 'hunters_focus', position: { x: -1, y: 4 } },
  { id: 'r_dex2', classId: 'ranger', nodeType: 'passive', name: '俊敏強化 II', requiredNodeIds: ['r_spd1'], cost: 2, passiveStats: { dex_flat: 8, luk_flat: 5 }, position: { x: 1, y: 4 } },
  { id: 'r_keystone', classId: 'ranger', nodeType: 'keystone', name: '必殺の精密', requiredNodeIds: ['r_focus'], cost: 3, keystoneEffectId: 'deadly_precision', position: { x: 0, y: 5 } },
  // ===== クレリック =====
  { id: 'c_root', classId: 'cleric', nodeType: 'active', name: 'ヒール', requiredNodeIds: [], cost: 1, skillId: 'heal', position: { x: 0, y: 0 } },
  { id: 'c_int1', classId: 'cleric', nodeType: 'passive', name: '信仰心 I', requiredNodeIds: ['c_root'], cost: 1, passiveStats: { int_flat: 4, vit_flat: 3 }, position: { x: -1, y: 1 } },
  { id: 'c_mp1', classId: 'cleric', nodeType: 'passive', name: '祈りの心得', requiredNodeIds: ['c_root'], cost: 1, passiveStats: { maxMP_flat: 15 }, position: { x: 1, y: 1 } },
  { id: 'c_smite', classId: 'cleric', nodeType: 'active', name: 'スマイト', requiredNodeIds: ['c_int1'], cost: 2, skillId: 'smite', position: { x: -1, y: 2 } },
  { id: 'c_bless', classId: 'cleric', nodeType: 'active', name: 'ブレッシング', requiredNodeIds: ['c_mp1'], cost: 2, skillId: 'blessing', position: { x: 1, y: 2 } },
  { id: 'c_light1', classId: 'cleric', nodeType: 'passive', name: '聖光の加護', requiredNodeIds: ['c_smite'], cost: 2, passiveStats: { lightATK_flat: 8, lightRes_pct: 10 }, position: { x: -1, y: 3 } },
  { id: 'c_regen1', classId: 'cleric', nodeType: 'passive', name: '癒しの波動', requiredNodeIds: ['c_bless'], cost: 2, passiveStats: { hpRegen_flat: 3, ailmentRes_pct: 15 }, position: { x: 1, y: 3 } },
  { id: 'c_mass', classId: 'cleric', nodeType: 'active', name: 'マスヒール', requiredNodeIds: ['c_regen1'], cost: 2, skillId: 'mass_heal', position: { x: 1, y: 4 } },
  { id: 'c_int2', classId: 'cleric', nodeType: 'passive', name: '信仰心 II', requiredNodeIds: ['c_light1'], cost: 2, passiveStats: { int_flat: 6, maxMP_flat: 30 }, position: { x: -1, y: 4 } },
  { id: 'c_keystone', classId: 'cleric', nodeType: 'keystone', name: '神聖なる守護者', requiredNodeIds: ['c_mass'], cost: 3, keystoneEffectId: 'divine_guardian', position: { x: 0, y: 5 } },
  // ===== サモナー =====
  { id: 's_root', classId: 'summoner', nodeType: 'active', name: 'ベノムボルト', requiredNodeIds: [], cost: 1, skillId: 'venom_bolt', position: { x: 0, y: 0 } },
  { id: 's_int1', classId: 'summoner', nodeType: 'passive', name: '知力強化 I', requiredNodeIds: ['s_root'], cost: 1, passiveStats: { int_flat: 5 }, position: { x: -1, y: 1 } },
  { id: 's_mp1', classId: 'summoner', nodeType: 'passive', name: '魔力の泉 I', requiredNodeIds: ['s_root'], cost: 1, passiveStats: { maxMP_flat: 20 }, position: { x: 1, y: 1 } },
  { id: 's_curse', classId: 'summoner', nodeType: 'active', name: 'カース', requiredNodeIds: ['s_int1'], cost: 2, skillId: 'curse', position: { x: -1, y: 2 } },
  { id: 's_imp', classId: 'summoner', nodeType: 'active', name: 'サモン・インプ', requiredNodeIds: ['s_mp1'], cost: 2, skillId: 'summon_imp', position: { x: 1, y: 2 } },
  { id: 's_poison1', classId: 'summoner', nodeType: 'passive', name: '毒素研究', requiredNodeIds: ['s_curse'], cost: 2, passiveStats: { poisonATK_flat: 8, poisonChance_pct: 10 }, position: { x: -1, y: 3 } },
  { id: 's_regen1', classId: 'summoner', nodeType: 'passive', name: '魔力循環', requiredNodeIds: ['s_imp'], cost: 2, passiveStats: { mpRegen_flat: 2, int_flat: 4 }, position: { x: 1, y: 3 } },
  { id: 's_swarm', classId: 'summoner', nodeType: 'active', name: 'プレイグスウォーム', requiredNodeIds: ['s_poison1'], cost: 2, skillId: 'plague_swarm', position: { x: -1, y: 4 } },
  { id: 's_luk1', classId: 'summoner', nodeType: 'passive', name: '禁呪の素養', requiredNodeIds: ['s_regen1'], cost: 2, passiveStats: { luk_flat: 5, maxMP_flat: 25 }, position: { x: 1, y: 4 } },
  { id: 's_keystone', classId: 'summoner', nodeType: 'keystone', name: '召喚の大家', requiredNodeIds: ['s_swarm'], cost: 3, keystoneEffectId: 'master_summoner', position: { x: 0, y: 5 } },
] as const;

const NODE_BY_ID = new Map(SKILL_TREE_NODES.map((node) => [node.id, node]));

export function getSkillNodeById(nodeId: string): SkillNode {
  const node = NODE_BY_ID.get(nodeId);
  if (!node) throw new Error(`Unknown skill node: ${nodeId}`);
  return node;
}

export function getSkillTreeByClass(classId: string): readonly SkillNode[] {
  return SKILL_TREE_NODES.filter((node) => node.classId === classId);
}

/** 実装済みキーストーン効果 ID(戦闘エンジンのハンドラと対応)。 */
export const KEYSTONE_EFFECT_IDS = [
  'berserker', // HP50%以下で与ダメージ+50%
  'elemental_overload', // 属性(物理以外)ダメージ+30%、被ダメージ+15%
  'deadly_precision', // クリティカル率+25%、攻撃が回避されない
  'divine_guardian', // 戦闘ごとに1回、致死ダメージをHP1で耐える
  'master_summoner', // 召喚上限+1、召喚ユニットのステータス+50%
] as const;
export type KeystoneEffectId = (typeof KEYSTONE_EFFECT_IDS)[number];
