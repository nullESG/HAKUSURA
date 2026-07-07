/**
 * アプリのルート(スマホ縦画面前提)。
 * タイトル → メイン(下部タブ: パーティ/持ち物/スキル/ダンジョン)→ 戦闘(全画面)。
 */
import { useEffect } from 'react';
import { useGameStore, type Screen } from './store/gameStore';
import { useGitHubAuthStore } from './integrations/github';
import { BattleScreen } from './ui/screens/BattleScreen';
import { DungeonScreen } from './ui/screens/DungeonScreen';
import { InventoryScreen } from './ui/screens/InventoryScreen';
import { PartyScreen } from './ui/screens/PartyScreen';
import { SkillTreeScreen } from './ui/screens/SkillTreeScreen';
import { TitleScreen } from './ui/screens/TitleScreen';
import { GitHubLoginScreen } from './ui/screens/GitHubLoginScreen';
import { GitHubRepositoriesScreen } from './ui/screens/GitHubRepositoriesScreen';
import { GitHubCallbackScreen } from './ui/screens/GitHubCallbackScreen';

const TABS: readonly { screen: Screen; label: string; icon: string }[] = [
  { screen: 'party', label: 'パーティ', icon: '👥' },
  { screen: 'inventory', label: '持ち物', icon: '🎒' },
  { screen: 'skills', label: 'スキル', icon: '✨' },
  { screen: 'dungeon', label: 'ダンジョン', icon: '⚔️' },
];

export function App() {
  const screen = useGameStore((s) => s.screen);
  const started = useGameStore((s) => s.started);
  const setScreen = useGameStore((s) => s.setScreen);
  const { loadFromStorage } = useGitHubAuthStore();

  useEffect(() => {
    loadFromStorage();

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && window.location.pathname === '/auth/github/callback') {
      // GitHubCallbackScreen will handle this
    }
  }, [loadFromStorage]);

  // Check if we're on the callback route
  const isOnCallbackRoute = window.location.pathname === '/auth/github/callback';

  return (
    <div className="min-h-dvh bg-neutral-950 pt-[env(safe-area-inset-top)] text-neutral-200">
      {isOnCallbackRoute ? (
        <GitHubCallbackScreen />
      ) : screen === 'github-login' ? (
        <GitHubLoginScreen />
      ) : screen === 'github-repositories' ? (
        <GitHubRepositoriesScreen />
      ) : !started || screen === 'title' ? (
        <TitleScreen />
      ) : screen === 'battle' ? (
        <BattleScreen />
      ) : (
        <div className="mx-auto flex min-h-dvh max-w-md flex-col">
          <main className="flex-1 pb-20">
            {screen === 'party' && <PartyScreen />}
            {screen === 'inventory' && <InventoryScreen />}
            {screen === 'skills' && <SkillTreeScreen />}
            {screen === 'dungeon' && <DungeonScreen />}
          </main>
          <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto grid max-w-md grid-cols-4">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.screen}
                  onClick={() => setScreen(tab.screen)}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                    screen === tab.screen ? 'text-amber-400' : 'text-neutral-500'
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
