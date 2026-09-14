/** Shell dell'app: header, navigazione tra schermate, toast. */

import { useEffect } from 'react';
import { useGame } from '@state/store';
import { HomeScreen } from '@ui/screens/HomeScreen';
import { TeamScreen } from '@ui/screens/TeamScreen';
import { DungeonScreen } from '@ui/screens/DungeonScreen';
import { BattleScreen } from '@ui/screens/BattleScreen';

export default function App() {
  const screen = useGame((s) => s.screen);
  const navigate = useGame((s) => s.navigate);
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  const energy = useGame((s) => s.profile.energy);
  const gold = useGame((s) => s.profile.currencies.gold);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast, setToast]);

  const showHeader = screen !== 'battle';

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-night-900">
      {showHeader && (
        <header className="flex items-center justify-between border-b border-white/10 bg-night-800 px-3 py-2">
          <button className="font-display text-lg text-gold" onClick={() => navigate('home')}>
            Fantaraugh
          </button>
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span title="Energia">⚡ {energy.current}/{energy.max}</span>
            <span title="Oro">🪙 {gold}</span>
          </div>
        </header>
      )}

      <main className="relative flex-1 overflow-hidden">
        {screen === 'home' && <HomeScreen />}
        {screen === 'team' && <TeamScreen />}
        {screen === 'dungeon' && <DungeonScreen />}
        {screen === 'battle' && <BattleScreen />}
      </main>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-black/80 px-4 py-2 text-sm text-parchment shadow-lg ring-1 ring-white/10">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
