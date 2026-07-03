import { describe, expect, it } from 'vitest';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { MONSTER_ART_IDS } from './components/MonsterArt';

describe('モンスターアート', () => {
  it('全ての敵定義にアートが存在する', () => {
    const artIds = new Set(MONSTER_ART_IDS);
    for (const enemy of ENEMY_DEFINITIONS) {
      expect(artIds.has(enemy.id), `${enemy.id}(${enemy.name})のアートがない`).toBe(true);
    }
  });

  it('敵定義に存在しない余剰アートがない(消し忘れ検知)', () => {
    const enemyIds = new Set(ENEMY_DEFINITIONS.map((e) => e.id));
    for (const artId of MONSTER_ART_IDS) {
      expect(enemyIds.has(artId), `アート ${artId} に対応する敵定義がない`).toBe(true);
    }
  });
});
