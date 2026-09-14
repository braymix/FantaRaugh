/**
 * Scelta dello starter: il primo mini-draft della run. Poche informazioni ma di
 * forte impatto — ruolo, tipo e meccanica identitaria.
 */

import { useState } from 'react';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP, STARTER_IDS } from '@content/creatures';
import { ROLE_KITS } from '@content/rolekits';
import { REGISTRY } from '@content/registry';
import { useGame } from '@state/store';
import { EffectCard } from '../components/EffectCard';
import { Sprite } from '../components/Sprite';
import { TypeRow } from '../components/TypeBadge';
import { ROLE_META } from '../format';

export function StarterScreen() {
  const startRun = useGame((s) => s.startRun);
  const navigate = useGame((s) => s.navigate);
  const nuzlocke = useGame((s) => s.profile.nuzlocke);
  const [picked, setPicked] = useState<string>(STARTER_IDS[0]!);
  const [seedText, setSeedText] = useState('');

  const def = CREATURE_MAP[picked]!;
  const kit = ROLE_KITS[def.role];

  return (
    <div className="flex h-full flex-col bg-dither">
      <div className="border-b-2 border-black/50 bg-night-800 p-3">
        <div className="font-display text-lg">Scegli il tuo compagno</div>
        <div className="text-[11px] text-white/45">
          Livello {BALANCE.starterLevel} · squadra max {BALANCE.maxRecruits}
          {nuzlocke && <span className="ml-2 text-blood">NUZLOCKE</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {STARTER_IDS.map((id) => {
          const c = CREATURE_MAP[id]!;
          return (
            <button
              key={id}
              onClick={() => setPicked(id)}
              className={`flex flex-col items-center border-2 p-1 ${
                picked === id ? 'border-gold bg-night-600' : 'border-black/50 bg-night-800'
              }`}
            >
              <Sprite defId={id} role={c.role} scale={2} />
              <div className="w-full truncate text-center text-[10px] font-semibold">{c.name}</div>
              <TypeRow types={c.types} small />
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <Sprite defId={picked} role={def.role} scale={3} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base">{def.name}</div>
              <div className={`text-[11px] ${ROLE_META[def.role].color}`}>
                {ROLE_META[def.role].icon} {ROLE_META[def.role].label}
              </div>
              <div className="mt-0.5">
                <TypeRow types={def.types} />
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-white/65">{kit.blurb}</p>
          <p className="mt-1 text-[10px] text-white/40">
            Evolve a livello {def.evolution?.atLevel ?? '—'}
            {def.evolution && ` in ${CREATURE_MAP[def.evolution.toId]?.name ?? '?'}`}.
          </p>
        </div>

        <EffectCard effect={kit.basicAttack} registry={REGISTRY} badge="base" />
        <EffectCard effect={kit.ability} registry={REGISTRY} badge="ultimate ✦" />
      </div>

      <div className="space-y-2 border-t-2 border-black/50 bg-night-800 p-3">
        <input
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder="Seed opzionale (run deterministica)"
          className="w-full border-2 border-black/50 bg-night-900 px-3 py-2 text-xs text-parchment placeholder:text-white/30"
        />
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => navigate('home')}>
            Indietro
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => startRun(picked, seedText ? parseSeed(seedText) : undefined)}
          >
            Parti con {def.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseSeed(text: string): number {
  const n = Number(text);
  if (Number.isFinite(n)) return n >>> 0;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
