import { useEffect, useState } from 'react';
import type { SaveSlotSummary } from '../../core/save/saveData';
import { CLASS_DEFINITIONS } from '../../data/classes';
import { useGameStore } from '../../store/gameStore';
import { useGitHubAuthStore } from '../../integrations/github';
import { Button, Panel } from '../components/shared';

interface MemberDraft {
  name: string;
  classId: string;
}

const DEFAULT_DRAFT: MemberDraft[] = [
  { name: 'アルタ', classId: 'warrior' },
  { name: 'ミラ', classId: 'mage' },
  { name: 'レン', classId: 'ranger' },
  { name: 'セシル', classId: 'cleric' },
];

export function TitleScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const loadGame = useGameStore((s) => s.loadGame);
  const listSlots = useGameStore((s) => s.listSlots);
  const setScreen = useGameStore((s) => s.setScreen);
  const { isAuthenticated } = useGitHubAuthStore();
  const [slots, setSlots] = useState<readonly SaveSlotSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MemberDraft[]>(DEFAULT_DRAFT);

  useEffect(() => {
    void listSlots().then(setSlots).catch(() => setSlots([]));
  }, [listSlots]);

  if (!creating) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-[0.3em] text-amber-500">HAKUSURA</h1>
          <p className="mt-2 text-xs text-neutral-500">ターン制ハクスラRPG</p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button onClick={() => setCreating(true)} className="py-3 text-base">
            はじめから
          </Button>
          {slots.map((slot) => (
            <Button
              key={slot.slotId}
              variant="ghost"
              className="py-3"
              onClick={() => void loadGame(slot.slotId)}
            >
              つづきから — {slot.partyNames.join('・')}(最深 {slot.highestDepth} 層)
            </Button>
          ))}
          <Button
            variant="ghost"
            className="py-3"
            onClick={() => setScreen(isAuthenticated ? 'github-repositories' : 'github-login')}
          >
            {isAuthenticated ? 'GitHub リポジトリ' : 'GitHub アカウント連携'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-4">
      <h2 className="text-lg font-bold text-amber-500">パーティ編成</h2>
      {draft.map((member, i) => (
        <Panel key={i} title={`メンバー ${i + 1}`}>
          <input
            className="mb-2 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm"
            value={member.name}
            maxLength={8}
            onChange={(e) =>
              setDraft(draft.map((m, j) => (j === i ? { ...m, name: e.target.value } : m)))
            }
          />
          <div className="grid grid-cols-5 gap-1">
            {CLASS_DEFINITIONS.map((cls) => (
              <button
                type="button"
                key={cls.id}
                onClick={() =>
                  setDraft(draft.map((m, j) => (j === i ? { ...m, classId: cls.id } : m)))
                }
                className={`rounded-md px-1 py-2 text-[10px] font-semibold ${
                  member.classId === cls.id
                    ? 'bg-amber-600 text-neutral-950'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-neutral-500">
            {CLASS_DEFINITIONS.find((c) => c.id === member.classId)?.description}
          </p>
        </Panel>
      ))}
      <div className="mt-auto flex gap-2 pb-4">
        <Button variant="ghost" className="flex-1" onClick={() => setCreating(false)}>
          もどる
        </Button>
        <Button
          className="flex-1"
          onClick={() =>
            newGame(
              draft.map((m) => ({ name: m.name.trim() || 'ななし', classId: m.classId })),
              (globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? 1) >>> 0,
            )
          }
        >
          冒険をはじめる
        </Button>
      </div>
    </div>
  );
}
