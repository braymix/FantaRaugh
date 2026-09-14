/** Barre di presentazione: HP (con scudo), energia, gauge d'azione. */

interface HpBarProps {
  hp: number;
  maxHp: number;
  shield?: number;
}

export function HpBar({ hp, maxHp, shield = 0 }: HpBarProps) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const shieldPct = Math.max(0, Math.min(100 - pct, (shield / maxHp) * 100));
  const color = pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-600';
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
      <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
      {shieldPct > 0 && (
        <div
          className="absolute top-0 h-full bg-sky-300/80"
          style={{ left: `${pct}%`, width: `${shieldPct}%` }}
        />
      )}
    </div>
  );
}

export function EnergyBar({ energy, energyMax }: { energy: number; energyMax: number }) {
  const pct = Math.max(0, Math.min(100, (energy / energyMax) * 100));
  const full = energy >= energyMax;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
      <div
        className={`h-full transition-all duration-200 ${full ? 'bg-gold' : 'bg-violet-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function GaugeBar({ gauge, threshold, acting }: { gauge: number; threshold: number; acting?: boolean }) {
  const pct = Math.max(0, Math.min(100, (gauge / threshold) * 100));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-black/40">
      <div
        className={`h-full transition-all duration-150 ${acting ? 'bg-gold' : 'bg-white/40'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
