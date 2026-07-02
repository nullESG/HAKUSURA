import type { CombatMasterData } from '../core/combat/battleEngine';
import type { DropMasterData } from '../core/drops/dropGenerator';
import type { DungeonMasterData } from '../core/dungeon/encounter';
import type { BuildMasterData } from '../core/player/characterBuild';
import { AFFIX_DEFINITIONS } from './affixes';
import { BASE_ITEM_DEFINITIONS } from './baseItems';
import { CLASS_DEFINITIONS } from './classes';
import { AFFIX_COUNT_BY_RARITY, RARITY_DOWNGRADE, RARITY_WEIGHTS } from './dropTables';
import {
  BASE_DROP_CHANCE_PCT,
  BOSS_DEPTH_INTERVAL,
  DUNGEON_BOSS_POOL,
  DUNGEON_ENEMY_POOL,
} from './dungeonTable';
import { ENEMY_DEFINITIONS } from './enemies';
import { SKILL_DEFINITIONS } from './skills';
import { SKILL_TREE_NODES } from './skillTrees';
import { ITEM_SET_DEFINITIONS, UNIQUE_ITEM_DEFINITIONS } from './uniques';

/** ドロップ生成用マスタデータ一式(core 層へ注入する)。 */
export const MASTER_DATA: DropMasterData = {
  baseItems: BASE_ITEM_DEFINITIONS,
  affixes: AFFIX_DEFINITIONS,
  uniques: UNIQUE_ITEM_DEFINITIONS,
  sets: ITEM_SET_DEFINITIONS,
  rarityWeights: RARITY_WEIGHTS,
  affixCountByRarity: AFFIX_COUNT_BY_RARITY,
  rarityDowngrade: RARITY_DOWNGRADE,
};

/** 戦闘エンジン用マスタデータ。 */
export const COMBAT_DATA: CombatMasterData = {
  skills: SKILL_DEFINITIONS,
  enemies: ENEMY_DEFINITIONS,
};

/** キャラビルド合成用マスタデータ。 */
export const BUILD_DATA: BuildMasterData = {
  classes: CLASS_DEFINITIONS,
  skillTreeNodes: SKILL_TREE_NODES,
  affixes: AFFIX_DEFINITIONS,
  baseItems: BASE_ITEM_DEFINITIONS,
  sets: ITEM_SET_DEFINITIONS,
};

/** 無限ダンジョン用マスタデータ。 */
export const DUNGEON_DATA: DungeonMasterData = {
  enemies: ENEMY_DEFINITIONS,
  enemyPool: DUNGEON_ENEMY_POOL,
  bossPool: DUNGEON_BOSS_POOL,
  bossDepthInterval: BOSS_DEPTH_INTERVAL,
  baseDropChancePct: BASE_DROP_CHANCE_PCT,
};
