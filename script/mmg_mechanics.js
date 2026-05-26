// ===== 猫猫糕 Mechanics =====
// Loaded after game_state.js, before team_builder.js

window.__renderMMGCard = function() {
  var tier = window.__getMMGTier();
  if (tier === 0) return null;

  var card = document.createElement('div');
  card.className = 'mmg-card';
  card.setAttribute('data-name', '猫猫糕');

  var nameSpan = document.createElement('span');
  nameSpan.className = 'mmg-name';
  nameSpan.textContent = '猫猫糕';
  card.appendChild(nameSpan);

  card.addEventListener('click', function(e) {
    e.stopPropagation();
    window.__showSpecBondInfo('银河学者', card);
  });

  return card;
};
