/**
 * ドロップ生成アルゴリズム(仕様 §5-7)。
 * データ定義(アフィックス/ベース/ユニーク/セット/レアリティ)を読むだけの純粋ロジック。
 */
import type { RarityRule } from '../../data/rarities';
import type { SetPieceDefinition } from '../../data/sets';
import type {
  AffixDefinition,
  BaseItemDefinition,
  ItemInstance,
  Rarity,
  UniqueItemDefinition,
} from '../types';
import { RARITIES } from '../types';
import type { GameRandom } from '../rng/gameRandom';
import { rollAffixSet, rollFixedAffix } from './affixRoller';

/** ドロップ生成器が読むデータテーブル一式。 */
export interface DropTables {
  readonly affixes: readonly AffixDefinition[];
  readonly affixById: ReadonlyMap<string, AffixDefinition>;
  readonly baseItems: readonly BaseItemDefinition[];
  readonly baseItemById: ReadonlyMap<string, BaseItemDefinition>;
  readonly uniques: readonly UniqueItemDefinition[];
  readonly setPieces: readonly SetPieceDefinition[];
  readonly rarityTable: Readonly<Record<Rarity, RarityRule>>;
}

export interface GenerateDropParams {
  readonly itemLevel: number;
  /** magicFind%(rarity_pct 合計 + 敵補正)。 */
  readonly magicFind: number;
  readonly rng: GameRandom;
  readonly tables: DropTables;
  /** インスタンスID生成器(テストでは決定的なものを注入)。 */
  readonly makeId: () => string;
}

/** レアリティを重み抽選する(magicFind はレア以上の重みを倍率補正、仕様 §5-7 手順2)。 */
export function rollRarity(magicFind: number, rng: GameRandom, tables: DropTables): Rarity {
  const mfMultiplier = 1 + magicFind / 100;
  const weights = RARITIES.map((r) => {
    const rule = tables.rarityTable[r];
    return rule.boostedByMagicFind ? rule.weight * mfMultiplier : rule.weight;
  });
  const idx = rng.weightedIndex(weights);
  return RARITIES[idx] ?? 'common';
}

/** ドロップを1つ生成する(仕様 §5-7 手順1〜7)。 */
export function generateDrop(params: GenerateDropParams): ItemInstance {
  const { itemLevel, magicFind, rng, tables, makeId } = params;

  // 手順2: レアリティ抽選(ユニーク/セット枠はプールが無ければ格下げ)
  let rarity = rollRarity(magicFind, rng, tables);
  if (rarity === 'unique' && tables.uniques.length === 0) rarity = 'legendary';
  if (rarity === 'set' && tables.setPieces.length === 0) rarity = 'legendary';

  // 手順7: ユニーク/セット枠は事前定義を適用
  if (rarity === 'unique' || rarity === 'set') {
    const pool: readonly UniqueItemDefinition[] =
      rarity === 'unique' ? tables.uniques : tables.setPieces;
    const eligible = pool.filter(
      (u) => (tables.baseItemById.get(u.baseItemId)?.minILvl ?? 1) <= itemLevel,
    );
    const picked = eligible.length > 0 ? eligible[rng.nextInt(eligible.length)] : undefined;
    if (picked) {
      const affixes = picked.fixedAffixes.map((f) => {
        const def = tables.affixById.get(f.affixId);
        if (!def) throw new Error(`unknown affix in unique/set: ${f.affixId}`);
        return rollFixedAffix(def, f.tier, rng);
      });
      return {
        instanceId: makeId(),
        baseItemId: picked.baseItemId,
        rarity,
        itemLevel,
        affixes,
        ...(rarity === 'unique' ? { uniqueId: picked.id } : {}),
        ...(rarity === 'set'
          ? { uniqueId: picked.id, setId: (picked as SetPieceDefinition).setId }
          : {}),
      };
    }
    rarity = 'rare'; // iLvl 不足で候補なし → レアに格下げ(仮定)
  }

  // 手順1: ベースアイテム抽選
  const basePool = tables.baseItems.filter((b) => b.minILvl <= itemLevel);
  if (basePool.length === 0) throw new Error(`no base item for iLvl ${itemLevel}`);
  const base = basePool[rng.weightedIndex(basePool.map((b) => b.weight))];
  if (!base) throw new Error('base item roll failed');

  // 手順3〜6: アフィックス数決定 → 抽選 → Tier → 実数ロール
  const rule = tables.rarityTable[rarity];
  const count =
    rule.affixMax === 0 ? 0 : rng.nextIntInRange(rule.affixMin, rule.affixMax);
  const affixes = rollAffixSet({
    pool: tables.affixes,
    itemType: base.itemType,
    itemLevel,
    rarity,
    count,
    rng,
  });

  return { instanceId: makeId(), baseItemId: base.id, rarity, itemLevel, affixes };
}
