/**
 * scripts/backfillPokedex.js
 *
 * One-time script to populate PlayerPokedex.seenKeys for all existing Player docs.
 * It collects:
 *  - keys in player.ownedPokemons
 *  - keys present in player.slots[].key (non-null)
 * Then performs $addToSet with $each.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." node scripts/backfillPokedex.js
 * or define MONGO_URI in your .env (Render dashboard for server-side run)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Load models (paths relative to project root)
const Player  = require(path.join(__dirname, '../models/Player'));
const Pokedex = require(path.join(__dirname, '../models/PlayerPokedex'));

async function main() {
  const mongoUri = process.env.MONGO_URI;
  const dbName   = process.env.MONGO_DB || undefined;

  if (!mongoUri) {
    console.error('❌ MONGO_URI is not set. Provide it via env.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      dbName,
      autoIndex: true
    });
    console.log('✅ Connected.');

    // Fetch Players (lean for performance)
    const players = await Player.find({}, 'username ownedPokemons slots').lean();
    console.log(`Found ${players.length} player(s).`);

    let processed = 0;

    for (const p of players) {
      const username = p.username;
      if (!username) continue;

      const ownedKeys = p.ownedPokemons ? Object.keys(p.ownedPokemons) : [];
      const slotKeys  = Array.isArray(p.slots)
        ? p.slots.map(s => s && s.key).filter(Boolean)
        : [];

      const allKeys = Array.from(new Set([...ownedKeys, ...slotKeys]));

      if (allKeys.length === 0) {
        // Ensure an empty pokedex doc exists
        await Pokedex.updateOne(
          { username },
          { $setOnInsert: { username, seenKeys: [] } },
          { upsert: true }
        );
        console.log(`[${username}] no keys to seed; ensured blank Pokedex.`);
        processed++;
        continue;
      }

      await Pokedex.updateOne(
        { username },
        {
          $addToSet: { seenKeys: { $each: allKeys } },
          $setOnInsert: { username }
        },
        { upsert: true }
      );

      console.log(`[${username}] seeded ${allKeys.length} key(s).`);
      processed++;
    }

    console.log(`✅ Backfill complete. Processed ${processed} player(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

main();
