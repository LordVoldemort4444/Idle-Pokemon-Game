// server.js — Render-ready, env-driven

require('dotenv').config();
const express  = require('express');
const path     = require('path');
const mongoose = require('mongoose');

// Models
const User     = require('./models/User');
const Player   = require('./models/Player');
const Pokedex  = require('./models/PlayerPokedex');

// Front-end data (kept as-is from your project)
const { POKEMON, CLOUDINARY_BASE } = require(path.join(__dirname, 'public/js/pokemonData'));
const EVOLUTION_MAP = require(path.join(__dirname, 'public/js/evolutionData')).EVOLUTION_MAP;

const app  = express();
const PORT = process.env.PORT || 5000;

/* ────────────────────────── MongoDB Setup ────────────────────────── */
(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI is not set in environment variables');
      process.exit(1);
    }

    // Optional DB override if you want: set MONGO_DB in Render
    const dbName = process.env.MONGO_DB || undefined;

    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      dbName,
      autoIndex: process.env.NODE_ENV !== 'production'
    });

    console.log('✅ [DB] MongoDB connected');
  } catch (err) {
    console.error('❌ [DB] Connection error:', err);
    process.exit(1);
  }
})();

/* ───────────────────────── Middleware ───────────────────────── */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ──────────────────────── Health / Config ──────────────────────── */
// Health check for Render
app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));

// Optional: expose only the Cloudinary cloud name to the client (no secrets)
app.get('/config/cloudinary', (req, res) => {
  res.json({ cloudName: process.env.CLOUDINARY_CLOUD_NAME || '' });
});

/* ─────────────────────── Serve Static Pages ─────────────────────── */
app.get('/',         (req, res) => res.sendFile(path.join(__dirname, 'src/pages/starter.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'src/pages/register.html')));
app.get('/login',    (req, res) => res.sendFile(path.join(__dirname, 'src/pages/login.html')));
app.get('/select',   (req, res) => res.sendFile(path.join(__dirname, 'src/pages/select.html')));

app.get('/game', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.redirect('/login');
  const u = await User.findById(userId);
  if (!u) return res.redirect('/login');
  const p = await Player.findOne({ username: u.username });
  if (!p || !p.ownedPokemons || Object.keys(p.ownedPokemons).length === 0) {
    return res.redirect(`/select?userId=${userId}`);
  }
  return res.sendFile(path.join(__dirname, 'src/pages/game.html'));
});

app.get('/pokedex', (req, res) => res.sendFile(path.join(__dirname, 'src/pages/pokedex.html')));
app.get('/shop',    (req, res) => res.sendFile(path.join(__dirname, 'src/pages/shop.html')));

/* ───── Helper: ensure a Player & Pokedex record exists (unchanged) ───── */
async function ensurePlayer(username) {
  let p = await Player.findOne({ username });
  if (!p) {
    p = new Player({ username });
    await p.save();
    // Create blank Pokedex
    await Pokedex.updateOne(
      { username },
      { $setOnInsert: { username, seenKeys: [] } },
      { upsert: true }
    );
  }
  // Guarantee at least one slot
  if (!Array.isArray(p.slots) || p.slots.length === 0) {
    p.slots = [{ key: null, level: 1, exp: 0 }];
  }
  // Initialize benchOrder if missing
  if (!Array.isArray(p.benchOrder) || p.benchOrder.length === 0) {
    p.benchOrder = Object.keys(p.ownedPokemons || {});
  }
  await p.save();
  return p;
}

/* ─────────────────────────── AUTH ─────────────────────────── */
// REGISTER
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (await User.exists({ username })) {
      return res.send(`<script>alert('Username taken');location='/register';</script>`);
    }
    const u = await new User({ username, password }).save();
    await ensurePlayer(username);
    return res.send(`<script>alert('Registered!');location='/game?userId=${u._id}';</script>`);
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.send(`<script>alert('Error registering');location='/register';</script>`);
  }
});

// LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const u = await User.findOne({ username });
    if (!u || u.password !== password) {
      return res.send(`<script>alert('Invalid credentials');location='/login';</script>`);
    }
    await ensurePlayer(username);
    return res.send(`<script>alert('Login successful');location='/game?userId=${u._id}';</script>`);
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.send(`<script>alert('Error logging in');location='/login';</script>`);
  }
});

/* ───────────────────────── Game APIs ───────────────────────── */
// SELECT STARTER
app.post('/select', async (req, res) => {
  const { userId, starterKey } = req.body;
  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).send('User not found');

    // Assign starter
    await Player.findOneAndUpdate(
      { username: u.username },
      {
        $set: {
          slots:      [{ key: starterKey, level: 1, exp: 0 }],
          benchOrder: [],
          [`ownedPokemons.${starterKey}`]: { level: 1, exp: 0 }
        }
      },
      { upsert: true }
    );

    // Mark seen in Pokedex
    await Pokedex.updateOne(
      { username: u.username },
      { $addToSet: { seenKeys: starterKey } },
      { upsert: true }
    );

    return res.redirect(`/game?userId=${userId}`);
  } catch (err) {
    console.error('[API] /select error:', err);
    return res.status(500).send('Server error');
  }
});

// GET /progress?userId=…
app.get('/progress', async (req, res) => {
  const { userId } = req.query;
  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    let p = await Player.findOneAndUpdate(
      { username: u.username },
      { $setOnInsert: { username: u.username } },
      { upsert: true, new: true }
    );

    // Clean out any slotted keys from benchOrder
    const slotKeys     = new Set(p.slots.map(sl => sl.key).filter(Boolean));
    const cleanedBench = (p.benchOrder || []).filter(k => !slotKeys.has(k));
    if (cleanedBench.length !== (p.benchOrder || []).length) {
      p.benchOrder = cleanedBench;
      await p.save();
    }

    await Pokedex.updateOne(
      { username: u.username },
      { $setOnInsert: { username: u.username, seenKeys: [] } },
      { upsert: true }
    );

    return res.json({ success: true, progress: p });
  } catch (err) {
    console.error('[API] /progress error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /save
app.post('/save', async (req, res) => {
  const {
    userId,
    money,
    shards,
    ownedPokemons,
    slots,
    benchOrder,
    chestAwarded,
    chestKeys,
    lastChestTier,
    candies,
    candiesBought
  } = req.body;

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const updated = await Player.findOneAndUpdate(
      { username: u.username },
      {
        $setOnInsert: { username: u.username },
        $set: {
          money,
          shards,
          ownedPokemons,
          slots,
          benchOrder,
          chestAwarded,
          chestKeys,
          lastChestTier,
          candies,
          ...(candiesBought !== undefined ? { candiesBought } : {})
        }
      },
      { new: true, upsert: true }
    );

    return res.json({ success: true, progress: updated });
  } catch (err) {
    console.error('[API] /save error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /reset
app.post('/reset', async (req, res) => {
  const { userId, password } = req.body;
  try {
    const u = await User.findById(userId);
    if (!u || u.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const defaults = {
      money:         0,
      shards:        { common: 0, rare: 0 },
      ownedPokemons: {},
      slots:         [{ key: null, level: 1, exp: 0 }],
      benchOrder:    [],
      chestKeys:     0,
      lastChestTier: 1,
      chestAwarded:  false,
      candies:       { rare: 0, epic: 0 },
      candiesBought: { rare: 0, epic: 0 }
    };

    const reset = await Player.findOneAndUpdate(
      { username: u.username },
      { $set: defaults },
      { new: true }
    );

    await Pokedex.findOneAndUpdate(
      { username: u.username },
      { $set: { seenKeys: [] } },
      { upsert: true }
    );

    return res.json({ success: true, progress: reset });
  } catch (err) {
    console.error('[API] /reset error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /open-chest
app.post('/open-chest', async (req, res) => {
  const { userId, count = 1 } = req.body;
  const numChests = Math.max(1, parseInt(count, 10) || 1);

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const p = await Player.findOne({ username: u.username });
    if (!p) return res.status(404).json({ success: false, message: 'Player not found' });

    if ((p.chestKeys || 0) < numChests) {
      return res.status(400).json({ success: false, message: 'Not enough chest keys' });
    }

    let totalCommon = 0, totalRare = 0, firstUsed = false;
    const newOwned = { ...p.ownedPokemons };

    if (!p.chestAwarded) {
      totalCommon += 10;
      totalRare   += 4;
      newOwned.pikachu = { level: 1, exp: 0 };
      await Pokedex.updateOne(
        { username: u.username },
        { $addToSet: { seenKeys: 'pikachu' } },
        { upsert: true }
      );
      firstUsed = true;
    }

    const loops = firstUsed ? numChests - 1 : numChests;
    for (let i = 0; i < loops; i++) {
      // TODO: your original chest-roll logic goes here (shards + 1% rare mons)
      // Update totalCommon/totalRare/newOwned and Pokedex as needed.
    }

    const ops = {
      $inc: {
        chestKeys:      -numChests,
        'shards.common': totalCommon,
        'shards.rare':   totalRare
      },
      $set: { ownedPokemons: newOwned }
    };
    if (firstUsed) ops.$set.chestAwarded = true;

    const updated = await Player.findOneAndUpdate(
      { username: u.username },
      ops,
      { new: true }
    );

    return res.json({
      success:          true,
      newChestKeys:     updated.chestKeys,
      newCommonShards:  updated.shards.common,
      commonGained:     totalCommon,
      newRareShards:    updated.shards.rare,
      rareGained:       totalRare,
      gotRarePokemon:   firstUsed,
      rareKey:          firstUsed ? 'pikachu' : null
    });
  } catch (err) {
    console.error('[API] /open-chest error:', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// POST /buy-pokemon
app.post('/buy-pokemon', async (req, res) => {
  const { key: keyFromPayload, userId } = req.body;
  if (!keyFromPayload || !userId) {
    return res.status(400).json({ success: false, message: 'Missing key or userId' });
  }

  try {
    // 1) Fetch user & player
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });
    const p = await Player.findOne({ username: u.username });
    if (!p) return res.status(404).json({ success: false, message: 'Player record missing' });

    // 2) Fetch their Pokedex history
    const pk = await Pokedex.findOne({ username: u.username });
    if (pk && pk.seenKeys.includes(keyFromPayload)) {
      // Already “seen” → disallow duplicate purchase
      return res.status(400).json({ success: false, message: 'You already have that Pokémon' });
    }

    // 3) Validate shards & cost
    const pokeEntry = POKEMON[keyFromPayload];
    if (!pokeEntry) {
      return res.status(400).json({ success: false, message: 'Invalid Pokémon key' });
    }
    const costField = pokeEntry.rarity === 'common' ? 'shards.common' : 'shards.rare';
    const cost      = 20;
    if ((p.shards[pokeEntry.rarity] || 0) < cost) {
      return res.status(400).json({ success: false, message: 'Not enough shards' });
    }

    // 4) Charge shards and add to ownedPokemons
    const updateResult = await Player.findOneAndUpdate(
      { username: u.username, [costField]: { $gte: cost } },
      {
        $inc: { [costField]: -cost },
        $set: { [`ownedPokemons.${keyFromPayload}`]: { level: 1, exp: 0 } }
      },
      { new: true }
    );

    // 5) Record in Pokédex
    await Pokedex.updateOne(
      { username: u.username },
      { $addToSet: { seenKeys: keyFromPayload } },
      { upsert: true }
    );

    return res.json({
      success:         true,
      newCommonShards: updateResult.shards.common,
      newRareShards:   updateResult.shards.rare,
      ownedPokemons:   updateResult.ownedPokemons
    });
  } catch (err) {
    console.error('[API] /buy-pokemon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/pokedex/master
app.get('/api/pokedex/master', (req, res) => {
  try {
    const master = Object.entries(POKEMON).map(([key, data]) => ({
      key, name: data.name, rarity: data.rarity,
      picUrl: `${CLOUDINARY_BASE}/${data.imageId}.png`,
      dexNumber: parseInt(data.imageId.split('_')[0], 10)
    })).sort((a,b) => a.dexNumber - b.dexNumber);

    return res.json({
      master: master.map(({key, name, rarity, picUrl}) => ({ key, name, rarity, picUrl }))
    });
  } catch (err) {
    console.error('[API] /api/pokedex/master error:', err);
    return res.status(500).json({ error: 'Failed to build master Pokédex' });
  }
});

// GET /api/pokedex/user
app.get('/api/pokedex/user', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const p  = await Player.findOne({ username: u.username });
    const pk = await Pokedex.findOne({ username: u.username });

    return res.json({
      success:       true,
      seenKeys:      pk ? pk.seenKeys : [],
      shards:        p.shards,
      candies:       p.candies,
      candiesBought: p.candiesBought,
      slots:         p.slots,
      benchOrder:    p.benchOrder,
      ownedPokemons: p.ownedPokemons
    });
  } catch (err) {
    console.error('[API] /api/pokedex/user error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /evolve-pokemon
app.post('/evolve-pokemon', async (req, res) => {
  const { userId, slotIndex } = req.body;
  if (typeof slotIndex !== 'number') {
    return res.status(400).json({ success: false, message: 'Invalid slotIndex' });
  }

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const p = await Player.findOne({ username: u.username });
    if (!p) return res.status(404).json({ success: false, message: 'Player record missing' });

    if (!Array.isArray(p.slots) || slotIndex < 0 || slotIndex >= p.slots.length) {
      return res.status(400).json({ success: false, message: 'Invalid slot index' });
    }
    const sl     = p.slots[slotIndex];
    const oldKey = sl.key;
    if (!oldKey) {
      return res.status(400).json({ success: false, message: 'No Pokémon in that slot' });
    }

    const evoInfo = EVOLUTION_MAP[oldKey];
    if (!evoInfo || evoInfo.atLevel <= 0) {
      return res.status(400).json({ success: false, message: 'Cannot evolve' });
    }
    if (sl.level < evoInfo.atLevel) {
      return res.status(400).json({ success: false, message: 'Level too low' });
    }

    const rarity = POKEMON[oldKey].rarity;
    let candyType = rarity === 'common' ? 'rare' : rarity === 'rare' ? 'epic' : null;
    if (!candyType || p.candies[candyType] < 1) {
      return res.status(400).json({ success: false, message: 'Not enough candy' });
    }

    const newKey   = evoInfo.evolvesTo;
    const newLevel = sl.level;
    const newExp   = sl.exp;

    const updateOps = {
      $inc: { [`candies.${candyType}`]: -1 },
      $set: {
        [`slots.${slotIndex}.key`]: newKey,
        [`ownedPokemons.${newKey}`]: { level: newLevel, exp: newExp }
      },
      $unset: { [`ownedPokemons.${oldKey}`]: "" }
    };

    const updated = await Player.findOneAndUpdate(
      { username: u.username },
      updateOps,
      { new: true }
    );
    if (!updated) {
      return res.status(500).json({ success: false, message: 'Evolution failed' });
    }

    await Pokedex.updateOne(
      { username: u.username },
      { $addToSet: { seenKeys: newKey } },
      { upsert: true }
    );

    return res.json({
      success:   true,
      oldKey,
      newKey,
      newLevel,
      newExp,
      rareCandy: updated.candies.rare,
      epicCandy: updated.candies.epic
    });
  } catch (err) {
    console.error('[API] /evolve-pokemon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /evolve-bench
app.post('/evolve-bench', async (req, res) => {
  const { userId, pokemonKey } = req.body;
  if (!userId || !pokemonKey) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const p = await Player.findOne({ username: u.username });
    if (!p) return res.status(404).json({ success: false, message: 'Player record missing' });

    const benchData = p.ownedPokemons[pokemonKey];
    if (!benchData) {
      return res.status(400).json({ success: false, message: 'Not owned or slotted' });
    }

    const evoInfo = EVOLUTION_MAP[pokemonKey];
    if (!evoInfo || evoInfo.atLevel <= 0) {
      return res.status(400).json({ success: false, message: 'Cannot evolve' });
    }
    if (benchData.level < evoInfo.atLevel) {
      return res.status(400).json({ success: false, message: 'Level too low' });
    }

    const rarity   = POKEMON[pokemonKey].rarity;
    let candyType  = rarity === 'common'? 'rare' : rarity === 'rare' ? 'epic' : null;
    if (!candyType || p.candies[candyType] < 1) {
      return res.status(400).json({ success: false, message: 'Not enough candy' });
    }

    const newKey   = evoInfo.evolvesTo;
    const newLevel = benchData.level;
    const newExp   = benchData.exp;

    const updateOps = {
      $inc: { [`candies.${candyType}`]: -1 },
      $set: { [`ownedPokemons.${newKey}`]: { level: newLevel, exp: newExp } },
      $unset: { [`ownedPokemons.${pokemonKey}`]: "" }
    };

    const updated = await Player.findOneAndUpdate(
      { username: u.username },
      updateOps,
      { new: true }
    );
    if (!updated) {
      return res.status(500).json({ success: false, message: 'Evolution failed' });
    }

    await Pokedex.updateOne(
      { username: u.username },
      { $addToSet: { seenKeys: newKey } },
      { upsert: true }
    );

    return res.json({
      success:    true,
      oldKey:     pokemonKey,
      newKey,
      newLevel,
      newExp,
      rareCandy:  updated.candies.rare,
      epicCandy:  updated.candies.epic
    });
  } catch (err) {
    console.error('[API] /evolve-bench error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /shop/buy-candy
app.post('/shop/buy-candy', async (req, res) => {
  const { userId, type } = req.body;
  if (!userId || (type !== 'rare' && type !== 'epic')) {
    return res.status(400).json({ success: false, message: 'Invalid request' });
  }

  try {
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ success: false, message: 'User not found' });

    const p = await Player.findOne({ username: u.username });
    if (!p) return res.status(404).json({ success: false, message: 'Player missing' });

    const owned    = p.candies[type]       || 0; // (kept for clarity; not directly used)
    const bought   = p.candiesBought[type] || 0;
    const price    = type === 'rare'
                   ? Math.round(500 * Math.pow(1.5, bought))
                   : Math.round(5000 * Math.pow(1.25, bought));

    if ((p.money || 0) < price) {
      return res.status(400).json({ success: false, message: 'Not enough money' });
    }

    const updated = await Player.findOneAndUpdate(
      { username: u.username },
      { $inc: { money: -price, [`candies.${type}`]: 1, [`candiesBought.${type}`]: 1 } },
      { new: true }
    );
    if (!updated) {
      return res.status(500).json({ success: false, message: 'Purchase failed' });
    }

    return res.json({
      success:      true,
      newMoney:     updated.money,
      ownedCandies: updated.candies[type],
      totalBought:  updated.candiesBought[type]
    });
  } catch (err) {
    console.error('[API] /shop/buy-candy error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ───────────────────────── Start Server ───────────────────────── */
app.listen(PORT, () => console.log(`[Server] Listening on port ${PORT}`));
