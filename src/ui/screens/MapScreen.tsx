/**
 * Mappa della run: si sceglie il percorso nodo per nodo attraverso le stanze del dungeon.
 * Ogni scelta ha un costo opportunità (un oggetto è una sentinella in meno, e quindi meno livelli).
 *
 * Mostra solo la porzione vicina del viaggio: il dungeon completo è lungo 7 tratte
 * di comandanti più 3 leader e il capo finale.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { ITEM_MAP } from '@content/items';
import type { MapNode, NodeKind } from '@content/runmap';
import { useGame } from '@state/store';
import { Sprite } from '../components/Sprite';
import { TypeBadge, TypeRow } from '../components/TypeBadge';
import { threatStars } from '../format';

const KIND_ICON: Record<NodeKind, string> = {
  wild: '⚔️',
  sentinella: '🛡️',
  item: '📦',
  trade: '🔄',
  heal: '🏕️',
  tutor: '📜',
  event: '❓',
  ball: '🔮',
  commander: '🏅',
  elite: '👑',
  boss: '🐉',
};

export function MapScreen() {
  const map = useGame((s) => s.map);
  const run = useGame((s) => s.profile.run);
  const enterNode = useGame((s) => s.enterNode);
  const abandon = useGame((s) => s.abandonRun);
  const navigate = useGame((s) => s.navigate);

  if (!map || !run) {
    return <div className="flex h-full items-center justify-center text-white/60">Nessuna run attiva.</div>;
  }

  const cleared = new Set(run.clearedNodeIds);
  const currentLayer = run.currentNodeId === null ? 0 : (map.nodes[run.currentNodeId]?.layer ?? 0) + 1;
  const selectable = new Set(
    run.currentNodeId === null ? map.startIds : (map.nodes[run.currentNodeId]?.next ?? []),
  );

  const from = Math.max(0, currentLayer - 1);
  const to = Math.min(map.layers.length, currentLayer + 4);
  const visible = map.layers.slice(from, to);

  const totalLayers = map.layers.length;

  const spineRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [links, setLinks] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useLayoutEffect(() => {
    const computeLinks = () => {
      const spine = spineRef.current;
      if (!spine) return;
      const spineRect = spine.getBoundingClientRect();
      const next: { x1: number; y1: number; x2: number; y2: number }[] = [];
      for (const layer of visible) {
        for (const nid of layer) {
          if (!selectable.has(nid)) continue;
          const fromEl = nodeRefs.current.get(nid);
          if (!fromEl) continue;
          const fromRect = fromEl.getBoundingClientRect();
          for (const targetId of map.nodes[nid]!.next) {
            const toEl = nodeRefs.current.get(targetId);
            if (!toEl) continue;
            const toRect = toEl.getBoundingClientRect();
            next.push({
              x1: fromRect.left + fromRect.width / 2 - spineRect.left,
              y1: fromRect.bottom - spineRect.top,
              x2: toRect.left + toRect.width / 2 - spineRect.left,
              y2: toRect.top - spineRect.top,
            });
          }
        }
      }
      setLinks(next);
    };
    computeLinks();
    window.addEventListener('resize', computeLinks);
    return () => window.removeEventListener('resize', computeLinks);
  }, [map, run.currentNodeId, from, to, selectable, visible]);

  return (
    <div className="flex h-full flex-col bg-dungeon">
      <div className="flex items-center justify-between border-b-2 border-black/60 bg-night-900/90 p-3">
        <div>
          <div className="font-display text-base leading-tight">
            🏅 {run.badges}/{BALANCE.badgeCount} medaglie
            {run.nuzlocke && <span className="ml-2 text-xs font-bold text-blood">NUZLOCKE</span>}
          </div>
          <div className="text-xs text-white/65 font-medium">
            profondità {Math.min(currentLayer + 1, totalLayers)}/{totalLayers} · dungeon #{map.seed}
          </div>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost" onClick={() => navigate('team')}>
            Squadra
          </button>
          <button className="btn-ghost" onClick={abandon}>
            Esci
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div ref={spineRef} className="dungeon-spine relative mx-auto flex max-w-md flex-col items-stretch gap-5">
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {links.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="#e0562d"
                strokeOpacity={0.55}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            ))}
          </svg>
          {visible.map((layer, i) => {
            const layerIndex = from + i;
            const isCurrent = layerIndex === currentLayer;
            const isCleared = layerIndex < currentLayer;
            const hasCommander = layer.some((nid) => {
              const k = map.nodes[nid]!.kind;
              return k === 'commander' || k === 'elite' || k === 'boss';
            });
            return (
              <div key={layerIndex} className="relative z-10">
                <DepthPlaque
                  depth={layerIndex + 1}
                  total={totalLayers}
                  current={isCurrent}
                  cleared={isCleared}
                  gate={hasCommander}
                />
                <div className="flex flex-wrap justify-center gap-2">
                  {layer.map((nid) => (
                    <NodeCard
                      key={nid}
                      node={map.nodes[nid]!}
                      selectable={selectable.has(nid)}
                      cleared={cleared.has(nid)}
                      onEnter={() => enterNode(nid)}
                      cardRef={(el) => nodeRefs.current.set(nid, el)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {to >= totalLayers && (
            <div className="relative z-10 pt-1 text-center text-[10px] uppercase tracking-widest text-white/30">
              ⛧ fondo del dungeon ⛧
            </div>
          )}
        </div>
      </div>

      {run.pending && <PendingSheet />}
    </div>
  );
}

/** Targa di pietra che segna la profondità della stanza nel dungeon. */
function DepthPlaque({
  depth,
  total,
  current,
  cleared,
  gate,
}: {
  depth: number;
  total: number;
  current: boolean;
  cleared: boolean;
  gate: boolean;
}) {
  const label = current
    ? '▼ SCEGLI STANZA'
    : cleared
      ? `Stanza ${depth} · esplorata`
      : gate
        ? `Stanza ${depth} · varco sorvegliato`
        : `Stanza ${depth}`;
  return (
    <div className="mb-2 flex items-center justify-center gap-2">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
      <span
        className={`whitespace-nowrap border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-pixel ${
          current
            ? 'border-ember/70 bg-ember/20 text-ember'
            : gate
              ? 'border-gold/50 bg-gold/10 text-gold/90'
              : cleared
                ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300/70'
                : 'border-black/50 bg-night-800 text-white/50'
        }`}
      >
        {gate && !current ? '🗝️ ' : ''}
        {label}
        <span className="ml-1 text-white/30">
          {depth}/{total}
        </span>
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
    </div>
  );
}

function NodeCard({
  node,
  selectable,
  cleared,
  onEnter,
  cardRef,
}: {
  node: MapNode;
  selectable: boolean;
  cleared: boolean;
  onEnter: () => void;
  cardRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={cardRef}
      onClick={selectable ? onEnter : undefined}
      disabled={!selectable}
      className={`relative w-[112px] rounded-t-lg border-2 border-b-4 px-1.5 pb-1.5 pt-2 text-left transition ${
        selectable
          ? 'animate-torch border-ember/70 bg-gradient-to-b from-night-600 to-night-800'
          : cleared
            ? 'border-emerald-900/60 border-b-emerald-950 bg-emerald-950/25 opacity-75'
            : 'border-black/60 border-b-black bg-night-900/70 opacity-45'
      }`}
    >
      {/* Arco della porta della stanza */}
      <span
        className={`pointer-events-none absolute inset-x-2 top-0 h-1 rounded-b ${
          selectable ? 'bg-ember/50' : cleared ? 'bg-emerald-700/40' : 'bg-white/10'
        }`}
      />
      <div className="flex items-center justify-between">
        <span className="text-base leading-none">{KIND_ICON[node.kind]}</span>
        {cleared ? (
          <span className="text-[10px] text-emerald-400">✓</span>
        ) : selectable ? (
          <span className="text-[9px] text-ember/90">◈</span>
        ) : null}
      </div>
      <div className="truncate text-[10px] font-bold">{node.preview.title}</div>
      {node.gymType && <TypeBadge type={node.gymType} small />}
      {node.encounter.length > 0 && (
        <>
          <div className="text-[9px] text-amber-300/80">{threatStars(node.preview.threat)} Lv{node.level}</div>
          <div className="mt-0.5 flex flex-wrap items-end gap-0.5">
            {node.encounter.slice(0, 4).map((e, i) => (
              <Sprite key={i} defId={e.defId} scale={1} />
            ))}
          </div>
        </>
      )}
      {node.kind === 'item' && (
        <div className="text-[9px] leading-tight text-white/50">{node.offers.length} oggetti</div>
      )}
      {node.kind === 'ball' && (
        <div className="mt-0.5 flex gap-0.5">
          {node.offers.map((id) => (
            <Sprite key={id} defId={id} scale={1} />
          ))}
        </div>
      )}
    </button>
  );
}

/** Pannello delle scelte generate dal nodo appena risolto. */
function PendingSheet() {
  const run = useGame((s) => s.profile.run)!;
  const resolveRecruit = useGame((s) => s.resolveRecruit);
  const resolveItemPick = useGame((s) => s.resolveItemPick);
  const resolveBall = useGame((s) => s.resolveBall);
  const resolveTutor = useGame((s) => s.resolveTutor);
  const resolveTrade = useGame((s) => s.resolveTrade);
  const dismiss = useGame((s) => s.dismissPending);

  const pending = run.pending!;
  const full = run.team.length >= BALANCE.maxRecruits;

  const title =
    pending.kind === 'recruit'
      ? 'Reclutare la creatura?'
      : pending.kind === 'item'
        ? 'Scegli un oggetto'
        : pending.kind === 'ball'
          ? 'Scegli chi reclutare'
          : pending.kind === 'tutor'
            ? 'Chi potenzia la mossa finale?'
            : 'Scambio: chi cedi?';

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/75">
      <div className="max-h-[85%] w-full overflow-y-auto border-t-2 border-gold/60 bg-night-800 p-3">
        <div className="mb-2 font-display text-sm text-gold">{title}</div>

        {pending.kind === 'recruit' && (
          <div className="space-y-2">
            <CreatureRow defId={pending.defId} level={pending.level} />
            {full && <div className="text-[11px] text-amber-200">Squadra piena: scegli chi sostituire.</div>}
            {full ? (
              <TeamPicker onPick={(uid) => resolveRecruit(true, uid)} />
            ) : (
              <button className="btn-primary w-full" onClick={() => resolveRecruit(true)}>
                Recluta
              </button>
            )}
            <button className="btn-ghost w-full" onClick={() => resolveRecruit(false)}>
              Lascia andare
            </button>
          </div>
        )}

        {pending.kind === 'item' && (
          <div className="space-y-2">
            {pending.offers.map((id) => {
              const it = ITEM_MAP[id]!;
              return (
                <button
                  key={id}
                  onClick={() => resolveItemPick(id)}
                  className="w-full border-2 border-black/40 bg-black/30 p-2 text-left"
                >
                  <div className="text-xs font-bold text-parchment">{it.name}</div>
                  {it.statMods && (
                    <div className="text-[10px] text-sky-200">
                      {it.statMods
                        .map(
                          (m) =>
                            `${m.stat} ${m.mode === 'add' ? (m.value > 0 ? '+' : '') + m.value : (m.value > 0 ? '+' : '') + Math.round(m.value * 100) + '%'}`,
                        )
                        .join(' · ')}
                    </div>
                  )}
                  {it.tradeoff && <div className="text-[10px] italic text-amber-200/80">{it.tradeoff}</div>}
                </button>
              );
            })}
          </div>
        )}

        {pending.kind === 'ball' && (
          <div className="space-y-2">
            {pending.offers.map((id) => (
              <div key={id} className="border-2 border-black/40 bg-black/30 p-2">
                <CreatureRow defId={id} level={pending.level} />
                {full ? (
                  <TeamPicker onPick={(uid) => resolveBall(id, uid)} label="sostituisci" />
                ) : (
                  <button className="btn-primary mt-1 w-full" onClick={() => resolveBall(id)}>
                    Recluta
                  </button>
                )}
              </div>
            ))}
            <button className="btn-ghost w-full" onClick={dismiss}>
              Rinuncia
            </button>
          </div>
        )}

        {pending.kind === 'tutor' && (
          <div className="space-y-2">
            <TeamPicker onPick={(uid) => resolveTutor(uid)} label="potenzia" showTier />
            <button className="btn-ghost w-full" onClick={dismiss}>
              Rinuncia
            </button>
          </div>
        )}

        {pending.kind === 'trade' && (
          <div className="space-y-2">
            <div className="text-[11px] text-white/60">In arrivo:</div>
            <CreatureRow defId={pending.defId} level={pending.level} />
            <div className="text-[11px] text-white/60">Chi cedi in cambio?</div>
            <TeamPicker onPick={(uid) => resolveTrade(uid)} label="cedi" />
            <button className="btn-ghost w-full" onClick={dismiss}>
              Rinuncia allo scambio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatureRow({ defId, level }: { defId: string; level: number }) {
  const def = CREATURE_MAP[defId];
  if (!def) return null;
  return (
    <div className="flex items-center gap-2">
      <Sprite defId={defId} role={def.role} scale={2} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-parchment">
          {def.name} <span className="text-white/40">Lv {level}</span>
        </div>
        <TypeRow types={def.types} small />
      </div>
    </div>
  );
}

function TeamPicker({
  onPick,
  label = 'scegli',
  showTier,
}: {
  onPick: (uid: string) => void;
  label?: string;
  showTier?: boolean;
}) {
  const team = useGame((s) => s.profile.run?.team ?? []);
  return (
    <div className="space-y-1">
      {team.map((mon) => {
        const def = CREATURE_MAP[mon.defId];
        return (
          <button
            key={mon.uid}
            onClick={() => onPick(mon.uid)}
            className="flex w-full items-center gap-2 border-2 border-black/40 bg-black/30 p-1.5 text-left"
          >
            <Sprite defId={mon.defId} role={def?.role} scale={1} />
            <span className="min-w-0 flex-1 truncate text-[11px] text-parchment">
              {def?.name ?? mon.defId} <span className="text-white/40">Lv {mon.level}</span>
              {showTier && <span className="text-gold"> · tier {mon.moveTier}</span>}
            </span>
            <span className="text-[9px] uppercase text-gold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
