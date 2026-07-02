/**
 * キャラクターの最終ビルド合成。
 * キャラ(成長)+ 装備(アフィックス・セット)+ スキルツリー(パッシブ)を
 * StatMap に集約し、statCalculator で二次ステータスを導出、
 * 戦闘参加者(CombatantState)まで変換する。
 */
import { combatStatsFromDerived } from '../combat/combatStats';
import type { CombatantState } from '../combat/combatTypes';
import {
  collectKeystoneEffectIds,
  collectLearnedSkillIds,
  collectPassiveStats,
} from '../progression/skillTree';
import { resolveSetBonuses } from '../stats/setBonus';
import {
  calculateDerivedStats,
  mergeStatMaps,
  statOf,
  type DerivedStats,
} from '../stats/statCalculator';
import type { AffixDefinition } from '../types/affix';
import type { Character, ClassDefinition, PrimaryStats } from '../types/character';
import type { StatMap } from '../types/enums';
import type { BaseItemDefinition, ItemInstance, ItemSetDefinition } from '../types/item';
import type { SkillNode } from '../types/skill';

/** ビルド合成に必要な静的マスタ。 */
export interface BuildMasterData {
  readonly classes: readonly ClassDefinition[];
  readonly skillTreeNodes: readonly SkillNode[];
  readonly affixes: readonly AffixDefinition[];
  readonly baseItems: readonly BaseItemDefinition[];
  readonly sets: readonly ItemSetDefinition[];
}

export interface CharacterBuild {
  readonly primary: PrimaryStats;
  readonly derived: DerivedStats;
  /** 装備+パッシブ+セットボーナスの合算 StatMap(戦闘スナップショットにも使う)。 */
  readonly mods: StatMap;
  readonly skillIds: readonly string[];
  readonly keystoneEffectIds: readonly string[];
  /** 装備中の実アイテム(UI 表示用)。 */
  readonly equippedItems: readonly ItemInstance[];
}

/** ロール済みアフィックスの StatMap を合算する。 */
function itemAffixStats(item: ItemInstance): StatMap {
  return mergeStatMaps(...item.affixes.map((a) => a.values));
}

/** キャラクターの最終ビルドを合成する。 */
export function buildCharacter(
  character: Character,
  inventory: readonly ItemInstance[],
  data: BuildMasterData,
): CharacterBuild {
  const classDef = data.classes.find((c) => c.id === character.classId);
  if (!classDef) throw new Error(`Unknown classId: ${character.classId}`);
  const tree = data.skillTreeNodes.filter((n) => n.classId === character.classId);
  const itemById = new Map(inventory.map((i) => [i.instanceId, i]));
  const baseById = new Map(data.baseItems.map((b) => [b.id, b]));

  const equippedItems = Object.values(character.equipment)
    .map((instanceId) => itemById.get(instanceId))
    .filter((i): i is ItemInstance => i !== undefined);

  // 装備アフィックス + セットボーナス + パッシブを合算
  const setBonuses = resolveSetBonuses(equippedItems, data.sets);
  const mods = mergeStatMaps(
    ...equippedItems.map(itemAffixStats),
    setBonuses.stats,
    collectPassiveStats(character.learnedNodeIds, tree),
  );

  // 一次ステータス = 成長分 + 装備/パッシブの一次補正(statCalculator は合算済み前提)
  const primary: PrimaryStats = {
    str: character.baseStats.str + statOf(mods, 'str_flat'),
    dex: character.baseStats.dex + statOf(mods, 'dex_flat'),
    int: character.baseStats.int + statOf(mods, 'int_flat'),
    vit: character.baseStats.vit + statOf(mods, 'vit_flat'),
    luk: character.baseStats.luk + statOf(mods, 'luk_flat'),
  };

  // 武器・防具の基礎値(武器はメインハンドのみ、防御は全部位合計)
  const mainHand = character.equipment.mainHand
    ? itemById.get(character.equipment.mainHand)
    : undefined;
  const mainHandBase = mainHand ? baseById.get(mainHand.baseItemId) : undefined;
  const armorDef = equippedItems.reduce(
    (acc, item) => acc + (baseById.get(item.baseItemId)?.armorDef ?? 0),
    0,
  );

  const derived = calculateDerivedStats({
    level: character.level,
    primary,
    classBase: classDef.base,
    weaponAtk: mainHandBase?.weaponAtk ?? 0,
    weaponMatk: mainHandBase?.weaponMatk ?? 0,
    armorDef,
    mods,
  });

  return {
    primary,
    derived,
    mods,
    skillIds: collectLearnedSkillIds(character.learnedNodeIds, tree),
    keystoneEffectIds: [
      ...collectKeystoneEffectIds(character.learnedNodeIds, tree),
      ...setBonuses.specialEffectIds,
    ],
    equippedItems,
  };
}

/** ビルドから戦闘参加者を生成する(HP/MP全快で開始)。 */
export function buildPartyCombatant(
  character: Character,
  build: CharacterBuild,
): CombatantState {
  const stats = combatStatsFromDerived(build.derived, build.mods);
  return {
    id: character.id,
    name: character.name,
    side: 'party',
    level: character.level,
    stats,
    currentHP: stats.maxHP,
    currentMP: stats.maxMP,
    ailments: [],
    buffs: [],
    guarding: false,
    skillIds: build.skillIds,
    keystoneEffectIds: build.keystoneEffectIds,
    isSummon: false,
    divineGuardianUsed: false,
    characterId: character.id,
  };
}
