/**
 * Schermata squadra: equipaggia armi, inserisci perk, sali di livello, schiera.
 *
 * Obiettivo di design: capire a colpo d'occhio COSA fa ogni cosa. Perciò ogni
 * perk/abilità è una EffectCard strutturata, e i selettori mostrano l'anteprima
 * della variazione di statistiche prima di confermare.
 */

import { useState } from 'react';
import { BALANCE } from '@content/balance';
import { HERO_MAP } from '@content/heroes';
import { PERK_MAP } from '@content/perks';
import { REGISTRY } from '@content/registry';
import { WEAPON_MAP } from '@content/weapons';
import { levelStats } from '@engine/build';
import type { BaseStats } from '@engine/types';
import { composeHero } from '@state/loadout';
import { useGame } from '@state/store';
import type { OwnedHero, PlayerProfile } from '@state/types';
import { EffectCard, StatDelta } from '../components/EffectCard';
import { Sprite } from '../components/Sprite';
import { RARITY_META, ROLE_META } from '../format';

/** Statistiche dell'eroe con una certa arma equipaggiata (per l'anteprima). */
function statsWith(profile: PlayerProfile, owned: OwnedHero, weaponInstanceId: string | null): BaseStats | null {
  const c = composeHero({ ...owned, weaponInstanceId }, profile);
  return c ? levelStats(c.def.baseStats, c.def.growth, owned.level) : null;
}

type Picker = { kind: 'weapon' } | { kind: 'perk'; slot: number } | null;

export function TeamScreen() {
  const profile = useGame((s) => s.profile);
  const [selected, setSelected] = useState<string>(profile.team[0] ?? profile.heroes[0]?.defId ?? '');
  const owned = profile.heroes.find((h) => h.defId === selected);

  return (
    <div className="flex h-full flex-col bg-dither">
      <div className="border-b-2 border-black/50 bg-night-800 p-3">
        <div className="font-display text-lg">Squadra & Collezione</div>
        <div className="text-[11px] text-white/45">
          Schierati {profile.team.length}/{BALANCE.teamSize} · 🪙 {profile.currencies.gold} · 💎{' '}
          {profile.currencies.gems}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
        {profile.heroes.map((h) => {
          const def = HERO_MAP[h.defId]!;
          const inTeam = profile.team.includes(h.defId);
          return (
            <button
              key={h.defId}
              onClick={() => setSelected(h.defId)}
              className={`relative flex flex-col items-center border-2 p-1 transition ${
                selected === h.defId ? 'border-gold bg-night-600' : 'border-black/50 bg-night-800'
              }`}
            >
              {inTeam && <span className="absolute right-1 top-0.5 text-[9px] text-emerald-400">●</span>}
              <Sprite defId={h.defId} role={def.role} scale={2} />
              <div className="w-full truncate text-center text-[10px] font-semibold">{def.name}</div>
              <div className="text-[9px] text-white/40">Lv {h.level}</div>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {owned && <HeroDetail key={owned.defId} defId={owned.defId} />}
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
  const [picker, setPicker] = useState<Picker>(null);

  const owned = profile.heroes.find((h) => h.defId === defId)!;
  const heroDef = HERO_MAP[defId]!;
  const composed = composeHero(owned, profile);
  const stats = composed ? levelStats(composed.def.baseStats, composed.def.growth, owned.level) : heroDef.baseStats;
  const bare = statsWith(profile, owned, null)!; // senza arma, per mostrare il contributo
  const inTeam = profile.team.includes(defId);

  const weapon = profile.weapons.find((w) => w.instanceId === owned.weaponInstanceId) ?? null;
  const weaponDef = weapon ? WEAPON_MAP[weapon.defId] : null;
  const affinity = weaponDef?.affinityRoles.includes(heroDef.role) ?? false;

  const availableWeapons = profile.weapons.filter(
    (w) => !profile.heroes.some((h) => h.weaponInstanceId === w.instanceId && h.defId !== defId),
  );
  const slottedPerkIds = new Set(profile.weapons.flatMap((w) => w.perkSlots).filter((p): p is string => p !== null));

  return (
    <div className="space-y-3">
      {/* Intestazione */}
      <div className="card flex items-center gap-3">
        <Sprite defId={defId} role={heroDef.role} scale={3} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-tight">{heroDef.name}</div>
          <div className="text-[11px]">
            <span className={ROLE_META[heroDef.role].color}>
              {ROLE_META[heroDef.role].icon} {ROLE_META[heroDef.role].label}
            </span>
            <span className={`ml-2 ${RARITY_META[heroDef.rarity].color}`}>{RARITY_META[heroDef.rarity].label}</span>
          </div>
          <div className="text-[11px] text-white/45">
            Livello {owned.level} · {owned.xp} XP
          </div>
        </div>
      </div>

      {/* Statistiche: il numero e quanto ci mette l'equipaggiamento */}
      <div className="card">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Statistiche <span className="text-white/25">(verde = contributo dell'arma)</span>
        </div>
        <StatDelta label="Salute" from={bare.maxHp} to={stats.maxHp} />
        <StatDelta label="Attacco" from={bare.atk} to={stats.atk} />
        <StatDelta label="Difesa" from={bare.def} to={stats.def} />
        <StatDelta label="Velocità" from={bare.speed} to={stats.speed} />
        <StatDelta label="Resistenza" from={bare.resistance} to={stats.resistance} />
        <div className="flex items-baseline justify-between py-0.5 text-[11px]">
          <span className="text-white/45">Critico</span>
          <span className="font-semibold text-parchment">
            {Math.round(stats.critRate * 100)}% · ×{stats.critDamage.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Azioni */}
      <div className="card flex flex-wrap gap-2">
        <button className={inTeam ? 'btn-ghost' : 'btn-primary'} onClick={() => toggleTeam(defId)}>
          {inTeam ? 'Rimuovi' : 'Schiera'}
        </button>
        <div className="flex border-2 border-black/50">
          {(['front', 'back'] as const).map((r) => (
            <button
              key={r}
              className={`px-3 py-2 text-xs ${owned.row === r ? 'bg-arcane text-white' : 'bg-white/5 text-white/50'}`}
              onClick={() => setRow(defId, r)}
            >
              {r === 'front' ? '▮ Prima linea' : '▯ Retrovia'}
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={() => trainHero(defId)}>
          Addestra · 60 🪙
        </button>
      </div>

      {/* Arma */}
      <div className="card">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Arma</span>
          <button className="border border-white/20 px-2 py-0.5 text-[10px] text-white/70" onClick={() => setPicker({ kind: 'weapon' })}>
            Cambia
          </button>
        </div>
        {weaponDef && weapon ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className={`text-sm font-bold ${RARITY_META[weaponDef.rarity].color}`}>{weaponDef.name}</span>
              <span className="text-[10px] text-white/45">Lv {weapon.level}</span>
            </div>
            <div className="text-[10px] text-white/45">
              {RARITY_META[weaponDef.rarity].label} · {weapon.perkSlots.length} slot
              {affinity && <span className="ml-1 text-gold">★ affinità {ROLE_META[heroDef.role].label}</span>}
            </div>
            {weaponDef.intrinsic && (
              <div className="mt-2">
                <EffectCard effect={weaponDef.intrinsic} registry={REGISTRY} badge="intrinseco" compact />
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] text-white/40">Nessuna arma equipaggiata.</div>
        )}
      </div>

      {/* Slot perk */}
      {weapon && (
        <div className="card">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
            Perk ({weapon.perkSlots.filter(Boolean).length}/{weapon.perkSlots.length})
          </div>
          <div className="space-y-2">
            {weapon.perkSlots.map((perkInstanceId, i) => {
              const op = perkInstanceId ? profile.perks.find((p) => p.instanceId === perkInstanceId) : null;
              const pd = op ? PERK_MAP[op.defId] : null;
              return (
                <div key={i}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wide text-white/35">Slot {i + 1}</span>
                    <div className="flex gap-1">
                      {perkInstanceId && (
                        <button
                          className="border border-white/20 px-1.5 text-[9px] text-white/50"
                          onClick={() => setPerkSlot(weapon.instanceId, i, null)}
                        >
                          togli
                        </button>
                      )}
                      <button
                        className="border border-white/20 px-1.5 text-[9px] text-white/70"
                        onClick={() => setPicker({ kind: 'perk', slot: i })}
                      >
                        scegli
                      </button>
                    </div>
                  </div>
                  {pd && op ? (
                    <EffectCard
                      effect={pd.effect}
                      registry={REGISTRY}
                      badge={`${RARITY_META[pd.rarity].label} · Lv ${op.level}`}
                      compact
                    />
                  ) : (
                    <div className="border-2 border-dashed border-white/15 p-2 text-center text-[10px] text-white/30">
                      slot vuoto
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abilità e passive */}
      {composed && (
        <div className="card space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Abilità & Passive</div>
          {composed.def.basicAttack && (
            <EffectCard effect={composed.def.basicAttack} registry={REGISTRY} badge="base" />
          )}
          <EffectCard effect={composed.def.ability} registry={REGISTRY} badge="ultimate ✦" />
          {composed.def.passives.map((p) => {
            // La provenienza aiuta a capire cosa è innato e cosa viene dall'equipaggiamento.
            const source = heroDef.passives.some((hp) => hp.id === p.id)
              ? 'innata'
              : weaponDef?.intrinsic?.id === p.id
                ? 'arma'
                : 'perk';
            return <EffectCard key={p.id} effect={p} registry={REGISTRY} badge={source} compact />;
          })}
        </div>
      )}

      {/* Selettore a tendina dal basso */}
      {picker && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={() => setPicker(null)}>
          <div
            className="max-h-[78%] w-full overflow-y-auto border-t-2 border-gold/50 bg-night-800 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm">
                {picker.kind === 'weapon' ? 'Scegli un\'arma' : `Perk per lo slot ${picker.slot + 1}`}
              </span>
              <button className="btn-ghost" onClick={() => setPicker(null)}>
                Chiudi
              </button>
            </div>

            {picker.kind === 'weapon' ? (
              <div className="space-y-2">
                <button
                  className="w-full border-2 border-black/40 bg-black/30 p-2 text-left text-[11px] text-white/60"
                  onClick={() => {
                    equipWeapon(defId, null);
                    setPicker(null);
                  }}
                >
                  Nessuna arma
                </button>
                {availableWeapons.map((w) => {
                  const wd = WEAPON_MAP[w.defId]!;
                  const preview = statsWith(profile, owned, w.instanceId);
                  const aff = wd.affinityRoles.includes(heroDef.role);
                  const equipped = w.instanceId === owned.weaponInstanceId;
                  return (
                    <button
                      key={w.instanceId}
                      className={`w-full border-2 p-2 text-left ${equipped ? 'border-gold/70 bg-gold/10' : 'border-black/40 bg-black/30'}`}
                      onClick={() => {
                        equipWeapon(defId, w.instanceId);
                        setPicker(null);
                      }}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-bold ${RARITY_META[wd.rarity].color}`}>{wd.name}</span>
                        <span className="text-[10px] text-white/45">
                          Lv {w.level}
                          {equipped && ' · equipaggiata'}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/45">
                        {RARITY_META[wd.rarity].label} · {w.perkSlots.length} slot
                        {aff && <span className="ml-1 text-gold">★ affinità</span>}
                      </div>
                      {preview && (
                        <div className="mt-1">
                          <StatDelta label="Salute" from={stats.maxHp} to={preview.maxHp} />
                          <StatDelta label="Attacco" from={stats.atk} to={preview.atk} />
                          <StatDelta label="Difesa" from={stats.def} to={preview.def} />
                          <StatDelta label="Velocità" from={stats.speed} to={preview.speed} />
                        </div>
                      )}
                      {wd.intrinsic && (
                        <div className="mt-1">
                          <EffectCard effect={wd.intrinsic} registry={REGISTRY} badge="intrinseco" compact />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {profile.perks
                  .filter((p) => !slottedPerkIds.has(p.instanceId) || weapon?.perkSlots[picker.slot] === p.instanceId)
                  .map((p) => {
                    const pd = PERK_MAP[p.defId]!;
                    return (
                      <button
                        key={p.instanceId}
                        className="w-full text-left"
                        onClick={() => {
                          if (weapon) setPerkSlot(weapon.instanceId, picker.slot, p.instanceId);
                          setPicker(null);
                        }}
                      >
                        <EffectCard
                          effect={pd.effect}
                          registry={REGISTRY}
                          badge={`${RARITY_META[pd.rarity].label} · Lv ${p.level}`}
                        />
                      </button>
                    );
                  })}
                {profile.perks.filter((p) => !slottedPerkIds.has(p.instanceId)).length === 0 && (
                  <div className="p-3 text-center text-[11px] text-white/40">
                    Nessun perk libero: toglilo da un'altra arma o trovane di nuovi nei forzieri.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
