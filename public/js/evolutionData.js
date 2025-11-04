// public/js/evolutionData.js

// Defines, for each Pokémon that can evolve, its next form and required level.
// All evolutions follow the pattern: common → rare at level 16, rare → epic at level 32.

const EVOLUTION_MAP = {
  // ──────────── Starter Line ────────────
  bulbasaur:   { evolvesTo: 'ivysaur',   atLevel: 16 },
  ivysaur:     { evolvesTo: 'venusaur',  atLevel: 32 },
  // venusaur is final (no entry)

  charmander:  { evolvesTo: 'charmeleon', atLevel: 16 },
  charmeleon:  { evolvesTo: 'charizard',  atLevel: 32 },
  // charizard is final

  squirtle:    { evolvesTo: 'wartortle',  atLevel: 16 },
  wartortle:   { evolvesTo: 'blastoise',  atLevel: 32 },
  // blastoise is final

  // ──────────── Pikachu Line ────────────
  pikachu:     { evolvesTo: 'raichu',     atLevel: 32 },
  // raichu is final

  // ──────────── Pidgey Line ────────────
  pidgey:      { evolvesTo: 'pidgeotto',  atLevel: 16 },
  pidgeotto:   { evolvesTo: 'pidgeot',    atLevel: 32 },
  // pidgeot is final

  // ──────────── Nidoran♀ Line ────────────
  'nidoran♀':  { evolvesTo: 'nidorina',   atLevel: 16 },
  nidorina:    { evolvesTo: 'nidoqueen',  atLevel: 32 },
  // nidoqueen is final

  // ──────────── Nidoran♂ Line ────────────
  'nidoran♂':  { evolvesTo: 'nidorino',   atLevel: 16 },
  nidorino:    { evolvesTo: 'nidoking',   atLevel: 32 },
  // nidoking is final

  // ──────────── Oddish Line ────────────
  oddish:      { evolvesTo: 'gloom',      atLevel: 16 },
  gloom:       { evolvesTo: 'vileplume',  atLevel: 32 },
  // vileplume is final

  // ──────────── Poliwag Line ────────────
  poliwag:     { evolvesTo: 'poliwhirl',  atLevel: 16 },
  poliwhirl:   { evolvesTo: 'poliwrath',  atLevel: 32 },
  // poliwrath is final

  // ──────────── Abra Line ────────────
  abra:        { evolvesTo: 'kadabra',    atLevel: 16 },
  kadabra:     { evolvesTo: 'alakazam',   atLevel: 32 },
  // alakazam is final

  // ──────────── Sandshrew Line ────────────
  sandshrew:   { evolvesTo: 'sandslash',  atLevel: 32 },
  // sandslash is final

  // ──────────── Vulpix Line ────────────
  vulpix:      { evolvesTo: 'ninetales',  atLevel: 32 },
  // ninetales is final

  // ──────────── Ekans Line ────────────
  ekans:       { evolvesTo: 'arbok',      atLevel: 32 },
  // arbok is final

  // ──────────── Diglett Line ────────────
  diglett:     { evolvesTo: 'dugtrio',    atLevel: 32 },
  // dugtrio is final

  // ──────────── Meowth Line ────────────
  meowth:      { evolvesTo: 'persian',    atLevel: 32 },
  // persian is final

  // ──────────── Psyduck Line ────────────
  psyduck:     { evolvesTo: 'golduck',    atLevel: 32 },
  // golduck is final
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { EVOLUTION_MAP };
}
