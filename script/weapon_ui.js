// ===== Weapon Info Popup & Merge Popups =====
// Loaded after game_state.js, before team_builder.js

window.__dismissWeaponInfoPopup = function() {
  if (window.__weaponInfoPopupEl) {
    window.__weaponInfoPopupEl.remove();
    window.__weaponInfoPopupEl = null;
  }
};

window.__showWeaponInfoPopup = function(weaponName, anchorEl, slotIndex) {
  window.__dismissWeaponInfoPopup();
  var asIngredient = window.__weaponAsIngredient[weaponName] || [];
  var asResult = window.__weaponAsResult[weaponName] || [];
  var limits = window.__LIMITS?.[weaponName] || null;
  var stats = window.__STATS?.[weaponName] || null;

  if (!asIngredient.length && !asResult.length && !limits && !stats) return;

  var popup = document.createElement('div');
  popup.className = 'weapon-info-popup';

  if (stats) {
    var statsDiv = document.createElement('div');
    statsDiv.className = 'wip-stats';
    if (stats['基础属性']?.length) {
      var baseSection = document.createElement('div');
      baseSection.className = 'wip-section wip-base';
      baseSection.innerHTML = '<div class="wip-title">基础属性</div>';
      stats['基础属性'].forEach(function(s) {
        var line = document.createElement('div');
        line.className = 'wip-line wip-stat';
        line.textContent = s;
        baseSection.appendChild(line);
      });
      statsDiv.appendChild(baseSection);
    }
    if (stats['描述']) {
      var descSection = document.createElement('div');
      descSection.className = 'wip-section wip-desc';
      descSection.innerHTML = '<div class="wip-title">描述</div>';
      var line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = stats['描述'].replace(/\n/g, '<br>');
      descSection.appendChild(line);
      statsDiv.appendChild(descSection);
    }
    popup.appendChild(statsDiv);
  }

  var isAha = typeof slotIndex === 'number' && slotIndex < 0;
  var ahaAllowed = new Set([
    ...(window.__EQUIPMENTS?.['进阶装备'] || []),
    ...(window.__EQUIPMENTS?.['流派星徽'] || []),
    ...(window.__EQUIPMENTS?.['阵营星徽'] || [])
  ]);
  if (asIngredient.length) {
    var section = document.createElement('div');
    section.className = 'wip-section';
    section.innerHTML = '<div class="wip-title">参与合成</div>';
    var filtered = isAha ? asIngredient.filter(function(entry) { return ahaAllowed.has(entry.result); }) : asIngredient;
    filtered.forEach(function(entry) {
      var line = document.createElement('div');
      line.className = 'wip-line';
      var clickable = slotIndex !== undefined;
      if (isAha && clickable) {
        var ahaIdx = -(slotIndex + 1);
        if (window.__ahaSynth[ahaIdx] && entry.result !== window.__ahaSynthR[ahaIdx]) clickable = false;
      }
      var resClass = clickable ? 'wip-result wip-clickable' : 'wip-result';
      var formula = '<span class="wip-item">' + weaponName + '</span><span class="wip-plus">+</span><span class="wip-item">' + entry.other + '</span>';
      if (entry.extras && entry.extras.length) {
        entry.extras.forEach(function(e) { formula += '<span class="wip-plus">+</span><span class="wip-item">' + e + '</span>'; });
      }
      formula += '<span class="wip-arrow">→</span><span class="' + resClass + '">' + entry.result + '</span>';
      line.innerHTML = formula;
      if (clickable) {
        line.querySelector('.wip-clickable').addEventListener('click', function(e) {
          e.stopPropagation();
          if (isAha) {
            var ahaIdx = -(slotIndex + 1);
            var otherIdx = window.__ahaWeapons.indexOf(entry.other);
            if (window.__ahaWeapons[ahaIdx] === weaponName) {
              if (window.__ahaSynth[ahaIdx] && entry.result !== window.__ahaSynthR[ahaIdx]) return;
              var evolved = window.__evolveAhaResult(entry.result);
              window.__ahaWeapons[ahaIdx] = evolved;
              window.__ahaSynth[ahaIdx] = true;
              window.__ahaSynthR[ahaIdx] = evolved;
              if (otherIdx >= 0 && otherIdx !== ahaIdx) {
                window.__ahaWeapons[otherIdx] = null;
              }
            }
          } else {
            var weapons = window.__slotWeapons[slotIndex];
            var ai = weapons.indexOf(weaponName);
            if (ai >= 0) weapons.splice(ai, 1);
            var bi = weapons.indexOf(entry.other);
            if (bi >= 0) weapons.splice(bi, 1);
            window.__consumeExtraIngredients(weapons, entry.result, weaponName, entry.other);
            weapons.push(entry.result);
          }
          window.__dismissWeaponInfoPopup();
          window.__refreshWeaponState();
        });
      }
      section.appendChild(line);
    });
    popup.appendChild(section);
  }

  if (asResult.length) {
    var section = document.createElement('div');
    section.className = 'wip-section';
    section.innerHTML = '<div class="wip-title">获取方式</div>';
    asResult.forEach(function(recipe) {
      var line = document.createElement('div');
      line.className = 'wip-line';
      var formula = recipe.map(function(ing, i) {
        return i === 0
          ? '<span class="wip-item">' + ing + '</span>'
          : '<span class="wip-plus">+</span><span class="wip-item">' + ing + '</span>';
      }).join('');
      formula += '<span class="wip-arrow">→</span><span class="wip-result">' + weaponName + '</span>';
      line.innerHTML = formula;
      section.appendChild(line);
    });
    popup.appendChild(section);
  }

  if (limits) {
    var section = document.createElement('div');
    section.className = 'wip-section';
    section.innerHTML = '<div class="wip-title">激活条件</div>';
    limits.forEach(function(entry) {
      var line = document.createElement('div');
      line.className = 'wip-line wip-limit';
      line.textContent = entry[0] + ' ≥ ' + entry[1];
      section.appendChild(line);
    });
    popup.appendChild(section);
  }

  var rect = anchorEl.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.visibility = 'hidden';
  popup.style.left = '0px';
  popup.style.top = '0px';
  popup.setAttribute('data-weapon', weaponName);
  if (slotIndex !== undefined) popup.setAttribute('data-slot', slotIndex);
  document.body.appendChild(popup);

  var popupRect = popup.getBoundingClientRect();
  var left = rect.right + 8;
  var top = rect.top;
  if (left + popupRect.width > window.innerWidth - 8) left = rect.left - popupRect.width - 8;
  if (top + popupRect.height > window.innerHeight - 8) top = window.innerHeight - popupRect.height - 8;
  if (left < 8) left = 8;
  if (top < 8) top = 8;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.visibility = '';

  window.__weaponInfoPopupEl = popup;
};

window.__dismissMergePopups = function() {
  (window.__mergePopupEls || []).forEach(function(el) { el.remove(); });
  window.__mergePopupEls = [];
};

window.__showMergePopup = function(slotIndex, results) {
  if ((window.__mergePopupEls || []).some(function(el) { return el.getAttribute('data-slot') === String(slotIndex); })) return;
  var slotEl;
  if (slotIndex < 0) {
    var ahaIdx = -(slotIndex + 1);
    slotEl = document.querySelector('.aha-weapon-slot[data-aha-slot="' + ahaIdx + '"]');
  } else {
    slotEl = document.querySelector('.card-slot[data-slot="' + slotIndex + '"]');
  }
  if (!slotEl) return;
  if (!window.__mergePopupEls) window.__mergePopupEls = [];

  var popup = document.createElement('div');
  popup.className = 'merge-popup';
  popup.setAttribute('data-slot', slotIndex);
  popup.innerHTML = results.map(function(r) { return '<span class="merge-result-name">' + r + '</span>'; }).join('');

  slotEl.appendChild(popup);
  window.__mergePopupEls.push(popup);
};

window.__showAllMergePopups = function(weaponName) {
  window.__dismissMergePopups();
  var effectiveMax = window.__getEffectiveMaxSlots();
  for (var i = 0; i < effectiveMax; i++) {
    if (!window.__slotCards[i]) continue;
    var weapons = window.__slotWeapons[i];
    var results = [];
    for (var j = 0; j < weapons.length; j++) {
      var existing = weapons[j];
      var result = window.__findMergeResult(weaponName, existing, weapons);
      if (result) results.push(result);
    }
    if (results.length) window.__showMergePopup(i, results);
  }
};

window.__findMergeResult = function(weaponA, weaponB, weapons) {
  var merge = window.__MERGE;
  if (!merge) return null;
  for (var result in merge) {
    var recipes = merge[result];
    if (!Array.isArray(recipes)) continue;
    for (var r = 0; r < recipes.length; r++) {
      var recipe = recipes[r];
      if (!Array.isArray(recipe) || recipe.length < 2) continue;
      if ((recipe[0] === weaponA && recipe[1] === weaponB) ||
          (recipe[0] === weaponB && recipe[1] === weaponA)) {
        if (recipe.length > 2 && weapons) {
          var remaining = recipe.slice(2);
          var available = [].concat(weapons);
          var b = available.indexOf(weaponB);
          if (b >= 0) available.splice(b, 1);
          var ok = remaining.every(function(r) {
            var i = available.indexOf(r);
            if (i >= 0) { available.splice(i, 1); return true; }
            return false;
          });
          if (!ok) continue;
        }
        return result;
      }
    }
  }
  return null;
};

window.__consumeExtraIngredients = function(weapons, result, weaponA, weaponB) {
  var merge = window.__MERGE;
  if (!merge) return;
  var recipes = merge[result];
  if (!Array.isArray(recipes)) return;
  for (var r = 0; r < recipes.length; r++) {
    var recipe = recipes[r];
    if (!Array.isArray(recipe)) continue;
    if ((recipe[0] === weaponA && recipe[1] === weaponB) ||
        (recipe[0] === weaponB && recipe[1] === weaponA)) {
      for (var i = 2; i < recipe.length; i++) {
        var ri = weapons.indexOf(recipe[i]);
        if (ri >= 0) weapons.splice(ri, 1);
      }
      return;
    }
  }
};

window.__canKeepStarEmblem = function(result, charName, weapons) {
  var bond = window.__getStarEmblemBond(result);
  if (!bond) return true;
  var hasBond = (window.__charBonds || {})[charName]?.includes(bond);
  var hasOtherStar = weapons.some(function(w) { return window.__getStarEmblemBond(w) === bond; });
  return !hasBond && !hasOtherStar;
};
