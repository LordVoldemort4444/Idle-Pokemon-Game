// public/js/game.js

// 1) Grab userId
const params = new URLSearchParams(window.location.search);
const userId = params.get('userId');
if (!userId) {
  alert('Missing userId—please log in.');
  window.location.href = '/login';
}

// 2) UI refs
const greetingEl       = document.getElementById('greeting');
const moneyEl          = document.getElementById('money');
const chestKeysEl      = document.getElementById('chestKeys');
const totalMoneyRateEl = document.getElementById('totalMoneyRate');
const totalExpRateEl   = document.getElementById('totalExpRate');
const trainerTierEl    = document.getElementById('trainerTier');
const trainerExpEl     = document.getElementById('trainerExp');
const trainerExpNextEl = document.getElementById('trainerExpNext');
const slotsContainer   = document.getElementById('slotsContainer');
const benchGridEl      = document.getElementById('benchGrid');
const shopBtn          = document.getElementById('shopBtn');
const pokedexBtn       = document.getElementById('pokedexBtn');
const saveBtn          = document.getElementById('saveBtn');
const resetBtn         = document.getElementById('resetBtn');
const dispatchIcon     = document.getElementById('dispatchIcon');
const dispatchNotes    = document.getElementById('dispatchNotes');
const closeDispatch    = document.getElementById('closeDispatch');

// 3) State
let money         = 0;
let chestKeys     = 0;
let lastChestTier = 1;
const shards      = { common: 0, rare: 0 };
let chestAwarded  = false;

// Owned = everything not slotted
const ownedPokemons = {};

// Slots array
let slots = [];

// Fixed bench order
let benchOrder = [];

// Candy
let rareCandy = 0;
let epicCandy = 0;

// 4) Helpers
const expToNext      = lvl  => 10 * Math.pow(1.4, lvl - 1);
const totalExpToNext = tier => 20 * Math.pow(1.2, tier - 1);
const upgradeCost    = lvl  => 20 * lvl;

// 5) CENTRAL RENDER
function renderAll() {
  updateMoney();
  updateChestKeys();
  updateTotalRates();
  renderSlots();
  slots.forEach((_, idx) => updateSlotUI(idx));
  updateTrainerStats();
  updateBenchList();
}

// UI updates
function updateMoney()           { moneyEl.textContent          = money.toFixed(1); }
function updateChestKeys()       { chestKeysEl.textContent      = chestKeys; }
function updateTotalRates() {
  let moneyRate = 0, expRate = 0;
  slots.forEach(sl => {
    if (!sl.key) return;
    const p = POKEMON[sl.key];
    const lvl = sl.level;
    expRate   += (p.expRate || p.baseRate) * lvl;
    moneyRate += p.baseRate * lvl * 2;
  });
  totalMoneyRateEl.textContent = moneyRate.toFixed(1);
  totalExpRateEl.textContent   = expRate.toFixed(1);
}

// Dispatch toggle
if (dispatchIcon && dispatchNotes && closeDispatch) {
  dispatchIcon.onclick  = () => { dispatchNotes.style.display = 'block'; };
  closeDispatch.onclick = () => { dispatchNotes.style.display = 'none'; };
}

// 6) UPGRADE logic
function upgradePokemon(key) {
  const idx = slots.findIndex(s => s.key === key);
  if (idx !== -1) return upgradeSlot(idx);

  const stats = ownedPokemons[key];
  if (!stats) return;
  const cost = upgradeCost(stats.level);
  if (money < cost || stats.exp < expToNext(stats.level)) return;

  money -= cost;
  stats.level++;
  saveGame();
  renderAll();
}

// 7) Trainer Tier & EXP
function updateTrainerStats() {
  const totalExp = Object.values(ownedPokemons)
                         .reduce((sum, p) => sum + p.exp, 0);

  let tier = 1, rem = totalExp;
  while (rem >= totalExpToNext(tier)) {
    rem -= totalExpToNext(tier);
    tier++;
  }

  let cumulativeNeeded = 0;
  for (let i = 1; i <= tier; i++) {
    cumulativeNeeded += totalExpToNext(i);
  }

  trainerTierEl.textContent    = tier;
  trainerExpEl.textContent     = totalExp.toFixed(1);
  trainerExpNextEl.textContent = cumulativeNeeded.toFixed(1);

  // Award chest keys on tier-up
  if (tier > lastChestTier) {
    chestKeys     += tier - lastChestTier;
    lastChestTier  = tier;
    saveGame();
  }

  // Unlock new slot at triangular tiers: 1,3,6,10…
  (function() {
    const nextTri = (slots.length+1)*(slots.length+2)/2;
    if (tier >= nextTri) {
      slots.push({ key: null, level: 1, exp: 0 });
      alert(`Congratulations! You’ve unlocked Slot ${slots.length}!`);
      saveGame();
    }
  })();
}

// 8) RENDER SLOTS
function renderSlots() {
  slotsContainer.innerHTML = '';
  slots.forEach((sl, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className     = 'slot-controls';
    wrapper.dataset.index = idx;
    wrapper.draggable     = !!sl.key;
    wrapper.innerHTML = `
      <h3>Slot ${idx+1}</h3>
      <div class="slot-content">
        <img id="slotImg-${idx}" class="slot-img" src="" alt="">
        <div><strong>Name:</strong> <span id="slotName-${idx}">—</span></div>
        <div><strong>Level:</strong> <span id="slotLevel-${idx}">—</span></div>
        <div><strong>EXP:</strong> 
          <span id="slotExp-${idx}">—</span>/ 
          <span id="slotExpNext-${idx}">—</span>
        </div>
        <button id="upgradeBtn-${idx}">
          Upgrade (Cost: <span id="upgradeCost-${idx}">0</span>)
        </button>
        <button id="evolveBtn-${idx}" class="evolve-btn" style="display:none;">
          Evolve
        </button>
      </div>
      <div class="slot-placeholder">Empty Slot</div>
    `;

    // Drag & drop
    wrapper.addEventListener('dragstart', e => {
      if (sl.key) e.dataTransfer.setData('text/plain', sl.key);
    });
    wrapper.addEventListener('dragenter', e => { e.preventDefault(); wrapper.classList.add('drag-over'); });
    wrapper.addEventListener('dragleave', () => wrapper.classList.remove('drag-over'));
    wrapper.addEventListener('dragover', e => e.preventDefault());
    wrapper.addEventListener('drop', e => {
      e.preventDefault();
      wrapper.classList.remove('drag-over');
      const key    = e.dataTransfer.getData('text/plain');
      const oldIdx = slots.findIndex(s => s.key === key);
      if (oldIdx !== -1 && oldIdx !== idx) clearSlot(oldIdx);
      assignSlot(idx, key);
    });

    // Upgrade button
    wrapper.querySelector(`#upgradeBtn-${idx}`)
           .addEventListener('click', () => upgradeSlot(idx));

    // Evolve button
    wrapper.querySelector(`#evolveBtn-${idx}`)
           .addEventListener('click', () => evolveSlot(idx));

    slotsContainer.appendChild(wrapper);
  });
}

function updateSlotUI(idx) {
  const sl          = slots[idx];
  const wrapper     = slotsContainer.children[idx];
  const content     = wrapper.querySelector('.slot-content');
  const placeholder = wrapper.querySelector('.slot-placeholder');
  const evolveBtn   = wrapper.querySelector(`#evolveBtn-${idx}`);

  if (!sl.key) {
    content.style.display     = 'none';
    placeholder.style.display = 'flex';
    return;
  }
  content.style.display     = 'block';
  placeholder.style.display = 'none';

  // Populate
  document.getElementById(`slotImg-${idx}`).src    = `${CLOUDINARY_BASE}/${POKEMON[sl.key].imageId}.png`;
  document.getElementById(`slotImg-${idx}`).alt    = POKEMON[sl.key].name;
  document.getElementById(`slotName-${idx}`).textContent    = POKEMON[sl.key].name;
  document.getElementById(`slotLevel-${idx}`).textContent   = sl.level;
  document.getElementById(`slotExp-${idx}`).textContent     = sl.exp.toFixed(1);
  document.getElementById(`slotExpNext-${idx}`).textContent = expToNext(sl.level).toFixed(1);

  // Upgrade enable
  const cost = upgradeCost(sl.level);
  document.getElementById(`upgradeCost-${idx}`).textContent = cost;
  document.getElementById(`upgradeBtn-${idx}`).disabled     = !(money >= cost && sl.exp >= expToNext(sl.level));

  // Evolution for slots
  const evoInfo = EVOLUTION_MAP[sl.key];
  if (evoInfo && sl.level >= evoInfo.atLevel) {
    evolveBtn.style.display = 'block';
    const rarity  = POKEMON[sl.key].rarity;
    evolveBtn.disabled = rarity === 'common'
                        ? rareCandy < 1
                        : epicCandy < 1;
  } else {
    evolveBtn.style.display = 'none';
  }
}

// 9) UPDATE BENCH LIST
function updateBenchList() {
  // 1) Remove bench entries no longer owned, keep only first occurrence
  benchOrder = benchOrder
    .filter((k, i) => ownedPokemons[k] && benchOrder.indexOf(k) === i);

  // 2) Add any newly-owned Pokémon
  Object.keys(ownedPokemons).forEach(k => {
    if (!benchOrder.includes(k)) benchOrder.push(k);
  });

  benchGridEl.innerHTML = '';

  benchOrder.forEach(key => {
    const stats = ownedPokemons[key];
    const cost  = upgradeCost(stats.level);
    const card  = document.createElement('div');
    card.className = 'bench-card';
    card.draggable = true;
    card.dataset.key = key;
    card.innerHTML = `
      <img src="${CLOUDINARY_BASE}/${POKEMON[key].imageId}.png" alt="${POKEMON[key].name}">
      <div><strong>Name:</strong> ${POKEMON[key].name}</div>
      <div><strong>Level:</strong> ${stats.level}</div>
      <div><strong>EXP:</strong> ${stats.exp.toFixed(1)} / ${expToNext(stats.level).toFixed(1)}</div>
      <button id="upgrade-${key}">Upgrade (Cost: ${cost})</button>
    `;
    benchGridEl.appendChild(card);

    // Upgrade button
    const upBtn = card.querySelector(`#upgrade-${key}`);
    upBtn.disabled = (money < cost || stats.exp < expToNext(stats.level));
    upBtn.addEventListener('click', () => upgradePokemon(key));

    // Evolve on bench
    const evoInfo = EVOLUTION_MAP[key];
    if (evoInfo && stats.level >= evoInfo.atLevel) {
      const evolveBtn = document.createElement('button');
      evolveBtn.className = 'evolve-btn';
      evolveBtn.id = `evolveBench-${key}`;
      evolveBtn.textContent = 'Evolve';
      const rarity = POKEMON[key].rarity;
      evolveBtn.disabled = rarity === 'common'
                           ? rareCandy < 1
                           : epicCandy < 1;
      evolveBtn.addEventListener('click', () => evolveBench(key));
      card.appendChild(evolveBtn);
    }

    // Drag to slot
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', key);
    });
  });
}

// Drop slot → bench
benchGridEl.addEventListener('dragover', e => e.preventDefault());
benchGridEl.addEventListener('drop', e => {
  e.preventDefault();
  const key = e.dataTransfer.getData('text/plain');
  const idx = slots.findIndex(s => s.key === key);
  if (idx !== -1) clearSlot(idx);
});

// 10) EVOLVE SLOT
async function evolveSlot(i) {
  const btn = document.getElementById(`evolveBtn-${i}`);
  if (btn) btn.disabled = true;

  const sl = slots[i];
  if (!sl.key) return;

  const evoInfo = EVOLUTION_MAP[sl.key];
  if (!evoInfo || sl.level < evoInfo.atLevel) return;

  const rarity = POKEMON[sl.key].rarity;
  if ((rarity === 'common' && rareCandy < 1) ||
      (rarity === 'rare'   && epicCandy < 1)) {
    return;
  }

  try {
    const res  = await fetch('/evolve-pokemon', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, slotIndex: i })
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.message || 'Evolution failed');
      return;
    }

    const oldName = POKEMON[json.oldKey].name;
    const newName = POKEMON[json.newKey].name;
    alert(`${oldName} evolved into ${newName}!`);

    delete ownedPokemons[json.oldKey];
    ownedPokemons[json.newKey] = { level: json.newLevel, exp: json.newExp };
    slots[i] = { key: json.newKey, level: json.newLevel, exp: json.newExp };
    rareCandy = json.rareCandy;
    epicCandy = json.epicCandy;

    saveGame();
    renderAll();
  } catch (err) {
    console.error('[Game] evolveSlot error:', err);
    alert('Error evolving Pokémon.');
  }
}

// 11) EVOLVE BENCH
async function evolveBench(pokemonKey) {
  const benchBtn = document.getElementById(`evolveBench-${pokemonKey}`);
  if (benchBtn) benchBtn.disabled = true;

  const stats   = ownedPokemons[pokemonKey];
  const evoInfo = EVOLUTION_MAP[pokemonKey];
  if (!stats || !evoInfo || stats.level < evoInfo.atLevel) return;

  const rarity = POKEMON[pokemonKey].rarity;
  if ((rarity==='common' && rareCandy<1) ||
      (rarity==='rare'   && epicCandy<1)) {
    return;
  }

  try {
    const res  = await fetch('/evolve-bench', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, pokemonKey })
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.message || 'Evolution failed');
      return;
    }

    const oldName = POKEMON[json.oldKey].name;
    const newName = POKEMON[json.newKey].name;
    alert(`${oldName} evolved into ${newName}!`);

    delete ownedPokemons[json.oldKey];
    ownedPokemons[json.newKey] = { level: json.newLevel, exp: json.newExp };
    rareCandy = json.rareCandy;
    epicCandy = json.epicCandy;

    saveGame();
    renderAll();
  } catch (err) {
    console.error('[Game] evolveBench error:', err);
    alert('Error evolving Pokémon.');
  }
}

// 12) assignSlot & clearSlot
function assignSlot(slotIndex, key) {
  const current = slots[slotIndex];
  if (current.key) {
    ownedPokemons[current.key] = { level: current.level, exp: current.exp };
    // only add back if not already in benchOrder
    if (!benchOrder.includes(current.key)) benchOrder.push(current.key);
  }
  slots[slotIndex] = {
    key,
    level: ownedPokemons[key].level,
    exp:   ownedPokemons[key].exp
  };
  // remove the newly-slotted key
  benchOrder = benchOrder.filter(k => k !== key);
  saveGame();
  renderAll();
}

function clearSlot(i) {
  const sl = slots[i];
  if (sl.key) {
    ownedPokemons[sl.key] = { level: sl.level, exp: sl.exp };
    // only add back if not already in benchOrder
    if (!benchOrder.includes(sl.key)) benchOrder.push(sl.key);
  }
  slots[i] = { key: null, level: 1, exp: 0 };
  saveGame();
  renderAll();
}

function upgradeSlot(i) {
  const sl   = slots[i];
  const cost = upgradeCost(sl.level);
  if (!sl.key || money < cost || sl.exp < expToNext(sl.level)) return;
  money -= cost;
  sl.level++;
  saveGame();
  renderAll();
}

// --- Load / Save / Reset ---

async function loadGame() {
  try {
    // 1) Fetch progress from server
    const res  = await fetch(`/progress?userId=${userId}`);
    const json = await res.json();
    if (!json.success || !json.progress) {
      // If no progress, send back to selection
      return window.location.href = `/select?userId=${userId}`;
    }
    const p = json.progress;

    // 2) Clear any previous inventory
    Object.keys(ownedPokemons).forEach(key => {
      delete ownedPokemons[key];
    });

    // 3) Restore slots exactly as saved
    slots = p.slots.map(sl => ({
      key:   sl.key,
      level: sl.level,
      exp:   sl.exp
    }));

    // 4) Restore benchOrder (or infer from full inventory)
    benchOrder = Array.isArray(p.benchOrder)
      ? p.benchOrder.slice()
      : Object.keys(p.ownedPokemons || {});

    // 5) Populate ownedPokemons from server, then strip out any slotted keys
    Object.assign(ownedPokemons, p.ownedPokemons);
    slots.forEach(sl => {
      if (sl.key) {
        delete ownedPokemons[sl.key];
      }
    });

    // 6) Load core state values
    money         = p.money;
    chestKeys     = p.chestKeys || 0;
    lastChestTier = p.lastChestTier || 1;
    shards.common = (p.shards && p.shards.common) || 0;
    shards.rare   = (p.shards && p.shards.rare)   || 0;
    chestAwarded  = !!p.chestAwarded;

    // 7) Load candy counts
    rareCandy     = (p.candies && p.candies.rare) || 0;
    epicCandy     = (p.candies && p.candies.epic) || 0;

    // 8) Greet user
    greetingEl.textContent = `Welcome back, ${p.username}`;
  } catch (e) {
    console.error('Load error:', e);
  }
}


async function saveGame() {
  const payload = {
    userId,
    money,
    shards,
    ownedPokemons,
    slots,
    benchOrder,
    chestAwarded,
    chestKeys,
    lastChestTier,
    candies: { rare: rareCandy, epic: epicCandy }
  };
  console.log('[Game] Saving state:', JSON.stringify(payload, null, 2));
  try {
    await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Save error:', e);
  }
}

async function resetGame() {
  const pwd = prompt('Enter password to reset:');
  if (pwd === null) return;
  try {
    const res  = await fetch('/reset', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, password: pwd })
    });
    if (res.status === 401) {
      alert('Invalid password. Progress not reset.');
      return;
    }
    const json = await res.json();
    if (!json.success) {
      alert('Reset failed: ' + (json.message || 'Unknown error'));
      return;
    }
    alert('Progress reset—pick a new starter.');
    window.location.href = `/select?userId=${userId}`;
  } catch (e) {
    console.error('Reset error:', e);
    alert('Reset failed—see console.');
  }
}

// RESTORE IDLE INCOME every second **with save**
setInterval(async () => {
  if (!slots.length) return;
  slots.forEach(sl => {
    if (!sl.key) return;
    const p = POKEMON[sl.key];
    money += p.baseRate * sl.level * 2;
    sl.exp += (p.expRate || p.baseRate) * sl.level;
    ownedPokemons[sl.key] = { level: sl.level, exp: sl.exp };
  });
  renderAll();
  try { await saveGame(); } catch (e) { console.error('Idle save error:', e); }
}, 1000);

// OVERRIDE Shop & Pokédex buttons so we tick, save, then navigate
;(async () => {
  await loadGame();
  renderAll();

  if (shopBtn) {
    shopBtn.onclick = async () => {
      slots.forEach(sl => {
        if (sl.key) {
          const p = POKEMON[sl.key];
          money += p.baseRate * sl.level * 2;
          sl.exp += (p.expRate || p.baseRate) * sl.level;
          ownedPokemons[sl.key] = { level: sl.level, exp: sl.exp };
        }
      });
      renderAll();
      await saveGame();
      window.location.href = `/shop?userId=${userId}`;
    };
  }

  if (pokedexBtn) {
    pokedexBtn.onclick = async () => {
      slots.forEach(sl => {
        if (sl.key) {
          const p = POKEMON[sl.key];
          money += p.baseRate * sl.level * 2;
          sl.exp += (p.expRate || p.baseRate) * sl.level;
          ownedPokemons[sl.key] = { level: sl.level, exp: sl.exp };
        }
      });
      renderAll();
      await saveGame();
      window.location.href = `/pokedex?userId=${userId}`;
    };
  }

  saveBtn.onclick  = saveGame;
  resetBtn.onclick = resetGame;
})();
