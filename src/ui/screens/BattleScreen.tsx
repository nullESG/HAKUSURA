import { useEffect, useMemo, useState } from 'react';
import { isAlive, nextActorId } from '../../core/combat/battleEngine';
import type { BattleEvent, CombatantState } from '../../core/combat/combatTypes';
import { getEnemyById } from '../../data/enemies';
import { getSkillById } from '../../data/skills';
import { useGameStore } from '../../store/gameStore';
import { AILMENT_LABELS, itemDisplayName, RARITY_TEXT_CLASS } from '../labels';
import { MonsterArt } from '../components/MonsterArt';
import { Bar, Button } from '../components/shared';

/** オート戦闘の1手ごとの間隔(ms)。ログを目で追える速さ。 */
const AUTO_STEP_MS = 450;

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

function isBossCombatant(combatant: CombatantState): boolean {
  if (!combatant.enemyDefId) return false;
  try {
    return getEnemyById(combatant.enemyDefId).isBoss;
  } catch {
    return false;
  }
}

function CombatantCard({
  combatant,
  active,
  targetable,
  dimmed,
  onSelect,
}: {
  combatant: CombatantState;
  active: boolean;
  targetable: boolean;
  dimmed: boolean;
  onSelect?: () => void;
}) {
  const dead = !isAlive(combatant);
  const showArt = combatant.enemyDefId !== undefined;
  const boss = showArt && isBossCombatant(combatant);
  return (
    <button
      type="button"
      disabled={!targetable}
      onClick={onSelect}
      className={`flex-1 rounded-lg border p-2 text-left transition-all ${
        dead
          ? 'border-neutral-900 bg-neutral-950 opacity-40'
          : targetable
            ? 'motion-safe:animate-pulse border-rose-400 bg-rose-950/40 ring-2 ring-rose-400/70 active:bg-rose-900/40'
            : active
              ? 'border-amber-500 bg-neutral-900'
              : dimmed
                ? 'border-neutral-800 bg-neutral-900 opacity-50'
                : 'border-neutral-800 bg-neutral-900'
      }`}
    >
      <div className="flex items-center gap-2">
        {showArt && (
          <MonsterArt
            enemyDefId={combatant.enemyDefId}
            className={`${boss ? 'h-14 w-14' : 'h-10 w-10'} shrink-0 ${dead ? 'grayscale' : ''}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-bold">
              {boss && <span className="mr-1 text-[9px] font-black text-rose-400">BOSS</span>}
              {combatant.name}
            </span>
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
        </div>
      </div>
    </button>
  );
}

type PendingCommand =
  | { kind: 'attack'; targetSide: 'enemy' }
  | { kind: 'skill'; skillId: string; targetSide: 'enemy' | 'party' };

export function BattleScreen() {
  const battle = useGameStore((s) => s.battle);
  const battleLog = useGameStore((s) => s.battleLog);
  const lastRewards = useGameStore((s) => s.lastRewards);
  const currentDepth = useGameStore((s) => s.currentDepth);
  const autoBattle = useGameStore((s) => s.autoBattle);
  const setAutoBattle = useGameStore((s) => s.setAutoBattle);
  const playerAction = useGameStore((s) => s.playerAction);
  const dismissRewards = useGameStore((s) => s.dismissRewards);
  const retreat = useGameStore((s) => s.retreat);
  const [pending, setPending] = useState<PendingCommand>();
  const [notice, setNotice] = useState<string>();

  const nameOf = useMemo(() => {
    const map = new Map(battle?.combatants.map((c) => [c.id, c.name]) ?? []);
    return (id: string): string => map.get(id) ?? id;
  }, [battle?.combatants]);

  const actorId = battle?.phase === 'active' ? nextActorId(battle) : undefined;

  // オート戦闘: 一定間隔で自動行動(トグルOFF・戦闘終了で停止)
  useEffect(() => {
    if (!autoBattle || !battle || battle.phase !== 'active' || !actorId) return;
    const timer = setTimeout(() => {
      setPending(undefined);
      playerAction('auto');
    }, AUTO_STEP_MS);
    return () => clearTimeout(timer);
  }, [autoBattle, battle, actorId, playerAction]);

  if (!battle) return null;
  const enemies = battle.combatants.filter((c) => c.side === 'enemy');
  const partySide = battle.combatants.filter((c) => c.side === 'party');
  const actor = actorId ? battle.combatants.find((c) => c.id === actorId) : undefined;

  const runAction = (
    command: PendingCommand | { kind: 'guard' },
    targetId?: string,
  ): void => {
    setPending(undefined);
    const fail =
      command.kind === 'guard'
        ? playerAction({ type: 'guard' })
        : command.kind === 'attack'
          ? playerAction({ type: 'attack', targetId: targetId! })
          : playerAction(
              targetId !== undefined
                ? { type: 'skill', skillId: command.skillId, targetId }
                : { type: 'skill', skillId: command.skillId },
            );
    setNotice(
      fail === 'not_enough_mp'
        ? 'MPが足りない!'
        : fail === 'silenced'
          ? '沈黙していて詠唱できない!'
          : fail === 'summon_limit'
            ? 'これ以上召喚できない!'
            : fail
              ? '行動できない'
              : undefined,
    );
  };

  /** コマンド選択: 有効な対象が1体だけなら選択ステップを飛ばして即実行する。 */
  const beginCommand = (command: PendingCommand | { kind: 'guard' }): void => {
    if (command.kind === 'guard') {
      runAction(command);
      return;
    }
    if (command.kind === 'skill') {
      const scope = getSkillById(command.skillId).scope;
      if (scope !== 'singleEnemy' && scope !== 'singleAlly') {
        runAction(command); // 全体・自身対象は対象選択なし
        return;
      }
    }
    const pool = command.targetSide === 'enemy' ? enemies : partySide;
    const valid = pool.filter(isAlive);
    if (valid.length === 1) {
      runAction(command, valid[0]!.id); // 対象が1体なら即実行
      return;
    }
    setPending(command);
  };

  const targetSide = pending?.targetSide;

  const logLines = battleLog
    .slice(-40)
    .map((e) => formatEvent(e, nameOf))
    .filter((line): line is string => line !== undefined)
    .slice(-8);

  return (
    <div className="flex min-h-dvh flex-col gap-2 p-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          深度 {currentDepth} 層 / ラウンド {battle.round}
        </span>
        <button
          type="button"
          onClick={() => setAutoBattle(!autoBattle)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            autoBattle
              ? 'bg-amber-600 text-neutral-950'
              : 'bg-neutral-800 text-neutral-400 active:bg-neutral-700'
          }`}
        >
          オート {autoBattle ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 敵 */}
      <div className="flex flex-wrap gap-1">
        {enemies.map((enemy) => (
          <CombatantCard
            key={enemy.id}
            combatant={enemy}
            active={enemy.id === actorId}
            targetable={Boolean(targetSide === 'enemy' && isAlive(enemy))}
            dimmed={targetSide === 'party'}
            onSelect={() => pending && runAction(pending, enemy.id)}
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
            targetable={Boolean(targetSide === 'party' && isAlive(member))}
            dimmed={targetSide === 'enemy'}
            onSelect={() => pending && runAction(pending, member.id)}
          />
        ))}
      </div>

      {/* コマンド */}
      {battle.phase === 'active' && actor && !autoBattle && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2">
          {pending ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-bold text-rose-300">
                {targetSide === 'enemy' ? '▲ 対象の敵をタップ' : '▼ 対象の味方をタップ'}
              </p>
              <Button variant="ghost" className="py-3" onClick={() => setPending(undefined)}>
                やめる
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-1.5 text-xs font-bold text-amber-400">{actor.name} のターン</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  className="py-3 text-base"
                  onClick={() => beginCommand({ kind: 'attack', targetSide: 'enemy' })}
                >
                  攻撃
                </Button>
                <Button
                  variant="ghost"
                  className="py-3 text-base"
                  onClick={() => beginCommand({ kind: 'guard' })}
                >
                  防御
                </Button>
                {actor.skillIds.map((skillId) => {
                  const skill = getSkillById(skillId);
                  const targetSideFor =
                    skill.scope === 'singleAlly' || skill.scope === 'allAllies' || skill.scope === 'self'
                      ? ('party' as const)
                      : ('enemy' as const);
                  const disabled =
                    skill.mpCost > 0 &&
                    (actor.currentMP < skill.mpCost ||
                      actor.ailments.some((a) => a.type === 'silence'));
                  return (
                    <Button
                      key={skillId}
                      variant="ghost"
                      className="py-3"
                      disabled={disabled}
                      onClick={() =>
                        beginCommand({ kind: 'skill', skillId, targetSide: targetSideFor })
                      }
                    >
                      {skill.name}
                      {skill.mpCost > 0 && (
                        <span className="ml-1 text-[10px] opacity-70">MP{skill.mpCost}</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      {battle.phase === 'active' && autoBattle && (
        <p className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-center text-xs text-neutral-400">
          オート戦闘中…(右上のボタンで解除)
        </p>
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
