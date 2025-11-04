// models/PlayerPokedex.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Each document corresponds to one player (by username).
 * `seenKeys` is an array of unique Pokémon keys that the player has ever owned.
 */
const PlayerPokedexSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  seenKeys: { type: [String], default: [] }
}, { timestamps: true });

// Ensure there’s exactly one document per username
PlayerPokedexSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('PlayerPokedex', PlayerPokedexSchema);
