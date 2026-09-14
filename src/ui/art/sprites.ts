/**
 * Sprite pixel-art di eroi e nemici, generati proceduralmente da un descrittore.
 *
 * Ogni unità dichiara solo palette + archetipo + copricapo + arma: la silhouette
 * la disegnano gli archetipi. Così aggiungere un nemico costa 4 righe di dati e
 * lo stile resta coerente (stessa griglia, stesso contorno, stesse proporzioni).
 */

import {
  disc,
  groundShadow,
  hline,
  mirrorX,
  newGrid,
  outline,
  px,
  rect,
  toDataUrl,
  vline,
  type Grid,
} from './pixel';

const OUTLINE = '#0b0710';
const BONE = '#e8e2d0';
const BONE_DARK = '#a9a392';
const WOOD = '#7a5c3a';

interface Palette {
  main: string;
  mainDark: string;
  accent: string;
  accentDark: string;
  skin: string;
  skinDark: string;
  metal: string;
  metalDark: string;
  eye: string;
}

type Head = 'helm' | 'hood' | 'hat' | 'halo' | 'horns' | 'ears' | 'skull' | 'bare';
type Weapon = 'sword' | 'hammer' | 'staff' | 'dagger' | 'bow' | 'shield' | 'none';

interface HumanoidOpts {
  head: Head;
  weapon?: Weapon;
  cape?: boolean;
  robe?: boolean;
  bulk?: number;
}

function pal(o: Partial<Palette>): Palette {
  return {
    main: '#6c7a92',
    mainDark: '#414c61',
    accent: '#d4af37',
    accentDark: '#8a6f22',
    skin: '#e9b98c',
    skinDark: '#c08a5c',
    metal: '#c3cede',
    metalDark: '#7b89a1',
    eye: '#1b1024',
    ...o,
  };
}

// --- Archetipo: umanoide chibi (metà sinistra + specchiatura) ---------------

function humanoid(p: Palette, o: HumanoidOpts): Grid {
  const g = newGrid();
  const bulk = o.bulk ?? 0;
  const tx = 7 - bulk; // bordo sinistro del torso

  if (o.robe) {
    rect(g, tx, 16, 12 - tx, 3, p.main);
    rect(g, tx - 1, 19, 13 - tx, 2, p.mainDark);
    hline(g, tx, 11, 18, p.accent); // orlo
  } else {
    rect(g, 8, 17, 2, 4, p.mainDark);
    rect(g, 7, 20, 3, 2, p.accentDark);
  }

  // Torso, cintura, mantello
  rect(g, tx, 11, 12 - tx, 6, p.main);
  hline(g, tx, 11, 15, p.accentDark);
  if (o.cape) rect(g, tx - 1, 11, 1, 7, p.accentDark);

  // Braccio + mano
  rect(g, tx - 2, 12, 2, 4, p.main);
  rect(g, tx - 2, 16, 2, 2, p.skin);

  // Testa
  rect(g, 7, 5, 5, 6, p.skin);
  rect(g, 7, 10, 5, 1, p.skinDark);

  drawHead(g, p, o.head);
  rect(g, 9, 8, 2, 2, p.eye); // occhio (specchiato → due occhi)

  mirrorX(g);
  if (o.weapon && o.weapon !== 'none') drawWeapon(g, p, o.weapon);
  outline(g, OUTLINE);
  groundShadow(g, 22, 7);
  return g;
}

function drawHead(g: Grid, p: Palette, head: Head): void {
  switch (head) {
    case 'helm':
      rect(g, 6, 3, 6, 4, p.metal);
      rect(g, 6, 7, 2, 3, p.metalDark); // guanciale
      vline(g, 11, 1, 3, p.accent); // cresta
      break;
    case 'hood':
      rect(g, 6, 3, 6, 5, p.mainDark);
      rect(g, 6, 8, 1, 3, p.mainDark);
      rect(g, 7, 7, 5, 1, '#00000066'); // ombra sul volto
      break;
    case 'hat':
      hline(g, 4, 11, 6, p.mainDark); // falda
      hline(g, 5, 11, 5, p.main);
      rect(g, 8, 2, 4, 3, p.main);
      rect(g, 10, 0, 2, 2, p.mainDark);
      break;
    case 'halo':
      rect(g, 6, 3, 6, 4, p.main);
      hline(g, 6, 11, 6, p.accent); // bordo del velo
      hline(g, 8, 11, 1, p.accent); // aureola
      hline(g, 8, 11, 0, p.accentDark);
      break;
    case 'horns':
      rect(g, 6, 4, 6, 3, p.mainDark);
      rect(g, 5, 2, 2, 2, BONE);
      rect(g, 4, 0, 2, 2, BONE_DARK);
      break;
    case 'ears':
      px(g, 6, 6, p.skin);
      px(g, 5, 5, p.skin);
      px(g, 4, 4, p.skinDark);
      rect(g, 6, 4, 6, 2, p.mainDark); // bandana
      break;
    case 'skull':
      rect(g, 7, 5, 5, 6, BONE);
      rect(g, 7, 10, 5, 1, BONE_DARK);
      hline(g, 8, 11, 10, BONE_DARK); // denti
      break;
    case 'bare':
    default:
      break;
  }
}

function drawWeapon(g: Grid, p: Palette, w: Weapon): void {
  switch (w) {
    case 'sword':
      vline(g, 18, 2, 12, p.metal);
      vline(g, 19, 3, 12, p.metalDark);
      hline(g, 16, 20, 13, p.accentDark); // guardia
      vline(g, 18, 14, 16, WOOD);
      break;
    case 'hammer':
      vline(g, 18, 8, 18, WOOD);
      rect(g, 16, 4, 5, 4, p.metal);
      rect(g, 16, 7, 5, 1, p.metalDark);
      break;
    case 'staff':
      vline(g, 18, 4, 19, WOOD);
      disc(g, 18, 3, 2, p.accent);
      px(g, 18, 3, '#fff7d6');
      break;
    case 'dagger':
      vline(g, 18, 10, 14, p.metal);
      hline(g, 17, 19, 15, p.metalDark);
      break;
    case 'bow':
      for (const [x, y] of [
        [20, 7],
        [21, 8],
        [21, 9],
        [21, 12],
        [21, 13],
        [20, 14],
        [19, 6],
        [19, 15],
      ] as const) {
        px(g, x, y, WOOD);
      }
      vline(g, 19, 6, 15, '#d8cfae'); // corda
      break;
    case 'shield':
      disc(g, 5, 14, 3, p.metal);
      disc(g, 5, 14, 1, p.accent);
      break;
    default:
      break;
  }
}

// --- Archetipo: bestia quadrupede (vista laterale, senza specchiatura) ------

function beast(p: Palette): Grid {
  const g = newGrid();
  rect(g, 6, 12, 12, 5, p.main); // corpo
  rect(g, 6, 16, 12, 1, p.mainDark);
  rect(g, 2, 10, 6, 5, p.main); // testa
  rect(g, 0, 12, 3, 3, p.mainDark); // muso
  px(g, 4, 8, p.main); // orecchie
  px(g, 3, 9, p.main);
  px(g, 6, 8, p.main);
  px(g, 7, 9, p.main);
  rect(g, 4, 11, 2, 1, p.eye);
  hline(g, 0, 2, 14, BONE); // zanne
  for (const lx of [6, 9, 14, 17]) rect(g, lx, 17, 2, 4, p.mainDark);
  for (const lx of [6, 9, 14, 17]) rect(g, lx, 20, 2, 1, p.accentDark);
  rect(g, 17, 10, 5, 2, p.main); // coda
  rect(g, 20, 7, 2, 4, p.mainDark);
  outline(g, OUTLINE);
  groundShadow(g, 22, 10);
  return g;
}

// --- Archetipo: volante (ali spiegate) -------------------------------------

function flyer(p: Palette): Grid {
  const g = newGrid();
  rect(g, 9, 10, 3, 6, p.main); // corpo
  rect(g, 9, 7, 3, 3, p.mainDark); // testa
  px(g, 10, 8, p.eye);
  px(g, 9, 5, p.mainDark); // orecchie
  px(g, 9, 6, p.mainDark);
  // ala: gradini verso l'esterno
  for (let i = 0; i < 8; i++) {
    const x = 8 - i;
    const top = 8 + Math.floor(i / 2);
    const bot = 15 - Math.floor(i / 3);
    vline(g, x, top, bot, i % 2 === 0 ? p.main : p.mainDark);
  }
  hline(g, 1, 8, 16, p.accentDark); // bordo inferiore dell'ala
  mirrorX(g);
  outline(g, OUTLINE);
  groundShadow(g, 22, 5);
  return g;
}

// --- Archetipo: aracnide ---------------------------------------------------

function arachnid(p: Palette): Grid {
  const g = newGrid();
  disc(g, 11, 14, 5, p.main); // addome
  disc(g, 11, 12, 3, p.mainDark);
  rect(g, 9, 8, 3, 3, p.mainDark); // cefalotorace
  px(g, 9, 9, p.eye);
  px(g, 11, 9, p.accent); // occhi
  // zampe: tre coppie a gradini
  for (const [sy, len] of [
    [9, 6],
    [12, 7],
    [15, 6],
  ] as const) {
    for (let i = 0; i < len; i++) px(g, 6 - i, sy + Math.floor(i / 2), p.mainDark);
  }
  mirrorX(g);
  outline(g, OUTLINE);
  groundShadow(g, 21, 8);
  return g;
}

// --- Archetipo: non-morto fluttuante --------------------------------------

function undead(p: Palette): Grid {
  const g = newGrid();
  // Veste che sfuma verso il basso (fluttua: nessun piede)
  rect(g, 7, 12, 5, 5, p.main);
  rect(g, 8, 17, 4, 2, p.mainDark);
  rect(g, 9, 19, 3, 1, p.mainDark);
  rect(g, 5, 12, 2, 4, p.main); // braccio
  rect(g, 5, 16, 2, 2, BONE); // mano scheletrica
  rect(g, 6, 3, 6, 4, p.mainDark); // cappuccio
  rect(g, 7, 5, 5, 6, BONE); // cranio
  hline(g, 8, 11, 10, BONE_DARK);
  rect(g, 9, 8, 2, 2, p.eye); // occhi che brillano
  mirrorX(g);
  vline(g, 18, 4, 19, WOOD); // scettro
  disc(g, 18, 3, 2, p.accent);
  outline(g, OUTLINE);
  // Bagliore al posto dell'ombra: sta sospeso
  groundShadow(g, 22, 6, 'rgba(124,58,237,0.35)');
  return g;
}

// --- Descrittori per unità -------------------------------------------------

const BUILDERS: Record<string, () => Grid> = {
  // Eroi
  hero_thane: () =>
    humanoid(pal({ main: '#6c7a92', mainDark: '#414c61' }), { head: 'helm', weapon: 'shield', cape: true, bulk: 1 }),
  hero_kael: () =>
    humanoid(pal({ main: '#b8452f', mainDark: '#7d2a1c', accent: '#e8c15a' }), { head: 'helm', weapon: 'sword' }),
  hero_umbra: () =>
    humanoid(pal({ main: '#3b2a52', mainDark: '#241635', eye: '#e879f9', accentDark: '#1b1024' }), {
      head: 'hood',
      weapon: 'dagger',
      cape: true,
    }),
  hero_pyra: () =>
    humanoid(pal({ main: '#7c3aed', mainDark: '#4c1d95', accent: '#f59e0b' }), {
      head: 'hat',
      weapon: 'staff',
      robe: true,
    }),
  hero_seraphine: () =>
    humanoid(pal({ main: '#e8dcc0', mainDark: '#b8a888', accent: '#d4af37', accentDark: '#8a6f22' }), {
      head: 'halo',
      weapon: 'none',
      robe: true,
    }),
  hero_vesper: () =>
    humanoid(pal({ main: '#4a7c3f', mainDark: '#2f5128', accent: '#d4af37' }), { head: 'hood', weapon: 'bow' }),

  // Nemici
  enemy_goblin_grunt: () =>
    humanoid(pal({ main: '#7a5c3a', mainDark: '#54401f', skin: '#6b9b3f', skinDark: '#4a7029', eye: '#f2d14a' }), {
      head: 'ears',
      weapon: 'dagger',
    }),
  enemy_goblin_archer: () =>
    humanoid(pal({ main: '#6b5330', mainDark: '#463519', skin: '#78a84a', skinDark: '#527531', eye: '#f2d14a' }), {
      head: 'ears',
      weapon: 'bow',
    }),
  enemy_orc_brute: () =>
    humanoid(pal({ main: '#4d5a3a', mainDark: '#333d25', skin: '#5c8a3c', skinDark: '#3e6127', eye: '#ffdd57' }), {
      head: 'horns',
      weapon: 'hammer',
      bulk: 2,
    }),
  enemy_dire_wolf: () => beast(pal({ main: '#8a8f98', mainDark: '#5c626c', eye: '#ff6b6b', accentDark: '#3a3f47' })),
  enemy_cave_bat: () => flyer(pal({ main: '#6a5480', mainDark: '#41304f', eye: '#ffd166', accentDark: '#2a1f36' })),
  enemy_dark_acolyte: () =>
    humanoid(pal({ main: '#2f2540', mainDark: '#1d1629', eye: '#ff4d6d', accent: '#8b5cf6' }), {
      head: 'hood',
      weapon: 'staff',
      robe: true,
    }),
  enemy_venom_spider: () =>
    arachnid(pal({ main: '#4a6b3a', mainDark: '#2d4423', accent: '#a3e635', eye: '#a3e635' })),
  enemy_shadow_lich: () =>
    undead(pal({ main: '#2b1f3d', mainDark: '#1a1228', accent: '#22d3ee', eye: '#22d3ee' })),
};

/** Sprite di riserva per ruolo, se un'unità non ne dichiara uno proprio. */
const ROLE_FALLBACK: Record<string, () => Grid> = {
  healer: () => humanoid(pal({ main: '#e8dcc0', mainDark: '#b8a888' }), { head: 'halo', robe: true }),
  caster: () => humanoid(pal({ main: '#7c3aed', mainDark: '#4c1d95' }), { head: 'hat', weapon: 'staff', robe: true }),
  defender: () => humanoid(pal({}), { head: 'helm', weapon: 'shield', bulk: 1 }),
  blade: () => humanoid(pal({ main: '#b8452f', mainDark: '#7d2a1c' }), { head: 'helm', weapon: 'sword' }),
  thief: () => humanoid(pal({ main: '#4a7c3f', mainDark: '#2f5128' }), { head: 'hood', weapon: 'dagger' }),
  assassin: () => humanoid(pal({ main: '#3b2a52', mainDark: '#241635', eye: '#e879f9' }), { head: 'hood', weapon: 'dagger' }),
};

/** PNG data URL dello sprite di un'unità (memoizzato). */
export function spriteUrl(defId: string, role?: string): string {
  const builder = BUILDERS[defId] ?? (role ? ROLE_FALLBACK[role] : undefined);
  if (!builder) return '';
  return toDataUrl(`${defId}:${role ?? ''}`, builder);
}

export const SPRITE_IDS = Object.keys(BUILDERS);
