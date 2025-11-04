// public/js/shop.js

// 1) Grab userId from URL
const params  = new URLSearchParams(window.location.search);
const userId  = params.get('userId');
if (!userId) {
  alert('Missing userId—please log in.');
  window.location.href = '/';
}

// 2) UI refs
const greetingEl         = document.getElementById('greeting');
const moneyDisplay       = document.getElementById('moneyDisplay');
const chestKeysSpan      = document.getElementById('shopChestKeys');
const commonShardsSpan   = document.getElementById('shopCommonShards');
const rareShardsSpan     = document.getElementById('shopRareShards');
const openBtn            = document.getElementById('openChestBtn');
const openTenBtn         = document.getElementById('openTenBtn');
const messageDiv         = document.getElementById('shopMessage');
const backLink           = document.getElementById('backToGame');

// Candy UI refs
const rareCandyCountSpan = document.getElementById('rareCandyCount');
const epicCandyCountSpan = document.getElementById('epicCandyCount');
const buyRareCandyBtn    = document.getElementById('buyRareCandyBtn');
const buyEpicCandyBtn    = document.getElementById('buyEpicCandyBtn');

// 3) Internal state
let chestKeys    = 0;
let shardsCommon = 0;
let shardsRare   = 0;
let username     = '';
let money        = 0;

// Candy state (inventory & historical)
let rareCandy       = 0;  // current inventory
let epicCandy       = 0;  // current inventory
let rareCandyBought = 0;  // total ever bought
let epicCandyBought = 0;  // total ever bought

// 4) updateShopUI()
//    Refresh counters and enables/disables the buttons
function updateShopUI() {
  // Core counters
  moneyDisplay.textContent       = money;
  chestKeysSpan.textContent      = chestKeys;
  commonShardsSpan.textContent   = shardsCommon;
  rareShardsSpan.textContent     = shardsRare;

  // Enable/disable “Open Chest” buttons
  openBtn.disabled    = (chestKeys < 1);
  openTenBtn.disabled = (chestKeys < 10);

  // Candy counters
  rareCandyCountSpan.textContent = rareCandy;
  epicCandyCountSpan.textContent = epicCandy;

  // Compute candy prices
  const priceRareCandy = Math.round(500 * Math.pow(1.5, rareCandyBought));   // ← updated
const priceEpicCandy = Math.round(5000 * Math.pow(1.25, epicCandyBought)); // ← updated

  buyRareCandyBtn.textContent = `Buy Rare Candy (Cost: ${priceRareCandy})`;
  buyEpicCandyBtn.textContent = `Buy Epic Candy (Cost: ${priceEpicCandy})`;

  // Enable/disable candy‐buying based on money
  buyRareCandyBtn.disabled = (money < priceRareCandy);
  buyEpicCandyBtn.disabled = (money < priceEpicCandy);
}

// 5) PAGE INIT: fetch /progress & render
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // (A) Fetch /progress
    const res  = await fetch(`/progress?userId=${userId}`);
    const json = await res.json();
    if (!json.success || !json.progress) {
      window.location.href = '/';
      return;
    }
    const p = json.progress;
    username     = p.username || '';
    if (!username) {
      window.location.href = '/';
      return;
    }

    // (B) Populate core state
    money        = typeof p.money === 'number'         ? p.money         : 0;
    chestKeys    = typeof p.chestKeys === 'number'     ? p.chestKeys     : 0;
    shardsCommon = (p.shards && typeof p.shards.common === 'number') ? p.shards.common : 0;
    shardsRare   = (p.shards && typeof p.shards.rare   === 'number') ? p.shards.rare   : 0;

    // (C) Populate candy state
    rareCandy       = (p.candies && typeof p.candies.rare       === 'number') ? p.candies.rare       : 0;
    epicCandy       = (p.candies && typeof p.candies.epic       === 'number') ? p.candies.epic       : 0;
    rareCandyBought = (p.candiesBought && typeof p.candiesBought.rare === 'number') ? p.candiesBought.rare : 0;
    epicCandyBought = (p.candiesBought && typeof p.candiesBought.epic === 'number') ? p.candiesBought.epic : 0;

    // (D) Populate greeting & shard displays
    greetingEl.textContent = `Welcome, ${username}`;

    // (E) Update all UI elements
    updateShopUI();
  } catch (err) {
    console.error('[Shop] load error:', err);
    window.location.href = '/';
  }
});

// 6) “Back to Game” link
backLink.addEventListener('click', () => {
  window.location.href = `/game?userId=${userId}&t=${Date.now()}`;
});

// 7) Open a single chest
openBtn.addEventListener('click', async () => {
  openBtn.disabled    = true;
  openTenBtn.disabled = true;

  try {
    const res  = await fetch('/open-chest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, count: 1 })
    });
    const json = await res.json();

    if (!json.success) {
      alert('Error opening chest: ' + (json.message || 'Unknown'));
      updateShopUI();
      return;
    }

    // 1) Update local state
    chestKeys = json.newChestKeys;
    if (json.newCommonShards != null) {
      shardsCommon = json.newCommonShards;
    }
    if (json.newRareShards != null) {
      shardsRare = json.newRareShards;
    }

    // 2) Build popup text (same wording as for 10 chests)
    let popupText = '';
    if (json.commonGained != null) {
      popupText += `You gained <strong>${json.commonGained}</strong> common shards!<br>`;
    }
    if (json.rareGained != null) {
      popupText += `You gained <strong>${json.rareGained}</strong> rare shards!`;
    }
    if (json.gotRarePokemon) {
      const rareKey = json.rareKey;
      if (rareKey) {
        popupText += `🎉 You also received <strong>${POKEMON[rareKey].name}</strong>!`;
      }
    }

    messageDiv.innerHTML     = popupText;
    messageDiv.style.display = 'block';

    // 3) Update UI counters
    updateShopUI();
  } catch (e) {
    console.error('[Shop] open-chest error:', e);
    alert('Error opening chest—see console.');
  } finally {
    // Re-enable based on updated chestKeys
    openBtn.disabled    = (chestKeys < 1);
    openTenBtn.disabled = (chestKeys < 10);
  }
});

// 8) Open ten chests at once
openTenBtn.addEventListener('click', async () => {
  openBtn.disabled    = true;
  openTenBtn.disabled = true;

  try {
    const res  = await fetch('/open-chest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, count: 10 })
    });
    const json = await res.json();

    if (!json.success) {
      alert('Error opening chests: ' + (json.message || 'Unknown'));
      updateShopUI();
      return;
    }

    // 1) Update local state
    chestKeys = json.newChestKeys;
    if (json.newCommonShards != null) {
      shardsCommon = json.newCommonShards;
    }
    if (json.newRareShards != null) {
      shardsRare = json.newRareShards;
    }

    // 2) Build popup text (same wording)
    let popupText = '';
    if (json.commonGained != null) {
      popupText += `You gained <strong>${json.commonGained}</strong> common shards!<br>`;
    }
    if (json.rareGained != null) {
      popupText += `You gained <strong>${json.rareGained}</strong> rare shards!`;
    }
    if (json.gotRarePokemon) {
      const rareKey = json.rareKey;
      if (rareKey) {
        popupText += `🎉 You also received <strong>${POKEMON[rareKey].name}</strong>!`;
      }
    }

    messageDiv.innerHTML     = popupText;
    messageDiv.style.display = 'block';

    // 3) Update UI counters
    updateShopUI();
  } catch (e) {
    console.error('[Shop] open-chest (×10) error:', e);
    alert('Error opening chests—see console.');
  } finally {
    // Re-enable based on updated chestKeys
    openBtn.disabled    = (chestKeys < 1);
    openTenBtn.disabled = (chestKeys < 10);
  }
});

// 9) Buy Rare Candy
buyRareCandyBtn.addEventListener('click', async () => {
  buyRareCandyBtn.disabled = true;
  buyEpicCandyBtn.disabled = true;

  try {
    const res  = await fetch('/shop/buy-candy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: 'rare' })
    });
    const json = await res.json();

    if (!json.success) {
      alert(json.message || 'Error purchasing Rare Candy');
      updateShopUI();
      return;
    }

    // 1) Update local state from server response
    money            = json.newMoney;
    rareCandy        = json.ownedCandies;
    rareCandyBought  = json.totalBought;

    // 2) Update UI: money, candy count, next price
    updateShopUI();
  } catch (err) {
    console.error('[Shop] buyRareCandy error:', err);
    alert('Error buying Rare Candy—see console.');
  }
});

// 10) Buy Epic Candy
buyEpicCandyBtn.addEventListener('click', async () => {
  buyRareCandyBtn.disabled = true;
  buyEpicCandyBtn.disabled = true;

  try {
    const res  = await fetch('/shop/buy-candy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: 'epic' })
    });
    const json = await res.json();

    if (!json.success) {
      alert(json.message || 'Error purchasing Epic Candy');
      updateShopUI();
      return;
    }

    // 1) Update local state from server response
    money           = json.newMoney;
    epicCandy       = json.ownedCandies;
    epicCandyBought = json.totalBought;

    // 2) Update UI: money, candy count, next price
    updateShopUI();
  } catch (err) {
    console.error('[Shop] buyEpicCandy error:', err);
    alert('Error buying Epic Candy—see console.');
  }
});
