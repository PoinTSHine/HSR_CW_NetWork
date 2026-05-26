// ===== Star Hunter Mechanics =====
// Loaded after game_state.js, before team_builder.js

window.__updateStarHunters = function() {
  var counts = window.__computeBondCounts();
  var starCount = counts['星核猎手'] || 0;
  var reqs = window.__CAMP_NUM?.['星核猎手'];
  if (!reqs || starCount < reqs[0]) {
    window.__starHunters = [];
    return;
  }
  var maxHunters = (reqs.length >= 3 && starCount >= reqs[2]) ? 2 : 1;
  var members = (window.__CAMP_MEM?.['星核猎手'] || []).filter(function(ch) {
    return window.__slotCards.indexOf(ch) >= 0;
  });
  var equipped = members.map(function(ch) {
    var total = 0;
    window.__slotCards.forEach(function(c, i) {
      if (c === ch) total += (window.__slotWeapons[i] || []).length;
    });
    return { name: ch, count: total };
  });
  equipped.sort(function(a, b) {
    if (b.count !== a.count) return b.count - a.count;
    var aOrder = 0, bOrder = 0;
    window.__slotCards.forEach(function(c, i) {
      if (c === a.name) aOrder = Math.max(aOrder, window.__slotEquipOrder[i] || 0);
      if (c === b.name) bOrder = Math.max(bOrder, window.__slotEquipOrder[i] || 0);
    });
    if (aOrder !== bOrder) return bOrder - aOrder;
    // Fallback: place order
    window.__slotCards.forEach(function(c, i) {
      if (c === a.name) aOrder = Math.max(aOrder, window.__slotPlaceOrder[i] || 0);
      if (c === b.name) bOrder = Math.max(bOrder, window.__slotPlaceOrder[i] || 0);
    });
    return bOrder - aOrder;
  });
  window.__starHunters = equipped.slice(0, maxHunters).map(function(e) { return e.name; });
};
