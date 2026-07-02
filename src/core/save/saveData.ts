/**
 * セーブデータスキーマ(仕様 §7)。
 *
 * 原則:
 * - 静的マスタは保存せず ID 参照のみ(ItemInstance / Character の軽量構造)
 * - RNG の内部状態を保存し、ロード後もドロップ列が再現される
 * - version を持ち、スキーマ変更時は migrateSaveData にマイグレーションを追加する
 */
import type { BattleState } from '../combat/combatTypes';
import type { RngState } from '../rng/gameRandom';
import type { Character } from '../types/character';
import type { ItemInstance } from '../types/item';

export const SAVE_SCHEMA_VERSION = 1;

export interface SaveData {
  readonly version: number;
  /** 保存日時(epoch ms)。表示・スロット一覧のソート用。 */
  readonly savedAt: number;
  /** 単一乱数生成器の状態(仕様 §7)。 */
  readonly rngState: RngState;
  readonly gold: number;
  readonly party: readonly Character[];
  readonly inventory: readonly ItemInstance[];
  /** 無限ダンジョンの最高到達深度(仕様 §6)。 */
  readonly highestDepth: number;
  /** 戦闘中セーブ(戦闘外では undefined)。 */
  readonly battle?: BattleState;
}

/** スロット一覧表示用のメタ情報。 */
export interface SaveSlotSummary {
  readonly slotId: string;
  readonly version: number;
  readonly savedAt: number;
  readonly partyNames: readonly string[];
  readonly highestDepth: number;
}

export class SaveDataError extends Error {}

/** 将来のスキーマ変更用マイグレーション(旧 version → 次 version)。 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // 例: 1: (data) => ({ ...data, newField: defaultValue, version: 2 }),
};

/** 最低限の形状検証。壊れたデータはロード時に SaveDataError にする。 */
function validateShape(data: Record<string, unknown>): void {
  const rng = data['rngState'] as Record<string, unknown> | undefined;
  if (
    typeof data['version'] !== 'number' ||
    typeof data['savedAt'] !== 'number' ||
    typeof data['gold'] !== 'number' ||
    typeof data['highestDepth'] !== 'number' ||
    !Array.isArray(data['party']) ||
    !Array.isArray(data['inventory']) ||
    rng === undefined ||
    typeof rng['a'] !== 'number' ||
    typeof rng['b'] !== 'number' ||
    typeof rng['c'] !== 'number' ||
    typeof rng['d'] !== 'number'
  ) {
    throw new SaveDataError('セーブデータが壊れています');
  }
}

/**
 * ロードした生データを現行スキーマへ引き上げる。
 * 現行より新しい version(ダウングレード)は拒否する。
 */
export function migrateSaveData(raw: unknown): SaveData {
  if (raw === null || typeof raw !== 'object') {
    throw new SaveDataError('セーブデータが壊れています');
  }
  let data = raw as Record<string, unknown>;
  const version = data['version'];
  if (typeof version !== 'number') throw new SaveDataError('セーブデータが壊れています');
  if (version > SAVE_SCHEMA_VERSION) {
    throw new SaveDataError(
      `セーブデータのバージョン(${version})が新しすぎます(対応: ${SAVE_SCHEMA_VERSION})`,
    );
  }
  for (let v = version; v < SAVE_SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new SaveDataError(`バージョン ${v} からの移行経路がありません`);
    data = migrate(data);
  }
  validateShape(data);
  return data as unknown as SaveData;
}

export function summarize(slotId: string, data: SaveData): SaveSlotSummary {
  return {
    slotId,
    version: data.version,
    savedAt: data.savedAt,
    partyNames: data.party.map((c) => c.name),
    highestDepth: data.highestDepth,
  };
}
