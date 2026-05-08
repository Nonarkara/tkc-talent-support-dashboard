/**
 * dq3-roster.ts — DQ3 hero config builder + personality system.
 *
 * Given an employee_id (stable seed) and archetype, produces a unique
 * HeroConfig for the sprite renderer. Also assigns a DQ3 personality
 * type from the canon 45-type table, weighted by class + gender.
 */

import {
  C,
  makeRng,
  type DQ3Class,
  type HatStyle,
  type HeroConfig,
  type Rng,
  type ShieldPalette,
  type StaffPalette,
  type SwordPalette,
} from "./dq3-sprite";
import type { Archetype } from "./token-economy";

// ─── Stable hash (same as sprite-16.ts) ─────────────────────────────────

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function seedFromId(id: string): number {
  return 0xa5f00d + stableHash(id) * 2654435761;
}

// ─── Archetype → DQ3 class mapping ──────────────────────────────────────

export function dq3ClassFor(archetype: Archetype): DQ3Class {
  switch (archetype) {
    case "captain":
    case "ops":
      return "Warrior";
    case "fighter":
    case "sales":
      return "Swordsman";
    case "tech":
      return "Magician";
    case "scout":
      return "Priest";
    case "goofoff":
      return "Kungfu Master";
  }
}

// ─── DQ3 personality system ─────────────────────────────────────────────

export const PERSONALITY_STATS: Record<
  string,
  { STR: number; AGL: number; VIT: number; INT: number; LUCK: number }
> = {
  Acrobat: { STR: 90, AGL: 120, VIT: 90, INT: 100, LUCK: 80 },
  Amazon: { STR: 130, AGL: 90, VIT: 100, INT: 80, LUCK: 80 },
  "Bat out of Hell": { STR: 100, AGL: 140, VIT: 100, INT: 100, LUCK: 100 },
  Clown: { STR: 100, AGL: 120, VIT: 95, INT: 115, LUCK: 110 },
  Contrarian: { STR: 70, AGL: 120, VIT: 70, INT: 110, LUCK: 130 },
  Crybaby: { STR: 90, AGL: 90, VIT: 100, INT: 110, LUCK: 115 },
  Daredevil: { STR: 95, AGL: 120, VIT: 115, INT: 100, LUCK: 100 },
  Daydreamer: { STR: 95, AGL: 110, VIT: 95, INT: 115, LUCK: 100 },
  Drudge: { STR: 105, AGL: 90, VIT: 110, INT: 100, LUCK: 80 },
  Egghead: { STR: 80, AGL: 105, VIT: 90, INT: 125, LUCK: 80 },
  Everyman: { STR: 100, AGL: 100, VIT: 100, INT: 100, LUCK: 100 },
  "Free spirit": { STR: 100, AGL: 75, VIT: 110, INT: 105, LUCK: 105 },
  Genius: { STR: 100, AGL: 120, VIT: 80, INT: 140, LUCK: 90 },
  "Good egg": { STR: 105, AGL: 95, VIT: 105, INT: 110, LUCK: 95 },
  Gourmand: { STR: 110, AGL: 60, VIT: 110, INT: 50, LUCK: 80 },
  "Happy camper": { STR: 90, AGL: 100, VIT: 90, INT: 100, LUCK: 130 },
  Idealist: { STR: 115, AGL: 100, VIT: 110, INT: 90, LUCK: 60 },
  Ironclad: { STR: 105, AGL: 80, VIT: 130, INT: 90, LUCK: 80 },
  Klutz: { STR: 80, AGL: 115, VIT: 100, INT: 70, LUCK: 70 },
  Lazybones: { STR: 115, AGL: 60, VIT: 120, INT: 65, LUCK: 110 },
  "Lone wolf": { STR: 100, AGL: 110, VIT: 120, INT: 110, LUCK: 70 },
  Lothario: { STR: 105, AGL: 95, VIT: 120, INT: 105, LUCK: 90 },
  Lout: { STR: 100, AGL: 90, VIT: 90, INT: 70, LUCK: 110 },
  "Lucky devil": { STR: 100, AGL: 110, VIT: 100, INT: 100, LUCK: 150 },
  Meathead: { STR: 130, AGL: 80, VIT: 100, INT: 70, LUCK: 80 },
  Meddler: { STR: 105, AGL: 85, VIT: 110, INT: 80, LUCK: 70 },
  Mule: { STR: 100, AGL: 60, VIT: 120, INT: 60, LUCK: 70 },
  Narcissist: { STR: 95, AGL: 105, VIT: 90, INT: 90, LUCK: 90 },
  Paragon: { STR: 140, AGL: 70, VIT: 100, INT: 80, LUCK: 70 },
  Plugger: { STR: 110, AGL: 85, VIT: 120, INT: 90, LUCK: 70 },
  Princess: { STR: 100, AGL: 80, VIT: 95, INT: 110, LUCK: 140 },
  Scatterbrain: { STR: 85, AGL: 115, VIT: 80, INT: 80, LUCK: 90 },
  "Show-off": { STR: 105, AGL: 110, VIT: 95, INT: 105, LUCK: 95 },
  "Shrinking violet": { STR: 110, AGL: 60, VIT: 120, INT: 110, LUCK: 90 },
  "Slippery devil": { STR: 90, AGL: 110, VIT: 90, INT: 120, LUCK: 100 },
  Socialite: { STR: 100, AGL: 90, VIT: 80, INT: 110, LUCK: 110 },
  "Sore loser": { STR: 95, AGL: 105, VIT: 105, INT: 95, LUCK: 95 },
  "Spoilt brat": { STR: 95, AGL: 100, VIT: 90, INT: 105, LUCK: 100 },
  "Straight arrow": { STR: 100, AGL: 90, VIT: 100, INT: 110, LUCK: 90 },
  Thug: { STR: 120, AGL: 90, VIT: 90, INT: 60, LUCK: 70 },
  Tomboy: { STR: 110, AGL: 110, VIT: 80, INT: 90, LUCK: 90 },
  "Tough cookie": { STR: 115, AGL: 90, VIT: 140, INT: 80, LUCK: 70 },
  Vamp: { STR: 110, AGL: 120, VIT: 105, INT: 115, LUCK: 120 },
  Wimp: { STR: 90, AGL: 70, VIT: 90, INT: 120, LUCK: 120 },
  Wit: { STR: 95, AGL: 100, VIT: 100, INT: 130, LUCK: 90 },
};

const PERSONALITIES: Record<string, [string, number][]> = {
  "Warrior|M": [
    ["Paragon", 8], ["Meathead", 7], ["Idealist", 6], ["Thug", 5], ["Tough cookie", 6],
    ["Ironclad", 4], ["Sore loser", 5], ["Daredevil", 5], ["Plugger", 5], ["Drudge", 4],
    ["Mule", 3], ["Lothario", 3], ["Lone wolf", 4], ["Lout", 3], ["Free spirit", 2],
    ["Straight arrow", 3], ["Everyman", 5], ["Klutz", 2], ["Gourmand", 2],
  ],
  "Warrior|F": [
    ["Paragon", 6], ["Amazon", 8], ["Tomboy", 8], ["Meathead", 5], ["Idealist", 5],
    ["Thug", 3], ["Tough cookie", 6], ["Ironclad", 4], ["Daredevil", 5], ["Plugger", 5],
    ["Drudge", 4], ["Mule", 3], ["Sore loser", 5], ["Free spirit", 2], ["Straight arrow", 3],
    ["Everyman", 5], ["Princess", 3], ["Gourmand", 2],
  ],
  "Swordsman|M": [
    ["Acrobat", 7], ["Bat out of Hell", 6], ["Daredevil", 7], ["Lone wolf", 6],
    ["Slippery devil", 5], ["Scatterbrain", 5], ["Show-off", 5], ["Sore loser", 5],
    ["Narcissist", 4], ["Paragon", 4], ["Idealist", 4], ["Meathead", 3], ["Thug", 3],
    ["Lothario", 3], ["Tough cookie", 3], ["Free spirit", 2], ["Everyman", 4], ["Klutz", 3],
  ],
  "Swordsman|F": [
    ["Acrobat", 7], ["Bat out of Hell", 6], ["Daredevil", 7], ["Lone wolf", 5],
    ["Tomboy", 7], ["Amazon", 5], ["Slippery devil", 5], ["Scatterbrain", 5],
    ["Show-off", 4], ["Sore loser", 5], ["Narcissist", 4], ["Vamp", 3], ["Princess", 3],
    ["Idealist", 3], ["Tough cookie", 3], ["Free spirit", 2], ["Everyman", 4], ["Klutz", 3],
  ],
  "Magician|M": [
    ["Genius", 8], ["Wit", 7], ["Egghead", 6], ["Daydreamer", 6], ["Slippery devil", 6],
    ["Contrarian", 4], ["Wimp", 5], ["Crybaby", 4], ["Spoilt brat", 4], ["Lone wolf", 3],
    ["Everyman", 4], ["Lucky devil", 3], ["Show-off", 3], ["Klutz", 2], ["Scatterbrain", 3],
  ],
  "Magician|F": [
    ["Genius", 7], ["Wit", 6], ["Vamp", 7], ["Egghead", 5], ["Daydreamer", 6],
    ["Slippery devil", 5], ["Princess", 5], ["Wimp", 4], ["Crybaby", 3], ["Spoilt brat", 3],
    ["Everyman", 4], ["Show-off", 3], ["Klutz", 2], ["Scatterbrain", 3],
  ],
  "Priest|M": [
    ["Good egg", 8], ["Wit", 5], ["Daydreamer", 5], ["Straight arrow", 6], ["Plugger", 5],
    ["Drudge", 4], ["Meddler", 4], ["Happy camper", 6], ["Lucky devil", 4], ["Crybaby", 3],
    ["Egghead", 3], ["Everyman", 5], ["Shrinking violet", 3], ["Sore loser", 3],
  ],
  "Priest|F": [
    ["Princess", 8], ["Good egg", 7], ["Vamp", 5], ["Daydreamer", 5], ["Wit", 4],
    ["Happy camper", 6], ["Straight arrow", 5], ["Plugger", 4], ["Crybaby", 3],
    ["Everyman", 5], ["Shrinking violet", 3], ["Meddler", 3], ["Sore loser", 3],
  ],
  "Kungfu Master|M": [
    ["Bat out of Hell", 7], ["Acrobat", 6], ["Lone wolf", 7], ["Daredevil", 6],
    ["Lucky devil", 5], ["Tough cookie", 5], ["Paragon", 5], ["Meathead", 5],
    ["Idealist", 4], ["Lothario", 3], ["Scatterbrain", 4], ["Crybaby", 2], ["Free spirit", 3],
    ["Everyman", 4], ["Sore loser", 3], ["Thug", 3],
  ],
  "Kungfu Master|F": [
    ["Bat out of Hell", 7], ["Acrobat", 6], ["Lone wolf", 6], ["Daredevil", 6],
    ["Tomboy", 7], ["Amazon", 5], ["Tough cookie", 5], ["Paragon", 4], ["Idealist", 4],
    ["Scatterbrain", 4], ["Happy camper", 4], ["Free spirit", 3], ["Everyman", 4],
    ["Sore loser", 3], ["Vamp", 3],
  ],
};

const PERSONALITY_FLAVOR: Record<string, {
  circletPref?: boolean;
  hairPref?: string;
  hatNonePref?: boolean;
  bandanaPref?: boolean;
  plumePref?: boolean;
  helmPref?: string;
  mohawkPref?: boolean;
  wizardStarPref?: boolean;
}> = {
  Princess: { circletPref: true, hairPref: "long" },
  Vamp: { hatNonePref: true, hairPref: "long" },
  Tomboy: { bandanaPref: true, hairPref: "short" },
  Amazon: { circletPref: true, hairPref: "ponytail" },
  Paragon: { plumePref: true, helmPref: "fullHelm" },
  Meathead: { mohawkPref: true, hatNonePref: true },
  "Bat out of Hell": { bandanaPref: true },
  Genius: { wizardStarPref: true },
  Egghead: { wizardStarPref: true },
  Daydreamer: { hairPref: "long" },
  Lothario: { hairPref: "spiky" },
  Wimp: { hairPref: "bowl" },
  Crybaby: { hairPref: "bowl" },
  "Lone wolf": { hatNonePref: true, hairPref: "spiky" },
  Thug: { mohawkPref: true },
  Clown: { mohawkPref: true },
};

function pickPersonality(rng: Rng, klass: DQ3Class, gender: "M" | "F"): string {
  const pool = PERSONALITIES[`${klass}|${gender}`];
  if (!pool) return "Everyman";
  const names = pool.map((p) => p[0]);
  const weights = pool.map((p) => p[1]);
  return rng.pickW(names, weights);
}

// ─── Shared option pools ────────────────────────────────────────────────

const SKINS = [C.skinPale, C.skin, C.skinDark, C.skinTan, C.skinDeep];
const HAIR_COLORS = [
  C.hairBlack, C.hairBrown, C.hairBrn2, C.hairBlond, C.hairRed,
  C.hairWhite, C.hairGrey, C.hairGreen, C.hairBlue, C.hairPink,
];
const FEMME_HAIR = ["long", "ponytail", "braid", "bowl", "short"] as const;
const MASC_HAIR = ["short", "spiky", "bowl", "mohawk", "topknot", "bald"] as const;
const SAGE_HAIR = ["wizardLong", "long", "bald", "short"] as const;

// ─── Palette pools ──────────────────────────────────────────────────────

const ARMOR_PALS = [
  { name: "Crimson Plate", main: C.red, dark: C.redD, trim: C.gold, highlight: C.crimsonL, bodyKind: "plate" as const, legs: C.steelD, belt: C.brownD, buckle: C.gold },
  { name: "Sapphire Knight", main: C.blue, dark: C.blueD, trim: C.silver, highlight: C.steelL, bodyKind: "plate" as const, legs: C.iron2, belt: C.brownD, buckle: C.silver },
  { name: "Iron Plate", main: C.steel, dark: C.iron2, trim: C.gold, highlight: C.steelL, bodyKind: "plate" as const, legs: C.iron2, belt: C.brownD, buckle: C.gold },
  { name: "Dragon Mail", main: C.green, dark: C.greenD, trim: C.gold, highlight: C.deepGrnL, bodyKind: "plate" as const, legs: C.deepGrn, belt: C.brownD, buckle: C.gold },
  { name: "Golden Plate", main: C.gold, dark: C.goldD, trim: C.crimson, highlight: C.cream, bodyKind: "plate" as const, legs: C.bronzeD, belt: C.brownD, buckle: C.crimson },
  { name: "Obsidian Plate", main: C.darkGrey, dark: C.midnight, trim: C.purpleD, highlight: C.iron, bodyKind: "plate" as const, legs: C.midnight, belt: C.brownD, buckle: C.purple },
  { name: "Bronze Mail", main: C.bronze, dark: C.bronzeD, trim: C.gold, highlight: C.cream2, bodyKind: "chain" as const, legs: C.bronzeD, belt: C.brownD, buckle: C.gold },
  { name: "Silver Mail", main: C.silver, dark: C.iron2, trim: C.steelL, highlight: C.steelL, bodyKind: "chain" as const, legs: C.iron2, belt: C.brownD, buckle: C.steelL },
  { name: "Forest Tunic", main: C.green, dark: C.greenD, trim: C.cream, bodyKind: "tunic" as const, legs: C.brownD, belt: C.brownD, buckle: C.bronze },
  { name: "Purple Tunic", main: C.purple, dark: C.purpleD, trim: C.gold, bodyKind: "tunic" as const, legs: C.midnight, belt: C.brownD, buckle: C.gold },
  { name: "Ocean Tunic", main: C.teal, dark: C.tealD, trim: C.cream, bodyKind: "tunic" as const, legs: C.blueD, belt: C.brownD, buckle: C.silver },
  { name: "Solar Tunic", main: C.yellow, dark: C.yellowD, trim: C.crimson, bodyKind: "tunic" as const, legs: C.brownD, belt: C.brownD, buckle: C.crimson },
  { name: "Brown Leather", main: C.leather, dark: C.leatherD, trim: C.bronze, bodyKind: "leather" as const, legs: C.brownD, belt: C.brownD, buckle: C.bronze },
  { name: "Pink Plate", main: C.pink, dark: C.pinkD, trim: C.silver, highlight: C.cream, bodyKind: "plate" as const, legs: C.pinkD, belt: C.brownD, buckle: C.silver },
  { name: "Orange Mail", main: C.orange, dark: C.orangeD, trim: C.gold, highlight: C.cream, bodyKind: "chain" as const, legs: C.brownD, belt: C.brownD, buckle: C.gold },
];

const ROBE_PALS = [
  { name: "Midnight Robe", main: C.midnight, dark: C.black, trim: C.gold, sash: C.purple, emblem: C.gold },
  { name: "Crimson Robe", main: C.crimson, dark: C.redD, trim: C.gold, sash: C.gold, emblem: C.gold },
  { name: "Royal Robe", main: C.royal, dark: C.purpleD, trim: C.gold, sash: C.midnightL, emblem: C.silver },
  { name: "Forest Robe", main: C.deepGrn, dark: C.greenD, trim: C.cream, sash: C.brown, emblem: C.gold },
  { name: "Ocean Robe", main: C.teal, dark: C.tealD, trim: C.silver, sash: C.blueD, emblem: C.steelL },
  { name: "White Robe", main: C.white, dark: C.grey, trim: C.gold, sash: C.crimson, emblem: C.gold },
  { name: "Holy Robe", main: C.cream, dark: C.creamD, trim: C.gold, sash: C.crimson, emblem: C.crimson },
  { name: "Grey Robe", main: C.grey, dark: C.darkGrey, trim: C.steelL, sash: C.midnight, emblem: C.steelL },
  { name: "Black Robe", main: C.darkGrey, dark: C.black, trim: C.crimson, sash: C.crimson, emblem: C.crimson },
  { name: "Sky Robe", main: C.blue, dark: C.blueD, trim: C.cream, sash: C.cream, emblem: C.gold },
  { name: "Rose Robe", main: C.pink, dark: C.pinkD, trim: C.cream, sash: C.cream, emblem: C.gold },
  { name: "Ember Robe", main: C.orange, dark: C.orangeD, trim: C.gold, sash: C.crimson, emblem: C.gold },
];

const KUNGFU_PALS = [
  { name: "Saffron Gi", main: C.yellow, dark: C.yellowD, trim: C.crimson, sash: C.red, sashKnot: C.redD, legs: C.brownD, bareFoot: true },
  { name: "White Gi", main: C.white, dark: C.grey, trim: C.black, sash: C.black, sashKnot: C.darkGrey, legs: C.darkGrey, bareFoot: false },
  { name: "Black Gi", main: C.darkGrey, dark: C.black, trim: C.gold, sash: C.crimson, sashKnot: C.redD, legs: C.black, bareFoot: true },
  { name: "Crimson Gi", main: C.red, dark: C.redD, trim: C.gold, sash: C.gold, sashKnot: C.goldD, legs: C.crimson, bareFoot: false },
  { name: "Jade Gi", main: C.green, dark: C.greenD, trim: C.gold, sash: C.cream, sashKnot: C.creamD, legs: C.greenD, bareFoot: true },
  { name: "Indigo Gi", main: C.blue, dark: C.blueD, trim: C.gold, sash: C.gold, sashKnot: C.goldD, legs: C.blueD, bareFoot: true },
  { name: "Plum Gi", main: C.purple, dark: C.purpleD, trim: C.gold, sash: C.gold, sashKnot: C.goldD, legs: C.purpleD, bareFoot: true },
  { name: "Sky Gi", main: C.teal, dark: C.tealD, trim: C.cream, sash: C.cream, sashKnot: C.creamD, legs: C.tealD, bareFoot: true },
  { name: "Sand Gi", main: C.tan, dark: C.tanD, trim: C.brown, sash: C.brown, sashKnot: C.brownD, legs: C.brown, bareFoot: true },
];

// ─── Palette generators ─────────────────────────────────────────────────

function helmPal(rng: Rng) {
  return rng.pick([
    { main: C.steel, dark: C.iron2, trim: C.gold, plume: C.red, eye: C.steelL },
    { main: C.bronze, dark: C.bronzeD, trim: C.gold, plume: C.crimson, eye: C.cream },
    { main: C.silver, dark: C.iron2, trim: C.steelL, plume: C.blue, eye: C.steelL },
    { main: C.gold, dark: C.goldD, trim: C.crimson, plume: C.crimson, eye: C.cream },
    { main: C.iron, dark: C.iron2, trim: C.silver, plume: C.green, eye: C.steelL },
    { main: C.darkGrey, dark: C.midnight, trim: C.purple, plume: C.purple, eye: C.purple },
  ]);
}

function wizHatPal(rng: Rng) {
  return rng.pick([
    { main: C.midnight, dark: C.black, star: C.gold, gem: C.gold },
    { main: C.royal, dark: C.purpleD, star: C.gold, gem: C.gold },
    { main: C.crimson, dark: C.redD, star: C.gold, gem: C.cream },
    { main: C.deepGrn, dark: C.greenD, star: C.gold, gem: C.gold },
    { main: C.darkGrey, dark: C.black, star: C.steelL, gem: C.steelL },
    { main: C.blue, dark: C.blueD, star: C.gold, gem: C.gold },
    { main: C.teal, dark: C.tealD, star: C.cream, gem: C.cream },
    { main: C.orange, dark: C.orangeD, star: C.gold, gem: C.gold },
  ]);
}

function priestHatPal(rng: Rng) {
  return rng.pick([
    { main: C.white, dark: C.grey, trim: C.gold, cross: C.gold },
    { main: C.cream, dark: C.creamD, trim: C.crimson, cross: C.crimson },
    { main: C.holy, dark: C.holyD, trim: C.gold, cross: C.gold },
    { main: C.purple, dark: C.purpleD, trim: C.gold, cross: C.gold },
    { main: C.darkGrey, dark: C.black, trim: C.silver, cross: C.steelL },
  ]);
}

function bandanaPal(rng: Rng) {
  return rng.pick([
    { main: C.red, dark: C.redD },
    { main: C.white, dark: C.grey },
    { main: C.black, dark: C.darkGrey },
    { main: C.blue, dark: C.blueD },
    { main: C.yellow, dark: C.yellowD },
    { main: C.green, dark: C.greenD },
    { main: C.purple, dark: C.purpleD },
  ]);
}

function turbanPal(rng: Rng) {
  return rng.pick([
    { main: C.white, dark: C.grey, gem: C.red },
    { main: C.purple, dark: C.purpleD, gem: C.gold },
    { main: C.crimson, dark: C.redD, gem: C.gold },
    { main: C.teal, dark: C.tealD, gem: C.cream },
    { main: C.gold, dark: C.goldD, gem: C.crimson },
  ]);
}

function circletPal(rng: Rng) {
  return rng.pick([
    { main: C.gold, gem: C.red },
    { main: C.silver, gem: C.blue },
    { main: C.bronze, gem: C.green },
    { main: C.gold, gem: C.purple },
  ]);
}

function swordPal(rng: Rng): SwordPalette {
  return rng.pick([
    { blade: C.steelL, bladeD: C.steelD, hilt: C.brown, guard: C.gold, pommel: C.gold, wrap: C.red },
    { blade: C.steelL, bladeD: C.steelD, hilt: C.leather, guard: C.silver, pommel: C.silver, wrap: C.blue },
    { blade: C.silver, bladeD: C.iron2, hilt: C.brown, guard: C.bronze, pommel: C.bronze, wrap: C.green },
    { blade: C.gold, bladeD: C.goldD, hilt: C.crimson, guard: C.silver, pommel: C.silver, wrap: C.crimson },
    { blade: C.cream, bladeD: C.creamD, hilt: C.purple, guard: C.gold, pommel: C.gold, wrap: C.gold },
    { blade: C.steelL, bladeD: C.steelD, hilt: C.black, guard: C.crimson, pommel: C.crimson, wrap: C.crimson },
  ]);
}

function shieldPal(rng: Rng): ShieldPalette {
  return rng.pick([
    { main: C.bronze, dark: C.bronzeD, trim: C.gold, emblem: C.crimson },
    { main: C.steel, dark: C.iron2, trim: C.silver, emblem: C.blue },
    { main: C.red, dark: C.redD, trim: C.gold, emblem: C.gold },
    { main: C.blue, dark: C.blueD, trim: C.silver, emblem: C.gold },
    { main: C.gold, dark: C.goldD, trim: C.crimson, emblem: C.crimson },
    { main: C.green, dark: C.greenD, trim: C.gold, emblem: C.cream },
  ]);
}

function staffPal(rng: Rng): StaffPalette {
  const orbs = [C.blue, C.red, C.green, C.purple, C.gold, C.cream, C.teal, C.pink, C.orange];
  const woods = [C.brown, C.brownD, C.leather, C.darkGrey];
  return {
    wood: rng.pick(woods),
    woodD: C.brownD,
    orb: rng.pick(orbs),
    orbL: C.steelL,
    bookCover: rng.pick([C.crimson, C.midnight, C.deepGrn, C.purple, C.darkGrey]),
    bookSpine: C.gold,
  };
}

// ─── Per-class hero builders ────────────────────────────────────────────

function buildWarrior(rng: Rng, forceGender?: "M" | "F"): HeroConfig {
  const gender = forceGender ?? (rng.bool(0.55) ? "M" as const : "F" as const);
  const armor = rng.pick(ARMOR_PALS);
  const skin = rng.pick(SKINS);
  const hair = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(gender === "M" ? MASC_HAIR : FEMME_HAIR) as HeroConfig["hairStyle"];

  const hatPick = rng.pickW<HatStyle>(
    ["hornedHelm", "fullHelm", "cap", "feathered", "none", "circlet"],
    [4, 3, 2, 1, 2, 1],
  );
  const hatPalette = hatPick === "circlet" ? circletPal(rng) : helmPal(rng);
  const hatOpts = { plume: rng.bool(0.5) };

  const dual = rng.bool(0.18);
  const right = rng.pickW(
    ["longsword", "broadsword", "axe", "mace", "flamberge", "shortsword"] as const,
    [6, 4, 3, 2, 1, 2],
  );
  const left = dual ? rng.pick(["shortsword", "dagger"] as const) : null;
  const sp = swordPal(rng);

  let shield: HeroConfig["shield"] = null;
  if (!dual && rng.bool(0.7))
    shield = { kind: rng.pick(["kite", "round", "tower", "buckler"] as const), palette: shieldPal(rng) };

  return {
    klass: "Warrior",
    gender,
    skin,
    hairColor: hair,
    hairStyle,
    hatStyle: hatPick,
    hatPalette,
    hatOpts,
    body: { ...armor, skin } as HeroConfig["body"],
    weapon: { right, left, palette: sp },
    shield,
    armorName: armor.name,
  };
}

function buildSwordsman(rng: Rng, forceGender?: "M" | "F"): HeroConfig {
  const gender = forceGender ?? (rng.bool(0.5) ? "M" as const : "F" as const);
  const armor = rng.pick(ARMOR_PALS);
  const skin = rng.pick(SKINS);
  const hair = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(gender === "M" ? MASC_HAIR : FEMME_HAIR) as HeroConfig["hairStyle"];

  const hatPick = rng.pickW<HatStyle>(
    ["cap", "feathered", "bandana", "none", "circlet", "hornedHelm"],
    [3, 3, 2, 4, 1, 1],
  );
  let hatPalette;
  if (hatPick === "bandana") hatPalette = bandanaPal(rng);
  else if (hatPick === "circlet") hatPalette = circletPal(rng);
  else hatPalette = helmPal(rng);
  const hatOpts = { plume: rng.bool(0.4) };

  const dual = rng.bool(0.45);
  const right = rng.pickW(
    ["longsword", "rapier", "shortsword", "flamberge", "broadsword"] as const,
    [5, 4, 3, 2, 2],
  );
  const left = dual ? rng.pick(["shortsword", "dagger"] as const) : null;
  const sp = swordPal(rng);

  let shield: HeroConfig["shield"] = null;
  if (!dual && rng.bool(0.4))
    shield = { kind: rng.pick(["round", "buckler", "kite"] as const), palette: shieldPal(rng) };

  return {
    klass: "Swordsman",
    gender,
    skin,
    hairColor: hair,
    hairStyle,
    hatStyle: hatPick,
    hatPalette,
    hatOpts,
    body: { ...armor, skin } as HeroConfig["body"],
    weapon: { right, left, palette: sp },
    shield,
    armorName: armor.name,
  };
}

function buildMagician(rng: Rng, forceGender?: "M" | "F"): HeroConfig {
  const gender = forceGender ?? (rng.bool(0.5) ? "M" as const : "F" as const);
  const robe = rng.pick(ROBE_PALS);
  const skin = rng.pick(SKINS);
  const hair = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(
    rng.bool(0.5) ? SAGE_HAIR : (gender === "M" ? MASC_HAIR : FEMME_HAIR),
  ) as HeroConfig["hairStyle"];

  const hatPick = rng.pickW<HatStyle>(
    ["wizardHat", "wizardHatBent", "turban", "none", "circlet"],
    [6, 4, 2, 1, 1],
  );
  let hatPalette;
  if (hatPick === "turban") hatPalette = turbanPal(rng);
  else if (hatPick === "circlet") hatPalette = circletPal(rng);
  else hatPalette = wizHatPal(rng);
  const hatOpts = { star: rng.bool(0.5), gem: rng.bool(0.4) };

  const staff = rng.pickW(
    ["orbStaff", "crystalStaff", "crookStaff", "gnarledStaff", "bookOfSpells"] as const,
    [5, 3, 2, 2, 1],
  );

  return {
    klass: "Magician",
    gender,
    skin,
    hairColor: hair,
    hairStyle,
    hatStyle: hatPick,
    hatPalette,
    hatOpts,
    body: { ...robe, skin } as HeroConfig["body"],
    weapon: { staff, palette: staffPal(rng) },
    shield: null,
    armorName: robe.name,
  };
}

function buildPriest(rng: Rng, forceGender?: "M" | "F"): HeroConfig {
  const gender = forceGender ?? (rng.bool(0.5) ? "M" as const : "F" as const);
  const robe = rng.pick(ROBE_PALS.filter((r) => /White|Holy|Cream|Sky|Rose|Grey|Black|Royal/.test(r.name)));
  const skin = rng.pick(SKINS);
  const hair = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(
    rng.bool(0.4) ? SAGE_HAIR : (gender === "M" ? MASC_HAIR : FEMME_HAIR),
  ) as HeroConfig["hairStyle"];

  const hatPick = rng.pickW<HatStyle>(
    ["priestHood", "mitre", "none", "circlet", "turban"],
    [5, 4, 2, 1, 1],
  );
  let hatPalette;
  if (hatPick === "circlet") hatPalette = circletPal(rng);
  else if (hatPick === "turban") hatPalette = turbanPal(rng);
  else hatPalette = priestHatPal(rng);
  const hatOpts = { cross: rng.bool(0.7) };

  const staff = rng.pickW(["cross", "crookStaff", "orbStaff", "bookOfSpells"] as const, [5, 3, 2, 2]);

  return {
    klass: "Priest",
    gender,
    skin,
    hairColor: hair,
    hairStyle,
    hatStyle: hatPick,
    hatPalette,
    hatOpts,
    body: { ...robe, skin } as HeroConfig["body"],
    weapon: { staff, palette: staff === "cross" ? { wood: C.brown, gold: C.gold } as unknown as StaffPalette : staffPal(rng) },
    shield: null,
    armorName: robe.name,
  };
}

function buildKungfu(rng: Rng, forceGender?: "M" | "F"): HeroConfig {
  const gender = forceGender ?? (rng.bool(0.55) ? "M" as const : "F" as const);
  const gi = rng.pick(KUNGFU_PALS);
  const skin = rng.pick(SKINS);
  const hair = rng.pick(HAIR_COLORS);
  const hairStyle = rng.pick(
    gender === "M"
      ? (["short", "spiky", "bald", "topknot", "mohawk"] as const)
      : (["ponytail", "braid", "short", "topknot"] as const),
  ) as HeroConfig["hairStyle"];

  const hatPick = rng.pickW<HatStyle>(
    ["banded", "kungfuCap", "bandana", "none", "turban"],
    [4, 3, 2, 3, 1],
  );
  let hatPalette;
  if (hatPick === "bandana") hatPalette = bandanaPal(rng);
  else if (hatPick === "turban") hatPalette = turbanPal(rng);
  else if (hatPick === "kungfuCap")
    hatPalette = { main: rng.pick([C.crimson, C.black, C.midnight, C.deepGrn, C.gold]), dark: C.black };
  else hatPalette = { main: rng.pick([C.red, C.white, C.black, C.yellow, C.blue]), dark: C.black };
  const hatOpts = {};

  let weapon: HeroConfig["weapon"] | null = null;
  const wkind = rng.pickW(["none", "staff", "spear"] as const, [5, 3, 2]);
  if (wkind !== "none") weapon = { kind: wkind, palette: swordPal(rng) };

  return {
    klass: "Kungfu Master",
    gender,
    skin,
    hairColor: hair,
    hairStyle,
    hatStyle: hatPick,
    hatPalette,
    hatOpts,
    body: { ...gi, skin } as HeroConfig["body"],
    weapon: weapon || { palette: swordPal(rng) },
    shield: null,
    armorName: gi.name,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────

const CLASS_BUILDERS: Record<DQ3Class, (rng: Rng, forceGender?: "M" | "F") => HeroConfig> = {
  Warrior: buildWarrior,
  Swordsman: buildSwordsman,
  Magician: buildMagician,
  Priest: buildPriest,
  "Kungfu Master": buildKungfu,
};

/**
 * Generate a complete HeroConfig for a given employee.
 * Deterministic: same id + archetype + gender always produces same hero.
 *
 * `gender` accepts "m" / "f" (DB convention) and is mapped to the
 * sprite system's "M" / "F". Pass null/undefined to let the sprite RNG
 * pick — keeps backward compatibility with callers that don't have
 * gender data.
 */
export function buildHeroForEmployee(
  employeeId: string,
  archetype: Archetype,
  gender?: "m" | "f" | "M" | "F" | null,
): HeroConfig {
  const seed = seedFromId(employeeId);
  const rng = makeRng(seed);
  const klass = dq3ClassFor(archetype);
  const force =
    gender === "m" || gender === "M" ? "M" :
    gender === "f" || gender === "F" ? "F" :
    undefined;
  const hero = CLASS_BUILDERS[klass](rng, force);

  // Assign personality
  hero.personality = pickPersonality(rng, klass, hero.gender);
  hero.stats = PERSONALITY_STATS[hero.personality];

  // Apply personality visual flavor
  const flavor = PERSONALITY_FLAVOR[hero.personality];
  if (flavor) {
    if (flavor.hairPref && rng.bool(0.6)) hero.hairStyle = flavor.hairPref as HeroConfig["hairStyle"];
    if (flavor.hatNonePref && rng.bool(0.5)) hero.hatStyle = "none";
    if (flavor.circletPref && rng.bool(0.6)) {
      hero.hatStyle = "circlet";
      hero.hatPalette = circletPal(rng);
    }
    if (flavor.bandanaPref && rng.bool(0.5)) {
      hero.hatStyle = "bandana";
      hero.hatPalette = bandanaPal(rng);
    }
    if (flavor.mohawkPref && rng.bool(0.7)) hero.hairStyle = "mohawk";
    if (flavor.plumePref) hero.hatOpts = { ...hero.hatOpts, plume: true };
    if (flavor.wizardStarPref) hero.hatOpts = { ...hero.hatOpts, star: true };
  }

  return hero;
}

/** All DQ3 classes for filter UIs. */
export const DQ3_CLASSES: DQ3Class[] = [
  "Warrior",
  "Swordsman",
  "Magician",
  "Priest",
  "Kungfu Master",
];

/** Human-readable weapon label for the inspect modal. */
export function weaponLabel(hero: HeroConfig): string {
  if (hero.klass === "Magician" || hero.klass === "Priest") {
    const map: Record<string, string> = {
      orbStaff: "Orb Staff",
      crookStaff: "Crook Staff",
      crystalStaff: "Crystal Staff",
      gnarledStaff: "Gnarled Staff",
      bookOfSpells: "Tome of Spells",
      cross: "Holy Cross",
    };
    return map[hero.weapon.staff || ""] || "—";
  }
  if (hero.klass === "Kungfu Master") {
    if (!hero.weapon?.kind) return "Bare Fists";
    return hero.weapon.kind === "staff" ? "Bo Staff" : "Spear";
  }
  const map: Record<string, string> = {
    longsword: "Longsword",
    shortsword: "Shortsword",
    broadsword: "Broadsword",
    rapier: "Rapier",
    flamberge: "Flamberge",
    axe: "Battle Axe",
    mace: "Mace",
    spear: "Spear",
  };
  let s = map[hero.weapon.right || ""] || "—";
  if (hero.weapon.left) s += " + " + (hero.weapon.left === "dagger" ? "Dagger" : "Shortsword");
  return s;
}
