import { useMemo, useState } from 'react';
import { isAlive, nextActorId } from '../../core/combat/battleEngine';
import type { BattleEvent, CombatantState } from '../../core/combat/combatTypes';
import { getSkillById } from '../../data/skills';
import { useGameStore } from '../../store/gameStore';
import { AILMENT_LABELS, itemDisplayName, RARITY_TEXT_CLASS } from '../labels';
import { Bar, Button } from '../components/shared';

/** 戦闘イベントをログ行に変換する。 */
function formatEvent(event: BattleEvent, nameOf: (id: string) => string): string | undefined {
  switch (event.type) {
    case 'damage':
      return `${nameOf(event.actorId)} → ${nameOf(event.targetId)} に ${event.amount} ダメージ${event.crit ? '(会心!)' : ''}${event.blocked ? '(ブロック)' : ''}`;
    case 'miss':
      return `${nameOf(event.actorId)} の攻撃は外れた`;
    case 'heal':
      return `${nameOf(event.targetId)} のHPが ${event.amount} 回復`;
    case 'guard':
      return `${nameOf(event.actorId)} は身を守っている`;
    case 'buff_applied':
      return `${nameOf(event.targetId)} に効果(${event.turns}ターン)`;
    case 'ailment_applied':
      return `${nameOf(event.targetId)} は${AILMENT_LABELS[event.ailment]}状態になった`;
    case 'ailment_tick':
      return `${nameOf(event.targetId)} は${AILMENT_LABELS[event.ailment]}で ${event.amount} ダメージ`;
    case 'paralyzed':
      return `${nameOf(event.actorId)} は麻痺して動けない`;
    case 'followup':
      return `${nameOf(event.actorId)} の追撃!`;
    case 'thorns':
      return `反射で ${nameOf(event.targetId)} に ${event.amount} ダメージ`;
    case 'summon':
      return `${event.name} が召喚された`;
    case 'defeated':
      return `${nameOf(event.targetId)} は倒れた`;
    case 'divine_guardian':
      return `${nameOf(event.targetId)} は神聖なる加護で持ちこたえた!`;
    case 'battle_end':
      return event.result === 'victory' ? '勝利!' : '全滅した…';
    default:
      return undefined;
  }
}

function CombatantCard({
  combatant,
  active,
  targetable,
  onSelect,
}: {
  combatant: CombatantState;
  active: boolean;
  targetable: boolean;
  onSelect?: () => void;
}) {
  const dead = !isAlive(combatant);
  return (
    <button
      type="button"
      disabled={!targetable}
      onClick={onSelect}
      className={`flex-1 rounded-lg border p-2 text-left transition-all ${
        dead
          ? 'border-neutral-900 bg-neutral-950 opacity-40'
          : active
            ? 'border-amber-500 bg-neutral-900'
            : targetable
              ? 'border-rose-500/70 bg-neutral-900 active:bg-neutral-800'
              : 'border-neutral-800 bg-neutral-900'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-bold">{combatant.name}</span>
        <span className="text-[10px] text-neutral-500">Lv{combatant.level}</span>
      </div>
      <Bar value={combatant.currentHP} max={combatant.stats.maxHP} colorClass="bg-emerald-500" />
      {combatant.stats.maxMP > 0 && (
        <div className="mt-0.5">
          <Bar value={combatant.currentMP} max={combatant.stats.maxMP} colorClass="bg-sky-500" />
        </div>
      )}
      <div className="mt-0.5 flex flex-wrap gap-0.5">
        {combatant.ailments.map((a) => (
          <span key={a.type} className="rounded bg-purple-900/80 px-1 text-[9px] text-purple-200">
            {AILMENT_LABELS[a.type]}
          </span>
        ))}
        {combatant.guarding && (
          <span className="rounded bg-neutral-700 px-1 text-[9px]">防御</span>
        )}
        {combatant.buffs.length > 0 && (
          <span className="rounded bg-amber-900/80 px-1 text-[9px] text-amber-200">強化</span>
        )}
      </div>
    </button>
  );
}

type PendingCommand = { kind: 'attack' } | { kind: 'skill'; skillId: string };

export function BattleScreen() {
  const battle = useGameStore((s) => s.battle);
  const battleLog = useGameStore((s) => s.battleLog);
  const lastRewards = useGameStore((s) => s.lastRewards);
  const currentDepth = useGameStore((s) => s.currentDepth);
  const playerAction = useGameStore((s) => s.playerAction);
  const dismissRewards = useGameStore((s) => s.dismissRewards);
  const retreat = useGameStore((s) => s.retreat);
  const [pending, setPending] = useState<PendingCommand>();
  const [notice, setNotice] = useState<string>();

  const nameOf = useMemo(() => {
    const map = new Map(battle?.combatants.map((c) => [c.id, c.name]) ?? []);
    return (id: string): string => map.get(id) ?? id;
  }, [battle?.combatants]);

  if (!battle) return null;
  const enemies = battle.combatants.filter((c) => c.side === 'enemy');
  const partySide = battle.combatants.filter((c) => c.side === 'party');
  const actorId = battle.phase === 'active' ? nextActorId(battle) : undefined;
  const actor = actorId ? battle.combatants.find((c) => c.id === actorId) : undefined;

  const needsTarget =
    pending &&
    (pending.kind === 'attack' || getSkillById(pending.skillId).scope === 'singleEnemy');
  const needsAllyTarget = pending?.kind === 'skill' && getSkillById(pending.skillId).scope === 'singleAlly';

  const act = (targetId?: string): void => {
    if (!pending) return;
    const fail =
      pending.kind === 'attack'
        ? playerAction({ type: 'attack', targetId: targetId! })
        : playerAction(
            targetId !== undefined
              ? { type: 'skill', skillId: pending.skillId, targetId }
              : { type: 'skill', skillId: pending.skillId },
          );
    if (fail) {
      setNotice(
        fail === 'not_enough_mp'
          ? 'MPが足りない!'
          : fail === 'silenced'
            ? '沈黙していて詠唱できない!'
            : fail === 'summon_limit'
              ? 'これ以上召喚できない!'
              : '行動できない',
      );
    } else {
      setNotice(undefined);
    }
    setPending(undefined);
  };

  const logLines = battleLog
    .slice(-30)
    .map((e) => formatEvent(e, nameOf))
    .filter((line): line is string => line !== undefined)
    .slice(-8);

  return (
    <div className="flex min-h-dvh flex-col gap-2 p-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>深度 {currentDepth} 層</span>
        <span>ラウンド {battle.round}</span>
      </div>

      {/* 敵 */}
      <div className="flex flex-wrap gap-1">
        {enemies.map((enemy) => (
          <CombatantCard
            key={enemy.id}
            combatant={enemy}
            active={enemy.id === actorId}
            targetable={Boolean(needsTarget && isAlive(enemy))}
            onSelect={() => act(enemy.id)}
          />
        ))}
      </div>

      {/* ログ */}
      <div className="min-h-24 flex-1 overflow-y-auto rounded-lg bg-neutral-950/80 p-2 text-[11px] leading-5 text-neutral-300">
        {logLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {notice && <p className="font-bold text-rose-400">{notice}</p>}
      </div>

      {/* 味方 */}
      <div className="flex flex-wrap gap-1">
        {partySide.map((member) => (
          <CombatantCard
            key={member.id}
            combatant={member}
            active={member.id === actorId}
            targetable={Boolean(needsAllyTarget && isAlive(member))}
            onSelect={() => act(member.id)}
          />
        ))}
      </div>

      {/* コマンド */}
      {battle.phase === 'active' && actor && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">
          <p className="mb-1 text-xs font-bold text-amber-400">{actor.name} のターン</p>
          {pending ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm text-neutral-300">
                {needsTarget ? '対象の敵を選択' : needsAllyTarget ? '対象の味方を選択' : ''}
              </p>
              <Button variant="ghost" onClick={() => setPending(undefined)}>
                やめる
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              <Button onClick={() => setPending({ kind: 'attack' })}>攻撃</Button>
              {actor.skillIds.map((skillId) => {
                const skill = getSkillById(skillId);
                const scope = skill.scope;
                const instant = scope !== 'singleEnemy' && scope !== 'singleAlly';
                return (
                  <Button
                    key={skillId}
                    variant="ghost"
                    onClick={() => {
                      if (instant) {
                        setPending(undefined);
                        const fail = playerAction({ type: 'skill', skillId });
                        setNotice(fail === 'not_enough_mp' ? 'MPが足りない!' : fail ? '行動できない' : undefined);
                      } else {
                        setPending({ kind: 'skill', skillId });
                      }
                    }}
                  >
                    {skill.name}
                    <span className="ml-1 text-[10px] opacity-70">MP{skill.mpCost}</span>
                  </Button>
                );
              })}
              <Button variant="ghost" onClick={() => { setPending(undefined); playerAction({ type: 'guard' }); }}>
                防御
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 結果 */}
      {battle.phase === 'victory' && lastRewards && (
        <div className="rounded-xl border border-amber-600 bg-neutral-900 p-4">
          <h3 className="text-center text-lg font-black text-amber-400">勝利!</h3>
          <p className="mt-1 text-center text-sm">
            EXP +{lastRewards.exp} / {lastRewards.gold} G
          </p>
          {lastRewards.levelUps.map((up) => (
            <p key={up.name} className="text-center text-sm text-emerald-400">
              {up.name} は Lv.{up.level} に上がった!
            </p>
          ))}
          {lastRewards.drops.length > 0 && (
            <ul className="mt-2 text-center text-sm">
              {lastRewards.drops.map((item) => (
                <li key={item.instanceId} className={RARITY_TEXT_CLASS[item.rarity]}>
                  {itemDisplayName(item)} を手に入れた!
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" className="flex-1 py-3" onClick={() => dismissRewards(false)}>
              帰還する
            </Button>
            <Button className="flex-1 py-3" onClick={() => dismissRewards(true)}>
              次の階層へ
            </Button>
          </div>
        </div>
      )}
      {battle.phase === 'defeat' && (
        <div className="rounded-xl border border-rose-800 bg-neutral-900 p-4">
          <h3 className="text-center text-lg font-black text-rose-400">全滅…</h3>
          <Button variant="ghost" className="mt-3 w-full py-3" onClick={retreat}>
            街へ戻る
          </Button>
        </div>
      )}
    </div>
  );
}
