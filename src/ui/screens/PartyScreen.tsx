import { useState } from 'react';
import { buildCharacter } from '../../core/player/characterBuild';
import type { PrimaryStats } from '../../core/types/character';
import { EQUIP_SLOTS } from '../../core/types/enums';
import { BUILD_DATA } from '../../data';
import { getClassById } from '../../data/classes';
import { useGameStore } from '../../store/gameStore';
import { itemDisplayName, RARITY_TEXT_CLASS, SLOT_LABELS } from '../labels';
import { Button, Panel } from '../components/shared';

const PRIMARY_KEYS: readonly (keyof PrimaryStats)[] = ['str', 'dex', 'int', 'vit', 'luk'];
const PRIMARY_LABELS: Record<keyof PrimaryStats, string> = {
  str: 'STR',
  dex: 'DEX',
  int: 'INT',
  vit: 'VIT',
  luk: 'LUK',
};

export function PartyScreen() {
  const party = useGameStore((s) => s.party);
  const inventory = useGameStore((s) => s.inventory);
  const allocateStat = useGameStore((s) => s.allocateStat);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const [selectedId, setSelectedId] = useState(party[0]?.id);

  const character = party.find((c) => c.id === selectedId) ?? party[0];
  if (!character) return null;
  const build = buildCharacter(character, inventory, BUILD_DATA);
  const itemById = new Map(inventory.map((i) => [i.instanceId, i]));

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-4 gap-1">
        {party.map((member) => (
          <button
            type="button"
            key={member.id}
            onClick={() => setSelectedId(member.id)}
            className={`rounded-lg px-1 py-2 text-xs font-bold ${
              member.id === character.id
                ? 'bg-amber-600 text-neutral-950'
                : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {member.name}
          </button>
        ))}
      </div>

      <Panel title={`${character.name} — Lv.${character.level} ${getClassById(character.classId).name}`}>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
          <span>HP {build.derived.maxHP}</span>
          <span>MP {build.derived.maxMP}</span>
          <span>速度 {build.derived.speed.toFixed(1)}</span>
          <span>物攻 {Math.floor(build.derived.physATK)}</span>
          <span>魔攻 {Math.floor(build.derived.magicATK)}</span>
          <span>防御 {Math.floor(build.derived.defense)}</span>
          <span>クリ率 {build.derived.critChancePct.toFixed(1)}%</span>
          <span>クリ倍 ×{build.derived.critMultiplier.toFixed(2)}</span>
          <span>回避 {build.derived.evasionPct.toFixed(1)}%</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          EXP {character.exp} / 次のレベルまで
        </p>
      </Panel>

      <Panel title={`ステータス割り振り(残り ${character.unspentStatPoints} pt)`}>
        <div className="flex flex-col gap-1">
          {PRIMARY_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="w-12 font-bold text-neutral-400">{PRIMARY_LABELS[key]}</span>
              <span className="flex-1">
                {build.primary[key]}
                {build.primary[key] !== character.baseStats[key] && (
                  <span className="ml-1 text-xs text-sky-400">
                    (基礎 {character.baseStats[key]})
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                disabled={character.unspentStatPoints < 1}
                onClick={() => allocateStat(character.id, key)}
              >
                +1
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="装備">
        <div className="flex flex-col gap-1">
          {EQUIP_SLOTS.map((slot) => {
            const instanceId = character.equipment[slot];
            const item = instanceId ? itemById.get(instanceId) : undefined;
            return (
              <div key={slot} className="flex items-center justify-between gap-2 text-sm">
                <span className="w-14 shrink-0 text-xs text-neutral-500">{SLOT_LABELS[slot]}</span>
                {item ? (
                  <>
                    <span className={`flex-1 truncate ${RARITY_TEXT_CLASS[item.rarity]}`}>
                      {itemDisplayName(item)}
                    </span>
                    <Button variant="ghost" onClick={() => unequipItem(character.id, slot)}>
                      外す
                    </Button>
                  </>
                ) : (
                  <span className="flex-1 text-neutral-600">—</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">装備の変更はインベントリから行えます</p>
      </Panel>
    </div>
  );
}
