/**
 * ドロップ生成器(仕様 §5-7)。
 *
 * 生成手順:
 *   1. ベースアイテム抽選(iLvl でフィルタ、weight で重み付き)
 *   2. レアリティ抽選(Magic Find が common 以外の重みを底上げ)
 *   3. unique / set 当選時は該当プールから抽選しベースを差し替え(プールが空なら降格)
 *   4. レアリティに応じたアフィックス個数を決定
 *   5. アフィックスプール抽選(部位・minRarity でフィルタ、グループ排他、Prefix/Suffix 上限)
 *   6. Tier 抽選(iLvl 以下の Tier のみ、高 Tier ほど稀少)→ 値ロール
 *
 * このモジュールは静的マスタを import しない(マスタデータ注入式)。
 * UI にも src/data にも依存しない純粋ロジックであり、
 * 乱数はすべて引数の GameRandom 経由(決定論・セーブ復元対応)。
 */
import { GAME_CONSTANTS } from '../constants';
import type { GameRandom } from '../rng/gameRandom';
import type { AffixDefinition, AffixTierDef, RolledAffix } from '../types/affix';
import type { ItemType, Rarity, StatId, StatMap } from '../types/enums';
import { RARITIES } from '../types/enums';
import type {
  BaseItemDefinition,
  ItemInstance,
  ItemSetDefinition,
  UniqueItemDefinition,
} from '../types/item';

const C = GAME_CONSTANTS;

/** ドロップ生成に必要な静的マスタ一式(src/data 側で組み立てて注入する)。 */
export interface DropMasterData {
  readonly baseItems: readonly BaseItemDefinition[];
  readonly affixes: readonly AffixDefinition[];
  /** セット部位を含む全ユニーク定義。 */
  readonly uniques: readonly UniqueItemDefinition[];
  readonly sets: readonly ItemSetDefinition[];
  readonly rarityWeights: Readonly<Record<Rarity, number>>;
  readonly affixCountByRarity: Readonly<Record<Rarity, { min: number; max: number }>>;
  readonly rarityDowngrade: Readonly<Partial<Record<Rarity, Rarity>>>;
}

export interface DropInput {
  /** ドロップ元のアイテムレベル(敵レベル・ダンジョン深度から決まる)。 */
  readonly itemLevel: number;
  /** パーティの Magic Find 合計%(rarity_pct)。省略時 0。 */
  readonly magicFindPct?: number;
}

/** レアリティ階層の序列(§5-1)。 */
export function rarityRank(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}

/** Magic Find 適用後のレアリティ重み。common 以外を (1 + MF/100) 倍する(仮定)。 */
export function applyMagicFindToWeights(
  weights: Readonly<Record<Rarity, number>>,
  magicFindPct: number,
): Record<Rarity, number> {
  const factor = 1 + Math.max(0, magicFindPct) / 100;
  const boosted = {} as Record<Rarity, number>;
  for (const rarity of RARITIES) {
    boosted[rarity] = rarity === 'common' ? weights[rarity] : weights[rarity] * factor;
  }
  return boosted;
}

/** 手順1: ベースアイテム抽選。 */
function rollBaseItem(
  rng: GameRandom,
  itemLevel: number,
  data: DropMasterData,
): BaseItemDefinition {
  const candidates = data.baseItems.filter((b) => b.minILvl <= itemLevel);
  if (candidates.length === 0) {
    throw new Error(`No base item available for itemLevel=${itemLevel}`);
  }
  const index = rng.weightedIndex(candidates.map((b) => b.weight));
  return candidates[index]!;
}

/** 手順2: レアリティ抽選。 */
function rollRarity(rng: GameRandom, magicFindPct: number, data: DropMasterData): Rarity {
  const weights = applyMagicFindToWeights(data.rarityWeights, magicFindPct);
  const index = rng.weightedIndex(RARITIES.map((r) => weights[r]));
  return RARITIES[index]!;
}

/**
 * 手順6(Tier 抽選): iLvl で出現可能な Tier から重み 0.75^(tier-1) で抽選する
 * (高 Tier ほど稀少、という仮定。§8 は出現条件のみ規定)。
 */
export function rollAffixTier(
  rng: GameRandom,
  def: AffixDefinition,
  itemLevel: number,
): AffixTierDef {
  const eligible = def.tiers.filter((t) => t.minILvl <= itemLevel);
  if (eligible.length === 0) {
    throw new Error(`Affix ${def.id} has no tier available at itemLevel=${itemLevel}`);
  }
  const index = rng.weightedIndex(eligible.map((t) => Math.pow(0.75, t.tier - 1)));
  return eligible[index]!;
}

/** Tier レンジ内の実値ロール(フラット系は整数、%系は 0.1 刻み)。 */
export function rollAffixValues(rng: GameRandom, tierDef: AffixTierDef): StatMap {
  const values: Partial<Record<StatId, number>> = {};
  for (const range of tierDef.stats) {
    if (range.stat.endsWith('_flat')) {
      values[range.stat] = rng.nextIntInRange(range.min, range.max);
    } else {
      const raw = rng.nextDoubleInRange(range.min, range.max);
      values[range.stat] = Math.round(raw * 10) / 10;
    }
  }
  return values;
}

export interface AffixRollParams {
  readonly itemType: ItemType;
  readonly rarity: Rarity;
  readonly itemLevel: number;
  /** すでに付与済みのアフィックス(グループ排他・上限の計算に使う)。 */
  readonly existing: readonly RolledAffix[];
  /** 追加でロールする個数。 */
  readonly count: number;
}

/**
 * 手順5〜6: アフィックスプール抽選 + Tier・値ロール。
 * グループ排他・Prefix/Suffix 上限(各3)・部位制限・minRarity 制限を満たす
 * プールから重み付きで引く。プールが尽きたら要求数未満で打ち切る。
 * クラフト(アフィックス追加・リロール)からも再利用する。
 */
export function rollAffixes(
  rng: GameRandom,
  params: AffixRollParams,
  data: DropMasterData,
): RolledAffix[] {
  const affixById = new Map(data.affixes.map((a) => [a.id, a]));
  const usedGroups = new Set(
    params.existing.map((r) => affixById.get(r.affixId)?.group ?? r.affixId),
  );
  let prefixCount = params.existing.filter(
    (r) => affixById.get(r.affixId)?.type === 'prefix',
  ).length;
  let suffixCount = params.existing.length - prefixCount;

  const rolled: RolledAffix[] = [];
  for (let i = 0; i < params.count; i++) {
    const pool = data.affixes.filter((def) => {
      if (!def.allowedItemTypes.includes(params.itemType)) return false;
      if (def.minRarity && rarityRank(params.rarity) < rarityRank(def.minRarity)) return false;
      if (usedGroups.has(def.group)) return false;
      if (def.type === 'prefix' && prefixCount >= C.maxPrefixes) return false;
      if (def.type === 'suffix' && suffixCount >= C.maxSuffixes) return false;
      // iLvl で出現可能な Tier が1つも無い定義は引かない
      return def.tiers.some((t) => t.minILvl <= params.itemLevel);
    });
    if (pool.length === 0) break;

    const def = pool[rng.weightedIndex(pool.map((d) => d.weight))]!;
    const tierDef = rollAffixTier(rng, def, params.itemLevel);
    rolled.push({ affixId: def.id, tier: tierDef.tier, values: rollAffixValues(rng, tierDef) });

    usedGroups.add(def.group);
    if (def.type === 'prefix') prefixCount++;
    else suffixCount++;
  }
  return rolled;
}

/** インベントリ内で一意な ID を RNG から決定論的に生成する(セーブ再現対応)。 */
function nextInstanceId(rng: GameRandom): string {
  const hex = (): string => rng.nextUint32().toString(16).padStart(8, '0');
  return `itm_${hex()}${hex()}`;
}

/** ユニーク/セット定義から実アイテムを生成する(固定アフィックスの値のみロール)。 */
export function instantiateUnique(
  rng: GameRandom,
  unique: UniqueItemDefinition,
  itemLevel: number,
  data: DropMasterData,
): ItemInstance {
  const affixById = new Map(data.affixes.map((a) => [a.id, a]));
  const setDef = data.sets.find((s) => s.pieceIds.includes(unique.id));
  const affixes: RolledAffix[] = unique.fixedAffixes.map((fixed) => {
    const def = affixById.get(fixed.affixId);
    if (!def) throw new Error(`Unique ${unique.id}: unknown affixId ${fixed.affixId}`);
    const tierDef = def.tiers.find((t) => t.tier === fixed.tier);
    if (!tierDef) throw new Error(`Unique ${unique.id}: ${fixed.affixId} has no T${fixed.tier}`);
    return { affixId: def.id, tier: tierDef.tier, values: rollAffixValues(rng, tierDef) };
  });
  return {
    instanceId: nextInstanceId(rng),
    baseItemId: unique.baseItemId,
    rarity: setDef ? 'set' : 'unique',
    itemLevel,
    affixes,
    uniqueId: unique.id,
    ...(setDef ? { setId: setDef.id } : {}),
  };
}

/**
 * 手順3: unique / set 当選時のプール抽選。
 * ベース抽選とは独立にプール全体(iLvl 条件を満たすもの)から等確率で引き、
 * 当該ユニークのベースへ差し替える(仮定)。プールが空なら1段降格する。
 */
function rollUniqueOrDowngrade(
  rng: GameRandom,
  rarity: 'unique' | 'set',
  itemLevel: number,
  data: DropMasterData,
): ItemInstance | Rarity {
  const setPieceIds = new Set(data.sets.flatMap((s) => s.pieceIds));
  const baseById = new Map(data.baseItems.map((b) => [b.id, b]));
  const pool = data.uniques.filter((u) => {
    if ((rarity === 'set') !== setPieceIds.has(u.id)) return false;
    const base = baseById.get(u.baseItemId);
    return base !== undefined && base.minILvl <= itemLevel;
  });
  if (pool.length === 0) {
    return data.rarityDowngrade[rarity] ?? 'legendary';
  }
  return instantiateUnique(rng, pool[rng.nextInt(pool.length)]!, itemLevel, data);
}

/** ドロップ1個を生成する(仕様 §5-7 のエントリポイント)。 */
export function generateItem(rng: GameRandom, input: DropInput, data: DropMasterData): ItemInstance {
  const itemLevel = Math.max(1, Math.floor(input.itemLevel));
  const magicFind = input.magicFindPct ?? 0;

  let rarity = rollRarity(rng, magicFind, data);
  // 手順3: unique / set はプール抽選(空なら降格して通常生成へ)
  while (rarity === 'unique' || rarity === 'set') {
    const result = rollUniqueOrDowngrade(rng, rarity, itemLevel, data);
    if (typeof result !== 'string') return result;
    rarity = result;
  }

  const base = rollBaseItem(rng, itemLevel, data);
  const countRange = data.affixCountByRarity[rarity];
  const count =
    countRange.max > countRange.min
      ? rng.nextIntInRange(countRange.min, countRange.max)
      : countRange.min;
  const affixes = rollAffixes(
    rng,
    { itemType: base.itemType, rarity, itemLevel, existing: [], count },
    data,
  );
  return {
    instanceId: nextInstanceId(rng),
    baseItemId: base.id,
    rarity,
    itemLevel,
    affixes,
  };
}
