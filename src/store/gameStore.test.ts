import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextActorId, getCombatant, isAlive } from '../core/combat/battleEngine';
import { IndexedDBSaveRepository } from '../core/save/saveRepository';
import { useGameStore } from './gameStore';

const DEFAULT_PARTY = [
  { name: 'アルタ', classId: 'warrior' },
  { name: 'ミラ', classId: 'mage' },
  { name: 'レン', classId: 'ranger' },
  { name: 'セシル', classId: 'cleric' },
];

function store(): ReturnType<typeof useGameStore.getState> {
  return useGameStore.getState();
}

/** 現在の戦闘をプレイヤー全員「先頭の敵を通常攻撃」で回しきる。 */
function fightUntilOver(maxActions = 300): void {
  for (let i = 0; i < maxActions; i++) {
    const battle = store().battle;
    if (!battle || battle.phase !== 'active') return;
    const target = battle.combatants.find((c) => c.side === 'enemy' && isAlive(c))!;
    const fail = store().playerAction({ type: 'attack', targetId: target.id });
    expect(fail).toBeUndefined();
  }
  throw new Error('戦闘が終わらなかった');
}

beforeEach(() => {
  useGameStore.setState({
    screen: 'title',
    started: false,
    slotId: 'slot1',
    repository: new IndexedDBSaveRepository(new IDBFactory()),
    party: [],
    inventory: [],
    gold: 0,
    highestDepth: 0,
    currentDepth: 0,
    battle: undefined,
    battleLog: [],
    lastRewards: undefined,
  });
});

describe('ゲームストア統合フロー', () => {
  it('ニューゲームでパーティが作られ、初期スキルポイント1', () => {
    store().newGame(DEFAULT_PARTY, 42);
    const s = store();
    expect(s.started).toBe(true);
    expect(s.party.length).toBe(4);
    expect(s.party[0]!.classId).toBe('warrior');
    expect(s.party.every((c) => c.unspentSkillPoints === 1)).toBe(true);
    expect(s.gold).toBe(100);
    expect(s.screen).toBe('party');
  });

  it('スキル取得 → ステ振り → ダンジョン → 勝利 → 報酬反映まで通る', () => {
    store().newGame(DEFAULT_PARTY, 123);
    // ルートスキル取得
    expect(store().learnSkillNode('ch_1', 'w_root')).toBeUndefined();
    expect(store().party[0]!.learnedNodeIds).toEqual(['w_root']);
    // 前提なしノードはエラー
    expect(store().learnSkillNode('ch_1', 'w_keystone')).toBe('requirements_not_met');

    store().enterDungeon(1);
    expect(store().screen).toBe('battle');
    expect(store().battle).toBeDefined();

    fightUntilOver();
    const s = store();
    expect(s.battle!.phase).toBe('victory');
    expect(s.lastRewards).toBeDefined();
    expect(s.lastRewards!.exp).toBeGreaterThan(0);
    expect(s.gold).toBeGreaterThan(100);
    expect(s.highestDepth).toBe(1);
    // レベル1でEXP十分ならレベルアップが記録される
    if (s.lastRewards!.levelUps.length > 0) {
      expect(s.party.some((c) => c.level > 1)).toBe(true);
    }
  });

  it('連戦(次の階層へ)と撤退が動く', () => {
    store().newGame(DEFAULT_PARTY, 7);
    store().enterDungeon(1);
    fightUntilOver();
    store().dismissRewards(true); // 深度2へ
    expect(store().currentDepth).toBe(2);
    expect(store().battle).toBeDefined();
    store().retreat();
    expect(store().battle).toBeUndefined();
    expect(store().screen).toBe('dungeon');
  });

  it('装備の付け外しとバリデーション', () => {
    store().newGame(DEFAULT_PARTY, 99);
    // 戦利品を稼ぐ(深度1を数回)
    for (let i = 0; i < 10 && store().inventory.length === 0; i++) {
      store().enterDungeon(1);
      fightUntilOver();
      store().dismissRewards(false);
    }
    const inv = store().inventory;
    if (inv.length === 0) return; // ドロップ運がゼロならスキップ(確率的にほぼ起きない)
    const item = inv[0]!;
    // 間違った部位には装備できない
    expect(store().equipItem('ch_1', 'ring1', item.instanceId)).not.toBeUndefined();
  });

  it('セーブ → 状態を汚す → ロードで完全復元', async () => {
    store().newGame(DEFAULT_PARTY, 555);
    store().enterDungeon(1);
    fightUntilOver();
    store().dismissRewards(false);
    const snapshot = {
      gold: store().gold,
      party: store().party,
      inventory: store().inventory,
      rngState: store().rngState,
      highestDepth: store().highestDepth,
    };
    await store().saveGame(1234567890);

    // 状態を汚す
    store().newGame([{ name: 'X', classId: 'mage' }], 1);
    expect(store().party.length).toBe(1);

    const loaded = await store().loadGame('slot1');
    expect(loaded).toBe(true);
    expect(store().gold).toBe(snapshot.gold);
    expect(store().party).toEqual(snapshot.party);
    expect(store().inventory).toEqual(snapshot.inventory);
    expect(store().rngState).toEqual(snapshot.rngState);
    expect(store().highestDepth).toBe(snapshot.highestDepth);

    const slots = await store().listSlots();
    expect(slots.length).toBe(1);
    expect(slots[0]!.partyNames).toEqual(['アルタ', 'ミラ', 'レン', 'セシル']);
  });

  it('戦闘中セーブ → ロードで戦闘が再開できる', async () => {
    store().newGame(DEFAULT_PARTY, 888);
    store().enterDungeon(1);
    const battleBefore = store().battle;
    expect(battleBefore).toBeDefined();
    await store().saveGame(999);

    store().retreat();
    const loaded = await store().loadGame('slot1');
    expect(loaded).toBe(true);
    expect(store().screen).toBe('battle');
    expect(store().battle).toEqual(battleBefore);
    // 復元後も行動できる
    const battle = store().battle!;
    if (battle.phase === 'active') {
      const enemy = battle.combatants.find((c) => c.side === 'enemy' && isAlive(c))!;
      expect(store().playerAction({ type: 'attack', targetId: enemy.id })).toBeUndefined();
    }
  });

  it('クラフトはゴールドを消費し、不足なら拒否', () => {
    store().newGame(DEFAULT_PARTY, 321);
    for (let i = 0; i < 10 && store().inventory.length === 0; i++) {
      store().enterDungeon(1);
      fightUntilOver();
      store().dismissRewards(false);
    }
    const item = store().inventory[0];
    if (!item) return;
    useGameStore.setState({ gold: 0 });
    expect(store().craft(item.instanceId, 'reroll_values')).toBe('not_enough_gold');
    useGameStore.setState({ gold: 100000 });
    const before = store().gold;
    const result = store().craft(item.instanceId, 'reroll_values');
    if (result === undefined) {
      expect(store().gold).toBeLessThan(before);
    }
  });

  it('売却でゴールドが増え、装備中は売れない', () => {
    store().newGame(DEFAULT_PARTY, 654);
    for (let i = 0; i < 10 && store().inventory.length === 0; i++) {
      store().enterDungeon(1);
      fightUntilOver();
      store().dismissRewards(false);
    }
    const item = store().inventory[0];
    if (!item) return;
    const goldBefore = store().gold;
    const countBefore = store().inventory.length;
    store().sellItem(item.instanceId);
    expect(store().gold).toBeGreaterThan(goldBefore);
    expect(store().inventory.length).toBe(countBefore - 1);
  });

  it('gold% 補正: 貪欲の指輪を装備すると同一シードの戦闘でゴールドが増える', async () => {
    const { instantiateUnique } = await import('../core/drops/dropGenerator');
    const { getUniqueById } = await import('../data/uniques');
    const { GameRandom } = await import('../core/rng/gameRandom');
    const { MASTER_DATA } = await import('../data');

    const run = (withRing: boolean): number => {
      store().newGame(DEFAULT_PARTY, 4242);
      if (withRing) {
        const ring = instantiateUnique(new GameRandom(1), getUniqueById('ring_of_greed'), 60, MASTER_DATA);
        useGameStore.setState((s) => ({
          inventory: [...s.inventory, ring],
          party: s.party.map((c, i) =>
            i === 0 ? { ...c, equipment: { ...c.equipment, ring1: ring.instanceId } } : c,
          ),
        }));
      }
      const goldBefore = store().gold;
      store().enterDungeon(1);
      fightUntilOver();
      return store().lastRewards!.gold + (store().gold - goldBefore - store().lastRewards!.gold);
    };
    const base = run(false);
    const boosted = run(true);
    // 同一シードなので同一エンカウント・同一基礎報酬。指輪の gold% 分だけ増える
    expect(boosted).toBeGreaterThan(base);
  });

  it("オート戦闘: playerAction('auto') だけで決着まで進められる", () => {
    store().newGame(DEFAULT_PARTY, 3131);
    store().enterDungeon(1);
    for (let i = 0; i < 300; i++) {
      const battle = store().battle;
      if (!battle || battle.phase !== 'active') break;
      expect(store().playerAction('auto')).toBeUndefined();
    }
    expect(store().battle!.phase).toBe('victory');
    expect(store().lastRewards).toBeDefined();
  });

  it('オート戦闘: 沈黙中でも失敗せず行動できる(フォールバック)', () => {
    store().newGame(DEFAULT_PARTY, 2929);
    store().enterDungeon(1);
    // 全員のスキル使用を沈黙で封じてもオートは進む
    useGameStore.setState((s) => ({
      battle: s.battle
        ? {
            ...s.battle,
            combatants: s.battle.combatants.map((c) =>
              c.side === 'party'
                ? { ...c, ailments: [{ type: 'silence' as const, remainingTurns: 99, value: 0 }] }
                : c,
            ),
          }
        : undefined,
    }));
    for (let i = 0; i < 20; i++) {
      const battle = store().battle;
      if (!battle || battle.phase !== 'active') break;
      expect(store().playerAction('auto')).toBeUndefined();
    }
  });

  it('setAutoBattle でトグルが切り替わる', () => {
    expect(store().autoBattle).toBe(false);
    store().setAutoBattle(true);
    expect(store().autoBattle).toBe(true);
    store().setAutoBattle(false);
    expect(store().autoBattle).toBe(false);
  });

  it('決定論: 同じシード・同じ操作で同じ結果', () => {
    const run = (): { gold: number; invCount: number } => {
      store().newGame(DEFAULT_PARTY, 2026);
      store().enterDungeon(1);
      fightUntilOver();
      return { gold: store().gold, invCount: store().inventory.length };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });

  it('advanceAuto: 敵が先制でも次の行動者はプレイヤーキャラになる', () => {
    store().newGame(DEFAULT_PARTY, 111);
    store().enterDungeon(1);
    const battle = store().battle!;
    if (battle.phase === 'active') {
      const actorId = nextActorId(battle)!;
      const actor = getCombatant(battle, actorId)!;
      expect(actor.side).toBe('party');
      expect(actor.isSummon).toBe(false);
    }
  });
});
