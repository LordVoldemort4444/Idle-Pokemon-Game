// public/js/pokedex.js

// 1) Grab userId from URL
const params       = new URLSearchParams(window.location.search);
const userId       = params.get('userId');
if (!userId) {
  console.error('[Pokédex] Missing userId—redirecting to starter');
  window.location.href = '/';
}

// 2) UI refs
const greetingEl        = document.getElementById('greeting');
const backBtn           = document.getElementById('backBtn');
const pokedexSectionsEl = document.getElementById('pokedexSections');
const commonShardsEl    = document.getElementById('pokedexCommonShards');
const rareShardsEl      = document.getElementById('pokedexRareShards');

// Internal state
let currentCommonShards = 0;
let currentRareShards   = 0;
let allOwnedKeys        = new Set();
let slotKeysList        = [];
let seenKeys            = new Set();
let username            = '';

const BASIC_RARE_KEYS = [
  'sandshrew', 'vulpix', 'ekans',
  'diglett',   'meowth', 'psyduck'
];

/**
 * Render a “rarity” section (common, rare, epic).
 * Under Rare, show “Buy (20 Rare)” *only* for BASIC_RARE_KEYS not yet seen/owned.
 * If user has “seen” but does not currently “own,” show “Seen.”
 */
function renderRaritySection(rarityName, pokemonArray) {
  const section = document.createElement('div');
  section.className = 'rarity-section';

  const title = document.createElement('h2');
  title.textContent = rarityName.charAt(0).toUpperCase() + rarityName.slice(1);
  section.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  pokemonArray.forEach(poke => {
    const key    = poke.key;
    const name   = poke.name;
    const imgUrl = poke.picUrl;

    // Check whether user currently owns this key
    const isOwned = allOwnedKeys.has(key);
    // Check whether user has ever seen this key (historic)
    const hasSeen  = seenKeys.has(key);

    const card = document.createElement('div');
    card.className = `pokemon-card ${isOwned ? 'owned' : 'not-owned'}`;

    // Sprite
    const imgEl = document.createElement('img');
    imgEl.src = imgUrl;
    imgEl.alt = name;
    imgEl.className = 'pokedex-img';
    card.appendChild(imgEl);

    // Details container
    const detailEl = document.createElement('div');
    detailEl.className = 'pokedex-details';
    detailEl.innerHTML = `<h3>${name}</h3>`;

    // (1) If owned → "Owned"
    if (isOwned) {
      detailEl.innerHTML += `<p>Owned</p>`;

    // (2) Else if seen (but not currently owned) → "Seen"
    } else if (hasSeen) {
      detailEl.innerHTML += `<p>Seen</p>`;

    // (3) Else if not seen/owned → show purchase logic
    } else {
      if (rarityName === 'common') {
        // Common purchase (20 Common shards)
        const btn = document.createElement('button');
        btn.id = `buy-common-${key}`;
        btn.textContent = 'Buy (20 Common)';
        btn.disabled = (currentCommonShards < 20);
        btn.className = 'buy-btn';
        btn.addEventListener('click', () => buyCommonPokemon(key, card));
        detailEl.appendChild(btn);

      } else if (rarityName === 'rare' && BASIC_RARE_KEYS.includes(key)) {
        // Basic rare purchase (20 Rare shards)
        const btn = document.createElement('button');
        btn.id = `buy-rare-${key}`;
        btn.textContent = 'Buy (20 Rare)';
        btn.disabled = (currentRareShards < 20);
        btn.className = 'buy-btn';
        btn.addEventListener('click', () => buyRarePokemon(key, card));
        detailEl.appendChild(btn);

      } else {
        // Not for sale (uncommon/epic or non-basic rares)
        detailEl.innerHTML += `<p>Not for sale</p>`;
      }
    }

    card.appendChild(detailEl);
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

// 3) Fetch /progress, /api/pokedex/user, and /api/pokedex/master, then render everything
async function initializePokedex() {
  try {
    console.log('[Pokédex] initializePokedex() called for userId:', userId);

    // (A) Fetch progress first
    const progRes  = await fetch(`/progress?userId=${userId}`);
    const progJson = await progRes.json();
    if (!progJson.success || !progJson.progress) {
      console.error('[Pokédex] /progress failed:', progJson);
      window.location.href = '/';
      return;
    }
    const player = progJson.progress;
    username     = player.username || '';
    if (!username) {
      window.location.href = '/';
      return;
    }
    currentCommonShards = (player.shards && player.shards.common) || 0;
    currentRareShards   = (player.shards && player.shards.rare)   || 0;

    // Build “owned” set = bench ∪ slots
    const benchKeys = player.ownedPokemons
      ? Object.keys(player.ownedPokemons)
      : [];
    const slotKeys  = Array.isArray(player.slots)
      ? player.slots.map(s => s.key).filter(k => k !== null)
      : [];
    slotKeysList = slotKeys.slice();
    allOwnedKeys = new Set([...benchKeys, ...slotKeysList]);

    // (B) Fetch “seenKeys” from /api/pokedex/user
    const pokedRes  = await fetch(`/api/pokedex/user?userId=${userId}`);
    const pokedJson = await pokedRes.json();
    if (!pokedJson.success) {
      console.error('[Pokédex] /api/pokedex/user failed:', pokedJson);
      // Even if this fails, we can proceed—no “seenKeys”
      seenKeys = new Set();
    } else {
      seenKeys = new Set(pokedJson.seenKeys || []);
    }

    // (C) Populate greeting & shards
    greetingEl.textContent     = `Welcome, ${username}`;
    commonShardsEl.textContent = currentCommonShards;
    rareShardsEl.textContent   = currentRareShards;

    // (D) Fetch master list
    const masterRes  = await fetch('/api/pokedex/master');
    const masterJson = await masterRes.json();
    if (masterJson.error) {
      console.error('[Pokédex] /api/pokedex/master failed:', masterJson);
      throw new Error('Failed to load master Pokédex.');
    }
    const masterList = masterJson.master;
    console.log('[Pokédex] Master list length:', masterList.length);

    // (E) Bucket by rarity
    const rarityMap = { common: [], rare: [], epic: [] };
    masterList.forEach(poke => {
      const rar = poke.rarity || 'common';
      if (rarityMap[rar]) rarityMap[rar].push(poke);
    });

    // (F) Clear and render each rarity section (passing seenKeys)
    pokedexSectionsEl.innerHTML = '';
    pokedexSectionsEl.appendChild(renderRaritySection('common', rarityMap.common));
    pokedexSectionsEl.appendChild(renderRaritySection('rare',   rarityMap.rare));
    pokedexSectionsEl.appendChild(renderRaritySection('epic',   rarityMap.epic));

  } catch (err) {
    console.error('[Pokédex] initialize error:', err);
    window.location.href = '/';
  }
}

/**
 * buyCommonPokemon(key, cardElement):
 *   Purchase a “common” Pokémon at cost 20 common shards.
 */
async function buyCommonPokemon(pokemonKey, cardElement) {
  console.log(`[Pokédex] buyCommonPokemon() for userId=${userId}, key=${pokemonKey}`);
  try {
    const res  = await fetch('/buy-pokemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, key: pokemonKey })
    });
    const json = await res.json();
    console.log('[Pokédex] /buy-pokemon response:', json);

    if (!json.success) {
      alert('Error buying Pokémon: ' + (json.message || 'Unknown'));
      return;
    }

    // (A) Update shard counts
    if (json.newCommonShards != null) {
      currentCommonShards = json.newCommonShards;
    }
    if (json.newRareShards != null) {
      currentRareShards = json.newRareShards;
    }
    commonShardsEl.textContent = currentCommonShards;
    rareShardsEl.textContent   = currentRareShards;

    // (B) Sync bench keys from server
    if (json.ownedPokemons) {
      const newBenchKeys = Object.keys(json.ownedPokemons);
      allOwnedKeys = new Set([...newBenchKeys, ...slotKeysList]);
    } else {
      allOwnedKeys.add(pokemonKey);
    }

    // (C) Update UI for this card
    cardElement.classList.remove('not-owned');
    cardElement.classList.add('owned');
    const btn = cardElement.querySelector(`#buy-common-${pokemonKey}`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Owned';
      btn.classList.add('owned');
    }

    // (D) Re‐render the entire page
    initializePokedex();

  } catch (err) {
    console.error('[Pokédex] buyCommonPokemon error:', err);
    alert('Error purchasing Pokémon—see console.');
  }
}

/**
 * buyRarePokemon(key, cardElement):
 *   Purchase a “rare” Pokémon at cost 20 rare shards.
 */
async function buyRarePokemon(pokemonKey, cardElement) {
  console.log(`[Pokédex] buyRarePokemon() for userId=${userId}, key=${pokemonKey}`);
  try {
    const res  = await fetch('/buy-pokemon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, key: pokemonKey })
    });
    const json = await res.json();
    console.log('[Pokédex] /buy-pokemon (rare) response:', json);

    if (!json.success) {
      alert('Error buying Pokémon: ' + (json.message || 'Unknown'));
      return;
    }

    // (A) Update shard counts
    if (json.newCommonShards != null) {
      currentCommonShards = json.newCommonShards;
    }
    if (json.newRareShards != null) {
      currentRareShards = json.newRareShards;
    }
    commonShardsEl.textContent = currentCommonShards;
    rareShardsEl.textContent   = currentRareShards;

    // (B) Sync bench keys from server
    if (json.ownedPokemons) {
      const newBenchKeys = Object.keys(json.ownedPokemons);
      allOwnedKeys = new Set([...newBenchKeys, ...slotKeysList]);
    } else {
      allOwnedKeys.add(pokemonKey);
    }

    // (C) Update UI for this card
    cardElement.classList.remove('not-owned');
    cardElement.classList.add('owned');
    const btn = cardElement.querySelector(`#buy-rare-${pokemonKey}`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Owned';
      btn.classList.add('owned');
    }

    // (D) Re‐render the entire page
    initializePokedex();

  } catch (err) {
    console.error('[Pokédex] buyRarePokemon error:', err);
    alert('Error purchasing Pokémon—see console.');
  }
}

// 5) “Back to Game” button
backBtn.addEventListener('click', () => {
  window.location.href = `/game?userId=${userId}&t=${Date.now()}`;
});

// 6) Initialize on DOMContentLoaded
window.addEventListener('DOMContentLoaded', initializePokedex);
