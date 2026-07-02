/**
 * アフィックス抽選・数値ロール(仕様 §5-7 手順4〜6)。
 * ドロップ生成器とクラフト(混沌・祝福のオーブ)で共用する純粋ロジック。
 */
import { GAME_CONSTANTS } from '../constants';
import type {
  AffixDefinition,
  AffixTierDef,
  ItemType,
  Rarity,
  RolledAffix,
  StatId,
} from '../types';
import { RARITIES } from '../types';
import type { GameRandom } from '../rng/gameRandom';

/** レアリティの強さ順(minRarity 判定用)。 */
export function rarityOrder(r: Rarity): number {
  return RARITIES.indexOf(r);
}

/** 指定 iLvl で出現可能な Tier 一覧。 */
export function eligibleTiers(affix: AffixDefinition, itemLevel: number): AffixTierDef[] {
  return affix.tiers.filter((t) => t.minILvl <= itemLevel);
}

/** Tier 内の min〜max で実数値をロールする(仕様 §5-7 手順6)。 */
export function rollTierValues(tier: AffixTierDef, rng: GameRandom): Partial<Record<StatId, number>> {
  const values: Partial<Record<StatId, number>> = {};
  for (const s of tier.stats) {
    values[s.stat] = rng.nextIntInRange(s.min, s.max);
  }
  return values;
}

/** アフィックス定義から Tier を選び数値をロールして RolledAffix を作る。 */
export function rollAffix(
  affix: AffixDefinition,
  itemLevel: number,
  rng: GameRandom,
): RolledAffix | undefined {
  const tiers = eligibleTiers(affix, itemLevel);
  if (tiers.length === 0) return undefined;
  const tier = tiers[rng.nextInt(tiers.length)];
  if (!tier) return undefined;
  return { affixId: affix.id, tier: tier.tier, values: rollTierValues(tier, rng) };
}

/** 固定アフィックス(ユニーク/セット)を指定 Tier でロールする。 */
export function rollFixedAffix(
  affix: AffixDefinition,
  tier: number,
  rng: GameRandom,
): RolledAffix {
  const tierDef = affix.tiers.find((t) => t.tier === tier) ?? affix.tiers[affix.tiers.length - 1];
  if (!tierDef) throw new Error(`affix ${affix.id} has no tiers`);
  return { affixId: affix.id, tier: tierDef.tier, values: rollTierValues(tierDef, rng) };
}

export interface RollAffixSetParams {
  readonly pool: readonly AffixDefinition[];
  readonly itemType: ItemType;
  readonly itemLevel: number;
  readonly rarity: Rarity;
  readonly count: number;
  readonly rng: GameRandom;
}

/**
 * アフィックス一式を抽選する(仕様 §5-7 手順4〜6)。
 * - allowedItemTypes / minILvl / minRarity でプールを絞る
 * - 同一グループ排他、prefix最大3 / suffix最大3 を守る
 * - weight による重み抽選
 */
export function rollAffixSet(params: RollAffixSetParams): RolledAffix[] {
  const { pool, itemType, itemLevel, rarity, count, rng } = params;
  const usedGroups = new Set<string>();
  let prefixCount = 0;
  let suffixCount = 0;
  const result: RolledAffix[] = [];

  const basePool = pool.filter(
    (a) =>
      a.allowedItemTypes.includes(itemType) &&
      (a.minRarity === undefined || rarityOrder(rarity) >= rarityOrder(a.minRarity)) &&
      eligibleTiers(a, itemLevel).length > 0,
  );

  for (let i = 0; i < count; i++) {
    const candidates = basePool.filter(
      (a) =>
        !usedGroups.has(a.group) &&
        (a.type === 'prefix'
          ? prefixCount < GAME_CONSTANTS.maxPrefixes
          : suffixCount < GAME_CONSTANTS.maxSuffixes),
    );
    if (candidates.length === 0) break;
    const picked = candidates[rng.weightedIndex(candidates.map((a) => a.weight))];
    if (!picked) break;
    const rolled = rollAffix(picked, itemLevel, rng);
    if (!rolled) break;
    result.push(rolled);
    usedGroups.add(picked.group);
    if (picked.type === 'prefix') prefixCount++;
    else suffixCount++;
  }
  return result;
}
