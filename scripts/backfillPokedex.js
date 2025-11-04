/**
 * scripts/backfillPokedex.js
 *
 * One‐time script to populate PlayerPokedex.seenKeys for all existing Player documents.
 * For each Player, it gathers:
 *   - All keys currently in player.ownedPokemons
 *   - All keys in player.slots (where slot.key !== null)
 * and then does a single $addToSet: { seenKeys: { $each: allKeys } }.
 *
 * Usage:  node scripts/backfillPokedex.js
 */

const mongoose = require('mongoose');
const path     = require('path');

// Adjust this to match your actual connection URI if necessary:
const MONGODB_URI =
  'mongodb+srv://enocheiheilam:Enoch_24761022@cluster0.xknyzbq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Load models (ensure paths are correct relative to project root)
const Player   = require(path.join(__dirname, '../models/Player'));
const Pokedex  = require(path.join(__dirname, '../models/PlayerPokedex'));

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  try {
    // 1) Fetch all Players
    const players = await Player.find({}, 'username ownedPokemons slots').lean();
    console.log(`Found ${players.length} players.`);

    let count = 0;

    for (const p of players) {
      const username = p.username;
      if (!username) continue;

      // 2) Collect all keys from ownedPokemons
      const ownedKeys = p.ownedPokemons ? Object.keys(p.ownedPokemons) : [];

      // 3) Collect all keys from slots[].key (skip null/undefined)
      const slotKeys = Array.isArray(p.slots)
        ? p.slots.map(s => s.key).filter(k => k)
        : [];

      // 4) Merge into a single array (deduplication happens in $addToSet)
      const allKeys = Array.from(new Set([...ownedKeys, ...slotKeys]));
      if (allKeys.length === 0) {
        // No Pokémon owned—still ensure a document exists so seenKeys stays empty
        await Pokedex.updateOne(
          { username },
          { $setOnInsert: { username, seenKeys: [] } },
          { upsert: true }
        );
        console.log(`[${username}]: no keys to seed, created blank Pokedex if missing.`);
        count++;
        continue;
      }

      // 5) Perform a single $addToSet with $each: allKeys
      const update = await Pokedex.updateOne(
        { username },
        { 
          $addToSet: { seenKeys: { $each: allKeys } },
          $setOnInsert: { username }  // create doc if not already present
        },
        { upsert: true }
      );
      console.log(`[${username}]: seeded ${allKeys.length} key(s) into seenKeys.`);
      count++;
    }

    console.log(`Backfill complete. Processed ${count} players.`);
  } catch (err) {
    console.error('Error during backfill:', err);
  } finally {
    mongoose.disconnect();
  }
}

main();
