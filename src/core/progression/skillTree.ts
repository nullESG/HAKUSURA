/**
 * スキルツリー進行ロジック(仕様 §3)。
 * ノード取得の検証・実行と、取得済みノードからの効果集約を提供する。
 * マスタデータ注入式で src/data に依存しない純粋関数のみ。
 */
import type { Character } from '../types/character';
import type { StatMap } from '../types/enums';
import type { SkillNode } from '../types/skill';
import { mergeStatMaps } from '../stats/statCalculator';

export type LearnFailReason =
  | 'unknown_node' // ツリーに存在しないノード
  | 'wrong_class' // 他クラスのノード
  | 'already_learned'
  | 'requirements_not_met' // 前提ノード未取得
  | 'not_enough_points';

export type LearnResult =
  | { readonly ok: true; readonly character: Character }
  | { readonly ok: false; readonly reason: LearnFailReason };

/** ノードが取得可能かを検証する(UI の活性判定にも使う)。 */
export function canLearnNode(
  character: Character,
  nodeId: string,
  tree: readonly SkillNode[],
): { ok: true; node: SkillNode } | { ok: false; reason: LearnFailReason } {
  const node = tree.find((n) => n.id === nodeId);
  if (!node) return { ok: false, reason: 'unknown_node' };
  if (node.classId !== character.classId) return { ok: false, reason: 'wrong_class' };
  if (character.learnedNodeIds.includes(nodeId)) return { ok: false, reason: 'already_learned' };
  if (!node.requiredNodeIds.every((id) => character.learnedNodeIds.includes(id))) {
    return { ok: false, reason: 'requirements_not_met' };
  }
  if (character.unspentSkillPoints < node.cost) return { ok: false, reason: 'not_enough_points' };
  return { ok: true, node };
}

/** ノードを取得した新しいキャラクターを返す(元は不変)。 */
export function learnNode(
  character: Character,
  nodeId: string,
  tree: readonly SkillNode[],
): LearnResult {
  const check = canLearnNode(character, nodeId, tree);
  if (!check.ok) return check;
  return {
    ok: true,
    character: {
      ...character,
      unspentSkillPoints: character.unspentSkillPoints - check.node.cost,
      learnedNodeIds: [...character.learnedNodeIds, nodeId],
    },
  };
}

/** 取得済みパッシブノードの StatMap を合算する(statCalculator の mods へ)。 */
export function collectPassiveStats(
  learnedNodeIds: readonly string[],
  tree: readonly SkillNode[],
): StatMap {
  const learned = new Set(learnedNodeIds);
  return mergeStatMaps(
    ...tree
      .filter((n) => learned.has(n.id) && n.passiveStats !== undefined)
      .map((n) => n.passiveStats!),
  );
}

/** 取得済みアクティブノードから使用可能スキル ID を列挙する(ツリー定義順)。 */
export function collectLearnedSkillIds(
  learnedNodeIds: readonly string[],
  tree: readonly SkillNode[],
): string[] {
  const learned = new Set(learnedNodeIds);
  return tree
    .filter((n) => learned.has(n.id) && n.skillId !== undefined)
    .map((n) => n.skillId!);
}

/** 取得済みキーストーン効果 ID を列挙する(戦闘エンジンのハンドラへ)。 */
export function collectKeystoneEffectIds(
  learnedNodeIds: readonly string[],
  tree: readonly SkillNode[],
): string[] {
  const learned = new Set(learnedNodeIds);
  return tree
    .filter((n) => learned.has(n.id) && n.keystoneEffectId !== undefined)
    .map((n) => n.keystoneEffectId!);
}
