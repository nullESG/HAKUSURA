/**
 * SaveRepository(仕様 §7)。IndexedDB 実装(依存ライブラリなし)。
 *
 * ストア層(Zustand)はこのインターフェースだけに依存し、
 * テストでは fake-indexeddb を注入する。
 */
import { migrateSaveData, summarize, type SaveData, type SaveSlotSummary } from './saveData';

export interface SaveRepository {
  save(slotId: string, data: SaveData): Promise<void>;
  /** 存在しないスロットは undefined。壊れたデータは SaveDataError。 */
  load(slotId: string): Promise<SaveData | undefined>;
  listSlots(): Promise<readonly SaveSlotSummary[]>;
  delete(slotId: string): Promise<void>;
}

const DB_NAME = 'hakusura';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export class IndexedDBSaveRepository implements SaveRepository {
  private dbPromise: Promise<IDBDatabase> | undefined;

  /** テストで fake-indexeddb を渡せるようにファクトリを注入可能にする。 */
  constructor(private readonly factory: IDBFactory = globalThis.indexedDB) {
    if (!factory) {
      throw new Error('IndexedDB is not available in this environment');
    }
  }

  private openDB(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = this.factory.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.openDB();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  async save(slotId: string, data: SaveData): Promise<void> {
    // structuredClone 相当の検査: プレーンデータ以外(関数・クラスインスタンス)を弾く
    const plain = JSON.parse(JSON.stringify(data)) as SaveData;
    const store = await this.store('readwrite');
    await requestToPromise(store.put(plain, slotId));
  }

  async load(slotId: string): Promise<SaveData | undefined> {
    const store = await this.store('readonly');
    const raw: unknown = await requestToPromise(store.get(slotId));
    if (raw === undefined) return undefined;
    return migrateSaveData(raw);
  }

  async listSlots(): Promise<readonly SaveSlotSummary[]> {
    const store = await this.store('readonly');
    const keys = await requestToPromise(store.getAllKeys());
    const values = await requestToPromise(store.getAll());
    const summaries: SaveSlotSummary[] = [];
    keys.forEach((key, i) => {
      try {
        summaries.push(summarize(String(key), migrateSaveData(values[i])));
      } catch {
        // 壊れたスロットは一覧から除外(ロード時に個別にエラーを出す)
      }
    });
    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async delete(slotId: string): Promise<void> {
    const store = await this.store('readwrite');
    await requestToPromise(store.delete(slotId));
  }
}
