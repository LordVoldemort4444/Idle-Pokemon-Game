// models/Player.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Sub-schema for a single slot
const SlotSchema = new Schema({
  key:   { type: String, default: null },
  level: { type: Number, default: 1 },
  exp:   { type: Number, default: 0 }
}, { _id: false });

const PlayerSchema = new Schema({
  username:      { type: String, required: true, unique: true },
  money:         { type: Number, default: 0 },

  shards: {
    common: { type: Number, default: 0 },
    rare:   { type: Number, default: 0 }
  },

  // ─── Inventory of candies currently held ───────────
  candies: {
    rare: { type: Number, default: 0 },
    epic: { type: Number, default: 0 }
  },

  // ─── Track historical purchases (never decreases) ─
  candiesBought: {
    rare: { type: Number, default: 0 },
    epic: { type: Number, default: 0 }
  },

  // key → { level, exp }
  ownedPokemons: { type: Schema.Types.Mixed, default: {} },

  // Persistent slots
  slots: {
    type: [SlotSchema],
    default: [{ key: null, level: 1, exp: 0 }]
  },

  // Fixed ordering of bench keys
  benchOrder: {
    type: [String],
    default: []
  },

  chestKeys:     { type: Number, default: 0 },
  lastChestTier: { type: Number, default: 1 },
  chestAwarded:  { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);
