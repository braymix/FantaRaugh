/**
 * Hook di riproduzione del log di battaglia. Guida l'avanzamento evento-per-evento
 * con pausa e velocità x1/x2/x4, oltre a "salta" (applica tutto e mostra subito il
 * risultato). Non contiene logica di gioco: solo timing e presentazione.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BattleEvent } from '@engine/types';
import { applyEvent, initDisplay, type DisplayState } from './replay';

export type Speed = 1 | 2 | 4;
const BASE_STEP_MS = 360;

// Eventi che meritano una "pausa visiva"; gli altri si applicano d'un fiato.
const VISUAL = new Set<BattleEvent['t']>([
  'turnStart',
  'abilityUsed',
  'damage',
  'miss',
  'heal',
  'shield',
  'statusTick',
  'stealBuff',
  'cleanse',
  'death',
  'battleEnd',
]);

export interface ReplayApi {
  display: DisplayState;
  playing: boolean;
  speed: Speed;
  done: boolean;
  progress: number; // 0..1
  togglePlay: () => void;
  setSpeed: (s: Speed) => void;
  skip: () => void;
}

export function useReplay(events: BattleEvent[], threshold: number): ReplayApi {
  const stateRef = useRef<DisplayState>(initDisplay(threshold));
  const idxRef = useRef(-1);
  const [, force] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const rerender = useCallback(() => force((n) => n + 1), []);

  // Reset quando cambia la battaglia.
  useEffect(() => {
    stateRef.current = initDisplay(threshold);
    idxRef.current = -1;
    setPlaying(true);
    rerender();
  }, [events, threshold, rerender]);

  const advanceOneBeat = useCallback(() => {
    let appliedVisual = false;
    while (idxRef.current < events.length - 1 && !appliedVisual) {
      idxRef.current += 1;
      const ev = events[idxRef.current]!;
      applyEvent(stateRef.current, ev);
      if (VISUAL.has(ev.t)) appliedVisual = true;
    }
    if (idxRef.current >= events.length - 1) setPlaying(false);
    rerender();
  }, [events, rerender]);

  const skip = useCallback(() => {
    while (idxRef.current < events.length - 1) {
      idxRef.current += 1;
      applyEvent(stateRef.current, events[idxRef.current]!);
    }
    setPlaying(false);
    rerender();
  }, [events, rerender]);

  const togglePlay = useCallback(() => {
    if (stateRef.current.done) return;
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(advanceOneBeat, BASE_STEP_MS / speed);
    return () => clearInterval(id);
  }, [playing, speed, advanceOneBeat]);

  return {
    display: stateRef.current,
    playing,
    speed,
    done: stateRef.current.done,
    progress: events.length > 0 ? (idxRef.current + 1) / events.length : 1,
    togglePlay,
    setSpeed,
    skip,
  };
}
