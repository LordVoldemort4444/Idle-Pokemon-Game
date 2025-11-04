// public/js/pokemonData.js

// Base URL for Cloudinary-hosted sprites
const CLOUDINARY_BASE = "https://res.cloudinary.com/doqq3i0ae/image/upload";

// Each entry includes: name, baseRate, evolveAt, rarity, imageId.
// “common” entries have rarity = "common", “rare” entries have rarity = "rare", “epic” entries have rarity = "epic".

const POKEMON = {
  // ──────────── Starter Line ────────────
  bulbasaur: {
    name:     'Bulbasaur',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Ivysaur
    rarity:   'common',
    imageId:  '0001_Bulbasaur'
  },
  ivysaur: {
    name:     'Ivysaur',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Venusaur
    rarity:   'rare',
    imageId:  '0002_Ivysaur'
  },
  venusaur: {
    name:     'Venusaur',
    baseRate: 2,
    evolveAt: 0,        // final form
    rarity:   'epic',
    imageId:  '0003_Venusaur'
  },

  charmander: {
    name:     'Charmander',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Charmeleon
    rarity:   'common',
    imageId:  '0004_Charmander'
  },
  charmeleon: {
    name:     'Charmeleon',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Charizard
    rarity:   'rare',
    imageId:  '0005_Charmeleon'
  },
  charizard: {
    name:     'Charizard',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0006_Charizard'
  },

  squirtle: {
    name:     'Squirtle',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Wartortle
    rarity:   'common',
    imageId:  '0007_Squirtle'
  },
  wartortle: {
    name:     'Wartortle',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Blastoise
    rarity:   'rare',
    imageId:  '0008_Wartortle'
  },
  blastoise: {
    name:     'Blastoise',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0009_Blastoise'
  },

  // ──────────── Pikachu Line ────────────
  pikachu: {
    name:     'Pikachu',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Raichu
    rarity:   'rare',
    imageId:  '0025_Pikachu'
  },
  raichu: {
    name:     'Raichu',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0026_Raichu'
  },

  // ──────────── Pidgey Line ────────────
  pidgey: {
    name:     'Pidgey',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Pidgeotto
    rarity:   'common',
    imageId:  '0016_Pidgey'
  },
  pidgeotto: {
    name:     'Pidgeotto',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Pidgeot
    rarity:   'rare',
    imageId:  '0017_Pidgeotto'
  },
  pidgeot: {
    name:     'Pidgeot',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0018_Pidgeot'
  },

  // ──────────── Nidoran♀ Line ────────────
  'nidoran♀': {
    name:     'Nidoran♀',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Nidorina
    rarity:   'common',
    imageId:  '0029_Nidoran'
  },
  nidorina: {
    name:     'Nidorina',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Nidoqueen
    rarity:   'rare',
    imageId:  '0030_Nidorina'
  },
  nidoqueen: {
    name:     'Nidoqueen',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0031_Nidoqueen'
  },

  // ──────────── Nidoran♂ Line ────────────
  'nidoran♂': {
    name:     'Nidoran♂',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Nidorino
    rarity:   'common',
    imageId:  '0032_Nidoran'
  },
  nidorino: {
    name:     'Nidorino',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Nidoking
    rarity:   'rare',
    imageId:  '0033_Nidorino'
  },
  nidoking: {
    name:     'Nidoking',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0034_Nidoking'
  },

  // ──────────── Oddish Line ────────────
  oddish: {
    name:     'Oddish',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Gloom
    rarity:   'common',
    imageId:  '0043_Oddish'
  },
  gloom: {
    name:     'Gloom',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Vileplume
    rarity:   'rare',
    imageId:  '0044_Gloom'
  },
  vileplume: {
    name:     'Vileplume',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0045_Vileplume'
  },

  // ──────────── Poliwag Line ────────────
  poliwag: {
    name:     'Poliwag',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Poliwhirl
    rarity:   'common',
    imageId:  '0060_Poliwag'
  },
  poliwhirl: {
    name:     'Poliwhirl',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Poliwrath
    rarity:   'rare',
    imageId:  '0061_Poliwhirl'
  },
  poliwrath: {
    name:     'Poliwrath',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0062_Poliwrath'
  },

  // ──────────── Abra Line ────────────
  abra: {
    name:     'Abra',
    baseRate: 1,
    evolveAt: 16,       // evolves at Lv 16 → Kadabra
    rarity:   'common',
    imageId:  '0063_Abra'
  },
  kadabra: {
    name:     'Kadabra',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Alakazam
    rarity:   'rare',
    imageId:  '0064_Kadabra'
  },
  alakazam: {
    name:     'Alakazam',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0065_Alakazam'
  },

  // ──────────── Sandshrew Line ────────────
  sandshrew: {
    name:     'Sandshrew',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Sandslash
    rarity:   'rare',
    imageId:  '0027_Sandshrew'
  },
  sandslash: {
    name:     'Sandslash',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0028_Sandslash'
  },

  // ──────────── Vulpix Line ────────────
  vulpix: {
    name:     'Vulpix',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Ninetales
    rarity:   'rare',
    imageId:  '0037_Vulpix'
  },
  ninetales: {
    name:     'Ninetales',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0038_Ninetales'
  },

  // ──────────── Ekans Line ────────────
  ekans: {
    name:     'Ekans',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Arbok
    rarity:   'rare',
    imageId:  '0023_Ekans'
  },
  arbok: {
    name:     'Arbok',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0024_Arbok'
  },

  // ──────────── Diglett Line ────────────
  diglett: {
    name:     'Diglett',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Dugtrio
    rarity:   'rare',
    imageId:  '0050_Diglett'
  },
  dugtrio: {
    name:     'Dugtrio',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0051_Dugtrio'
  },

  // ──────────── Meowth Line ────────────
  meowth: {
    name:     'Meowth',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Persian
    rarity:   'rare',
    imageId:  '0052_Meowth'
  },
  persian: {
    name:     'Persian',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0053_Persian'
  },

  // ──────────── Psyduck Line ────────────
  psyduck: {
    name:     'Psyduck',
    baseRate: 1.5,
    evolveAt: 32,       // evolves at Lv 32 → Golduck
    rarity:   'rare',
    imageId:  '0054_Psyduck'
  },
  golduck: {
    name:     'Golduck',
    baseRate: 2,
    evolveAt: 0,
    rarity:   'epic',
    imageId:  '0055_Golduck'
  }
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { POKEMON, CLOUDINARY_BASE };
}
