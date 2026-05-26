// ===== 月色精华 Mechanics =====
// Loaded after game_state.js, before team_builder.js

window.__renderYeSeCard = function() {
  var tier = window.__getYeSeTier();
  if (tier === 0) return null;

  var card = document.createElement('div');
  card.className = 'yese-card';
  card.setAttribute('data-name', '月色精华');

  var nameSpan = document.createElement('span');
  nameSpan.className = 'yese-name';
  nameSpan.textContent = '月色精华';
  card.appendChild(nameSpan);

  card.addEventListener('click', function(e) {
    e.stopPropagation();
    window.__showSpecBondInfo('夜之半神', card);
  });

  return card;
};
