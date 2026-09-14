/** Etichette, colori e icone per ruoli/rarità. Solo presentazione. */

import type { MonType, Rarity, Role } from '@engine/types';

/** Etichette e colori dei tipi elementali. */
export const TYPE_META: Record<MonType, { label: string; color: string; bg: string }> = {
  fuoco: { label: 'Fuoco', color: 'text-orange-200', bg: 'bg-orange-900/60 border-orange-600/60' },
  acqua: { label: 'Acqua', color: 'text-sky-200', bg: 'bg-sky-900/60 border-sky-600/60' },
  natura: { label: 'Natura', color: 'text-lime-200', bg: 'bg-lime-900/60 border-lime-600/60' },
  fulmine: { label: 'Fulmine', color: 'text-yellow-100', bg: 'bg-yellow-800/60 border-yellow-500/60' },
  ghiaccio: { label: 'Ghiaccio', color: 'text-cyan-100', bg: 'bg-cyan-900/60 border-cyan-500/60' },
  roccia: { label: 'Roccia', color: 'text-amber-100', bg: 'bg-amber-900/60 border-amber-700/60' },
  ombra: { label: 'Ombra', color: 'text-fuchsia-200', bg: 'bg-fuchsia-950/70 border-fuchsia-700/60' },
  luce: { label: 'Luce', color: 'text-yellow-50', bg: 'bg-amber-800/50 border-amber-300/50' },
  acciaio: { label: 'Acciaio', color: 'text-slate-100', bg: 'bg-slate-700/60 border-slate-400/60' },
  veleno: { label: 'Veleno', color: 'text-violet-200', bg: 'bg-violet-950/70 border-violet-600/60' },
};

export const ROLE_META: Record<Role, { label: string; icon: string; color: string }> = {
  healer: { label: 'Curatore', icon: '✚', color: 'text-emerald-300' },
  caster: { label: 'Caster', icon: '✦', color: 'text-violet-300' },
  defender: { label: 'Difensore', icon: '🛡', color: 'text-sky-300' },
  blade: { label: 'Combattente', icon: '⚔', color: 'text-orange-300' },
  thief: { label: 'Ladro', icon: '🗡', color: 'text-amber-300' },
  assassin: { label: 'Nascosto', icon: '🌑', color: 'text-fuchsia-300' },
};

export const RARITY_META: Record<Rarity, { label: string; color: string; ring: string }> = {
  common: { label: 'Comune', color: 'text-gray-300', ring: 'ring-gray-500/40' },
  rare: { label: 'Raro', color: 'text-sky-300', ring: 'ring-sky-400/50' },
  epic: { label: 'Epico', color: 'text-violet-300', ring: 'ring-violet-400/60' },
  legendary: { label: 'Leggendario', color: 'text-amber-300', ring: 'ring-amber-400/70' },
  mythic: { label: 'Mitico', color: 'text-rose-300', ring: 'ring-rose-400/80' },
};

export function threatStars(n: number): string {
  return '★'.repeat(Math.max(1, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));
}

/** Icona breve per uno stato (fallback: iniziale del nome). */
export const STATUS_ICON: Record<string, string> = {
  taunt: '🛡',
  stealth: '🌑',
  stun: '💫',
  poison: '☠',
  bleed: '🩸',
  burn: '🔥',
  regen: '💚',
  atk_up: '⬆',
  atk_down: '⬇',
  def_up: '🔰',
  def_down: '💔',
  fortify: '🏰',
  slow: '🐌',
  momentum: '💥',
  arcane_charge: '✦',
  ambush: '🎯',
};

export function statusIcon(id: string): string {
  return STATUS_ICON[id] ?? '•';
}
