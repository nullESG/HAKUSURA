import type { BaseItemDefinition } from '../core/types/item';

/**
 * ベースアイテムマスタ(仕様 §5-3。ドロップ手順1で抽選される「種」)。
 * 各部位を iLvl 帯(序盤 0 / 中盤 30 / 終盤 60)で 3 段階ずつ用意する。
 * 基礎値・requiredStr は仕様に数値指定がないため仮置き(ブロックB報告参照)。
 */
export const BASE_ITEM_DEFINITIONS: readonly BaseItemDefinition[] = [
  // ===== 片手武器 =====
  { id: 'short_sword', name: 'ショートソード', itemType: 'weapon1h', weight: 100, minILvl: 0, weaponAtk: 8, weaponMatk: 0, requiredStr: 5 },
  { id: 'long_sword', name: 'ロングソード', itemType: 'weapon1h', weight: 80, minILvl: 30, weaponAtk: 24, weaponMatk: 0, requiredStr: 18 },
  { id: 'rune_blade', name: 'ルーンブレイド', itemType: 'weapon1h', weight: 60, minILvl: 60, weaponAtk: 52, weaponMatk: 20, requiredStr: 35 },
  { id: 'apprentice_wand', name: '見習いのワンド', itemType: 'weapon1h', weight: 100, minILvl: 0, weaponAtk: 3, weaponMatk: 10, requiredStr: 3 },
  { id: 'crystal_wand', name: 'クリスタルワンド', itemType: 'weapon1h', weight: 80, minILvl: 30, weaponAtk: 8, weaponMatk: 30, requiredStr: 8 },
  { id: 'arch_scepter', name: 'アークセプター', itemType: 'weapon1h', weight: 60, minILvl: 60, weaponAtk: 15, weaponMatk: 62, requiredStr: 15 },
  // ===== 両手武器 =====
  { id: 'battle_axe', name: 'バトルアクス', itemType: 'weapon2h', weight: 90, minILvl: 0, weaponAtk: 14, weaponMatk: 0, requiredStr: 10 },
  { id: 'great_sword', name: 'グレートソード', itemType: 'weapon2h', weight: 70, minILvl: 30, weaponAtk: 40, weaponMatk: 0, requiredStr: 28 },
  { id: 'dragon_cleaver', name: 'ドラゴンクリーバー', itemType: 'weapon2h', weight: 50, minILvl: 60, weaponAtk: 86, weaponMatk: 0, requiredStr: 50 },
  { id: 'oak_staff', name: 'オークスタッフ', itemType: 'weapon2h', weight: 90, minILvl: 0, weaponAtk: 6, weaponMatk: 16, requiredStr: 5 },
  { id: 'sage_staff', name: '賢者のスタッフ', itemType: 'weapon2h', weight: 70, minILvl: 30, weaponAtk: 12, weaponMatk: 46, requiredStr: 12 },
  { id: 'void_staff', name: '虚空のスタッフ', itemType: 'weapon2h', weight: 50, minILvl: 60, weaponAtk: 20, weaponMatk: 96, requiredStr: 20 },
  // ===== 盾 =====
  { id: 'buckler', name: 'バックラー', itemType: 'shield', weight: 100, minILvl: 0, armorDef: 6, requiredStr: 8 },
  { id: 'kite_shield', name: 'カイトシールド', itemType: 'shield', weight: 80, minILvl: 30, armorDef: 18, requiredStr: 22 },
  { id: 'tower_shield', name: 'タワーシールド', itemType: 'shield', weight: 60, minILvl: 60, armorDef: 38, requiredStr: 42 },
  // ===== 兜 =====
  { id: 'leather_cap', name: 'レザーキャップ', itemType: 'helmet', weight: 100, minILvl: 0, armorDef: 4, requiredStr: 3 },
  { id: 'iron_helm', name: 'アイアンヘルム', itemType: 'helmet', weight: 80, minILvl: 30, armorDef: 12, requiredStr: 15 },
  { id: 'dragon_helm', name: 'ドラゴンヘルム', itemType: 'helmet', weight: 60, minILvl: 60, armorDef: 26, requiredStr: 30 },
  // ===== 鎧 =====
  { id: 'cloth_robe', name: 'クロースローブ', itemType: 'armor', weight: 100, minILvl: 0, armorDef: 6, requiredStr: 3 },
  { id: 'chain_mail', name: 'チェインメイル', itemType: 'armor', weight: 80, minILvl: 30, armorDef: 20, requiredStr: 20 },
  { id: 'plate_armor', name: 'プレートアーマー', itemType: 'armor', weight: 60, minILvl: 60, armorDef: 44, requiredStr: 45 },
  // ===== 手 =====
  { id: 'leather_gloves', name: 'レザーグローブ', itemType: 'gloves', weight: 100, minILvl: 0, armorDef: 3, requiredStr: 3 },
  { id: 'gauntlets', name: 'ガントレット', itemType: 'gloves', weight: 80, minILvl: 30, armorDef: 10, requiredStr: 14 },
  { id: 'titan_grips', name: 'タイタングリップ', itemType: 'gloves', weight: 60, minILvl: 60, armorDef: 22, requiredStr: 28 },
  // ===== 足 =====
  { id: 'leather_boots', name: 'レザーブーツ', itemType: 'boots', weight: 100, minILvl: 0, armorDef: 3, requiredStr: 3 },
  { id: 'greaves', name: 'グリーブ', itemType: 'boots', weight: 80, minILvl: 30, armorDef: 10, requiredStr: 14 },
  { id: 'wind_striders', name: 'ウィンドストライダー', itemType: 'boots', weight: 60, minILvl: 60, armorDef: 22, requiredStr: 28 },
  // ===== 装飾(基礎値なし・アフィックスが本体) =====
  { id: 'copper_amulet', name: '銅のアミュレット', itemType: 'amulet', weight: 70, minILvl: 0 },
  { id: 'jade_amulet', name: '翡翠のアミュレット', itemType: 'amulet', weight: 55, minILvl: 30 },
  { id: 'star_amulet', name: '星辰のアミュレット', itemType: 'amulet', weight: 40, minILvl: 60 },
  { id: 'copper_ring', name: '銅の指輪', itemType: 'ring', weight: 70, minILvl: 0 },
  { id: 'sapphire_ring', name: 'サファイアリング', itemType: 'ring', weight: 55, minILvl: 30 },
  { id: 'eclipse_ring', name: '蝕の指輪', itemType: 'ring', weight: 40, minILvl: 60 },
  { id: 'rope_belt', name: '縄のベルト', itemType: 'belt', weight: 70, minILvl: 0 },
  { id: 'studded_belt', name: '鋲打ちのベルト', itemType: 'belt', weight: 55, minILvl: 30 },
  { id: 'champion_girdle', name: '覇者の腰帯', itemType: 'belt', weight: 40, minILvl: 60 },
] as const;

const BASE_ITEM_BY_ID = new Map(BASE_ITEM_DEFINITIONS.map((def) => [def.id, def]));

export function getBaseItemById(baseItemId: string): BaseItemDefinition {
  const def = BASE_ITEM_BY_ID.get(baseItemId);
  if (!def) throw new Error(`Unknown baseItemId: ${baseItemId}`);
  return def;
}
