/**
 * 無限ダンジョンの出現テーブル(仕様 §6)。
 * 深度が進むほど強い敵種がプールに追加される(数値は仮置き)。
 */

export interface DungeonPoolEntry {
  readonly enemyId: string;
  /** この敵が出現し始める深度。 */
  readonly minDepth: number;
  readonly weight: number;
}

/** 通常フロアの敵プール。 */
export const DUNGEON_ENEMY_POOL: readonly DungeonPoolEntry[] = [
  { enemyId: 'slime', minDepth: 1, weight: 100 },
  { enemyId: 'goblin', minDepth: 1, weight: 90 },
  { enemyId: 'bat', minDepth: 1, weight: 80 },
  { enemyId: 'wolf', minDepth: 3, weight: 80 },
  { enemyId: 'skeleton', minDepth: 8, weight: 70 },
  { enemyId: 'zombie', minDepth: 8, weight: 70 },
  { enemyId: 'imp', minDepth: 12, weight: 60 },
  { enemyId: 'orc', minDepth: 15, weight: 60 },
  { enemyId: 'dark_mage', minDepth: 20, weight: 50 },
  { enemyId: 'golem', minDepth: 25, weight: 40 },
  { enemyId: 'harpy', minDepth: 30, weight: 40 },
  { enemyId: 'wraith', minDepth: 40, weight: 40 },
];

/** ボスフロア(10層ごと)のボスプール。 */
export const DUNGEON_BOSS_POOL: readonly DungeonPoolEntry[] = [
  { enemyId: 'goblin_king', minDepth: 10, weight: 100 },
  { enemyId: 'frost_dragon', minDepth: 30, weight: 80 },
  { enemyId: 'lich', minDepth: 50, weight: 80 },
];

/** ボスフロアの間隔(深度がこの倍数のときボス戦)。 */
export const BOSS_DEPTH_INTERVAL = 10;

/** 敵1体あたりの基礎ドロップ率%(dropRateMultiplier を乗算)。 */
export const BASE_DROP_CHANCE_PCT = 30;
