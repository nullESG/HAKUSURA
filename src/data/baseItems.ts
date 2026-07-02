import type { BaseItemDefinition, ItemType } from '../core/types';

/**
 * ベースアイテム定義(仕様 §5-7 手順1)。
 * 各装備タイプに序盤/中盤/終盤の3グレード(minILvl 1/25/55)。
 * 基礎値はグレードで上昇(数値は仮置き、バランス調整はデータ側で行う)。
 */
interface BaseSpec {
  readonly itemType: ItemType;
  readonly names: readonly [string, string, string];
  readonly atk?: readonly [number, number, number];
  readonly matk?: readonly [number, number, number];
  readonly def?: readonly [number, number, number];
  readonly reqStr?: readonly [number, number, number];
}

const SPECS: readonly BaseSpec[] = [
  { itemType: 'weapon1h', names: ['ショートソード', 'ウォーソード', 'ルーンブレード'], atk: [8, 26, 58], reqStr: [0, 20, 45] },
  { itemType: 'weapon2h', names: ['バトルアクス', 'グレートアクス', '滅却の大斧'], atk: [14, 44, 96], reqStr: [10, 35, 70] },
  { itemType: 'weapon1h', names: ['ワンド', 'ソーサラーワンド', '星霜のワンド'], matk: [9, 28, 62] },
  { itemType: 'weapon2h', names: ['クォータースタッフ', 'アークスタッフ', '虚空の杖'], matk: [15, 47, 102] },
  { itemType: 'shield', names: ['ウッドシールド', 'タワーシールド', '聖壁の大盾'], def: [6, 20, 44], reqStr: [5, 25, 50] },
  { itemType: 'helmet', names: ['レザーキャップ', 'グレートヘルム', '覇王の兜'], def: [3, 11, 25] },
  { itemType: 'armor', names: ['レザーアーマー', 'プレートメイル', '竜鱗の鎧'], def: [8, 27, 60], reqStr: [0, 30, 60] },
  { itemType: 'gloves', names: ['レザーグローブ', 'ガントレット', '雷光の籠手'], def: [2, 8, 18] },
  { itemType: 'boots', names: ['レザーブーツ', 'グリーヴ', '疾風の長靴'], def: [2, 8, 18] },
  { itemType: 'amulet', names: ['銅のアミュレット', '銀のアミュレット', '星々のアミュレット'] },
  { itemType: 'ring', names: ['銅の指輪', '銀の指輪', '王者の指輪'] },
  { itemType: 'belt', names: ['布のベルト', '革のベルト', '巨人のベルト'], def: [1, 5, 12] },
];

const GRADE_ILVL = [1, 25, 55] as const;
const GRADE_WEIGHT = [100, 60, 30] as const;

export const BASE_ITEMS: readonly BaseItemDefinition[] = SPECS.flatMap((s, si) =>
  s.names.map((name, g): BaseItemDefinition => ({
    id: `base_${s.itemType}_${si}_${g}`,
    name,
    itemType: s.itemType,
    weight: GRADE_WEIGHT[g] ?? 30,
    minILvl: GRADE_ILVL[g] ?? 1,
    ...(s.atk ? { weaponAtk: s.atk[g] } : {}),
    ...(s.matk ? { weaponMatk: s.matk[g] } : {}),
    ...(s.def ? { armorDef: s.def[g] } : {}),
    ...(s.reqStr ? { requiredStr: s.reqStr[g] } : {}),
  })),
);

export const BASE_ITEM_BY_ID: ReadonlyMap<string, BaseItemDefinition> = new Map(
  BASE_ITEMS.map((b) => [b.id, b]),
);
