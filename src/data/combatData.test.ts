import { describe, expect, it } from 'vitest';
import { AILMENT_TYPES, ELEMENT_TYPES, STAT_IDS } from '../core/types/enums';
import { CLASS_DEFINITIONS } from './classes';
import { ENEMY_DEFINITIONS, getEnemyById } from './enemies';
import { getSkillById, SKILL_DEFINITIONS } from './skills';
import {
  getSkillNodeById,
  getSkillTreeByClass,
  KEYSTONE_EFFECT_IDS,
  SKILL_TREE_NODES,
} from './skillTrees';

const statIds = new Set<string>(STAT_IDS);

describe('スキルマスタ(仕様 §3, §4)', () => {
  it('IDがユニークで、種別に応じた必須フィールドを持つ', () => {
    const ids = new Set(SKILL_DEFINITIONS.map((s) => s.id));
    expect(ids.size).toBe(SKILL_DEFINITIONS.length);
    for (const skill of SKILL_DEFINITIONS) {
      expect(ELEMENT_TYPES).toContain(skill.element);
      expect(skill.mpCost).toBeGreaterThanOrEqual(0);
      if (skill.kind === 'attack' || skill.kind === 'heal') {
        expect(skill.multiplier, `${skill.id} の multiplier`).toBeGreaterThan(0);
      }
      if (skill.kind === 'buff' || skill.kind === 'debuff') {
        expect(skill.buff, `${skill.id} に buff がない`).toBeDefined();
        expect(Object.keys(skill.buff!.stats).length).toBeGreaterThan(0);
        expect(skill.buff!.durationTurns).toBeGreaterThan(0);
        for (const stat of Object.keys(skill.buff!.stats)) {
          expect(statIds.has(stat), `${skill.id}: 不明な stat ${stat}`).toBe(true);
        }
        // デバフは敵対象・バフは味方対象
        if (skill.kind === 'debuff') {
          expect(['singleEnemy', 'allEnemies']).toContain(skill.scope);
        } else {
          expect(['self', 'singleAlly', 'allAllies']).toContain(skill.scope);
        }
      }
      if (skill.kind === 'summon') {
        expect(skill.summonEnemyId).toBeDefined();
        expect(() => getEnemyById(skill.summonEnemyId!)).not.toThrow();
      }
      for (const ailment of skill.ailments) {
        expect(AILMENT_TYPES).toContain(ailment.type);
        expect(ailment.chancePercent).toBeGreaterThan(0);
        expect(ailment.durationTurns).toBeGreaterThan(0);
      }
    }
    expect(() => getSkillById('no_such_skill')).toThrow();
  });

  it('通常攻撃(basic_attack)が存在し倍率1.0', () => {
    const basic = getSkillById('basic_attack');
    expect(basic.multiplier).toBe(1.0);
    expect(basic.mpCost).toBe(0);
  });
});

describe('敵マスタ(仕様 §5 実装指示, §6)', () => {
  it('IDがユニークで、参照スキルが解決でき、基準値が正', () => {
    const ids = new Set(ENEMY_DEFINITIONS.map((e) => e.id));
    expect(ids.size).toBe(ENEMY_DEFINITIONS.length);
    for (const enemy of ENEMY_DEFINITIONS) {
      expect(enemy.baseStats.maxHP).toBeGreaterThan(0);
      expect(enemy.baseStats.speed).toBeGreaterThan(0);
      expect(enemy.baseExp).toBeGreaterThan(0);
      expect(enemy.baseGold).toBeGreaterThanOrEqual(0);
      expect(enemy.dropRateMultiplier).toBeGreaterThan(0);
      for (const skillId of enemy.skillIds) {
        expect(() => getSkillById(skillId), `${enemy.id} の ${skillId}`).not.toThrow();
      }
      for (const [element, value] of Object.entries(enemy.resistances)) {
        expect(ELEMENT_TYPES).toContain(element);
        expect(value).toBeLessThanOrEqual(100);
      }
      for (const ailment of Object.keys(enemy.ailmentResistances)) {
        expect(AILMENT_TYPES).toContain(ailment);
      }
    }
  });

  it('ボスと通常敵の両方が存在する', () => {
    expect(ENEMY_DEFINITIONS.some((e) => e.isBoss)).toBe(true);
    expect(ENEMY_DEFINITIONS.some((e) => !e.isBoss)).toBe(true);
  });
});

describe('スキルツリーマスタ(仕様 §3)', () => {
  it('全クラスに10ノードのツリーがあり、ID・座標がユニーク', () => {
    const ids = new Set(SKILL_TREE_NODES.map((n) => n.id));
    expect(ids.size).toBe(SKILL_TREE_NODES.length);
    for (const cls of CLASS_DEFINITIONS) {
      const tree = getSkillTreeByClass(cls.id);
      expect(tree.length, `${cls.id} のノード数`).toBe(10);
      const positions = new Set(tree.map((n) => `${n.position.x},${n.position.y}`));
      expect(positions.size).toBe(tree.length);
      // ルート(前提なし)がちょうど1つ
      expect(tree.filter((n) => n.requiredNodeIds.length === 0).length).toBe(1);
      // キーストーンがちょうど1つ
      expect(tree.filter((n) => n.nodeType === 'keystone').length).toBe(1);
    }
  });

  it('ノード種別に応じた必須フィールドを持ち、参照が解決できる', () => {
    const classIds = new Set(CLASS_DEFINITIONS.map((c) => c.id));
    for (const node of SKILL_TREE_NODES) {
      expect(classIds.has(node.classId), `${node.id} の classId`).toBe(true);
      expect(node.cost).toBeGreaterThanOrEqual(1);
      if (node.nodeType === 'active') {
        expect(node.skillId, `${node.id} に skillId がない`).toBeDefined();
        expect(() => getSkillById(node.skillId!)).not.toThrow();
      }
      if (node.nodeType === 'passive') {
        expect(node.passiveStats).toBeDefined();
        expect(Object.keys(node.passiveStats!).length).toBeGreaterThan(0);
        for (const stat of Object.keys(node.passiveStats!)) {
          expect(statIds.has(stat), `${node.id}: 不明な stat ${stat}`).toBe(true);
        }
      }
      if (node.nodeType === 'keystone') {
        expect(node.keystoneEffectId).toBeDefined();
        expect(KEYSTONE_EFFECT_IDS).toContain(node.keystoneEffectId);
      }
    }
  });

  it('前提ノードは同一クラス内に存在し、循環がない(DAG)', () => {
    for (const node of SKILL_TREE_NODES) {
      for (const reqId of node.requiredNodeIds) {
        const req = getSkillNodeById(reqId);
        expect(req.classId, `${node.id} → ${reqId} がクラス跨ぎ`).toBe(node.classId);
      }
    }
    // トポロジカルソートで全ノードが処理できれば循環なし+全ノード到達可能
    for (const cls of CLASS_DEFINITIONS) {
      const tree = getSkillTreeByClass(cls.id);
      const learned = new Set<string>();
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (const node of tree) {
          if (learned.has(node.id)) continue;
          if (node.requiredNodeIds.every((id) => learned.has(id))) {
            learned.add(node.id);
            progressed = true;
          }
        }
      }
      expect(learned.size, `${cls.id} に到達不能ノードか循環がある`).toBe(tree.length);
    }
  });
});
