import { useState } from 'react';
import { isBossDepth } from '../../core/dungeon/encounter';
import { DUNGEON_DATA } from '../../data';
import { useGameStore } from '../../store/gameStore';
import { Button, Panel } from '../components/shared';

export function DungeonScreen() {
  const highestDepth = useGameStore((s) => s.highestDepth);
  const gold = useGameStore((s) => s.gold);
  const enterDungeon = useGameStore((s) => s.enterDungeon);
  const saveGame = useGameStore((s) => s.saveGame);
  const [depth, setDepth] = useState(() => Math.max(1, highestDepth + 1));
  const [saveMessage, setSaveMessage] = useState<string>();

  const maxSelectable = highestDepth + 1;
  const clamped = Math.min(Math.max(1, depth), maxSelectable);

  return (
    <div className="flex flex-col gap-3 p-3">
      <Panel title="無限ダンジョン">
        <p className="text-sm text-neutral-400">
          最深到達: <span className="font-bold text-amber-400">{highestDepth} 層</span> / 所持金:{' '}
          <span className="font-bold text-amber-400">{gold.toLocaleString()} G</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          深くなるほど敵が強くなり、良いアイテムが落ちます。{DUNGEON_DATA.bossDepthInterval}
          層ごとにボスが待ち構えています。
        </p>
      </Panel>

      <Panel title="挑戦する深度">
        <div className="flex items-center justify-center gap-4 py-2">
          <Button variant="ghost" onClick={() => setDepth(Math.max(1, clamped - 1))}>
            −
          </Button>
          <div className="w-28 text-center">
            <span className="text-3xl font-black text-amber-400">{clamped}</span>
            <span className="ml-1 text-sm text-neutral-400">層</span>
            {isBossDepth(clamped, DUNGEON_DATA) && (
              <p className="text-xs font-bold text-rose-400">BOSS</p>
            )}
          </div>
          <Button variant="ghost" onClick={() => setDepth(Math.min(maxSelectable, clamped + 1))}>
            +
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" className="flex-1" onClick={() => setDepth(1)}>
            1層
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => setDepth(maxSelectable)}>
            最前線({maxSelectable}層)
          </Button>
        </div>
        <Button className="mt-3 w-full py-3 text-base" onClick={() => enterDungeon(clamped)}>
          出撃する
        </Button>
      </Panel>

      <Panel title="記録">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            void saveGame(Date.now())
              .then(() => setSaveMessage('セーブしました'))
              .catch(() => setSaveMessage('セーブに失敗しました'));
          }}
        >
          セーブ
        </Button>
        {saveMessage && <p className="mt-2 text-center text-xs text-amber-400">{saveMessage}</p>}
      </Panel>
    </div>
  );
}
