// ===== 步离人 Mechanics =====
// Loaded after game_state.js, before team_builder.js

window.__renderBuliCard = function() {
  var tier = window.__getLangShouTier();
  if (tier === 0) return null;

  var card = document.createElement('div');
  card.className = 'buli-card';
  card.setAttribute('data-name', '步离人');

  var nameSpan = document.createElement('span');
  nameSpan.className = 'buli-name';
  nameSpan.textContent = '步离人';
  card.appendChild(nameSpan);

  card.addEventListener('click', function(e) {
    e.stopPropagation();
    window.__showSpecBondInfo('狼狩', card);
  });

  return card;
};
