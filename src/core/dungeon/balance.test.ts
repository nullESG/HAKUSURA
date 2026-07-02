/**
 * バランス検証(難易度勾配のスモーク)。
 * 初期パーティ(Lv1・裸・ルートスキルのみ)を自動行動で戦わせ、
 * - 深度1では安定して勝てる
 * - 深度30では手も足も出ない
 * ことを統計的に確認する。§6 の指数スケーリングが機能している保証。
 */
import { describe, expect, it } from 'vitest';
import { BUILD_DATA, COMBAT_DATA, DUNGEON_DATA } from '../../data';
import {
  chooseAutoAction,
  createBattleState,
  executeTurn,
  nextActorId,
} from '../combat/battleEngine';
import { buildCharacter, buildPartyCombatant } from '../player/characterBuild';
import { GameRandom } from '../rng/gameRandom';
import type { Character } from '../types/character';
import { generateEncounter } from './encounter';

const ROOT_NODES: Record<string, string> = {
  warrior: 'w_root',
  mage: 'm_root',
  ranger: 'r_root',
  cleric: 'c_root',
};

function makeStarterParty(): Character[] {
  return Object.entries(ROOT_NODES).map(([classId, rootNode], i) => {
    const cls = BUILD_DATA.classes.find((c) => c.id === classId)!;
    return {
      id: `ch_${i}`,
      name: cls.name,
      classId,
      level: 1,
      exp: 0,
      baseStats: cls.startingStats,
      unspentStatPoints: 0,
      unspentSkillPoints: 0,
      learnedNodeIds: [rootNode],
      equipment: {},
    };
  });
}

/** 全員自動行動で1戦シミュレートし、勝敗を返す(決着しない場合は敗北扱い)。 */
function simulateBattle(seed: number, depth: number): 'victory' | 'defeat' {
  const rng = new GameRandom(seed);
  const party = makeStarterParty().map((c) =>
    buildPartyCombatant(c, buildCharacter(c, [], BUILD_DATA)),
  );
  const enemies = generateEncounter(rng, depth, DUNGEON_DATA);
  let state = createBattleState(party, enemies);
  for (let i = 0; i < 400 && state.phase === 'active'; i++) {
    const actorId = nextActorId(state);
    if (!actorId) break;
    const result = executeTurn(
      state,
      rng,
      actorId,
      chooseAutoAction(state, rng, actorId, COMBAT_DATA),
      COMBAT_DATA,
    );
    if (!result.ok) break;
    state = result.state;
  }
  return state.phase === 'victory' ? 'victory' : 'defeat';
}

function winRate(depth: number, runs: number): number {
  let wins = 0;
  for (let seed = 1; seed <= runs; seed++) {
    if (simulateBattle(seed * 31 + depth, depth) === 'victory') wins++;
  }
  return wins / runs;
}

describe('難易度勾配(仕様 §6 のスケーリング検証)', () => {
  it('初期パーティは深度1で安定して勝てる(勝率80%以上)', () => {
    expect(winRate(1, 30)).toBeGreaterThanOrEqual(0.8);
  });

  it('初期パーティは深度30ではほぼ勝てない(勝率10%以下)', () => {
    expect(winRate(30, 30)).toBeLessThanOrEqual(0.1);
  });

  it('深度が上がるほど勝率が下がる(1層 ≥ 6層 ≥ 30層)', () => {
    const shallow = winRate(1, 30);
    const mid = winRate(6, 30);
    const deep = winRate(30, 30);
    expect(shallow).toBeGreaterThanOrEqual(mid);
    expect(mid).toBeGreaterThanOrEqual(deep);
  });
});
