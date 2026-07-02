import { describe, expect, it } from 'vitest';
import { BUILD_DATA, MASTER_DATA } from '../../data';
import { getUniqueById } from '../../data/uniques';
import { instantiateUnique } from '../drops/dropGenerator';
import { GameRandom } from '../rng/gameRandom';
import type { Character } from '../types/character';
import type { ItemInstance } from '../types/item';
import { buildCharacter, buildPartyCombatant } from './characterBuild';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'ch1',
    name: 'アルタ',
    classId: 'warrior',
    level: 5,
    exp: 0,
    baseStats: { str: 20, dex: 5, int: 3, vit: 15, luk: 5 },
    unspentStatPoints: 0,
    unspentSkillPoints: 0,
    learnedNodeIds: [],
    equipment: {},
    ...overrides,
  };
}

/** 固定アフィックスのユニークを装備品として使う(値が決定論的にロールされる)。 */
function makeEquipment(): { items: ItemInstance[]; weapon: ItemInstance; armor: ItemInstance } {
  const rng = new GameRandom(1);
  const weapon = instantiateUnique(rng, getUniqueById('vampire_fang'), 60, MASTER_DATA); // short_sword: ATK8
  const armor = instantiateUnique(rng, getUniqueById('titan_heart'), 60, MASTER_DATA); // plate_armor: DEF44
  return { items: [weapon, armor], weapon, armor };
}

describe('キャラビルド合成', () => {
  it('装備なし・ツリーなしはクラス基礎値どおり', () => {
    const ch = makeCharacter();
    const build = buildCharacter(ch, [], BUILD_DATA);
    expect(build.mods).toEqual({});
    expect(build.skillIds).toEqual([]);
    // maxHP = 60 + 15*8 + 5*5 = 205
    expect(build.derived.maxHP).toBe(205);
    // physATK = 20*1.5 = 30(武器なし)
    expect(build.derived.physATK).toBe(30);
  });

  it('装備の基礎値とアフィックスが反映される', () => {
    const { items, weapon, armor } = makeEquipment();
    const ch = makeCharacter({
      equipment: { mainHand: weapon.instanceId, armor: armor.instanceId },
    });
    const build = buildCharacter(ch, items, BUILD_DATA);
    // 武器ATK8が乗る: physATK = (20*1.5 + 8 + phys_atk_flat) * (1+dmg%)
    expect(build.derived.physATK).toBeGreaterThan(30 + 8);
    // titan_heart の vit_flat が一次ステに合算される
    expect(build.primary.vit).toBeGreaterThan(15);
    // 防具の基礎DEF(44)が防御に反映
    expect(build.derived.defense).toBeGreaterThanOrEqual(44);
    expect(build.equippedItems.length).toBe(2);
    // 吸血・反射のような戦闘用 mods も集約されている
    expect(build.mods.lifeLeech_pct).toBeGreaterThan(0);
    expect(build.mods.thorns_flat).toBeGreaterThan(0);
  });

  it('スキルツリーのパッシブ・アクティブ・キーストーンが反映される', () => {
    const ch = makeCharacter({
      learnedNodeIds: ['w_root', 'w_str1', 'w_cleave', 'w_str2', 'w_cry', 'w_keystone'],
    });
    const build = buildCharacter(ch, [], BUILD_DATA);
    // str_flat 5+8 が一次ステに合算
    expect(build.primary.str).toBe(20 + 13);
    expect(build.skillIds).toEqual(['power_strike', 'cleave', 'war_cry']);
    expect(build.keystoneEffectIds).toEqual(['berserker']);
  });

  it('インベントリに無い instanceId は無視される(装備欠損の安全側)', () => {
    const ch = makeCharacter({ equipment: { mainHand: 'itm_missing' } });
    const build = buildCharacter(ch, [], BUILD_DATA);
    expect(build.equippedItems).toEqual([]);
    expect(build.derived.physATK).toBe(30);
  });

  it('戦闘参加者へ変換される(HP/MP全快・スナップショット一致)', () => {
    const ch = makeCharacter({ learnedNodeIds: ['w_root'] });
    const build = buildCharacter(ch, [], BUILD_DATA);
    const combatant = buildPartyCombatant(ch, build);
    expect(combatant.side).toBe('party');
    expect(combatant.currentHP).toBe(build.derived.maxHP);
    expect(combatant.currentMP).toBe(build.derived.maxMP);
    expect(combatant.skillIds).toEqual(['power_strike']);
    expect(combatant.characterId).toBe('ch1');
  });
});
