/**
 * 無限ダンジョンのエンカウント生成とドロップ判定(仕様 §6)。
 * - 深度に応じた敵プールから 1〜4 体を抽選(§4 の敵グループ上限内)
 * - BOSS_DEPTH_INTERVAL の倍数の深度はボスフロア
 * - アイテムレベル = 深度(上限100、仮定)
 * - 敵の強さ・報酬は enemyScaling(1.08^depth)でスケーリング
 */
import type { DungeonPoolEntry } from '../../data/dungeonTable';
import type { CombatantState } from '../combat/combatTypes';
import { buildEnemyCombatant } from '../combat/enemyScaling';
import type { BattleRewards } from '../combat/battleEngine';
import { generateItem, type DropMasterData } from '../drops/dropGenerator';
import type { GameRandom } from '../rng/gameRandom';
import type { EnemyDefinition } from '../types/enemy';
import type { ItemInstance } from '../types/item';

export interface DungeonMasterData {
  readonly enemies: readonly EnemyDefinition[];
  readonly enemyPool: readonly DungeonPoolEntry[];
  readonly bossPool: readonly DungeonPoolEntry[];
  readonly bossDepthInterval: number;
  readonly baseDropChancePct: number;
}

export function isBossDepth(depth: number, data: DungeonMasterData): boolean {
  return depth > 0 && depth % data.bossDepthInterval === 0;
}

/** ドロップのアイテムレベル(深度がそのまま iLvl、上限100。仮定)。 */
export function itemLevelForDepth(depth: number): number {
  return Math.max(1, Math.min(100, depth));
}

/** 通常フロア: 1〜4体(重み 20/35/30/15)。ボスフロア: ボス1体。 */
export function generateEncounter(
  rng: GameRandom,
  depth: number,
  data: DungeonMasterData,
): CombatantState[] {
  const defById = new Map(data.enemies.map((e) => [e.id, e]));
  const pick = (pool: readonly DungeonPoolEntry[]): EnemyDefinition => {
    const candidates = pool.filter((entry) => entry.minDepth <= depth);
    if (candidates.length === 0) {
      throw new Error(`No enemy available at depth=${depth}`);
    }
    const entry = candidates[rng.weightedIndex(candidates.map((c) => c.weight))]!;
    const def = defById.get(entry.enemyId);
    if (!def) throw new Error(`Unknown enemyId in pool: ${entry.enemyId}`);
    return def;
  };

  if (isBossDepth(depth, data)) {
    return [buildEnemyCombatant(pick(data.bossPool), depth, `enemy_boss_${depth}`)];
  }
  const count = 1 + rng.weightedIndex([20, 35, 30, 15]);
  return Array.from({ length: count }, (_, i) =>
    buildEnemyCombatant(pick(data.enemyPool), depth, `enemy_${depth}_${i}`),
  );
}

/**
 * 勝利報酬のドロップ抽選。
 * 敵1体につき baseDropChancePct × dropRateMultiplier %(上限100)で1個生成する。
 */
export function rollVictoryDrops(
  rng: GameRandom,
  rewards: BattleRewards,
  depth: number,
  magicFindPct: number,
  dungeonData: DungeonMasterData,
  dropData: DropMasterData,
): ItemInstance[] {
  const itemLevel = itemLevelForDepth(depth);
  const drops: ItemInstance[] = [];
  for (const defeated of rewards.defeatedEnemies) {
    const chance = Math.min(100, dungeonData.baseDropChancePct * defeated.dropRateMultiplier);
    if (rng.roll(chance)) {
      drops.push(generateItem(rng, { itemLevel, magicFindPct }, dropData));
    }
  }
  return drops;
}
