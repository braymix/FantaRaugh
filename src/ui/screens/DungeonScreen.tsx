/** Schermata dungeon: grafo a nodi ramificato, con anteprima parziale dei nodi. */

import { useMemo } from 'react';
import type { DungeonNode, NodeType, RewardKind } from '@content/dungeon';
import { useGame } from '@state/store';
import { Sprite } from '../components/Sprite';
import { threatStars } from '../format';

const TYPE_ICON: Record<NodeType, string> = {
  fight: '⚔️',
  elite: '👹',
  boss: '🐉',
  event: '❓',
  reward: '📦',
  rest: '🏕️',
};

const REWARD_ICON: Record<RewardKind, string> = {
  xp: '✨',
  gold: '🪙',
  item: '💎',
  weapon: '⚔️',
  perk: '🔮',
};

export function DungeonScreen() {
  const dungeon = useGame((s) => s.dungeon);
  const run = useGame((s) => s.profile.run);
  const enterNode = useGame((s) => s.enterNode);
  const abandon = useGame((s) => s.abandonRun);

  const selectable = useMemo(() => {
    if (!dungeon || !run) return new Set<string>();
    if (run.currentNodeId === null) return new Set(dungeon.startIds);
    const cur = dungeon.nodes[run.currentNodeId];
    return new Set(cur?.next ?? []);
  }, [dungeon, run]);

  if (!dungeon || !run) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">Nessuna run attiva.</div>
    );
  }

  const cleared = new Set(run.clearedNodeIds);

  return (
    <div className="flex h-full flex-col bg-dither">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div>
          <div className="font-display text-lg">{dungeon.name}</div>
          <div className="text-[11px] text-white/40">seed {dungeon.seed}</div>
        </div>
        <button className="btn-ghost" onClick={abandon}>
          Abbandona
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {dungeon.layers.map((layer, li) => (
          <div key={li}>
            <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-white/30">
              {li === dungeon.layers.length - 1 ? 'Boss' : `Livello ${li + 1}`}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {layer.map((nid) => {
                const node = dungeon.nodes[nid]!;
                const isSelectable = selectable.has(nid);
                const isCleared = cleared.has(nid);
                const isCurrent = run.currentNodeId === nid;
                return (
                  <NodeCard
                    key={nid}
                    node={node}
                    selectable={isSelectable}
                    cleared={isCleared}
                    current={isCurrent}
                    onEnter={() => enterNode(nid)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  node,
  selectable,
  cleared,
  current,
  onEnter,
}: {
  node: DungeonNode;
  selectable: boolean;
  cleared: boolean;
  current: boolean;
  onEnter: () => void;
}) {
  const dimmed = !selectable && !cleared && !current;
  return (
    <button
      onClick={selectable ? onEnter : undefined}
      disabled={!selectable}
      className={`w-[104px] rounded-lg border p-2 text-left transition ${
        selectable
          ? 'border-gold/60 bg-night-600 shadow-[0_0_10px] shadow-gold/20 hover:scale-105'
          : cleared
            ? 'border-emerald-700/50 bg-emerald-950/30'
            : current
              ? 'border-white/40 bg-night-600'
              : 'border-white/5 bg-night-800'
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{TYPE_ICON[node.type]}</span>
        {cleared && <span className="text-emerald-400">✓</span>}
        {node.rewardKind && !cleared && <span title={node.rewardKind}>{REWARD_ICON[node.rewardKind]}</span>}
      </div>
      <div className="mt-0.5 truncate text-xs font-semibold">{node.preview.title}</div>
      {node.encounter.length > 0 && (
        <>
          <div className="text-[10px] text-amber-300/80">{threatStars(node.threat)}</div>
          <div className="mt-0.5 flex flex-wrap items-end gap-0.5">
            {node.encounter.slice(0, 5).map((e, i) => (
              <Sprite key={i} defId={e.enemyId} scale={1} />
            ))}
          </div>
        </>
      )}
    </button>
  );
}
