import { describe, expect, it } from 'vitest';
import { DUNGEON_DATA, MASTER_DATA } from '../../data';
import { GAME_CONSTANTS } from '../constants';
import { GameRandom } from '../rng/gameRandom';
import {
  generateEncounter,
  isBossDepth,
  itemLevelForDepth,
  rollVictoryDrops,
} from './encounter';

describe('無限ダンジョン(仕様 §6)', () => {
  it('10層ごとにボスフロアになる', () => {
    expect(isBossDepth(10, DUNGEON_DATA)).toBe(true);
    expect(isBossDepth(20, DUNGEON_DATA)).toBe(true);
    expect(isBossDepth(1, DUNGEON_DATA)).toBe(false);
    expect(isBossDepth(15, DUNGEON_DATA)).toBe(false);
  });

  it('アイテムレベルは深度に等しい(1〜100にクランプ)', () => {
    expect(itemLevelForDepth(1)).toBe(1);
    expect(itemLevelForDepth(55)).toBe(55);
    expect(itemLevelForDepth(0)).toBe(1);
    expect(itemLevelForDepth(300)).toBe(100);
  });

  it('通常フロアは1〜4体で、深度制限を満たす敵だけが出る', () => {
    const rng = new GameRandom(1);
    for (let i = 0; i < 100; i++) {
      const encounter = generateEncounter(rng, 5, DUNGEON_DATA);
      expect(encounter.length).toBeGreaterThanOrEqual(1);
      expect(encounter.length).toBeLessThanOrEqual(GAME_CONSTANTS.maxEnemyGroupSize);
      for (const enemy of encounter) {
        const entry = DUNGEON_DATA.enemyPool.find((p) => p.enemyId === enemy.enemyDefId)!;
        expect(entry.minDepth).toBeLessThanOrEqual(5);
        expect(enemy.side).toBe('enemy');
      }
    }
  });

  it('ボスフロアはボス1体で、深度スケーリングされている', () => {
    const rng = new GameRandom(2);
    const encounter = generateEncounter(rng, 10, DUNGEON_DATA);
    expect(encounter.length).toBe(1);
    expect(encounter[0]!.enemyDefId).toBe('goblin_king'); // 深度10で出せるボスは1種
    const base = DUNGEON_DATA.enemies.find((e) => e.id === 'goblin_king')!;
    expect(encounter[0]!.stats.maxHP).toBe(Math.floor(base.baseStats.maxHP * Math.pow(1.08, 10)));
  });

  it('同一シードで同一エンカウント(決定論)', () => {
    const a = generateEncounter(new GameRandom(7), 15, DUNGEON_DATA);
    const b = generateEncounter(new GameRandom(7), 15, DUNGEON_DATA);
    expect(a).toEqual(b);
  });

  it('ドロップ抽選: ボス(補正3倍)は90%、深度相当のiLvlで生成される', () => {
    const rng = new GameRandom(3);
    const rewards = {
      exp: 100,
      gold: 100,
      defeatedEnemies: [{ enemyDefId: 'goblin_king', dropRateMultiplier: 3 }],
    };
    let dropCount = 0;
    for (let i = 0; i < 200; i++) {
      const drops = rollVictoryDrops(rng, rewards, 10, 0, DUNGEON_DATA, MASTER_DATA);
      for (const drop of drops) {
        expect(drop.itemLevel).toBe(10);
      }
      dropCount += drops.length;
    }
    // 期待値 90%(=180/200)。統計的に 150 以上は出るはず
    expect(dropCount).toBeGreaterThan(150);
  });

  it('撃破数ぶんの抽選が行われる(複数体)', () => {
    const rng = new GameRandom(4);
    const rewards = {
      exp: 0,
      gold: 0,
      defeatedEnemies: [
        { enemyDefId: 'slime', dropRateMultiplier: 1 },
        { enemyDefId: 'goblin', dropRateMultiplier: 1 },
        { enemyDefId: 'wolf', dropRateMultiplier: 1 },
      ],
    };
    let total = 0;
    for (let i = 0; i < 300; i++) {
      total += rollVictoryDrops(rng, rewards, 5, 0, DUNGEON_DATA, MASTER_DATA).length;
    }
    // 期待値 30% × 3体 × 300回 = 270個。統計幅を見て 180〜360
    expect(total).toBeGreaterThan(180);
    expect(total).toBeLessThan(360);
  });
});
