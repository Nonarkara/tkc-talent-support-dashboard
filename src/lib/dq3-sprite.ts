/**
 * dq3-sprite.ts — DQ3-style 16×16 hero sprite renderer.
 *
 * Ported from the Claude Design prototype (sprite.js). Pixels are drawn
 * into a 16×16 grid; CSS / canvas scales to 64 / 256 px.
 *
 * Coordinate system: (0,0) top-left. y grows down.
 * Layout (typical):
 *   y 0-1  : hat top
 *   y 2    : hat brim / hair top
 *   y 3-5  : head / face
 *   y 6    : neck / collar
 *   y 7-11 : torso (armor / robe)
 *   y 12-14: legs / robe hem
 *   y 15   : feet / boots
 * Weapons in right hand column (x=11..14), shields/staves in left (x=1..4).
 */

// ─── NES-ish palette ────────────────────────────────────────────────────

export const C = {
  transparent: null as null,
  black: "#000000",
  outline: "#0c0c0c",
  white: "#fcfcfc",
  cream: "#fce0a8",
  skin: "#fcc890",
  skinDark: "#d89058",
  skinPale: "#fce8c4",
  skinTan: "#c08858",
  skinDeep: "#8b5a3c",

  hairBlack: "#1c1c1c",
  hairBrown: "#704020",
  hairBrn2: "#8c4818",
  hairBlond: "#fcd060",
  hairRed: "#c83030",
  hairWhite: "#e8e8e8",
  hairGrey: "#a0a0b0",
  hairGreen: "#3c8030",
  hairBlue: "#3060c8",
  hairPink: "#f098b8",

  steel: "#b8b8c8",
  steelD: "#686878",
  steelL: "#e0e0f0",
  iron: "#787888",
  iron2: "#484858",
  bronze: "#c8843c",
  bronzeD: "#7c4818",
  gold: "#fcd060",
  goldD: "#c08020",
  silver: "#c8c8d8",

  red: "#d83030",
  redD: "#8c1818",
  blue: "#3050d8",
  blueD: "#1c2c80",
  green: "#308c30",
  greenD: "#1c5818",
  purple: "#8838c0",
  purpleD: "#501880",
  orange: "#f08030",
  orangeD: "#a04018",
  yellow: "#f8c830",
  yellowD: "#a07c18",
  teal: "#30a8a8",
  tealD: "#185858",
  pink: "#f898c0",
  pinkD: "#a85878",
  brown: "#80501c",
  brownD: "#502c08",
  tan: "#d0a878",
  tanD: "#806030",
  cream2: "#fce8b8",
  creamD: "#a08838",

  midnight: "#181848",
  midnightL: "#3838a0",
  crimson: "#a01818",
  crimsonL: "#d83838",
  deepGrn: "#185020",
  deepGrnL: "#308050",
  royal: "#5028a0",
  royalL: "#8050d8",

  holy: "#fcecb8",
  holyD: "#c8a848",

  leather: "#8c5828",
  leatherD: "#503018",
  boot: "#3c2810",
  bootMid: "#604020",
  grey: "#888898",
  darkGrey: "#383848",
} as const;

export type Color = string | null;

// ─── Seeded RNG ─────────────────────────────────────────────────────────

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next: () => number;
  pick: <T>(arr: readonly T[]) => T;
  pickW: <T>(arr: readonly T[], weights: readonly number[]) => T;
  bool: (p?: number) => boolean;
  int: (a: number, b: number) => number;
}

export function makeRng(seed: number): Rng {
  const r = mulberry32(seed >>> 0);
  return {
    next: r,
    pick: <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    pickW: <T>(arr: readonly T[], weights: readonly number[]) => {
      const tot = weights.reduce((a, b) => a + b, 0);
      let v = r() * tot;
      for (let i = 0; i < arr.length; i++) {
        v -= weights[i];
        if (v < 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    bool: (p = 0.5) => r() < p,
    int: (a: number, b: number) => Math.floor(r() * (b - a + 1)) + a,
  };
}

// ─── 16×16 grid helpers ─────────────────────────────────────────────────

const W = 16;
const H = 16;

export type Grid = (Color)[];

export function newGrid(): Grid {
  return new Array(W * H).fill(null);
}

function set(g: Grid, x: number, y: number, c: Color) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  if (c === null || c === undefined) return;
  g[y * W + x] = c;
}

function rect(g: Grid, x: number, y: number, w: number, h: number, c: Color) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) set(g, xx, yy, c);
}

function pix(g: Grid, pts: [number, number][], c: Color) {
  for (const p of pts) set(g, p[0], p[1], c);
}

function outlineSilhouette(g: Grid) {
  const o = C.outline;
  const buf = g.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[y * W + x] !== null) continue;
      const n = [
        buf[(y - 1) * W + x],
        buf[(y + 1) * W + x],
        buf[y * W + (x - 1)],
        buf[y * W + (x + 1)],
      ];
      if (n.some((v) => v && v !== o)) set(g, x, y, o);
    }
  }
}

// ─── Body parts ─────────────────────────────────────────────────────────

interface HeadOpts {
  skin: string;
  mouth?: boolean;
}

function drawHead(g: Grid, opts: HeadOpts) {
  const skin = opts.skin;
  rect(g, 6, 2, 4, 1, skin);
  rect(g, 5, 3, 6, 3, skin);
  rect(g, 6, 6, 4, 1, skin);
  set(g, 6, 4, C.outline);
  set(g, 9, 4, C.outline);
  if (opts.mouth) set(g, 7, 5, "#a86038");
}

type HairStyle =
  | "short"
  | "long"
  | "bowl"
  | "bald"
  | "mohawk"
  | "spiky"
  | "ponytail"
  | "braid"
  | "wizardLong"
  | "topknot";

function drawHair(
  g: Grid,
  style: HairStyle,
  color: string,
  opts: { ribbon?: string },
) {
  if (style === "bald") return;
  switch (style) {
    case "short":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 5, 2, 1, 1, color);
      rect(g, 10, 2, 1, 1, color);
      set(g, 6, 2, color);
      set(g, 9, 2, color);
      break;
    case "bowl":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 4, 2, 8, 1, color);
      rect(g, 5, 3, 1, 1, color);
      rect(g, 10, 3, 1, 1, color);
      rect(g, 6, 2, 4, 1, color);
      break;
    case "long":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 4, 2, 8, 1, color);
      set(g, 4, 3, color);
      set(g, 11, 3, color);
      set(g, 4, 4, color);
      set(g, 11, 4, color);
      set(g, 4, 5, color);
      set(g, 11, 5, color);
      set(g, 4, 6, color);
      set(g, 11, 6, color);
      rect(g, 6, 2, 4, 1, color);
      break;
    case "spiky":
      pix(g, [[5, 1], [7, 1], [9, 1], [6, 0], [8, 0], [10, 0]], color);
      rect(g, 5, 2, 6, 1, color);
      set(g, 4, 2, color);
      set(g, 11, 2, color);
      break;
    case "mohawk":
      rect(g, 7, 0, 2, 2, color);
      rect(g, 7, 2, 2, 1, color);
      break;
    case "ponytail":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 5, 2, 1, 1, color);
      rect(g, 10, 2, 1, 1, color);
      set(g, 6, 2, color);
      set(g, 9, 2, color);
      rect(g, 11, 3, 1, 4, color);
      set(g, 12, 5, color);
      break;
    case "braid":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 4, 2, 8, 1, color);
      set(g, 4, 3, color);
      set(g, 11, 3, color);
      rect(g, 11, 4, 1, 5, color);
      set(g, 11, 9, opts.ribbon || C.red);
      rect(g, 6, 2, 4, 1, color);
      break;
    case "wizardLong":
      rect(g, 5, 1, 6, 1, color);
      rect(g, 4, 2, 8, 1, color);
      rect(g, 4, 3, 1, 5, color);
      rect(g, 11, 3, 1, 5, color);
      set(g, 3, 4, color);
      set(g, 12, 4, color);
      set(g, 3, 5, color);
      set(g, 12, 5, color);
      rect(g, 6, 2, 4, 1, color);
      break;
    case "topknot":
      rect(g, 7, 0, 2, 1, color);
      rect(g, 6, 1, 4, 1, color);
      rect(g, 5, 2, 6, 1, color);
      set(g, 4, 2, color);
      set(g, 11, 2, color);
      break;
  }
}

// ─── Hats / Helms ───────────────────────────────────────────────────────

export type HatStyle =
  | "none"
  | "hornedHelm"
  | "fullHelm"
  | "cap"
  | "banded"
  | "wizardHat"
  | "wizardHatBent"
  | "priestHood"
  | "mitre"
  | "circlet"
  | "turban"
  | "kungfuCap"
  | "bandana"
  | "feathered";

interface HatPalette {
  main: string;
  dark?: string;
  trim?: string;
  plume?: string;
  eye?: string;
  star?: string;
  gem?: string;
  cross?: string;
  feather?: string;
}

interface HatOpts {
  plume?: boolean;
  star?: boolean;
  gem?: boolean;
  cross?: boolean;
}

function drawHat(g: Grid, style: HatStyle, palette: HatPalette, opts: HatOpts) {
  const main = palette.main;
  const dark = palette.dark || C.outline;

  switch (style) {
    case "none":
      return;
    case "hornedHelm":
      rect(g, 5, 1, 6, 1, main);
      rect(g, 4, 2, 8, 1, main);
      rect(g, 4, 3, 1, 1, main);
      rect(g, 11, 3, 1, 1, main);
      rect(g, 5, 3, 6, 1, dark);
      set(g, 4, 4, main);
      set(g, 11, 4, main);
      set(g, 4, 5, main);
      set(g, 11, 5, main);
      pix(g, [[3, 1], [3, 2], [12, 1], [12, 2]], main);
      pix(g, [[2, 2], [13, 2]], dark);
      set(g, 7, 0, dark);
      set(g, 8, 0, dark);
      return;
    case "fullHelm":
      rect(g, 5, 1, 6, 1, main);
      rect(g, 4, 2, 8, 4, main);
      rect(g, 5, 6, 6, 1, main);
      rect(g, 5, 4, 6, 1, dark);
      set(g, 6, 4, palette.eye || C.steelL);
      set(g, 9, 4, palette.eye || C.steelL);
      if (opts.plume) {
        set(g, 7, 0, palette.plume || C.red);
        set(g, 8, 0, palette.plume || C.red);
      }
      return;
    case "cap":
      rect(g, 5, 1, 6, 1, main);
      rect(g, 4, 2, 8, 1, main);
      set(g, 4, 3, main);
      set(g, 11, 3, main);
      rect(g, 5, 2, 6, 1, main);
      return;
    case "banded":
      rect(g, 4, 2, 8, 1, main);
      set(g, 11, 3, main);
      set(g, 12, 3, main);
      return;
    case "wizardHat":
      set(g, 8, 0, main);
      rect(g, 7, 1, 3, 1, main);
      rect(g, 6, 2, 5, 1, main);
      rect(g, 4, 3, 8, 1, main);
      rect(g, 3, 4, 10, 1, main);
      rect(g, 4, 3, 8, 1, dark);
      if (opts.star) set(g, 8, 2, palette.star || C.gold);
      return;
    case "wizardHatBent":
      set(g, 9, 0, main);
      set(g, 8, 1, main);
      rect(g, 7, 2, 3, 1, main);
      rect(g, 6, 3, 5, 1, main);
      rect(g, 4, 4, 8, 1, main);
      rect(g, 6, 3, 5, 1, dark);
      return;
    case "priestHood":
      rect(g, 4, 1, 8, 1, main);
      rect(g, 3, 2, 10, 1, main);
      rect(g, 3, 3, 1, 4, main);
      rect(g, 12, 3, 1, 4, main);
      rect(g, 5, 3, 6, 1, dark);
      return;
    case "mitre":
      rect(g, 7, 0, 2, 1, main);
      rect(g, 6, 1, 4, 1, main);
      rect(g, 5, 2, 6, 1, main);
      rect(g, 5, 3, 6, 1, dark);
      if (opts.cross) set(g, 8, 1, palette.cross || C.gold);
      return;
    case "circlet":
      rect(g, 4, 2, 8, 1, main);
      set(g, 8, 2, palette.gem || C.red);
      return;
    case "turban":
      rect(g, 5, 1, 6, 1, main);
      rect(g, 4, 2, 8, 1, main);
      rect(g, 4, 3, 8, 1, main);
      set(g, 5, 2, dark);
      set(g, 9, 3, dark);
      if (opts.gem) set(g, 7, 2, palette.gem || C.red);
      return;
    case "kungfuCap":
      rect(g, 5, 1, 6, 1, main);
      rect(g, 4, 2, 8, 1, main);
      set(g, 7, 0, main);
      set(g, 8, 0, main);
      rect(g, 5, 3, 6, 1, dark);
      return;
    case "bandana":
      rect(g, 5, 2, 6, 1, main);
      rect(g, 4, 3, 8, 1, main);
      set(g, 11, 3, main);
      set(g, 12, 4, main);
      return;
    case "feathered":
      rect(g, 5, 2, 6, 1, main);
      rect(g, 4, 3, 8, 1, main);
      pix(g, [[4, 1], [3, 1], [2, 2]], palette.feather || C.red);
      return;
  }
}

// ─── Bodies ─────────────────────────────────────────────────────────────

export interface WarriorBodyPalette {
  main: string;
  dark: string;
  trim: string;
  highlight?: string;
  bodyKind: "plate" | "chain" | "tunic" | "leather";
  legs: string;
  belt: string;
  buckle: string;
  skin: string;
}

function drawWarriorBody(g: Grid, p: WarriorBodyPalette) {
  const { main, dark, trim, bodyKind } = p;
  rect(g, 4, 7, 8, 1, main);
  rect(g, 4, 8, 8, 4, main);
  rect(g, 4, 11, 8, 1, p.belt || C.brownD);
  set(g, 7, 11, p.buckle || C.gold);
  set(g, 8, 11, p.buckle || C.gold);
  rect(g, 5, 12, 2, 3, p.legs || dark);
  rect(g, 9, 12, 2, 3, p.legs || dark);
  rect(g, 5, 15, 2, 1, C.boot);
  rect(g, 9, 15, 2, 1, C.boot);
  rect(g, 3, 8, 1, 3, main);
  rect(g, 12, 8, 1, 3, main);
  rect(g, 3, 11, 1, 1, p.skin);
  rect(g, 12, 11, 1, 1, p.skin);

  if (bodyKind === "plate") {
    rect(g, 6, 8, 4, 1, p.highlight || C.steelL);
    set(g, 7, 9, dark);
    set(g, 8, 9, dark);
    set(g, 7, 10, dark);
    set(g, 8, 10, dark);
    set(g, 4, 7, dark);
    set(g, 11, 7, dark);
  } else if (bodyKind === "chain") {
    for (let yy = 8; yy <= 10; yy++)
      for (let xx = 5; xx <= 10; xx++)
        if ((xx + yy) % 2 === 0) set(g, xx, yy, dark);
  } else if (bodyKind === "tunic") {
    set(g, 7, 7, p.skin);
    set(g, 8, 7, p.skin);
    set(g, 7, 8, p.skin);
    rect(g, 4, 11, 8, 1, trim);
  } else if (bodyKind === "leather") {
    set(g, 6, 8, dark);
    set(g, 9, 8, dark);
    rect(g, 5, 10, 6, 1, dark);
  }
}

export interface RobedBodyPalette {
  main: string;
  dark: string;
  trim: string;
  sash?: string;
  emblem?: string;
  skin: string;
}

function drawRobedBody(g: Grid, p: RobedBodyPalette) {
  const { main, dark, trim } = p;
  rect(g, 5, 7, 6, 1, main);
  rect(g, 4, 8, 8, 1, main);
  rect(g, 4, 9, 8, 1, main);
  rect(g, 3, 10, 10, 1, main);
  rect(g, 3, 11, 10, 1, main);
  rect(g, 2, 12, 12, 1, main);
  rect(g, 2, 13, 12, 1, main);
  rect(g, 2, 14, 12, 1, main);
  rect(g, 2, 14, 12, 1, trim);
  rect(g, 2, 15, 12, 1, dark);
  rect(g, 3, 8, 1, 3, main);
  rect(g, 12, 8, 1, 3, main);
  set(g, 3, 10, trim);
  set(g, 12, 10, trim);
  set(g, 3, 11, p.skin);
  set(g, 12, 11, p.skin);
  if (p.sash) rect(g, 4, 10, 8, 1, p.sash);
  if (p.emblem) {
    set(g, 7, 8, p.emblem);
    set(g, 8, 8, p.emblem);
  }
}

export interface KungfuBodyPalette {
  main: string;
  dark: string;
  trim: string;
  sash: string;
  sashKnot: string;
  legs: string;
  bareFoot: boolean;
  skin: string;
}

function drawKungfuBody(g: Grid, p: KungfuBodyPalette) {
  const { main, dark } = p;
  rect(g, 4, 7, 8, 1, main);
  rect(g, 4, 8, 8, 3, main);
  set(g, 7, 8, p.skin);
  set(g, 8, 8, p.skin);
  set(g, 7, 9, p.skin);
  set(g, 8, 9, p.skin);
  rect(g, 3, 11, 10, 1, p.sash || C.red);
  rect(g, 3, 12, 10, 1, p.sash || C.red);
  set(g, 4, 12, p.sashKnot || C.redD);
  set(g, 5, 13, p.sashKnot || C.redD);
  rect(g, 5, 13, 2, 2, p.legs || dark);
  rect(g, 9, 13, 2, 2, p.legs || dark);
  if (p.bareFoot) {
    rect(g, 5, 15, 2, 1, p.skin);
    rect(g, 9, 15, 2, 1, p.skin);
  } else {
    rect(g, 5, 15, 2, 1, C.boot);
    rect(g, 9, 15, 2, 1, C.boot);
  }
  rect(g, 3, 8, 1, 2, main);
  rect(g, 12, 8, 1, 2, main);
  rect(g, 3, 10, 1, 2, p.skin);
  rect(g, 12, 10, 1, 2, p.skin);
}

// ─── Weapons ────────────────────────────────────────────────────────────

export interface SwordPalette {
  blade: string;
  bladeD: string;
  hilt: string;
  guard: string;
  pommel: string;
  wrap: string;
}

type SwordKind =
  | "longsword"
  | "shortsword"
  | "broadsword"
  | "rapier"
  | "flamberge"
  | "axe"
  | "mace"
  | "spear";

function drawSwordRight(g: Grid, kind: SwordKind, palette: SwordPalette) {
  const blade = palette.blade || C.steelL;
  const bladeD = palette.bladeD || C.steelD;
  const hilt = palette.hilt || C.brown;
  const guard = palette.guard || C.gold;
  const pommel = palette.pommel || C.gold;

  switch (kind) {
    case "longsword":
      rect(g, 13, 7, 1, 5, blade);
      set(g, 14, 8, bladeD);
      rect(g, 12, 12, 3, 1, guard);
      rect(g, 13, 13, 1, 2, hilt);
      set(g, 13, 15, pommel);
      break;
    case "shortsword":
      rect(g, 13, 9, 1, 3, blade);
      set(g, 14, 10, bladeD);
      rect(g, 12, 12, 3, 1, guard);
      set(g, 13, 13, hilt);
      set(g, 13, 14, pommel);
      break;
    case "broadsword":
      rect(g, 13, 6, 2, 6, blade);
      rect(g, 14, 7, 1, 4, bladeD);
      rect(g, 12, 12, 3, 1, guard);
      rect(g, 13, 13, 1, 2, hilt);
      set(g, 13, 15, pommel);
      break;
    case "rapier":
      rect(g, 13, 6, 1, 6, blade);
      set(g, 12, 12, guard);
      set(g, 13, 12, guard);
      set(g, 14, 12, guard);
      set(g, 12, 11, guard);
      set(g, 13, 13, hilt);
      set(g, 13, 14, pommel);
      break;
    case "flamberge":
      pix(g, [[13, 7], [14, 8], [13, 9], [14, 10], [13, 11]], blade);
      pix(g, [[14, 7], [13, 8], [14, 9], [13, 10], [14, 11]], bladeD);
      rect(g, 12, 12, 3, 1, guard);
      rect(g, 13, 13, 1, 2, hilt);
      set(g, 13, 15, pommel);
      break;
    case "axe":
      rect(g, 13, 7, 1, 8, hilt);
      rect(g, 11, 8, 2, 3, blade);
      rect(g, 11, 8, 1, 3, bladeD);
      set(g, 14, 9, blade);
      break;
    case "mace":
      rect(g, 13, 9, 1, 6, hilt);
      rect(g, 12, 7, 3, 2, blade);
      pix(g, [[12, 8], [14, 8], [12, 7], [14, 7]], bladeD);
      break;
    case "spear":
      rect(g, 13, 5, 1, 10, hilt);
      pix(g, [[13, 4], [12, 5], [14, 5]], blade);
      set(g, 13, 8, palette.wrap || C.red);
      break;
  }
}

function drawSwordLeft(g: Grid, kind: string, palette: SwordPalette) {
  const blade = palette.blade || C.steelL;
  const bladeD = palette.bladeD || C.steelD;
  const hilt = palette.hilt || C.brown;
  const guard = palette.guard || C.gold;
  const pommel = palette.pommel || C.gold;

  if (kind === "shortsword") {
    rect(g, 2, 9, 1, 3, blade);
    set(g, 1, 10, bladeD);
    rect(g, 1, 12, 3, 1, guard);
    set(g, 2, 13, hilt);
    set(g, 2, 14, pommel);
  } else if (kind === "dagger") {
    rect(g, 2, 10, 1, 2, blade);
    rect(g, 1, 12, 3, 1, guard);
    set(g, 2, 13, hilt);
  } else {
    rect(g, 2, 7, 1, 5, blade);
    set(g, 1, 8, bladeD);
    rect(g, 1, 12, 3, 1, guard);
    rect(g, 2, 13, 1, 2, hilt);
    set(g, 2, 15, pommel);
  }
}

export interface ShieldPalette {
  main: string;
  dark: string;
  trim: string;
  emblem: string;
}

function drawShield(
  g: Grid,
  kind: "kite" | "round" | "tower" | "buckler",
  palette: ShieldPalette,
) {
  const main = palette.main || C.bronze;
  const dark = palette.dark || C.bronzeD;
  const emblem = palette.emblem;

  switch (kind) {
    case "kite":
      rect(g, 1, 8, 3, 4, main);
      set(g, 1, 7, main);
      set(g, 3, 7, main);
      rect(g, 2, 12, 1, 1, main);
      set(g, 1, 8, dark);
      set(g, 1, 11, dark);
      set(g, 3, 8, dark);
      set(g, 3, 11, dark);
      if (emblem) set(g, 2, 9, emblem);
      break;
    case "round":
      rect(g, 1, 8, 3, 3, main);
      set(g, 2, 7, main);
      set(g, 2, 11, main);
      set(g, 1, 8, dark);
      set(g, 3, 8, dark);
      set(g, 1, 10, dark);
      set(g, 3, 10, dark);
      if (emblem) set(g, 2, 9, emblem);
      break;
    case "tower":
      rect(g, 1, 7, 3, 6, main);
      rect(g, 1, 9, 3, 1, palette.trim);
      if (emblem) set(g, 2, 10, emblem);
      break;
    case "buckler":
      rect(g, 2, 9, 2, 2, main);
      set(g, 2, 8, main);
      set(g, 2, 10, dark);
      if (emblem) set(g, 2, 9, emblem);
      break;
  }
}

export interface StaffPalette {
  wood: string;
  woodD: string;
  orb: string;
  orbL: string;
  bookCover: string;
  bookSpine: string;
}

function drawStaff(
  g: Grid,
  kind: "orbStaff" | "crystalStaff" | "crookStaff" | "gnarledStaff" | "bookOfSpells",
  palette: StaffPalette,
) {
  const wood = palette.wood || C.brown;
  const woodD = palette.woodD || C.brownD;
  const orb = palette.orb || C.blue;
  const orbL = palette.orbL || C.steelL;

  switch (kind) {
    case "orbStaff":
      rect(g, 2, 6, 1, 9, wood);
      set(g, 3, 8, woodD);
      set(g, 1, 11, woodD);
      pix(g, [[1, 5], [2, 4], [3, 5], [2, 5]], orb);
      set(g, 2, 5, orbL);
      break;
    case "crookStaff":
      rect(g, 2, 6, 1, 9, wood);
      pix(g, [[2, 5], [2, 4], [3, 4], [3, 5]], wood);
      break;
    case "crystalStaff":
      rect(g, 2, 7, 1, 8, wood);
      pix(g, [[2, 6], [2, 5], [1, 4], [3, 4], [2, 3]], orb);
      set(g, 2, 5, orbL);
      break;
    case "gnarledStaff":
      rect(g, 2, 5, 1, 10, wood);
      set(g, 3, 7, woodD);
      set(g, 1, 10, woodD);
      set(g, 3, 12, woodD);
      break;
    case "bookOfSpells":
      rect(g, 1, 9, 3, 3, palette.bookCover || C.crimson);
      rect(g, 2, 9, 1, 3, palette.bookSpine || C.gold);
      break;
  }
}

function drawHolyStaff(g: Grid, palette: { wood: string; gold: string }) {
  const wood = palette.wood || C.brown;
  const gold = palette.gold || C.gold;
  rect(g, 2, 6, 1, 9, wood);
  rect(g, 1, 5, 3, 1, gold);
  rect(g, 2, 4, 1, 2, gold);
}

// ─── Class assembly ─────────────────────────────────────────────────────

export interface HeroConfig {
  klass: DQ3Class;
  gender: "M" | "F";
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  hatStyle: HatStyle;
  hatPalette: HatPalette;
  hatOpts: HatOpts;
  body: WarriorBodyPalette | RobedBodyPalette | KungfuBodyPalette;
  weapon: {
    right?: SwordKind;
    left?: string | null;
    staff?: string;
    kind?: string;
    palette: SwordPalette | StaffPalette;
  };
  shield?: { kind: "kite" | "round" | "tower" | "buckler"; palette: ShieldPalette } | null;
  armorName: string;
  id?: number;
  name?: string;
  personality?: string;
  stats?: Record<string, number>;
}

export type DQ3Class =
  | "Warrior"
  | "Swordsman"
  | "Magician"
  | "Priest"
  | "Kungfu Master";

function assembleWarrior(g: Grid, hero: HeroConfig) {
  drawWarriorBody(g, hero.body as WarriorBodyPalette);
  drawHead(g, { skin: hero.skin, mouth: true });
  drawHair(g, hero.hairStyle, hero.hairColor, {});
  drawHat(g, hero.hatStyle, hero.hatPalette, hero.hatOpts);
  if (hero.shield) drawShield(g, hero.shield.kind, hero.shield.palette);
  if (hero.weapon.right)
    drawSwordRight(g, hero.weapon.right, hero.weapon.palette as SwordPalette);
  if (hero.weapon.left)
    drawSwordLeft(g, hero.weapon.left, hero.weapon.palette as SwordPalette);
}

function assembleSwordsman(g: Grid, hero: HeroConfig) {
  drawWarriorBody(g, hero.body as WarriorBodyPalette);
  drawHead(g, { skin: hero.skin, mouth: true });
  drawHair(g, hero.hairStyle, hero.hairColor, {});
  drawHat(g, hero.hatStyle, hero.hatPalette, hero.hatOpts);
  if (hero.weapon.right)
    drawSwordRight(g, hero.weapon.right, hero.weapon.palette as SwordPalette);
  if (hero.weapon.left)
    drawSwordLeft(g, hero.weapon.left, hero.weapon.palette as SwordPalette);
  if (hero.shield) drawShield(g, hero.shield.kind, hero.shield.palette);
}

function assembleMagician(g: Grid, hero: HeroConfig) {
  drawRobedBody(g, hero.body as RobedBodyPalette);
  drawHead(g, { skin: hero.skin, mouth: false });
  drawHair(g, hero.hairStyle, hero.hairColor, {});
  drawHat(g, hero.hatStyle, hero.hatPalette, hero.hatOpts);
  if (hero.weapon.staff)
    drawStaff(
      g,
      hero.weapon.staff as "orbStaff" | "crystalStaff" | "crookStaff" | "gnarledStaff" | "bookOfSpells",
      hero.weapon.palette as StaffPalette,
    );
}

function assemblePriest(g: Grid, hero: HeroConfig) {
  drawRobedBody(g, hero.body as RobedBodyPalette);
  drawHead(g, { skin: hero.skin, mouth: false });
  drawHair(g, hero.hairStyle, hero.hairColor, {});
  drawHat(g, hero.hatStyle, hero.hatPalette, hero.hatOpts);
  if (hero.weapon.staff === "cross")
    drawHolyStaff(g, hero.weapon.palette as unknown as { wood: string; gold: string });
  else if (hero.weapon.staff)
    drawStaff(
      g,
      hero.weapon.staff as "orbStaff" | "crystalStaff" | "crookStaff" | "gnarledStaff" | "bookOfSpells",
      hero.weapon.palette as StaffPalette,
    );
}

function assembleKungfu(g: Grid, hero: HeroConfig) {
  drawKungfuBody(g, hero.body as KungfuBodyPalette);
  drawHead(g, { skin: hero.skin, mouth: true });
  drawHair(g, hero.hairStyle, hero.hairColor, {});
  drawHat(g, hero.hatStyle, hero.hatPalette, hero.hatOpts);
  if (hero.weapon?.kind === "staff")
    drawStaff(g, "gnarledStaff", hero.weapon.palette as StaffPalette);
  else if (hero.weapon?.kind === "spear")
    drawSwordRight(g, "spear", hero.weapon.palette as SwordPalette);
}

// ─── Render to canvas ───────────────────────────────────────────────────

export function renderToGrid(hero: HeroConfig): Grid {
  const g = newGrid();
  switch (hero.klass) {
    case "Warrior":
      assembleWarrior(g, hero);
      break;
    case "Swordsman":
      assembleSwordsman(g, hero);
      break;
    case "Magician":
      assembleMagician(g, hero);
      break;
    case "Priest":
      assemblePriest(g, hero);
      break;
    case "Kungfu Master":
      assembleKungfu(g, hero);
      break;
  }
  outlineSilhouette(g);
  return g;
}

export function renderToCanvas(canvas: HTMLCanvasElement, hero: HeroConfig) {
  const g = renderToGrid(hero);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const c = g[i];
    if (c === null) {
      img.data[i * 4 + 3] = 0;
    } else {
      const r = parseInt(c.slice(1, 3), 16);
      const gg = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      img.data[i * 4 + 0] = r;
      img.data[i * 4 + 1] = gg;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
