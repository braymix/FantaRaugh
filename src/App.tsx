/** Shell dell'app: header, navigazione tra schermate, toast. */

import { useEffect, useState } from 'react';
import { useGame } from '@state/store';
import { HomeScreen } from '@ui/screens/HomeScreen';
import { TeamScreen } from '@ui/screens/TeamScreen';
import { StarterScreen } from '@ui/screens/StarterScreen';
import { MapScreen } from '@ui/screens/MapScreen';
import { MetaScreen } from '@ui/screens/MetaScreen';
import { BattleScreen } from '@ui/screens/BattleScreen';
import { RulesSheet } from '@ui/components/RulesSheet';
import { Tutorial } from '@ui/components/Tutorial';

export default function App() {
  const screen = useGame((s) => s.screen);
  const navigate = useGame((s) => s.navigate);
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);
  const essence = useGame((s) => s.profile.essence);
  const tutorialSeen = useGame((s) => s.profile.tutorialSeen);
  const closeTutorial = useGame((s) => s.closeTutorial);
  const badges = useGame((s) => s.profile.run?.badges ?? 0);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast, setToast]);

  const [help, setHelp] = useState(false);
  const showHeader = screen !== 'battle';

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-dither">
      {showHeader && (
        <header className="flex items-center justify-between border-b border-white/10 bg-night-800 px-3 py-2">
          <button className="font-display text-lg text-gold" onClick={() => navigate('home')}>
            Fantaraugh
          </button>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span title="Medaglie">🏅 {badges}</span>
            <span title="Essenze">✦ {essence}</span>
            <button
              onClick={() => setHelp(true)}
              title="Come si gioca"
              className="border-2 border-black/50 bg-white/10 px-1.5 text-parchment"
            >
              ?
            </button>
          </div>
        </header>
      )}

      <main className="relative flex-1 overflow-hidden">
        {screen === 'home' && <HomeScreen />}
        {screen === 'starter' && <StarterScreen />}
        {screen === 'map' && <MapScreen />}
        {screen === 'team' && <TeamScreen />}
        {screen === 'meta' && <MetaScreen />}
        {screen === 'battle' && <BattleScreen />}
      </main>

      {help && <RulesSheet onClose={() => setHelp(false)} />}

      {/* Alla primissima apertura il tutorial parte da solo. */}
      {!tutorialSeen && <Tutorial onClose={closeTutorial} />}

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
