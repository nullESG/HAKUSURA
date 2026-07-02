import { useState } from 'react';
import { CRAFT_OPERATIONS, type CraftOperation } from '../../core/craft/crafting';
import type { EquipSlot } from '../../core/types/enums';
import type { ItemInstance } from '../../core/types/item';
import { getBaseItemById } from '../../data/baseItems';
import { craftGoldCost } from '../../data/economy';
import { getUniqueById } from '../../data/uniques';
import { sellPrice, useGameStore } from '../../store/gameStore';
import {
  formatAffix,
  itemDisplayName,
  RARITY_LABELS,
  RARITY_TEXT_CLASS,
  SLOT_LABELS,
} from '../labels';
import { Button, Sheet } from '../components/shared';

const CRAFT_LABELS: Record<CraftOperation, string> = {
  reroll_affixes: '全再構築',
  add_affix: '付与追加',
  reroll_values: '数値再抽選',
  upgrade_rarity: '等級昇格',
  remove_affix: '付与除去',
};

/** アイテム種別 → 装備先候補スロット。 */
function slotCandidates(item: ItemInstance): EquipSlot[] {
  const type = getBaseItemById(item.baseItemId).itemType;
  switch (type) {
    case 'weapon1h':
    case 'weapon2h':
      return ['mainHand'];
    case 'shield':
      return ['offHand'];
    case 'ring':
      return ['ring1', 'ring2'];
    default:
      return [type as EquipSlot];
  }
}

export function InventoryScreen() {
  const inventory = useGameStore((s) => s.inventory);
  const party = useGameStore((s) => s.party);
  const gold = useGameStore((s) => s.gold);
  const equipItem = useGameStore((s) => s.equipItem);
  const craft = useGameStore((s) => s.craft);
  const sellItem = useGameStore((s) => s.sellItem);
  const [selectedId, setSelectedId] = useState<string>();
  const [message, setMessage] = useState<string>();

  const selected = inventory.find((i) => i.instanceId === selectedId);
  const equippedIds = new Set(party.flatMap((c) => Object.values(c.equipment)));

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-400">
          インベントリ({inventory.length})
        </h2>
        <span className="text-sm font-bold text-amber-400">{gold.toLocaleString()} G</span>
      </div>

      {inventory.length === 0 && (
        <p className="py-12 text-center text-sm text-neutral-600">
          アイテムがありません。ダンジョンで入手しましょう。
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {inventory.map((item) => (
          <li key={item.instanceId}>
            <button
              type="button"
              onClick={() => {
                setSelectedId(item.instanceId);
                setMessage(undefined);
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-left text-sm active:bg-neutral-800"
            >
              <span className={`flex-1 truncate ${RARITY_TEXT_CLASS[item.rarity]}`}>
                {itemDisplayName(item)}
              </span>
              {equippedIds.has(item.instanceId) && (
                <span className="rounded bg-neutral-700 px-1 text-[10px]">E</span>
              )}
              <span className="text-xs text-neutral-500">iLv{item.itemLevel}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <Sheet onClose={() => setSelectedId(undefined)}>
          <ItemDetail
            item={selected}
            equipped={equippedIds.has(selected.instanceId)}
            gold={gold}
            message={message}
            onEquip={(charId, slot) => {
              const fail = equipItem(charId, slot, selected.instanceId);
              setMessage(
                fail === undefined
                  ? '装備しました'
                  : fail === 'str_too_low'
                    ? 'STRが足りません'
                    : fail === 'two_handed_conflict'
                      ? '両手武器と盾は併用できません'
                      : '装備できません',
              );
            }}
            onCraft={(op) => {
              const fail = craft(selected.instanceId, op);
              setMessage(
                fail === undefined
                  ? 'クラフト成功'
                  : fail === 'not_enough_gold'
                    ? 'ゴールドが足りません'
                    : fail === 'affixes_full'
                      ? 'これ以上付与できません'
                      : fail === 'unique_immutable'
                        ? 'ユニークは数値再抽選のみ可能です'
                        : fail === 'rarity_cap'
                          ? 'これ以上昇格できません'
                          : 'クラフトできません',
              );
            }}
            onSell={() => {
              sellItem(selected.instanceId);
              setSelectedId(undefined);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}

function ItemDetail({
  item,
  equipped,
  gold,
  message,
  onEquip,
  onCraft,
  onSell,
}: {
  item: ItemInstance;
  equipped: boolean;
  gold: number;
  message: string | undefined;
  onEquip: (characterId: string, slot: EquipSlot) => void;
  onCraft: (op: CraftOperation) => void;
  onSell: () => void;
}) {
  const party = useGameStore((s) => s.party);
  const base = getBaseItemById(item.baseItemId);
  const [equipTarget, setEquipTarget] = useState(party[0]?.id ?? '');
  const unique = item.uniqueId ? getUniqueById(item.uniqueId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className={`text-lg font-bold ${RARITY_TEXT_CLASS[item.rarity]}`}>
          {itemDisplayName(item)}
        </h3>
        <p className="text-xs text-neutral-500">
          {RARITY_LABELS[item.rarity]} / {base.name} / アイテムLv {item.itemLevel}
          {base.requiredStr ? ` / 必要STR ${base.requiredStr}` : ''}
        </p>
        {(base.weaponAtk ?? 0) > 0 && <p className="text-sm">物理攻撃 {base.weaponAtk}</p>}
        {(base.weaponMatk ?? 0) > 0 && <p className="text-sm">魔法攻撃 {base.weaponMatk}</p>}
        {(base.armorDef ?? 0) > 0 && <p className="text-sm">防御力 {base.armorDef}</p>}
      </div>

      <ul className="flex flex-col gap-0.5 text-sm text-sky-300">
        {item.affixes.map((affix, i) => (
          <li key={i}>{formatAffix(affix)}</li>
        ))}
      </ul>
      {unique?.flavorText && (
        <p className="text-xs italic text-neutral-500">"{unique.flavorText}"</p>
      )}

      <div className="flex items-center gap-2">
        <select
          className="flex-1 rounded-lg bg-neutral-800 px-2 py-2 text-sm"
          value={equipTarget}
          onChange={(e) => setEquipTarget(e.target.value)}
        >
          {party.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {slotCandidates(item).map((slot) => (
          <Button key={slot} onClick={() => onEquip(equipTarget, slot)}>
            {SLOT_LABELS[slot]}に装備
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        {CRAFT_OPERATIONS.map((op) => {
          const cost = craftGoldCost(op, item.itemLevel);
          return (
            <Button key={op} variant="ghost" disabled={gold < cost} onClick={() => onCraft(op)}>
              {CRAFT_LABELS[op]}({cost}G)
            </Button>
          );
        })}
        <Button variant="danger" disabled={equipped} onClick={onSell}>
          売却({sellPrice(item)}G)
        </Button>
      </div>
      {message && <p className="text-center text-sm text-amber-400">{message}</p>}
    </div>
  );
}
