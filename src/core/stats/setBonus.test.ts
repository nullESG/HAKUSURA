import { describe, expect, it } from 'vitest';
import { MASTER_DATA } from '../../data';
import { getUniqueById } from '../../data/uniques';
import { instantiateUnique } from '../drops/dropGenerator';
import { GameRandom } from '../rng/gameRandom';
import type { ItemInstance } from '../types/item';
import { resolveSetBonuses } from './setBonus';

function equipPieces(pieceIds: readonly string[]): ItemInstance[] {
  const rng = new GameRandom(1);
  return pieceIds.map((id) => instantiateUnique(rng, getUniqueById(id), 60, MASTER_DATA));
}

describe('セットボーナス解決(仕様 §5-6)', () => {
  it('部位数に応じて段階ボーナスが積み上がる', () => {
    const none = resolveSetBonuses(equipPieces(['hunter_hood']), MASTER_DATA.sets);
    expect(none.stats).toEqual({});
    expect(none.specialEffectIds).toEqual([]);
    expect(none.equippedPieces).toEqual({ shadow_hunter_set: 1 });

    const two = resolveSetBonuses(equipPieces(['hunter_hood', 'hunter_garb']), MASTER_DATA.sets);
    expect(two.stats).toEqual({ dex_flat: 15, critChance_pct: 5 });
    expect(two.specialEffectIds).toEqual([]);

    const three = resolveSetBonuses(
      equipPieces(['hunter_hood', 'hunter_garb', 'hunter_treads']),
      MASTER_DATA.sets,
    );
    // 2部位ボーナスと3部位ボーナスの両方が有効
    expect(three.stats).toEqual({
      dex_flat: 15,
      critChance_pct: 5,
      atkSpeed_pct: 15,
      dmg_pct: 20,
    });
    expect(three.specialEffectIds).toEqual(['hunter_double_strike']);
    expect(three.equippedPieces).toEqual({ shadow_hunter_set: 3 });
  });

  it('複数セットの同時装備で両方のボーナスが合算される', () => {
    const result = resolveSetBonuses(
      equipPieces(['hunter_hood', 'hunter_garb', 'sage_circlet', 'sage_robe']),
      MASTER_DATA.sets,
    );
    expect(result.stats).toEqual({
      dex_flat: 15,
      critChance_pct: 5,
      int_flat: 15,
      maxMP_flat: 40,
    });
    expect(result.equippedPieces).toEqual({ shadow_hunter_set: 2, grand_sage_set: 2 });
  });

  it('同一部位の重複は1部位として数える', () => {
    const result = resolveSetBonuses(
      equipPieces(['hunter_hood', 'hunter_hood']),
      MASTER_DATA.sets,
    );
    expect(result.stats).toEqual({});
    expect(result.equippedPieces).toEqual({ shadow_hunter_set: 1 });
  });

  it('セット以外の装備は無視される', () => {
    const rng = new GameRandom(2);
    const unique = instantiateUnique(rng, getUniqueById('titan_heart'), 60, MASTER_DATA);
    const result = resolveSetBonuses([unique], MASTER_DATA.sets);
    expect(result.stats).toEqual({});
    expect(result.equippedPieces).toEqual({});
  });
});
