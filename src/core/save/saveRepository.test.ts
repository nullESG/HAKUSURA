import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { MASTER_DATA } from '../../data';
import { generateItem } from '../drops/dropGenerator';
import { GameRandom } from '../rng/gameRandom';
import type { Character } from '../types/character';
import { migrateSaveData, SAVE_SCHEMA_VERSION, SaveDataError, type SaveData } from './saveData';
import { IndexedDBSaveRepository } from './saveRepository';

function makeCharacter(name: string): Character {
  return {
    id: `ch_${name}`,
    name,
    classId: 'warrior',
    level: 5,
    exp: 1200,
    baseStats: { str: 15, dex: 6, int: 3, vit: 13, luk: 5 },
    unspentStatPoints: 5,
    unspentSkillPoints: 2,
    learnedNodeIds: ['w_root', 'w_str1'],
    equipment: { mainHand: 'itm_deadbeef00000000' },
  };
}

function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
  const rng = new GameRandom(123);
  const inventory = Array.from({ length: 5 }, () =>
    generateItem(rng, { itemLevel: 30 }, MASTER_DATA),
  );
  return {
    version: SAVE_SCHEMA_VERSION,
    savedAt: 1_760_000_000_000,
    rngState: rng.state,
    gold: 4200,
    party: [makeCharacter('アルタ'), makeCharacter('ベルカ')],
    inventory,
    highestDepth: 12,
    ...overrides,
  };
}

function makeRepo(): IndexedDBSaveRepository {
  // テストごとに独立した空の IndexedDB
  return new IndexedDBSaveRepository(new IDBFactory());
}

describe('SaveRepository(仕様 §7)', () => {
  it('保存 → ロードで完全に一致する(ラウンドトリップ)', async () => {
    const repo = makeRepo();
    const data = makeSaveData();
    await repo.save('slot1', data);
    const loaded = await repo.load('slot1');
    expect(loaded).toEqual(data);
  });

  it('存在しないスロットは undefined', async () => {
    const repo = makeRepo();
    expect(await repo.load('nope')).toBeUndefined();
  });

  it('上書き保存で最新が読める', async () => {
    const repo = makeRepo();
    await repo.save('slot1', makeSaveData({ gold: 100 }));
    await repo.save('slot1', makeSaveData({ gold: 999 }));
    expect((await repo.load('slot1'))!.gold).toBe(999);
  });

  it('listSlots が savedAt 降順のメタ情報を返す', async () => {
    const repo = makeRepo();
    await repo.save('a', makeSaveData({ savedAt: 1000 }));
    await repo.save('b', makeSaveData({ savedAt: 3000, highestDepth: 30 }));
    await repo.save('c', makeSaveData({ savedAt: 2000 }));
    const slots = await repo.listSlots();
    expect(slots.map((s) => s.slotId)).toEqual(['b', 'c', 'a']);
    expect(slots[0]).toEqual({
      slotId: 'b',
      version: SAVE_SCHEMA_VERSION,
      savedAt: 3000,
      partyNames: ['アルタ', 'ベルカ'],
      highestDepth: 30,
    });
  });

  it('delete でスロットが消える', async () => {
    const repo = makeRepo();
    await repo.save('slot1', makeSaveData());
    await repo.delete('slot1');
    expect(await repo.load('slot1')).toBeUndefined();
    expect(await repo.listSlots()).toEqual([]);
  });

  it('RNG状態の復元でドロップ列が再現される(§7 の核心)', async () => {
    const repo = makeRepo();
    // セーブ時点の RNG 状態を保存
    const rng = new GameRandom(777);
    generateItem(rng, { itemLevel: 50 }, MASTER_DATA); // 進行済み状態を作る
    await repo.save('slot1', makeSaveData({ rngState: rng.state }));
    // セーブ後にさらに引いたドロップ列
    const expected = Array.from({ length: 10 }, () =>
      generateItem(rng, { itemLevel: 50 }, MASTER_DATA),
    );
    // ロードして復元した RNG から同じ列が出る
    const loaded = await repo.load('slot1');
    const restored = GameRandom.fromState(loaded!.rngState);
    const actual = Array.from({ length: 10 }, () =>
      generateItem(restored, { itemLevel: 50 }, MASTER_DATA),
    );
    expect(actual).toEqual(expected);
  });

  it('壊れたデータ・未来バージョンは SaveDataError', () => {
    expect(() => migrateSaveData(null)).toThrow(SaveDataError);
    expect(() => migrateSaveData({ version: 'x' })).toThrow(SaveDataError);
    expect(() => migrateSaveData({ ...makeSaveData(), version: SAVE_SCHEMA_VERSION + 1 })).toThrow(
      /新しすぎます/,
    );
    expect(() => migrateSaveData({ ...makeSaveData(), rngState: undefined })).toThrow(
      SaveDataError,
    );
    // 現行バージョンはそのまま通る
    expect(migrateSaveData(makeSaveData())).toEqual(makeSaveData());
  });

  it('IndexedDB が無い環境ではコンストラクタで明示的に失敗する', () => {
    expect(() => new IndexedDBSaveRepository(undefined as unknown as IDBFactory)).toThrow(
      /IndexedDB/,
    );
  });
});
