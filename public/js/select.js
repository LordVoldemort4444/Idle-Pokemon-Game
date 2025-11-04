// public/js/select.js

// Grab userId so we can redirect after choosing
const params = new URLSearchParams(window.location.search);
const userId = params.get('userId');
if (!userId) {
  alert('No userId—please log in.');
  window.location.href = '/login';
}

// Build the grid of starter cards
(async () => {
  const grid = document.getElementById('starterGrid');
  // Only use the three starters
  for (const key of ['bulbasaur', 'charmander', 'squirtle']) {
    const poke = POKEMON[key];
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.innerHTML = `
      <img src="${CLOUDINARY_BASE}/${poke.imageId}.png" alt="${poke.name}">
      <h2>${poke.name}</h2>
      <button id="btn-${key}">Choose ${poke.name}</button>
    `;
    grid.appendChild(card);
    document.getElementById(`btn-${key}`).onclick = () => chooseStarter(key);
  }
})();

// When a starter is chosen, initialize their progress and go to /game
async function chooseStarter(key) {
  const init = {
    userId,
    money: 0,
    shards: { common: 0 },
    ownedPokemons: { [key]: { level: 1, exp: 0 } },
    slots: [{ key: null, level: 1, exp: 0 }],
    chestAwarded: false
  };
  await fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(init)
  });
  window.location.href = `/game?userId=${userId}`;
}
