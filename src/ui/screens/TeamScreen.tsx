/** Schermata squadra: equipaggia armi, inserisci perk, sali di livello, schiera. */

import { useState } from 'react';
import { HERO_MAP } from '@content/heroes';
import { WEAPON_MAP } from '@content/weapons';
import { PERK_MAP } from '@content/perks';
import { REGISTRY } from '@content/registry';
import { describeEffect, levelStats } from '@engine/index';
import { composeHero } from '@state/loadout';
import { useGame } from '@state/store';
import { RARITY_META, ROLE_META } from '../format';

export function TeamScreen() {
  const profile = useGame((s) => s.profile);
  const [selected, setSelected] = useState<string>(profile.team[0] ?? profile.heroes[0]?.defId ?? '');

  const owned = profile.heroes.find((h) => h.defId === selected);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="font-display text-lg">Squadra & Collezione</div>
        <div className="text-[11px] text-white/40">
          Schierati {profile.team.length}/5 · 🪙 {profile.currencies.gold} · 💎 {profile.currencies.gems}
        </div>
      </div>

      {/* Griglia eroi */}
      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
        {profile.heroes.map((h) => {
          const def = HERO_MAP[h.defId]!;
          const inTeam = profile.team.includes(h.defId);
          return (
            <button
              key={h.defId}
              onClick={() => setSelected(h.defId)}
              className={`relative rounded-lg border p-2 text-center transition ${
                selected === h.defId ? 'border-gold bg-night-600' : 'border-white/10 bg-night-800'
              }`}
            >
              {inTeam && <span className="absolute right-1 top-1 text-[10px] text-emerald-400">●</span>}
              <div className={`text-xl ${ROLE_META[def.role].color}`}>{ROLE_META[def.role].icon}</div>
              <div className="truncate text-xs font-semibold">{def.name}</div>
              <div className="text-[10px] text-white/40">Lv {h.level}</div>
            </button>
          );
        })}
      </div>

      {/* Dettaglio eroe */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {owned && <HeroDetail defId={owned.defId} key={owned.defId} />}
      </div>
    </div>
  );
}

function HeroDetail({ defId }: { defId: string }) {
  const profile = useGame((s) => s.profile);
  const equipWeapon = useGame((s) => s.equipWeapon);
  const setPerkSlot = useGame((s) => s.setPerkSlot);
  const setRow = useGame((s) => s.setRow);
  const toggleTeam = useGame((s) => s.toggleTeam);
  const trainHero = useGame((s) => s.trainHero);

  const owned = profile.heroes.find((h) => h.defId === defId)!;
  const heroDef = HERO_MAP[defId]!;
  const composed = composeHero(owned, profile);
  const stats = composed ? levelStats(composed.def.baseStats, composed.def.growth, owned.level) : heroDef.baseStats;
  const inTeam = profile.team.includes(defId);

  const weapon = owned.weaponInstanceId
    ? profile.weapons.find((w) => w.instanceId === owned.weaponInstanceId) ?? null
    : null;
  const weaponDef = weapon ? WEAPON_MAP[weapon.defId] : null;

  // Armi disponibili: non equipaggiate da altri (o quella corrente).
  const availableWeapons = profile.weapons.filter(
    (w) => !profile.heroes.some((h) => h.weaponInstanceId === w.instanceId && h.defId !== defId),
  );

  const slottedPerkIds = new Set(
    profile.weapons.flatMap((w) => w.perkSlots).filter((p): p is string => p !== null),
  );

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display text-base">
            <span className={ROLE_META[heroDef.role].color}>{ROLE_META[heroDef.role].icon}</span> {heroDef.name}
            <span className={`ml-2 text-xs ${RARITY_META[heroDef.rarity].color}`}>{RARITY_META[heroDef.rarity].label}</span>
          </div>
          <span className="text-xs text-white/50">Lv {owned.level}</span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[11px] text-white/70">
          <Stat label="HP" value={Math.round(stats.maxHp)} />
          <Stat label="ATK" value={Math.round(stats.atk)} />
          <Stat label="DIF" value={Math.round(stats.def)} />
          <Stat label="VEL" value={Math.round(stats.speed)} />
          <Stat label="CRIT" value={`${Math.round(stats.critRate * 100)}%`} />
          <Stat label="RES" value={Math.round(stats.resistance)} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className={inTeam ? 'btn-ghost' : 'btn-primary'} onClick={() => toggleTeam(defId)}>
            {inTeam ? 'Rimuovi dalla squadra' : 'Schiera'}
          </button>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            <button
              className={`px-3 py-2 text-sm ${owned.row === 'front' ? 'bg-arcane text-white' : 'bg-white/5 text-white/50'}`}
              onClick={() => setRow(defId, 'front')}
            >
              Prima linea
            </button>
            <button
              className={`px-3 py-2 text-sm ${owned.row === 'back' ? 'bg-arcane text-white' : 'bg-white/5 text-white/50'}`}
              onClick={() => setRow(defId, 'back')}
            >
              Retrovia
            </button>
          </div>
          <button className="btn-ghost" onClick={() => trainHero(defId)}>
            Addestra (60 🪙)
          </button>
        </div>
      </div>

      {/* Arma */}
      <div className="card">
        <div className="mb-1 text-xs uppercase tracking-wider text-white/40">Arma</div>
        <select
          className="w-full rounded-lg bg-night-800 p-2 text-sm text-parchment"
          value={owned.weaponInstanceId ?? ''}
          onChange={(e) => equipWeapon(defId, e.target.value || null)}
        >
          <option value="">— Nessuna —</option>
          {availableWeapons.map((w) => {
            const wd = WEAPON_MAP[w.defId]!;
            const aff = wd.affinityRoles.includes(heroDef.role) ? ' ★' : '';
            return (
              <option key={w.instanceId} value={w.instanceId}>
                {wd.name} (Lv {w.level}){aff}
              </option>
            );
          })}
        </select>

        {weapon && weaponDef && (
          <div className="mt-2">
            <div className="mb-1 text-[11px] text-white/50">
              Slot perk ({weapon.perkSlots.length}){weaponDef.affinityRoles.includes(heroDef.role) && ' · affinità ★'}
            </div>
            <div className="space-y-1">
              {weapon.perkSlots.map((perkId, i) => (
                <select
                  key={i}
                  className="w-full rounded-lg bg-night-800 p-2 text-sm text-parchment"
                  value={perkId ?? ''}
                  onChange={(e) => setPerkSlot(weapon.instanceId, i, e.target.value || null)}
                >
                  <option value="">— Slot {i + 1} vuoto —</option>
                  {profile.perks
                    .filter((p) => p.instanceId === perkId || !slottedPerkIds.has(p.instanceId))
                    .map((p) => {
                      const pd = PERK_MAP[p.defId]!;
                      return (
                        <option key={p.instanceId} value={p.instanceId}>
                          {pd.name} (Lv {p.level})
                        </option>
                      );
                    })}
                </select>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Abilità (descrizioni generate dai dati) */}
      {composed && (
        <div className="card">
          <div className="mb-1 text-xs uppercase tracking-wider text-white/40">Abilità & Passive</div>
          <AbilityRow label="Attacco" text={describeEffect(composed.def.basicAttack ?? composed.def.ability, REGISTRY)} />
          <AbilityRow label="Ultimate ✦" text={describeEffect(composed.def.ability, REGISTRY)} />
          {composed.def.passives.map((p) => (
            <AbilityRow key={p.id} label={p.name} text={describeEffect(p, REGISTRY)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded bg-black/30 px-2 py-1">
      <span className="text-white/40">{label} </span>
      <span className="font-semibold text-parchment">{value}</span>
    </div>
  );
}

function AbilityRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-t border-white/5 py-1.5 first:border-t-0">
      <div className="text-xs font-semibold text-parchment">{label}</div>
      <div className="text-[11px] leading-snug text-white/60">{text}</div>
    </div>
  );
}
