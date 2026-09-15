/** Riquadro minimale di login: sign up / sign in / sign out via Supabase. */

import { useState } from 'react';
import { useGame } from '@state/store';

export function AuthPanel() {
  const cloudAvailable = useGame((s) => s.cloudAvailable);
  const user = useGame((s) => s.user);
  const authBusy = useGame((s) => s.authBusy);
  const authError = useGame((s) => s.authError);
  const authSignUp = useGame((s) => s.authSignUp);
  const authSignIn = useGame((s) => s.authSignIn);
  const authSignOut = useGame((s) => s.authSignOut);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!cloudAvailable) {
    return (
      <div className="w-full max-w-xs text-center text-[10px] text-white/30">
        Salvataggio cloud non configurato per questa build.
      </div>
    );
  }

  if (user) {
    return (
      <div className="card w-full max-w-xs text-center text-xs">
        <p className="text-white/70">
          Connesso come <span className="font-semibold text-parchment">{user.email}</span>
        </p>
        <p className="mt-1 text-[10px] text-white/40">Il salvataggio si sincronizza automaticamente.</p>
        <button className="btn-ghost mt-2 w-full" disabled={authBusy} onClick={() => void authSignOut()}>
          Esci
        </button>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-xs text-xs">
      <p className="mb-2 text-center text-white/70">
        Accedi per ritrovare il salvataggio su un altro dispositivo.
      </p>
      <div className="flex flex-col gap-1.5">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-2 border-black/50 bg-white/10 px-2 py-1 text-parchment placeholder:text-white/30"
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-2 border-black/50 bg-white/10 px-2 py-1 text-parchment placeholder:text-white/30"
        />
      </div>
      {authError && <p className="mt-1 text-[10px] text-blood">{authError}</p>}
      <div className="mt-2 flex gap-2">
        <button
          className="btn-ghost flex-1"
          disabled={authBusy || !email || !password}
          onClick={() => void authSignIn(email, password)}
        >
          Accedi
        </button>
        <button
          className="btn-ghost flex-1"
          disabled={authBusy || !email || !password}
          onClick={() => void authSignUp(email, password)}
        >
          Registrati
        </button>
      </div>
    </div>
  );
}
