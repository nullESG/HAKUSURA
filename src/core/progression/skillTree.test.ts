import { describe, expect, it } from 'vitest';
import { getSkillTreeByClass } from '../../data/skillTrees';
import type { Character } from '../types/character';
import {
  canLearnNode,
  collectKeystoneEffectIds,
  collectLearnedSkillIds,
  collectPassiveStats,
  learnNode,
} from './skillTree';

const TREE = getSkillTreeByClass('warrior');

function makeWarrior(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ch1',
    name: 'テスト戦士',
    classId: 'warrior',
    level: 10,
    exp: 0,
    baseStats: { str: 12, dex: 5, int: 3, vit: 11, luk: 5 },
    unspentStatPoints: 0,
    unspentSkillPoints: 10,
    learnedNodeIds: [],
    equipment: {},
    ...overrides,
  };
}

describe('スキルツリー進行(仕様 §3)', () => {
  it('ルートから前提順に取得でき、ポイントが減る', () => {
    let ch = makeWarrior();
    const r1 = learnNode(ch, 'w_root', TREE);
    if (!r1.ok) throw new Error(r1.reason);
    ch = r1.character;
    expect(ch.unspentSkillPoints).toBe(9);
    expect(ch.learnedNodeIds).toEqual(['w_root']);

    const r2 = learnNode(ch, 'w_str1', TREE);
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.character.unspentSkillPoints).toBe(8);
  });

  it('前提未取得のノードは requirements_not_met', () => {
    const ch = makeWarrior();
    expect(learnNode(ch, 'w_cleave', TREE)).toEqual({
      ok: false,
      reason: 'requirements_not_met',
    });
  });

  it('ポイント不足は not_enough_points', () => {
    const ch = makeWarrior({ unspentSkillPoints: 0 });
    expect(learnNode(ch, 'w_root', TREE)).toEqual({ ok: false, reason: 'not_enough_points' });
  });

  it('取得済み・他クラス・不明ノードを拒否する', () => {
    const ch = makeWarrior({ learnedNodeIds: ['w_root'] });
    expect(learnNode(ch, 'w_root', TREE)).toEqual({ ok: false, reason: 'already_learned' });
    expect(canLearnNode(ch, 'm_root', getSkillTreeByClass('mage'))).toEqual({
      ok: false,
      reason: 'wrong_class',
    });
    expect(canLearnNode(ch, 'nope', TREE)).toEqual({ ok: false, reason: 'unknown_node' });
  });

  it('キーストーンまで一本道で取得でき、効果集約が正しい', () => {
    let ch = makeWarrior({ unspentSkillPoints: 99 });
    for (const nodeId of ['w_root', 'w_str1', 'w_cleave', 'w_str2', 'w_cry', 'w_keystone']) {
      const result = learnNode(ch, nodeId, TREE);
      if (!result.ok) throw new Error(`${nodeId}: ${result.reason}`);
      ch = result.character;
    }
    expect(collectLearnedSkillIds(ch.learnedNodeIds, TREE)).toEqual([
      'power_strike',
      'cleave',
      'war_cry',
    ]);
    expect(collectPassiveStats(ch.learnedNodeIds, TREE)).toEqual({
      str_flat: 13, // 5 + 8
      dmg_pct: 5,
    });
    expect(collectKeystoneEffectIds(ch.learnedNodeIds, TREE)).toEqual(['berserker']);
  });

  it('learnNode は元のキャラクターを変更しない(不変性)', () => {
    const ch = makeWarrior();
    const result = learnNode(ch, 'w_root', TREE);
    expect(result.ok).toBe(true);
    expect(ch.learnedNodeIds).toEqual([]);
    expect(ch.unspentSkillPoints).toBe(10);
  });
});
