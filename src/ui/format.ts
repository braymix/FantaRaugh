/** Etichette, colori e icone per ruoli/rarità. Solo presentazione. */

import type { Rarity, Role } from '@engine/types';

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
