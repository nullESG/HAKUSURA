/**
 * ゲーム全体の状態管理(Zustand)。
 *
 * core 層の純粋関数をつなぐオーケストレーション層。
 * - 乱数は単一 GameRandom の状態(rngState)を Zustand 状態として持ち、
 *   使うたびに復元→実行→書き戻す(セーブでそのまま永続化される)
 * - 戦闘はプレイヤー操作のキャラ以外(敵・召喚)を自動で進める
 */
import { create } from 'zustand';
import type {
  ActionFailReason,
  BattleEvent,
  BattleState,
  CombatAction,
} from '../core/combat/combatTypes';
import {
  chooseAutoAction,
  computeBattleRewards,
  createBattleState,
  executeTurn,
  getCombatant,
  nextActorId,
} from '../core/combat/battleEngine';
import { craftItem, type CraftOperation, type CraftFailReason } from '../core/craft/crafting';
import { generateEncounter, rollVictoryDrops } from '../core/dungeon/encounter';
import { buildCharacter, buildPartyCombatant } from '../core/player/characterBuild';
import { allocateStatPoint, gainExp } from '../core/progression/leveling';
import { learnNode, type LearnFailReason } from '../core/progression/skillTree';
import { GameRandom, type RngState } from '../core/rng/gameRandom';
import { SAVE_SCHEMA_VERSION, type SaveData, type SaveSlotSummary } from '../core/save/saveData';
import { IndexedDBSaveRepository, type SaveRepository } from '../core/save/saveRepository';
import type { Character, PrimaryStats } from '../core/types/character';
import type { EquipSlot } from '../core/types/enums';
import type { ItemInstance } from '../core/types/item';
import { BUILD_DATA, COMBAT_DATA, DUNGEON_DATA, MASTER_DATA } from '../data';
import { getBaseItemById } from '../data/baseItems';
import { getClassById } from '../data/classes';
import { craftGoldCost } from '../data/economy';
import { getSkillTreeByClass } from '../data/skillTrees';

export type Screen = 'title' | 'party' | 'inventory' | 'skills' | 'dungeon' | 'battle';

/** 部位 → 装備できるアイテム種別。 */
const SLOT_ACCEPTS: Readonly<Record<EquipSlot, readonly string[]>> = {
  mainHand: ['weapon1h', 'weapon2h'],
  offHand: ['shield'],
  helmet: ['helmet'],
  armor: ['armor'],
  gloves: ['gloves'],
  boots: ['boots'],
  amulet: ['amulet'],
  ring1: ['ring'],
  ring2: ['ring'],
  belt: ['belt'],
};

export type EquipFailReason = 'not_found' | 'slot_mismatch' | 'str_too_low' | 'two_handed_conflict';

export interface BattleRewardSummary {
  readonly exp: number;
  readonly gold: number;
  readonly drops: readonly ItemInstance[];
  readonly levelUps: readonly { name: string; level: number }[];
}

interface GameStore {
  // --- メタ ---
  screen: Screen;
  started: boolean;
  slotId: string;
  repository: SaveRepository | undefined;
  // --- セーブ対象の状態 ---
  rngState: RngState;
  gold: number;
  party: Character[];
  inventory: ItemInstance[];
  highestDepth: number;
  // --- ダンジョン進行(セッション内) ---
  currentDepth: number;
  battle: BattleState | undefined;
  battleLog: BattleEvent[];
  lastRewards: BattleRewardSummary | undefined;

  // --- アクション ---
  setScreen(screen: Screen): void;
  newGame(members: readonly { name: string; classId: string }[], seed: number): void;
  saveGame(now: number): Promise<void>;
  loadGame(slotId: string): Promise<boolean>;
  listSlots(): Promise<readonly SaveSlotSummary[]>;

  allocateStat(characterId: string, stat: keyof PrimaryStats): void;
  learnSkillNode(characterId: string, nodeId: string): LearnFailReason | undefined;
  equipItem(characterId: string, slot: EquipSlot, instanceId: string): EquipFailReason | undefined;
  unequipItem(characterId: string, slot: EquipSlot): void;
  craft(instanceId: string, operation: CraftOperation): CraftFailReason | 'not_enough_gold' | undefined;
  sellItem(instanceId: string): void;

  enterDungeon(depth: number): void;
  playerAction(action: CombatAction): ActionFailReason | undefined;
  dismissRewards(goDeeper: boolean): void;
  retreat(): void;
}

/** rngState を復元して fn を実行し、消費後の状態を書き戻すためのヘルパ。 */
function withRng<T>(state: RngState, fn: (rng: GameRandom) => T): { result: T; rngState: RngState } {
  const rng = GameRandom.fromState(state);
  const result = fn(rng);
  return { result, rngState: rng.state };
}

/** 戦闘を「次がプレイヤー操作キャラ or 終了」まで自動で進める。 */
function advanceAuto(
  battle: BattleState,
  rng: GameRandom,
  log: BattleEvent[],
): BattleState {
  let current = battle;
  for (let guard = 0; guard < 200; guard++) {
    if (current.phase !== 'active') return current;
    const actorId = nextActorId(current);
    if (!actorId) return current;
    const actor = getCombatant(current, actorId)!;
    const isPlayerControlled = actor.side === 'party' && !actor.isSummon;
    if (isPlayerControlled) return current;
    const result = executeTurn(current, rng, actorId, chooseAutoAction(current, rng, actorId, COMBAT_DATA), COMBAT_DATA);
    if (!result.ok) return current; // 到達しない想定(自動行動は常に有効)
    log.push(...result.events);
    current = result.state;
  }
  return current;
}

/** 撃破後の売却額(仮定: iLvl × レアリティ係数)。 */
const SELL_RARITY_FACTOR: Record<ItemInstance['rarity'], number> = {
  common: 1, magic: 3, rare: 8, epic: 20, legendary: 50, unique: 100, set: 100,
};
export function sellPrice(item: ItemInstance): number {
  return Math.max(1, item.itemLevel * SELL_RARITY_FACTOR[item.rarity]);
}

export const useGameStore = create<GameStore>()((set, get) => ({
  screen: 'title',
  started: false,
  slotId: 'slot1',
  repository: undefined,
  rngState: new GameRandom(1).state,
  gold: 0,
  party: [],
  inventory: [],
  highestDepth: 0,
  currentDepth: 0,
  battle: undefined,
  battleLog: [],
  lastRewards: undefined,

  setScreen: (screen) => set({ screen }),

  newGame: (members, seed) => {
    if (members.length === 0 || members.length > 4) {
      throw new Error('パーティは1〜4人で作成してください');
    }
    const party: Character[] = members.map((m, i) => {
      const classDef = getClassById(m.classId);
      return {
        id: `ch_${i + 1}`,
        name: m.name || classDef.name,
        classId: m.classId,
        level: 1,
        exp: 0,
        baseStats: classDef.startingStats,
        unspentStatPoints: 0,
        unspentSkillPoints: 1, // ルートスキルを取れるように初期1(仮定)
        learnedNodeIds: [],
        equipment: {},
      };
    });
    set({
      started: true,
      screen: 'party',
      rngState: new GameRandom(seed).state,
      gold: 100,
      party,
      inventory: [],
      highestDepth: 0,
      currentDepth: 0,
      battle: undefined,
      battleLog: [],
      lastRewards: undefined,
    });
  },

  saveGame: async (now) => {
    const s = get();
    const repo = s.repository ?? new IndexedDBSaveRepository();
    const data: SaveData = {
      version: SAVE_SCHEMA_VERSION,
      savedAt: now,
      rngState: s.rngState,
      gold: s.gold,
      party: s.party,
      inventory: s.inventory,
      highestDepth: s.highestDepth,
      ...(s.battle ? { battle: s.battle } : {}),
    };
    await repo.save(s.slotId, data);
    set({ repository: repo });
  },

  loadGame: async (slotId) => {
    const repo = get().repository ?? new IndexedDBSaveRepository();
    const data = await repo.load(slotId);
    if (!data) return false;
    set({
      started: true,
      screen: data.battle ? 'battle' : 'party',
      slotId,
      repository: repo,
      rngState: data.rngState,
      gold: data.gold,
      party: [...data.party],
      inventory: [...data.inventory],
      highestDepth: data.highestDepth,
      battle: data.battle,
      battleLog: [],
      lastRewards: undefined,
    });
    return true;
  },

  listSlots: async () => {
    const repo = get().repository ?? new IndexedDBSaveRepository();
    set({ repository: repo });
    return repo.listSlots();
  },

  allocateStat: (characterId, stat) => {
    set((s) => ({
      party: s.party.map((c) => (c.id === characterId ? (allocateStatPoint(c, stat) ?? c) : c)),
    }));
  },

  learnSkillNode: (characterId, nodeId) => {
    const character = get().party.find((c) => c.id === characterId);
    if (!character) return 'unknown_node';
    const result = learnNode(character, nodeId, getSkillTreeByClass(character.classId));
    if (!result.ok) return result.reason;
    set((s) => ({ party: s.party.map((c) => (c.id === characterId ? result.character : c)) }));
    return undefined;
  },

  equipItem: (characterId, slot, instanceId) => {
    const s = get();
    const character = s.party.find((c) => c.id === characterId);
    const item = s.inventory.find((i) => i.instanceId === instanceId);
    if (!character || !item) return 'not_found';
    const base = getBaseItemById(item.baseItemId);
    if (!SLOT_ACCEPTS[slot].includes(base.itemType)) return 'slot_mismatch';
    // 装備重量 = 必要STR(現在のビルドの一次STRで判定、仕様 §2)
    const build = buildCharacter(character, s.inventory, BUILD_DATA);
    if ((base.requiredStr ?? 0) > build.primary.str) return 'str_too_low';

    let equipment = { ...character.equipment, [slot]: instanceId };
    // 両手武器は盾と排他(§5-3)
    if (base.itemType === 'weapon2h') {
      delete equipment.offHand;
    }
    if (slot === 'offHand' && equipment.mainHand) {
      const mainBase = s.inventory.find((i) => i.instanceId === equipment.mainHand);
      if (mainBase && getBaseItemById(mainBase.baseItemId).itemType === 'weapon2h') {
        return 'two_handed_conflict';
      }
    }
    // 同一アイテムの二重装備を防ぐ(別部位に付いていたら外す)
    for (const [otherSlot, id] of Object.entries(equipment) as [EquipSlot, string][]) {
      if (otherSlot !== slot && id === instanceId) delete equipment[otherSlot];
    }
    set({
      party: s.party.map((c) => (c.id === characterId ? { ...c, equipment } : c)),
    });
    return undefined;
  },

  unequipItem: (characterId, slot) => {
    set((s) => ({
      party: s.party.map((c) => {
        if (c.id !== characterId) return c;
        const equipment = { ...c.equipment };
        delete equipment[slot];
        return { ...c, equipment };
      }),
    }));
  },

  craft: (instanceId, operation) => {
    const s = get();
    const item = s.inventory.find((i) => i.instanceId === instanceId);
    if (!item) return 'not_craftable';
    const cost = craftGoldCost(operation, item.itemLevel);
    if (s.gold < cost) return 'not_enough_gold';
    const { result, rngState } = withRng(s.rngState, (rng) =>
      craftItem(rng, item, operation, MASTER_DATA),
    );
    if (!result.ok) return result.reason;
    set({
      rngState,
      gold: s.gold - cost,
      inventory: s.inventory.map((i) => (i.instanceId === instanceId ? result.item : i)),
    });
    return undefined;
  },

  sellItem: (instanceId) => {
    const s = get();
    const item = s.inventory.find((i) => i.instanceId === instanceId);
    if (!item) return;
    const equipped = s.party.some((c) => Object.values(c.equipment).includes(instanceId));
    if (equipped) return; // 装備中は売却不可
    set({
      gold: s.gold + sellPrice(item),
      inventory: s.inventory.filter((i) => i.instanceId !== instanceId),
    });
  },

  enterDungeon: (depth) => {
    const s = get();
    if (s.party.length === 0) return;
    const log: BattleEvent[] = [];
    const { result, rngState } = withRng(s.rngState, (rng) => {
      const enemies = generateEncounter(rng, depth, DUNGEON_DATA);
      const partyCombatants = s.party.map((c) =>
        buildPartyCombatant(c, buildCharacter(c, s.inventory, BUILD_DATA)),
      );
      const battle = createBattleState(partyCombatants, enemies);
      return advanceAuto(battle, rng, log);
    });
    set({
      rngState,
      currentDepth: depth,
      battle: result,
      battleLog: log,
      lastRewards: undefined,
      screen: 'battle',
    });
  },

  playerAction: (action) => {
    const s = get();
    if (!s.battle || s.battle.phase !== 'active') return 'battle_over';
    const actorId = nextActorId(s.battle);
    if (!actorId) return 'actor_cannot_act';

    const log: BattleEvent[] = [];
    let failReason: ActionFailReason | undefined;
    const { result: battle, rngState } = withRng(s.rngState, (rng) => {
      const turn = executeTurn(s.battle!, rng, actorId, action, COMBAT_DATA);
      if (!turn.ok) {
        failReason = turn.reason;
        return s.battle!;
      }
      log.push(...turn.events);
      return advanceAuto(turn.state, rng, log);
    });
    if (failReason) return failReason;

    // 戦闘終了処理
    if (battle.phase === 'victory') {
      const rewards = computeBattleRewards(battle);
      const builds = s.party.map((c) => buildCharacter(c, s.inventory, BUILD_DATA));
      // Magic Find / gold% はパーティ合算、exp% はキャラ個別に適用(仮定)
      const magicFind = builds.reduce((acc, b) => acc + b.derived.magicFindPct, 0);
      const goldPct = builds.reduce((acc, b) => acc + b.derived.goldGainPct, 0);
      const goldGained = Math.floor(rewards.gold * (1 + goldPct / 100));
      const { result: drops, rngState: afterDrops } = withRng(rngState, (rng) =>
        rollVictoryDrops(rng, rewards, s.currentDepth, magicFind, DUNGEON_DATA, MASTER_DATA),
      );
      const levelUps: { name: string; level: number }[] = [];
      const party = s.party.map((c, i) => {
        const expGained = Math.floor(
          rewards.exp * (1 + builds[i]!.derived.expGainPct / 100),
        );
        const gained = gainExp(c, expGained);
        if (gained.levelsGained > 0) {
          levelUps.push({ name: c.name, level: gained.character.level });
        }
        return gained.character;
      });
      set({
        rngState: afterDrops,
        battle,
        battleLog: [...s.battleLog, ...log],
        party,
        gold: s.gold + goldGained,
        inventory: [...s.inventory, ...drops],
        highestDepth: Math.max(s.highestDepth, s.currentDepth),
        lastRewards: { exp: rewards.exp, gold: goldGained, drops, levelUps },
      });
      return undefined;
    }

    set({ rngState, battle, battleLog: [...s.battleLog, ...log] });
    return undefined;
  },

  dismissRewards: (goDeeper) => {
    const s = get();
    set({ battle: undefined, battleLog: [], lastRewards: undefined });
    if (goDeeper) {
      get().enterDungeon(s.currentDepth + 1);
    } else {
      set({ screen: 'dungeon' });
    }
  },

  retreat: () => {
    // 敗北・撤退: ペナルティなしで街へ戻る(仮定)
    set({ battle: undefined, battleLog: [], lastRewards: undefined, screen: 'dungeon' });
  },
}));
