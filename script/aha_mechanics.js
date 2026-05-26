// ===== AHa Mechanics =====
// Loaded after game_state.js, before team_builder.js

window.__initAhaWeapons = function(BASIC_EQUIPS) {
  for (var i = 0; i < 3; i++) {
    var w = BASIC_EQUIPS[Math.floor(Math.random() * BASIC_EQUIPS.length)] || null;
    window.__ahaWeapons[i] = w;
    window.__ahaInitW[i] = w;
  }
};

window.__evolveAhaResult = function(result) {
  var count = (window.__computeBondCounts()['欢愉'] || 0);
  if (count >= 7) {
    var evolved = result + '•特权';
    var privSet = window.__EQUIPMENTS && window.__EQUIPMENTS['特权装备'];
    if (privSet && privSet.indexOf(evolved) >= 0) return evolved;
  }
  return result;
};

window.__getFirstAvailableAhaSlot = function() {
  var tier = window.__getHuanYuTier();
  for (var w = 0; w < tier; w++) {
    if (!window.__ahaSynth[w]) return w;
    if (window.__ahaWeapons[w] !== window.__ahaSynthR[w]) return w;
  }
  return -1;
};

window.__handleAhaWeaponDrop = function(weaponName, slotIdx) {
  var equipped = window.__ahaWeapons[slotIdx];
  if (!equipped) return;
  if (window.__ahaSynth[slotIdx]) {
    var result = window.__findMergeResult(weaponName, equipped, window.__ahaWeapons);
    if (!result || result !== window.__ahaSynthR[slotIdx]) return;
    var evolved = window.__evolveAhaResult(result);
    window.__ahaWeapons[slotIdx] = evolved;
    window.__ahaSynthR[slotIdx] = evolved;
    window.__refreshWeaponState();
    return;
  }
  var result = window.__findMergeResult(weaponName, equipped, window.__ahaWeapons);
  if (!result) return;
  var evolved = window.__evolveAhaResult(result);
  window.__ahaWeapons[slotIdx] = evolved;
  window.__ahaSynth[slotIdx] = true;
  window.__ahaSynthR[slotIdx] = evolved;
  window.__refreshWeaponState();
};
