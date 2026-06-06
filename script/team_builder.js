// ===== Team Builder =====
(function () {
  const campData = window.__CAMP_MEM;
  const spendData = window.__CHR_SPEND || {};
  const posData = window.__CHR_POSITION || {};
  const campNum = window.__CAMP_NUM || {};
  const campColors = window.__CAMP_COLORS || {};

  // Build character map: name -> { spend, position, bonds }
  const charMap = {};
  const allChars = new Set();
  const charBonds = {};

  for (const [bond, chars] of Object.entries(campData)) {
    chars.forEach(ch => {
      allChars.add(ch);
      (charBonds[ch] ??= []).push(bond);
    });
  }

  const spendLookup = {};
  for (const [k, chars] of Object.entries(spendData)) chars.forEach(ch => spendLookup[ch] = k);
  const posLookup = {};
  for (const [k, chars] of Object.entries(posData)) chars.forEach(ch => posLookup[ch] = k);

  for (const ch of allChars) {
    charMap[ch] = { spend: spendLookup[ch] || null, position: posLookup[ch] || null, bonds: charBonds[ch] };
  }

  // Mutual exclusion rules
  const MUTUAL_EXCLUSIONS = [['开拓者·记忆', '开拓者·欢愉']];

  function removeMutualExclusion(char, skipIndex) {
    for (const [a, b] of MUTUAL_EXCLUSIONS) {
      if (char !== a && char !== b) continue;
      const other = char === a ? b : a;
      const idx = window.__slotCards.indexOf(other);
      if (idx >= 0 && idx !== skipIndex) window.__slotCards[idx] = null;
    }
  }

  function createSpendBadge(spend, cssPrefix) {
    const badge = document.createElement('span');
    badge.className = cssPrefix + 'spend spend-' + spend;
    badge.textContent = spend === 'special' ? '特' : spend + '费';
    return badge;
  }

  function createPositionIndicator(position, cssPrefix) {
    const span = document.createElement('span');
    span.className = cssPrefix + 'pos';
    const topClass = position === '后台' ? 'hollow' : 'solid';
    const bottomClass = position === '前台' ? 'hollow' : 'solid';
    span.innerHTML = `<span class="pb ${topClass}"></span><span class="pb ${bottomClass}"></span>`;
    return span;
  }

  // State
  const TOTAL_FIXED_TOP = 4;
  const INITIAL_BOTTOM = 6;
  const independentSet = new Set(window.__CAMP_CLASS?.['独立羁绊'] || []);
  const hackerMods = new Set(window.__EQUIPMENTS?.['骇客改件'] || []);
  const repeatableEquips = new Set([
    ...(window.__EQUIPMENTS?.['进阶装备'] || []),
    ...(window.__EQUIPMENTS?.['特权装备'] || []),
    ...(window.__EQUIPMENTS?.['垃圾'] || [])
  ]);
  window.__slotCards = new Array(TOTAL_FIXED_TOP + INITIAL_BOTTOM).fill(null);
  window.__slotWeapons = new Array(TOTAL_FIXED_TOP + INITIAL_BOTTOM).fill(null).map(() => []);
  window.__slotDiceWeapons = new Array(TOTAL_FIXED_TOP + INITIAL_BOTTOM).fill(null).map(() => new Set());
  window.__maxSlots = window.__slotCards.length;
  window.__slotPlaceOrder = window.__slotCards.map(() => 0);
  window.__slotEquipOrder = window.__slotCards.map(() => 0);
  window.__placeOrderSeq = 0;
  window.__equipOrderSeq = 0;

  // 阿哈 state
  const BASIC_EQUIPS = window.__EQUIPMENTS?.['简易装备'] || [];
  window.__ahaWeapons = [null, null, null];

  // 盛会之星巨星
  window.__superstar = null;
  window.__superstarPopupEl = null;
  window.__ahaInitW = [null, null, null];
  window.__ahaSynth = [false, false, false];
  window.__ahaSynthR = [null, null, null];
  window.__prevHYTier = 0;
  window.__prevLSTier = 0;

  // 星核猎手猎星人
  window.__starHunters = [];

  function initAhaWeapons() { window.__initAhaWeapons(BASIC_EQUIPS); }

  // DOM refs
  const topRow = document.getElementById('top-row');
  const bottomRow = document.getElementById('bottom-row');
  const slotArea = document.getElementById('slot-area');
  const compendiumList = document.getElementById('compendium-list');
  const weaponList = document.getElementById('weapon-list');
  const fieldBonds = document.getElementById('field-bonds');
  const recycleZone = document.getElementById('recycle-zone');
  window.__compendiumMode = 'character'; // 'character' | 'weapon'
  window.__draggedWeaponName = null;

  // Lift overflow during drag so ghost isn't clipped
  const teamBuilder = document.getElementById('team-builder');
  document.addEventListener('dragstart', () => { teamBuilder.style.overflow = 'visible'; });
  document.addEventListener('dragend', () => {
    teamBuilder.style.overflow = '';
    window.__draggedWeaponName = null;
    dismissMergePopups();
  });

  // ===== Merge Info Lookups =====
  window.__weaponAsIngredient = {}; // weapon → [{other, result}]
  window.__weaponAsResult = {};     // weapon → [[a, b]]
  (function buildMergeLookups() {
    const merge = window.__MERGE;
    if (!merge) return;
    for (const [result, recipes] of Object.entries(merge)) {
      if (!Array.isArray(recipes)) continue;
      (window.__weaponAsResult[result] = (window.__weaponAsResult[result] || [])).push(
        ...recipes.filter(r => Array.isArray(r) && r.length >= 2)
      );
      for (const recipe of recipes) {
        if (!Array.isArray(recipe) || recipe.length < 2) continue;
        const extras = recipe.length > 2 ? recipe.slice(2) : [];
        (window.__weaponAsIngredient[recipe[0]] = (window.__weaponAsIngredient[recipe[0]] || [])).push({ other: recipe[1], extras, result });
        if (recipe[0] !== recipe[1]) {
          (window.__weaponAsIngredient[recipe[1]] = (window.__weaponAsIngredient[recipe[1]] || [])).push({ other: recipe[0], extras, result });
        }
      }
    }
  })();

  window.__weaponInfoPopupEl = null;

  function dismissWeaponInfoPopup() { window.__dismissWeaponInfoPopup(); }
  function showWeaponInfoPopup(a,b,c) { window.__showWeaponInfoPopup(a,b,c); }

  // Dismiss weapon info popup on outside click
  document.addEventListener('click', (e) => {
    if (window.__weaponInfoPopupEl && !e.target.closest('.weapon-item') && !e.target.closest('.weapon-info-popup') && !e.target.closest('.card-weapon-slot') && !e.target.closest('.aha-weapon-slot')) {
      dismissWeaponInfoPopup();
    }
    if (window.__bondInfoPopupEl && !e.target.closest('.bond-info-popup') && !e.target.closest('.field-bond-item')) {
      dismissBondInfoPopup();
    }
    if (window.__superstarPopupEl && !e.target.closest('.superstar-popup')) {
      dismissSuperstarPopup();
    }
  });

  // ===== Search (delegated to shared utility) =====
  window.__searchedChar = null;
  window.__searchedBond = null;

  function refreshAfterSearch() {
    renderSlots();
    reorderCompendium();
    compendiumList.scrollTop = 0;
  }

  function getSuperstarCandidates() {
    var bond = '盛会之星';
    var bondChars = campData[bond] || [];
    var fieldChars = window.__slotCards.filter(Boolean);
    var candidates = [];
    fieldChars.forEach(function(ch) {
      if (bondChars.includes(ch)) candidates.push(ch);
    });
    // Also include characters with 盛会之星星徽 equipped
    var effectiveMax = getEffectiveMaxSlots();
    for (var i = 0; i < effectiveMax; i++) {
      var ch = window.__slotCards[i];
      if (!ch || candidates.indexOf(ch) >= 0) continue;
      if ((window.__slotWeapons[i] || []).some(function(w) { return getStarEmblemBond(w) === bond; })) {
        candidates.push(ch);
      }
    }
    return candidates;
  }

  function dismissSuperstarPopup() {
    if (window.__superstarPopupEl) {
      window.__superstarPopupEl.remove();
      window.__superstarPopupEl = null;
    }
  }

  function showSuperstarSelection() {
    dismissSuperstarPopup();
    var candidates = getSuperstarCandidates();
    if (candidates.length === 0) return;

    var popup = document.createElement('div');
    popup.className = 'superstar-popup';
    popup.innerHTML = '<div class="superstar-popup-title">选择巨星</div>' +
      '<div class="superstar-popup-desc">选择1名【盛会之星】角色作为巨星，获得该角色对应的独特加成</div>';

    candidates.forEach(function(ch) {
      var btn = document.createElement('div');
      btn.className = 'superstar-popup-item';
      btn.textContent = ch;
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.__superstar = ch;
        dismissSuperstarPopup();
        renderSlots();
        updateLeftPanel();
      });
      popup.appendChild(btn);
    });

    popup.style.position = 'fixed';
    popup.style.visibility = 'hidden';
    document.body.appendChild(popup);

    var popupRect = popup.getBoundingClientRect();
    var left = Math.max(8, (window.innerWidth - popupRect.width) / 2);
    var top = Math.max(8, (window.innerHeight - popupRect.height) / 2);
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.visibility = 'visible';
    window.__superstarPopupEl = popup;
  }

  var teamSearchInput = document.getElementById('team-search-input');
  var teamSearchResult = document.getElementById('team-search-result');

  function clearWeaponSearch() {
    weaponList.querySelectorAll('.weapon-item.weapon-searched').forEach(function(el) {
      el.classList.remove('weapon-searched');
    });
  }

  function clearSearchedState() {
    window.__searchedChar = null;
    window.__searchedBond = null;
    clearWeaponSearch();
  }

  function highlightWeapon(value) {
    switchCompendiumMode('weapon');
    var weaponItem = weaponList.querySelector('.weapon-item[data-weapon="' + CSS.escape(value) + '"]');
    if (!weaponItem) return;
    clearWeaponSearch();
    weaponItem.classList.add('weapon-searched');
    weaponList.querySelectorAll('.weapon-section-header.expanded').forEach(function(h) { h.classList.remove('expanded'); });
    weaponList.querySelectorAll('.weapon-section-body.expanded').forEach(function(b) { b.classList.remove('expanded'); });
    var sectionBody = weaponItem.closest('.weapon-section-body');
    if (sectionBody) {
      sectionBody.classList.add('expanded');
      sectionBody.previousElementSibling.classList.add('expanded');
    }
    weaponItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  __createFuzzySearch({
    input: teamSearchInput,
    btn: document.getElementById('team-search-btn'),
    resultEl: teamSearchResult,
    container: document.getElementById('team-search-box'),
    sources: [
      {
        name: '角色',
        items: new Set(allChars),
        onSelect: function(v) {
          switchCompendiumMode('character');
          window.__searchedChar = v;
          window.__searchedBond = null;
          if (window.__slotCards.indexOf(v) >= 0) {
            teamSearchResult.textContent = v + ' 已在场上';
            teamSearchResult.className = 'found';
          }
          refreshAfterSearch();
        },
      },
      {
        name: '羁绊',
        items: new Set(Object.keys(campData)),
        onSelect: function(v) {
          switchCompendiumMode('character');
          window.__searchedChar = null;
          window.__searchedBond = v;
          refreshAfterSearch();
        },
      },
      {
        name: '装备',
        items: new Set(
          window.__EQUIPMENTS ? Object.values(window.__EQUIPMENTS).flat() : []
        ),
        onSelect: function(v) {
          window.__searchedChar = null;
          window.__searchedBond = null;
          highlightWeapon(v);
          refreshAfterSearch();
        },
      },
    ],
    onEmpty: function() {
      clearSearchedState();
      refreshAfterSearch();
    },
    onNoMatch: function() {
      clearSearchedState();
      refreshAfterSearch();
    },
    onDismiss: function() {
      if (window.__searchedChar === null && window.__searchedBond === null) {
        var q = teamSearchInput.value.trim();
        if (q) {
          teamSearchResult.textContent = '未找到角色、装备或羁绊：' + q;
          teamSearchResult.className = 'not-found';
        }
      }
    },
  });

  // ===== Build Compendium =====
  function buildCompendium() {
    compendiumList.innerHTML = '';
    const sorted = [...allChars].sort((a, b) => a.localeCompare(b[0], 'zh'));
    sorted.forEach(ch => {
      const info = charMap[ch];
      const card = document.createElement('div');
      card.className = 'compendium-card';
      card.draggable = true;
      card.setAttribute('data-char', ch);

      card.innerHTML = `<span class="cc-name">${ch}</span>`;

      // Spend badge
      if (info.spend) card.appendChild(createSpendBadge(info.spend, 'cc-'));

      // Position indicator
      if (info.position) card.appendChild(createPositionIndicator(info.position, 'cc-'));

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'compendium', char: ch }));
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('click', function(e) {
        e.stopPropagation();
        window.__showChrIntroPopup(ch, card);
      });

      compendiumList.appendChild(card);
    });
  }

  // ===== Build Weapon List =====
  function getStarEmblemBond(name) {
    return name.endsWith('星徽') ? name.slice(0, -2) : null;
  }
  window.__getStarEmblemBond = getStarEmblemBond;

  function getCassetteBond(name) {
    if (name.endsWith('卡带Max')) return name.slice(0, -5);
    if (name.endsWith('卡带')) return name.slice(0, -2);
    return null;
  }

  function countFortuneDiamonds() {
    let count = 0;
    for (const weapons of window.__slotWeapons) {
      for (const w of weapons) {
        if (w === '财富宝钻') count++;
      }
    }
    return count;
  }

  function getEffectiveMaxSlots() {
    return window.__maxSlots + Math.min(countFortuneDiamonds(), 3);
  }
  window.__getEffectiveMaxSlots = getEffectiveMaxSlots;

  function getEquipmentBondBonuses() {
    var bonuses = {};
    var effectiveMax = getEffectiveMaxSlots();
    for (var i = 0; i < effectiveMax; i++) {
      if (!window.__slotCards[i]) continue;
      for (var j = 0; j < (window.__slotWeapons[i] || []).length; j++) {
        var w = window.__slotWeapons[i][j];
        var bond = getStarEmblemBond(w) || getCassetteBond(w);
        if (bond) bonuses[bond] = (bonuses[bond] || 0) + 1;
      }
    }
    return bonuses;
  }
  window.__getEquipmentBondBonuses = getEquipmentBondBonuses;

  function computeBondCounts() {
    var fieldChars = window.__slotCards.filter(Boolean);
    var counts = {};
    for (var bond in campData) {
      var chars = campData[bond];
      var n = fieldChars.filter(function(ch) { return chars.indexOf(ch) >= 0; }).length;
      if (n > 0) counts[bond] = n;
    }
    var bonuses = getEquipmentBondBonuses();
    for (var bond in bonuses) {
      counts[bond] = (counts[bond] || 0) + bonuses[bond];
    }
    return counts;
  }
  window.__computeBondCounts = computeBondCounts;

  function isWeaponEquipped(weaponName) {
    for (const weapons of window.__slotWeapons) {
      if (weapons.includes(weaponName)) return true;
    }
    return false;
  }

  function isAnyHackerEquipped() {
    return window.__slotWeapons.some(ws => ws.some(w => hackerMods.has(w)));
  }

  function weaponLimitsMet(name) {
    const limits = window.__LIMITS?.[name];
    if (!limits) return true;
    const counts = computeBondCounts();
    return limits.some(([bond, required]) => (counts[bond] || 0) >= required);
  }

  function getHuanYuTier() {
    var counts = computeBondCounts();
    var count = counts['欢愉'] || 0;
    var reqs = campNum['欢愉'];
    if (!reqs) return 0;
    var tier = 0;
    for (var i = 0; i < reqs.length; i++) {
      if (count >= reqs[i]) tier = i + 1;
    }
    return tier;
  }
  window.__getHuanYuTier = getHuanYuTier;

  function getLangShouTier() {
    var counts = computeBondCounts();
    var count = counts['狼狩'] || 0;
    var reqs = campNum['狼狩'];
    if (!reqs) return 0;
    var tier = 0;
    for (var i = 0; i < reqs.length; i++) {
      if (count >= reqs[i]) tier = i + 1;
    }
    return tier;
  }
  window.__getLangShouTier = getLangShouTier;

  function getYeSeTier() {
    var counts = computeBondCounts();
    var count = counts['夜之半神'] || 0;
    var reqs = campNum['夜之半神'];
    if (!reqs) return 0;
    var tier = 0;
    for (var i = 0; i < reqs.length; i++) {
      if (count >= reqs[i]) tier = i + 1;
    }
    return tier;
  }
  window.__getYeSeTier = getYeSeTier;

  function getMMGTier() {
    var counts = computeBondCounts();
    var count = counts['银河学者'] || 0;
    var reqs = campNum['银河学者'];
    if (!reqs) return 0;
    var tier = 0;
    for (var i = 0; i < reqs.length; i++) {
      if (count >= reqs[i]) tier = i + 1;
    }
    return tier;
  }
  window.__getMMGTier = getMMGTier;

  function refreshWeaponState() {
    dismissWeaponInfoPopup();
    renderSlots();
    updateWeaponListState();
    updateLeftPanel();
  }
  window.__refreshWeaponState = refreshWeaponState;

  // Weapon item click via event delegation
  weaponList.addEventListener('click', (e) => {
    const weaponItem = e.target.closest('.weapon-item');
    if (!weaponItem) return;
    e.stopPropagation();
    const name = weaponItem.getAttribute('data-weapon');
    if (!name) return;
    if (window.__weaponInfoPopupEl && window.__weaponInfoPopupEl.getAttribute('data-weapon') === name) {
      dismissWeaponInfoPopup();
    } else {
      showWeaponInfoPopup(name, weaponItem);
    }
  });

  function buildWeaponList() {
    dismissWeaponInfoPopup();
    weaponList.innerHTML = '';
    const equipments = window.__EQUIPMENTS;
    if (!equipments) return;

    Object.entries(equipments).forEach(([category, items]) => {
      if (!items.length) return;

      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'section-header weapon-section-header';
      sectionHeader.innerHTML = `<span class="section-arrow">▶</span>${category} (${items.length})`;

      const sectionBody = document.createElement('div');
      sectionBody.className = 'section-body weapon-section-body';

      const sorted = [...items].sort((a, b) => {
        const aMet = weaponLimitsMet(a);
        const bMet = weaponLimitsMet(b);
        if (aMet !== bMet) return Number(bMet) - Number(aMet);
        return a.localeCompare(b[0], 'zh');
      });
      sorted.forEach(name => {
        const item = document.createElement('div');
        item.className = 'weapon-item';
        const met = weaponLimitsMet(name);
        const hasFieldChar = window.__slotCards.some(Boolean);
        if (!hasFieldChar || !met) item.classList.add('weapon-dimmed');
        item.setAttribute('data-weapon', name);
        item.textContent = name;
        item.draggable = hasFieldChar && met;
        // __LIMITS weapons: override if already equipped
        if (window.__LIMITS?.[name]) {
          const tag = document.createElement('span');
          tag.className = 'weapon-equipped-tag';
          tag.textContent = '已装备';
          const equipped = hasFieldChar && isWeaponEquipped(name);
          if (equipped) {
            item.classList.add('weapon-dimmed');
            item.draggable = false;
          } else {
            tag.style.display = 'none';
          }
          item.appendChild(tag);
        }
        if (hackerMods.has(name) && hasFieldChar && isAnyHackerEquipped()) {
          item.classList.add('weapon-dimmed');
          item.draggable = false;
        }
        item.addEventListener('dragstart', (e) => {
          if (!weaponLimitsMet(name) || (window.__LIMITS?.[name] && isWeaponEquipped(name)) || (hackerMods.has(name) && isAnyHackerEquipped())) { e.preventDefault(); return; }
          e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'weapon', weapon: name }));
          e.dataTransfer.effectAllowed = 'move';
          window.__draggedWeaponName = name;
          showAllMergePopups(name);
        });
        sectionBody.appendChild(item);
      });

      sectionHeader.addEventListener('click', () => {
        const wasExpanded = sectionHeader.classList.contains('expanded');
        // Collapse all other sections
        weaponList.querySelectorAll('.weapon-section-header.expanded').forEach(h => {
          if (h !== sectionHeader) h.classList.remove('expanded');
        });
        weaponList.querySelectorAll('.weapon-section-body.expanded').forEach(b => {
          if (b !== sectionBody) b.classList.remove('expanded');
        });
        if (wasExpanded) {
          sectionHeader.classList.remove('expanded');
          sectionBody.classList.remove('expanded');
        } else {
          sectionHeader.classList.add('expanded');
          sectionBody.classList.add('expanded');
        }
      });

      weaponList.appendChild(sectionHeader);
      weaponList.appendChild(sectionBody);
    });
  }

  function updateWeaponListState() {
    const hasFieldChar = window.__slotCards.some(Boolean);
    weaponList.querySelectorAll('.weapon-section-body').forEach(sectionBody => {
      const items = [...sectionBody.querySelectorAll('.weapon-item')];
      items.forEach(item => {
        const name = item.getAttribute('data-weapon');
        const met = weaponLimitsMet(name);
        if (!hasFieldChar || !met) {
          item.classList.add('weapon-dimmed');
        } else {
          item.classList.remove('weapon-dimmed');
        }
        item.draggable = hasFieldChar && met;
        // __LIMITS weapons: override if already equipped
        if (window.__LIMITS?.[name]) {
          const equipped = hasFieldChar && isWeaponEquipped(name);
          if (equipped) {
            item.classList.add('weapon-dimmed');
            item.draggable = false;
          }
          const tag = item.querySelector('.weapon-equipped-tag');
          if (tag) tag.style.display = equipped ? '' : 'none';
        }
        // Hacker mods: dim all once any is equipped
        if (hackerMods.has(name) && hasFieldChar && isAnyHackerEquipped()) {
          item.classList.add('weapon-dimmed');
          item.draggable = false;
        }
      });
      items.sort((a, b) => {
        const aDim = a.classList.contains('weapon-dimmed');
        const bDim = b.classList.contains('weapon-dimmed');
        if (aDim !== bDim) return Number(aDim) - Number(bDim);
        return a.getAttribute('data-weapon').localeCompare(b.getAttribute('data-weapon'), 'zh');
      });
      items.forEach(item => sectionBody.appendChild(item));
    });
  }

  // ===== Compendium Mode Toggle =====
  const compendiumMenu = document.getElementById('compendium-menu');
  const compendiumNavBtn = document.getElementById('compendium-nav-btn');
  const compendiumTitle = document.getElementById('compendium-title');
  const COMPENDIUM_TITLES = { field: '场上羁绊', character: '角色列表', weapon: '装备列表' };
  const compendiumField = document.getElementById('compendium-field');

  function switchCompendiumMode(mode) {
    dismissWeaponInfoPopup();
    window.__compendiumMode = mode;
    compendiumTitle.textContent = COMPENDIUM_TITLES[mode];
    compendiumMenu.querySelectorAll('.menu-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-panel') === mode);
    });
    // Hide all panels first
    compendiumField.style.display = 'none';
    compendiumList.style.display = 'none';
    weaponList.style.display = 'none';
    // Show the selected panel
    if (mode === 'field') {
      compendiumField.style.display = 'flex';
    } else if (mode === 'weapon') {
      weaponList.style.display = '';
    } else {
      compendiumList.style.display = '';
    }
    // Sync the header toggle button state
    if (compendiumHeaderToggle) {
      if (mode === 'field') {
        compendiumHeaderToggle.innerHTML = '◀';
        compendiumHeaderToggle.title = '切换为角色列表';
      } else {
        compendiumHeaderToggle.innerHTML = '▶';
        compendiumHeaderToggle.title = '切换为场上羁绊';
      }
      compendiumHeaderToggle.style.display = '';
    }
    // 场上羁绊时隐藏角色/装备切换按钮
    compendiumNavBtn.style.display = mode === 'field' ? 'none' : '';
  }

  compendiumNavBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    compendiumMenu.classList.toggle('open');
  });

  compendiumMenu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      compendiumMenu.classList.remove('open');
      switchCompendiumMode(item.getAttribute('data-panel'));
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!compendiumNavBtn.contains(e.target) && !compendiumMenu.contains(e.target)) {
      compendiumMenu.classList.remove('open');
    }
  });

  // ===== Render Slots =====
  function createSlot(index) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.setAttribute('data-slot', index);

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => { slot.classList.remove('drag-over'); });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      handleDrop(data, index);
    });

    return slot;
  }

  window.__showChrIntroPopup = function(charName, anchorEl) {
    var old = document.querySelector('.chr-intro-popup');
    if (old && old.getAttribute('data-char') === charName) {
      dismissBondInfoPopup();
      return;
    }
    if (old) old.remove();
    dismissWeaponInfoPopup();
    dismissBondInfoPopup();
    var intros = window.__CHR_INTRO?.[charName];
    if (!intros) return;
    var popup = document.createElement('div');
    popup.className = 'weapon-info-popup chr-intro-popup';
    popup.setAttribute('data-char', charName);
    Object.keys(intros).forEach(function(key) {
      var sec = document.createElement('div');
      sec.className = 'wip-section';
      sec.innerHTML = '<div class="wip-title">' + key + '</div>';
      var line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = intros[key].replace(/\n/g, '<br>');
      sec.appendChild(line);
      popup.appendChild(sec);
    });
    // Bond tags
    var bonds = charMap[charName]?.bonds;
    if (bonds && bonds.length) {
      var bondRow = document.createElement('div');
      bondRow.className = 'chr-intro-bonds';
      bonds.forEach(function(b) {
        var tag = document.createElement('span');
        tag.className = 'detail-bond-tag';
        tag.textContent = b;
        tag.addEventListener('click', function(e) {
          e.stopPropagation();
          showBondInfoPopup(b, tag, true);
        });
        bondRow.appendChild(tag);
      });
      popup.appendChild(bondRow);
    }
    document.body.appendChild(popup);
    popup.style.position = 'fixed';
    var rect = anchorEl.getBoundingClientRect();
    var left = rect.right + 8;
    var top = rect.top;
    if (left + 300 > window.innerWidth) left = rect.left - 308;
    if (top + popup.offsetHeight > window.innerHeight) top = window.innerHeight - popup.offsetHeight - 8;
    popup.style.left = Math.max(4, left) + 'px';
    popup.style.top = Math.max(4, top) + 'px';
    popup.addEventListener('click', function(e) {
      e.stopPropagation();
      dismissBondInfoPopup(true);
    });
    // Dismiss on outside click
    setTimeout(function() {
      document.addEventListener('click', function dismissChrPopup(e) {
        if (!popup.parentNode) { document.removeEventListener('click', dismissChrPopup); return; }
        if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('click', dismissChrPopup); }
      });
    }, 0);
  };

  function renderCard(ch, slotIndex) {
    const info = charMap[ch];
    const card = document.createElement('div');
    card.className = 'slot-card';
    card.draggable = true;
    card.setAttribute('data-char', ch);

    card.innerHTML = '<span class="card-name">' + ch + '</span>';

    var inTracked = info.bonds.some(function(b) { return window.__trackedBonds.indexOf(b) >= 0; }) || info.bonds.indexOf(window.__searchedBond) >= 0;
    card.classList.toggle('tracked-char', (window.__trackedBonds.length > 0 || window.__searchedBond) && inTracked);
    card.classList.toggle('searched-char', window.__searchedChar === ch);
    card.classList.toggle('superstar-card', ch === window.__superstar);
    card.classList.toggle('star-hunter-card', window.__starHunters.indexOf(ch) >= 0);

    if (info.spend || ch === window.__superstar || window.__starHunters.indexOf(ch) >= 0 || info.position) {
      var metaRow = document.createElement('div');
      metaRow.className = 'card-meta';

      if (info.spend) metaRow.appendChild(createSpendBadge(info.spend, 'card-'));

      if (ch === window.__superstar) {
        var badge = document.createElement('span');
        badge.className = 'card-badge card-badge-superstar';
        badge.textContent = '⭐';
        metaRow.appendChild(badge);
      }
      if (window.__starHunters.indexOf(ch) >= 0) {
        var badge = document.createElement('span');
        badge.className = 'card-badge card-badge-hunter';
        badge.textContent = '⚔';
        metaRow.appendChild(badge);
      }

      if (info.position) {
      const posSpan = createPositionIndicator(info.position, 'card-');
      const isTopRow = slotIndex < TOTAL_FIXED_TOP;
      const inXunhai = info.bonds.includes('巡海游侠');
      const isBusitu = ch === '不死途';
      const wrongPos = (info.position === '前台' && !isTopRow) || (info.position === '后台' && isTopRow);
      if (isBusitu) {
        posSpan.querySelectorAll('.pb').forEach(pb => pb.classList.add('alt'));
      } else if (wrongPos && inXunhai && info.position === '前台') {
        posSpan.querySelectorAll('.pb').forEach(pb => pb.classList.add('alt'));
      } else if (wrongPos) {
        posSpan.querySelectorAll('.pb').forEach(pb => pb.classList.add('wrong'));
      }
      metaRow.appendChild(posSpan);
    }
    card.appendChild(metaRow);
  }

    // Weapon slots
    const weaponsDiv = document.createElement('div');
    const weapons = window.__slotWeapons[slotIndex] || [];
    const regularWeapons = [];
    const hackerWeapons = [];
    weapons.forEach((name, idx) => {
      if (hackerMods.has(name)) hackerWeapons.push({ name, idx });
      else regularWeapons.push({ name, idx });
    });
    weaponsDiv.className = hackerWeapons.length ? 'card-weapons has-hacker' : 'card-weapons';

    function makeSlotHandlers(slot, entry, idx) {
      slot.classList.add('filled');
      slot.textContent = entry.name;
      const isDice = window.__slotDiceWeapons[slotIndex].has(idx);
      if (!isDice) {
        slot.draggable = true;
        slot.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'weapon-slot', slotIndex, weaponIndex: idx, weapon: entry.name }));
          e.dataTransfer.effectAllowed = 'move';
        });
      }
      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.__weaponInfoPopupEl && window.__weaponInfoPopupEl.getAttribute('data-weapon') === entry.name && window.__weaponInfoPopupEl.getAttribute('data-slot') === String(slotIndex)) {
          dismissWeaponInfoPopup();
        } else {
          showWeaponInfoPopup(entry.name, slot, slotIndex);
        }
      });
    }

    // Regular slots (always 3)
    for (let w = 0; w < 3; w++) {
      const weaponSlot = document.createElement('div');
      weaponSlot.className = 'card-weapon-slot';
      const entry = regularWeapons[w];
      if (entry) makeSlotHandlers(weaponSlot, entry, entry.idx);
      weaponSlot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        weaponSlot.classList.add('weapon-drag-over');
      });
      weaponSlot.addEventListener('dragleave', () => { weaponSlot.classList.remove('weapon-drag-over'); });
      weaponSlot.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        weaponSlot.classList.remove('weapon-drag-over');
        dismissMergePopups();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source === 'weapon') handleWeaponDrop(data.weapon, slotIndex);
      });
      weaponsDiv.appendChild(weaponSlot);
    }

    // Hacker mod slot
    if (hackerWeapons.length > 0) {
      const entry = hackerWeapons[0];
      const hackerSlot = document.createElement('div');
      hackerSlot.className = 'card-weapon-slot card-hacker-slot';
      makeSlotHandlers(hackerSlot, entry, entry.idx);
      hackerSlot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        hackerSlot.classList.add('weapon-drag-over');
      });
      hackerSlot.addEventListener('dragleave', () => { hackerSlot.classList.remove('weapon-drag-over'); });
      hackerSlot.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hackerSlot.classList.remove('weapon-drag-over');
        dismissMergePopups();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source === 'weapon') handleWeaponDrop(data.weapon, slotIndex);
      });
      weaponsDiv.appendChild(hackerSlot);
    }
    card.appendChild(weaponsDiv);

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'slot', index: slotIndex, char: ch }));
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('click', function(e) {
      if (e.target.closest('.card-weapon-slot') || e.target.closest('.aha-weapon-slot')) return;
      e.stopPropagation();
      window.__showChrIntroPopup(ch, card);
    });

    return card;
  }

  function evolveAhaResult(r) { return window.__evolveAhaResult(r); }
  function getFirstAvailableAhaSlot() { return window.__getFirstAvailableAhaSlot(); }
  function handleAhaWeaponDrop(a,b) { window.__handleAhaWeaponDrop(a,b); }

  function renderAhaCard() {
    const tier = getHuanYuTier();
    if (tier === 0) return null;

    const card = document.createElement('div');
    card.className = 'aha-card';
    card.setAttribute('data-name', '阿哈');

    const headerDiv = document.createElement('div');
    headerDiv.className = 'aha-header';
    headerDiv.innerHTML = '<span class="aha-name">阿哈</span>';
    const posSpan = createPositionIndicator('前后台', 'aha-');
    headerDiv.appendChild(posSpan);
    card.appendChild(headerDiv);

    const weaponsDiv = document.createElement('div');
    weaponsDiv.className = 'aha-weapons';

    for (let w = 0; w < 3; w++) {
      const slot = document.createElement('div');
      slot.className = 'aha-weapon-slot';
      slot.setAttribute('data-aha-slot', w);
      slot.textContent = window.__ahaWeapons[w];

      if (w < tier) {
        if (window.__ahaSynth[w] && window.__ahaWeapons[w] === window.__ahaSynthR[w]) {
          slot.classList.add('synthesized');
        } else if (w === getFirstAvailableAhaSlot()) {
          slot.classList.add('filled');
        } else {
          slot.classList.add('pending');
        }
      } else {
        slot.classList.add('locked');
      }

      weaponsDiv.appendChild(slot);
    }

    // Event delegation for clicks on weapon slots
    weaponsDiv.addEventListener('click', (e) => {
      const slot = e.target.closest('.aha-weapon-slot');
      if (!slot) return;
      const w = parseInt(slot.getAttribute('data-aha-slot'));
      if (isNaN(w) || !window.__ahaWeapons[w]) return;
      e.stopPropagation();
      const ahaSlotIdx = -(w + 1);
      if (window.__weaponInfoPopupEl && window.__weaponInfoPopupEl.getAttribute('data-weapon') === window.__ahaWeapons[w] && window.__weaponInfoPopupEl.getAttribute('data-slot') === String(ahaSlotIdx)) {
        dismissWeaponInfoPopup();
      } else {
        showWeaponInfoPopup(window.__ahaWeapons[w], slot, ahaSlotIdx);
      }
    });
    card.appendChild(weaponsDiv);

    // Drag-drop on the whole card so the forbidden icon never appears
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const slot = e.target.closest('.aha-weapon-slot.filled');
      if (slot) slot.classList.add('weapon-drag-over');
    });
    card.addEventListener('dragleave', (e) => {
      const slot = e.target.closest('.aha-weapon-slot');
      if (slot) slot.classList.remove('weapon-drag-over');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      let slotIdx = getFirstAvailableAhaSlot();
      const slotEl = e.target.closest('.aha-weapon-slot');
      if (slotEl) {
        slotEl.classList.remove('weapon-drag-over');
        if (slotEl.classList.contains('filled')) slotIdx = parseInt(slotEl.getAttribute('data-aha-slot'));
      }
      if (slotIdx < 0 || !window.__draggedWeaponName) return;
      handleAhaWeaponDrop(window.__draggedWeaponName, slotIdx);
    });

    card.addEventListener('click', function(e) {
      if (e.target.closest('.aha-weapon-slot')) return;
      e.stopPropagation();
      window.__showSpecBondInfo('欢愉', card);
    });

    return card;
  }

  function renderSlots() {
    dismissMergePopups();
    var chrPopup = document.querySelector('.chr-intro-popup');
    if (chrPopup) chrPopup.remove();
    window.__updateStarHunters();
    const effectiveMax = getEffectiveMaxSlots();
    while (window.__slotCards.length < effectiveMax) { window.__slotCards.push(null); window.__slotWeapons.push([]); window.__slotDiceWeapons.push(new Set()); }
    while (window.__slotCards.length > effectiveMax) { window.__slotCards.pop(); window.__slotWeapons.pop(); window.__slotDiceWeapons.pop(); }
    topRow.innerHTML = '';
    bottomRow.innerHTML = '';

    for (let i = 0; i < TOTAL_FIXED_TOP; i++) {
      const slot = createSlot(i);
      if (window.__slotCards[i]) {
        slot.classList.add('filled');
        slot.appendChild(renderCard(window.__slotCards[i], i));
      }
      topRow.appendChild(slot);
    }

    for (let i = TOTAL_FIXED_TOP; i < effectiveMax; i++) {
      const slot = createSlot(i);
      if (window.__slotCards[i]) {
        slot.classList.add('filled');
        slot.appendChild(renderCard(window.__slotCards[i], i));
      }
      bottomRow.appendChild(slot);
    }

    // 阿哈 card — re-randomize on reactivation
    const ahaTier = getHuanYuTier();
    if (ahaTier > 0 && window.__prevHYTier === 0) {
      initAhaWeapons();
      window.__ahaSynth = [false, false, false];
      window.__ahaSynthR = [null, null, null];
    } else if (ahaTier > 0 && ahaTier < window.__prevHYTier) {
      for (let w = ahaTier; w < 3; w++) {
        window.__ahaWeapons[w] = window.__ahaInitW[w];
      }
    }
    // Downgrade 特权 to 进阶 when tier drops below 4
    if (ahaTier > 0 && ahaTier < 4 && window.__prevHYTier >= 4) {
      for (let w = 0; w < ahaTier; w++) {
        if (window.__ahaWeapons[w] && window.__ahaWeapons[w].endsWith('•特权')) {
          window.__ahaWeapons[w] = window.__ahaWeapons[w].replace('•特权', '');
          window.__ahaSynthR[w] = window.__ahaWeapons[w];
        }
      }
    }
    // Upgrade/downgrade based on 欢愉 count
    const huanYuCount = computeBondCounts()['欢愉'] || 0;
    for (let w = 0; w < 3; w++) {
      if (!window.__ahaSynth[w] || !window.__ahaWeapons[w]) continue;
      if (huanYuCount >= 7 && !window.__ahaWeapons[w].endsWith('•特权')) {
        const evolved = window.__ahaWeapons[w] + '•特权';
        if ((window.__EQUIPMENTS?.['特权装备'] || []).includes(evolved)) {
          window.__ahaWeapons[w] = evolved;
          window.__ahaSynthR[w] = evolved;
        }
      } else if (huanYuCount < 7 && window.__ahaWeapons[w].endsWith('•特权')) {
        window.__ahaWeapons[w] = window.__ahaWeapons[w].replace('•特权', '');
        window.__ahaSynthR[w] = window.__ahaWeapons[w];
      }
    }
    window.__prevHYTier = ahaTier;

    // Special chars container — holds Aha, 步离人, and future special chars
    var specContainer = slotArea.querySelector('.special-chars-container');
    if (!specContainer) {
      specContainer = document.createElement('div');
      specContainer.className = 'special-chars-container';
      slotArea.appendChild(specContainer);
    }

    var existingAha = specContainer.querySelector('.aha-card');
    var ahaCard = renderAhaCard();
    if (ahaCard) {
      if (existingAha) existingAha.replaceWith(ahaCard);
      else specContainer.appendChild(ahaCard);
    } else if (existingAha) {
      existingAha.remove();
    }

    // 步离人 card
    const lsTier = getLangShouTier();
    window.__prevLSTier = lsTier;
    var existingBuli = specContainer.querySelector('.buli-card');
    var buliCard = window.__renderBuliCard();
    if (buliCard) {
      if (existingBuli) existingBuli.replaceWith(buliCard);
      else specContainer.appendChild(buliCard);
    } else if (existingBuli) {
      existingBuli.remove();
    }

    // 月色精华 card
    var existingYeSe = specContainer.querySelector('.yese-card');
    var yeseCard = window.__renderYeSeCard();
    if (yeseCard) {
      if (existingYeSe) existingYeSe.replaceWith(yeseCard);
      else specContainer.appendChild(yeseCard);
    } else if (existingYeSe) {
      existingYeSe.remove();
    }

    // 猫猫糕 card
    var existingMMG = specContainer.querySelector('.mmg-card');
    var mmgCard = window.__renderMMGCard();
    if (mmgCard) {
      if (existingMMG) existingMMG.replaceWith(mmgCard);
      else specContainer.appendChild(mmgCard);
    } else if (existingMMG) {
      existingMMG.remove();
    }

    // Sort spec cards by pinyin
    var cards = Array.from(specContainer.children);
    cards.sort(function(a, b) {
      return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '', 'zh');
    });
    cards.forEach(function(c) { specContainer.appendChild(c); });

    // Remove empty container
    if (!specContainer.children.length) specContainer.remove();

    // 能量 bond glass effect
    var energyCount = computeBondCounts()['能量'] || 0;
    var energyReqs = campNum['能量'] || [];
    var energyActive = energyCount >= (energyReqs[0] || Infinity);
    var energyMax = energyCount >= (energyReqs[energyReqs.length - 1] || Infinity);
    // Clear all slot glass classes first
    topRow.querySelectorAll('.card-slot').forEach(function(s) { s.classList.remove('energy-glass'); });
    bottomRow.querySelectorAll('.card-slot').forEach(function(s) { s.classList.remove('energy-glass'); });
    if (energyMax) {
      // Max tier: all slots get glass effect
      topRow.querySelectorAll('.card-slot').forEach(function(s) { s.classList.add('energy-glass'); });
      bottomRow.querySelectorAll('.card-slot').forEach(function(s) { s.classList.add('energy-glass'); });
    } else if (energyActive) {
      // Activated but not max: only first front/back
      var firstTop = topRow.firstElementChild;
      var firstBottom = bottomRow.firstElementChild;
      if (firstTop) firstTop.classList.add('energy-glass');
      if (firstBottom) firstBottom.classList.add('energy-glass');
    }
  }

  // ===== Drop Handler =====
  function handleDrop(data, targetSlot) {
    if (data.source === 'weapon') {
      handleWeaponDrop(data.weapon, targetSlot);
      return;
    }
    let char = data.char;
    // Transform: 开拓者·欢愉 → top row becomes 开拓者·记忆, 开拓者·记忆 → bottom row becomes 开拓者·欢愉
    if (char === '开拓者·欢愉' && targetSlot < TOTAL_FIXED_TOP) char = '开拓者·记忆';
    else if (char === '开拓者·记忆' && targetSlot >= TOTAL_FIXED_TOP) char = '开拓者·欢愉';

    if (data.source === 'compendium') {
      const existingIndex = window.__slotCards.indexOf(char);
      if (existingIndex >= 0) {
        window.__slotCards[existingIndex] = window.__slotCards[targetSlot] || null;
        var orderA = window.__slotPlaceOrder[existingIndex];
        var orderB = window.__slotPlaceOrder[targetSlot];
        window.__slotPlaceOrder[existingIndex] = orderB;
        window.__slotPlaceOrder[targetSlot] = orderA;
        const ew = window.__slotWeapons[existingIndex];
        const ed = window.__slotDiceWeapons[existingIndex];
        window.__slotWeapons[existingIndex] = window.__slotWeapons[targetSlot];
        window.__slotDiceWeapons[existingIndex] = window.__slotDiceWeapons[targetSlot];
        window.__slotWeapons[targetSlot] = ew;
        window.__slotDiceWeapons[targetSlot] = ed;
      } else {
        window.__slotWeapons[targetSlot] = [];
        window.__slotDiceWeapons[targetSlot] = new Set();
        window.__slotPlaceOrder[targetSlot] = ++window.__placeOrderSeq;
      }
      removeMutualExclusion(char, -1);
      window.__slotCards[targetSlot] = char;
    } else if (data.source === 'slot') {
      const displaced = window.__slotCards[targetSlot];
      const srcWeapons = window.__slotWeapons[data.index];
      const dstWeapons = window.__slotWeapons[targetSlot];
      const srcDice = window.__slotDiceWeapons[data.index];
      const dstDice = window.__slotDiceWeapons[targetSlot];
      window.__slotCards[data.index] = null;
      window.__slotWeapons[data.index] = [];
      window.__slotDiceWeapons[data.index] = new Set();
      var srcOrder = window.__slotPlaceOrder[data.index];
      var dstOrder = window.__slotPlaceOrder[targetSlot];
      window.__slotPlaceOrder[data.index] = 0;
      removeMutualExclusion(char, targetSlot);
      window.__slotCards[targetSlot] = char;
      window.__slotPlaceOrder[targetSlot] = srcOrder;
      window.__slotWeapons[targetSlot] = srcWeapons;
      window.__slotDiceWeapons[targetSlot] = srcDice;
      if (displaced) {
        window.__slotCards[data.index] = displaced;
        window.__slotPlaceOrder[data.index] = dstOrder;
        window.__slotWeapons[data.index] = dstWeapons;
        window.__slotDiceWeapons[data.index] = dstDice;
      }
    }
    renderSlots();
    updateLeftPanel();
    reorderCompendium();
    updateWeaponListState();
  }

  function consumeExtraIngredients(a,b,c,d) { window.__consumeExtraIngredients(a,b,c,d); }
  function canKeepStarEmblem(a,b,c) { return window.__canKeepStarEmblem(a,b,c); }
  function findMergeResult(a,b,c) { return window.__findMergeResult(a,b,c); }
  window.__mergePopupEls = [];
  function dismissMergePopups() { window.__dismissMergePopups(); }
  function showMergePopup(a,b) { window.__showMergePopup(a,b); }
  function showAllMergePopups(weaponName) {
    window.__dismissMergePopups();
    var effectiveMax = getEffectiveMaxSlots();
    for (var i = 0; i < effectiveMax; i++) {
      if (!window.__slotCards[i]) continue;
      var weapons = window.__slotWeapons[i];
      var results = [];
      for (var j = 0; j < weapons.length; j++) {
        var existing = weapons[j];
        var result = findMergeResult(weaponName, existing, weapons);
        if (result && weaponLimitsMet(result) && results.indexOf(result) < 0) {
          results.push(result);
        }
      }
      if (results.length) showMergePopup(i, results);
    }
    // 阿哈 merge previews — only for the first available slot
    var ahaSlot = getFirstAvailableAhaSlot();
    if (ahaSlot >= 0 && window.__ahaWeapons[ahaSlot]) {
      if (window.__ahaSynth[ahaSlot]) {
        var target = window.__ahaSynthR[ahaSlot];
        var recipes = window.__MERGE?.[target];
        var full = recipes ? [].concat(recipes[0]) : [];
        var idx = full.indexOf(window.__ahaWeapons[ahaSlot]);
        if (idx >= 0) full.splice(idx, 1);
        var label = full.length ? '只能使用' + full.join('、') + '，合成' + target : '合成' + target;
        showMergePopup(-(ahaSlot + 1), [label]);
      } else {
        var result = findMergeResult(weaponName, window.__ahaWeapons[ahaSlot], window.__ahaWeapons);
        if (result && weaponLimitsMet(result)) {
          showMergePopup(-(ahaSlot + 1), [result]);
        }
      }
    }
  }

  function handleWeaponDrop(weaponName, slotIndex) {
    const charName = window.__slotCards[slotIndex];
    if (!charName) return;
    if (!weaponLimitsMet(weaponName)) return;
    // Star emblem restriction: character cannot equip a star emblem of a bond they already belong to (including via other star emblems)
    const starBond = getStarEmblemBond(weaponName);
    if (starBond) {
      const hasBond = charBonds[charName]?.includes(starBond);
      const hasStarBond = (window.__slotWeapons[slotIndex] || []).some(w => getStarEmblemBond(w) === starBond);
      if (hasBond || hasStarBond) return;
    }
    // 骇客改件/羁绊装备: character must have the required bond
    const limits = window.__LIMITS?.[weaponName];
    if (limits) {
      const reqBond = limits[0][0];
      const hasBond = charBonds[charName]?.includes(reqBond);
      const hasStarBond = (window.__slotWeapons[slotIndex] || []).some(w => getStarEmblemBond(w) === reqBond);
      if (!hasBond && !hasStarBond) return;
    }
    const isHacker = hackerMods.has(weaponName);
    const weapons = window.__slotWeapons[slotIndex];
    if (isHacker && weapons.some(w => hackerMods.has(w))) return;

    // Check merge opportunities first (before duplicate/count checks)
    for (const existing of weapons) {
      const result = findMergeResult(weaponName, existing, weapons);
      if (result && weaponLimitsMet(result)) {
        const idx = weapons.indexOf(existing);
        if (idx >= 0) weapons.splice(idx, 1);
        consumeExtraIngredients(weapons, result, weaponName, existing);
        if (canKeepStarEmblem(result, charName, weapons)) weapons.push(result);
        window.__slotEquipOrder[slotIndex] = ++window.__equipOrderSeq;
        refreshWeaponState();
        return;
      }
    }

    // No merge available — equip normally
    const regularCount = weapons.filter(w => !hackerMods.has(w)).length;
    if (!isHacker && regularCount >= 3) return;
    if (weaponName !== '财富宝钻' && !repeatableEquips.has(weaponName) && weapons.includes(weaponName)) return;
    if (window.__LIMITS?.[weaponName] && isWeaponEquipped(weaponName)) return;

    // 随便骰子: only when all 3 regular slots are empty (ignoring hacker mods)
    const isDice = weaponName === '随便骰子' || weaponName === '随便骰子•特权';
    if (isDice && regularCount > 0) return;

    weapons.push(weaponName);
    window.__slotEquipOrder[slotIndex] = ++window.__equipOrderSeq;
    refreshWeaponState();

    // 随便骰子 effect: randomly equip 2 weapons, locked
    if (isDice) {
      const pool = weaponName === '随便骰子•特权'
        ? (window.__EQUIPMENTS?.['特权装备'] || [])
        : [...(window.__EQUIPMENTS?.['简易装备'] || []), ...(window.__EQUIPMENTS?.['进阶装备'] || [])];
      const picked = [];
      for (let i = 0; i < 2; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool[idx]);
      }
      const diceSet = window.__slotDiceWeapons[slotIndex];
      picked.forEach(w => {
        weapons.push(w);
        diceSet.add(weapons.length - 1);
      });
      renderSlots();
      updateWeaponListState();
    }
  }

  // ===== Recycle Zone =====
  recycleZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    recycleZone.classList.add('drag-over');
  });
  recycleZone.addEventListener('dragleave', () => { recycleZone.classList.remove('drag-over'); });
  recycleZone.addEventListener('drop', (e) => {
    e.preventDefault();
    recycleZone.classList.remove('drag-over');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (data.source === 'slot') {
      window.__slotCards[data.index] = null;
      window.__slotWeapons[data.index] = [];
      window.__slotDiceWeapons[data.index] = new Set();
      renderSlots();
      updateLeftPanel();
      reorderCompendium();
      updateWeaponListState();
    } else if (data.source === 'weapon-slot') {
      const diceSet = window.__slotDiceWeapons[data.slotIndex];
      if (diceSet.has(data.weaponIndex)) return; // dice-locked weapon cannot be removed
      const removed = window.__slotWeapons[data.slotIndex][data.weaponIndex];
      window.__slotWeapons[data.slotIndex].splice(data.weaponIndex, 1);
      // Adjust dice indices after splice BEFORE using them
      const adjusted = new Set();
      diceSet.forEach(i => { adjusted.add(i > data.weaponIndex ? i - 1 : i); });
      window.__slotDiceWeapons[data.slotIndex] = adjusted;
      // If 随便骰子 removed, also remove its locked weapons
      if (removed === '随便骰子' || removed === '随便骰子•特权') {
        const weapons = window.__slotWeapons[data.slotIndex];
        const locked = [...adjusted].sort((a, b) => b - a);
        locked.forEach(i => { if (i < weapons.length) weapons.splice(i, 1); });
        adjusted.clear();
        window.__slotDiceWeapons[data.slotIndex] = new Set();
      }
      refreshWeaponState();
    }
  });

  // ===== Left Panel =====
  window.__trackedBonds = [];
  const MAX_TRACKED = 3;

  const COLOR_CLASS = { '铜': 'tier-bronze', '银': 'tier-silver', '金': 'tier-gold', '幻彩': 'tier-prismatic' };

  function getBondTierInfo(bond, count) {
    const reqs = campNum[bond];
    if (!reqs || reqs.length === 0) return { display: count.toString(), tierClass: '' };

    let tier = 0;
    for (let i = 0; i < reqs.length; i++) {
      if (count >= reqs[i]) tier = i + 1;
    }

    const isMax = tier >= reqs.length;
    const display = isMax ? count.toString() : count + '/' + reqs[tier];

    const colors = campColors[bond];
    let tierClass = '';
    if (tier > 0 && colors) tierClass = COLOR_CLASS[colors[tier - 1]] || '';
    else if (tier === 0) tierClass = 'tier-none';

    return { display, tierClass };
  }

  window.__bondInfoPopupEl = null;
  window.__bondInfoPopupBond = null;

  function dismissBondInfoPopup(keepChr) {
    if (window.__bondInfoPopupEl) { window.__bondInfoPopupEl.remove(); window.__bondInfoPopupEl = null; window.__bondInfoPopupBond = null; }
    dismissWeaponInfoPopup();
    if (!keepChr) {
      var cp = document.querySelector('.chr-intro-popup');
      if (cp) cp.remove();
    }
  }
  window.__dismissBondInfoPopup = dismissBondInfoPopup;

  function dismissAllPopups() {
    dismissBondInfoPopup();
    dismissWeaponInfoPopup();
    dismissMergePopups();
  }

  function fmt(s) { return s.replace(/\n/g, '<br>'); }
  function toggleBondTrack(bond) {
    const idx = window.__trackedBonds.indexOf(bond);
    if (idx >= 0) { window.__trackedBonds.splice(idx, 1); }
    else {
      if (window.__trackedBonds.length >= MAX_TRACKED) window.__trackedBonds.shift();
      window.__trackedBonds.push(bond);
    }
    updateLeftPanel();
    renderSlots();
    reorderCompendium();
    compendiumList.scrollTop = 0;
  }

  window.__showSpecBondInfo = function(bond, cardEl) {
    // Toggle: if popup already open for this bond, close it
    if (window.__bondInfoPopupEl && window.__bondInfoPopupEl.getAttribute('data-bond') === bond) {
      dismissBondInfoPopup();
      return;
    }
    dismissBondInfoPopup();
    const stats = window.__CAMP_STATS?.[bond];
    if (!stats) return;

    const popup = document.createElement('div');
    popup.className = 'weapon-info-popup bond-info-popup';
    popup.setAttribute('data-bond', bond);

    if (stats['介绍']) {
      const sec = document.createElement('div');
      sec.className = 'wip-section';
      const line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = fmt(stats['介绍']);
      sec.appendChild(line);
      popup.appendChild(sec);
    }

    if (stats['补充']) {
      const sec = document.createElement('div');
      sec.className = 'wip-section wip-desc';
      const line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = fmt(stats['补充']);
      sec.appendChild(line);
      popup.appendChild(sec);
    }

    document.body.appendChild(popup);
    popup.addEventListener('click', function(e) { e.stopPropagation(); });
    popup.style.position = 'fixed';
    const cardRect = cardEl.getBoundingClientRect();
    var left = cardRect.right + 8;
    var top = cardRect.top;
    if (left + 300 > window.innerWidth) left = cardRect.left - 308;
    if (top + popup.offsetHeight > window.innerHeight) top = window.innerHeight - popup.offsetHeight - 8;
    popup.style.left = Math.max(4, left) + 'px';
    popup.style.top = Math.max(4, top) + 'px';
    window.__bondInfoPopupEl = popup;
  };

  function showBondInfoPopup(bond, anchorEl, keepChr) {
    // Toggle: if popup already open for this bond, close it
    if (window.__bondInfoPopupEl && window.__bondInfoPopupEl.getAttribute('data-bond') === bond) {
      dismissBondInfoPopup(keepChr);
      return;
    }
    dismissBondInfoPopup(keepChr);
    const stats = window.__CAMP_STATS?.[bond];
    if (!stats) return;

    const popup = document.createElement('div');
    popup.className = 'weapon-info-popup bond-info-popup';
    popup.setAttribute('data-bond', bond);

    // Track button
    const btnRow = document.createElement('div');
    btnRow.className = 'bond-popup-actions';
    const trackBtn = document.createElement('button');
    trackBtn.textContent = window.__trackedBonds.includes(bond) ? '取消追踪' : '追踪';
    trackBtn.className = 'bond-track-btn';
    trackBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleBondTrack(bond); });
    btnRow.appendChild(trackBtn);
    if (bond === '盛会之星' && window.__superstar) {
      var changeBtn = document.createElement('button');
      changeBtn.textContent = '更换巨星';
      changeBtn.className = 'bond-track-btn';
      changeBtn.style.marginLeft = '6px';
      changeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dismissBondInfoPopup();
        showSuperstarSelection();
      });
      btnRow.appendChild(changeBtn);
    }
    popup.appendChild(btnRow);

    // Description
    if (stats['介绍']) {
      const sec = document.createElement('div');
      sec.className = 'wip-section';
      sec.innerHTML = '<div class="wip-title">介绍</div>';
      const line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = fmt(stats['介绍']);
      sec.appendChild(line);
      popup.appendChild(sec);
    }

    // Tier bonuses
    const reqs = campNum[bond];
    const curCount = (computeBondCounts()[bond] || 0);
    if (reqs && reqs.some(req => stats[req])) {
      const sec = document.createElement('div');
      sec.className = 'wip-section wip-base';
      // 盛会之星: show superstar-specific current tier bonus instead of generic text
      if (bond === '盛会之星' && window.__superstar) {
        sec.innerHTML = '<div class="wip-title">层级加成（巨星：' + window.__superstar + '）</div>';
        var activeReq = 0;
        reqs.forEach(function(r) { if (curCount >= r) activeReq = r; });
        if (activeReq > 0) {
          var starText = stats['补充']?.[window.__superstar]?.[activeReq];
          if (!starText) {
            // Superstar is a star-emblem-only character — show 星徽 bonus
            var starEmblemBonus = stats['补充']?.['星徽']?.[activeReq];
            if (starEmblemBonus) starText = starEmblemBonus;
          }
          if (starText) {
            var line = document.createElement('div');
            line.className = 'wip-line wip-stat superstar-tier';
            line.innerHTML = '<b>' + activeReq + '人：</b>' + fmt(starText);
            sec.appendChild(line);
          }
        }
      } else {
        sec.innerHTML = '<div class="wip-title">层级加成</div>';
        reqs.forEach(function(req) {
          var text = stats[req];
          if (text) {
            var line = document.createElement('div');
            line.className = 'wip-line wip-stat' + (curCount >= req ? '' : ' wip-dim');
            line.innerHTML = '<b>' + req + '人：</b>' + fmt(text);
            sec.appendChild(line);
          }
        });
      }
      popup.appendChild(sec);
    }

    // Supplementary
    if (stats['补充']) {
      const sec = document.createElement('div');
      sec.className = 'wip-section wip-desc';
      sec.innerHTML = '<div class="wip-title">补充</div>';
      const supp = stats['补充'];
      if (typeof supp === 'string') {
        const line = document.createElement('div');
        line.className = 'wip-line wip-desc-text';
        line.innerHTML = fmt(supp);
        sec.appendChild(line);
      } else {
        const fieldSet = new Set(window.__slotCards.filter(Boolean));
        const hasStarBond = window.__slotWeapons.some(ws => ws.some(w => getStarEmblemBond(w) === bond));
        var isSuperstarBond = (bond === '盛会之星');
        Object.entries(supp).forEach(([name, info]) => {
          var isSuperstar = isSuperstarBond && window.__superstar === name;
          var entry = document.createElement('div');
          entry.className = 'wip-line wip-desc-text';
          if (isSuperstar) {
            entry.classList.add('superstar-highlight');
          } else if (!fieldSet.has(name) && !(hasStarBond && name === '星徽')) {
            entry.classList.add('wip-dim');
          }
          // Only show 介绍, no tier breakdown
          var desc = typeof info === 'string' ? fmt(info) : fmt(info['介绍'] || info['描述'] || '');
          entry.innerHTML = (isSuperstar ? '⭐ ' : '') + '<b>' + name + '</b>：' + desc;
          sec.appendChild(entry);
        });
      }
      popup.appendChild(sec);
    }

    const rect = anchorEl.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.visibility = 'hidden';
    popup.style.left = '0px';
    popup.style.top = '0px';
    window.__bondInfoPopupBond = bond;
    document.body.appendChild(popup);
    popup.addEventListener('click', function(e) { e.stopPropagation(); });

    const popupRect = popup.getBoundingClientRect();
    let left = rect.right + 8;
    let top = rect.top;
    if (left + popupRect.width > window.innerWidth - 8) left = rect.left - popupRect.width - 8;
    if (top + popupRect.height > window.innerHeight - 8) top = window.innerHeight - popupRect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.visibility = '';

    window.__bondInfoPopupEl = popup;
  }

  function updateLeftPanel() {
    const bondCounts = computeBondCounts();
    // Refresh bond popup if open
    if (window.__bondInfoPopupEl && window.__bondInfoPopupBond) {
      const anchor = document.querySelector('.field-bond-item');
      if (anchor) showBondInfoPopup(window.__bondInfoPopupBond, anchor);
    }

    window.__trackedBonds = window.__trackedBonds.filter(b => bondCounts[b]);

    // 盛会之星: clear superstar if bond drops below 2 or character leaves
    var starCount = bondCounts['盛会之星'] || 0;
    if (starCount < 2) {
      window.__superstar = null;
    } else if (window.__superstar) {
      // Check if the selected superstar is still eligible
      var candidates = getSuperstarCandidates();
      if (candidates.indexOf(window.__superstar) < 0) window.__superstar = null;
    }
    // Auto-show selection popup if activated and no superstar chosen yet
    if (starCount >= 2 && window.__superstar === null) {
      showSuperstarSelection();
    }

    // 星核猎手: update hunters when bond count changes
    var prevHunters = window.__starHunters.slice();
    window.__updateStarHunters();
    if (prevHunters.join(',') !== window.__starHunters.join(',')) {
      renderSlots();
    }

    updateCompendiumMaxWidth();

    fieldBonds.innerHTML = '';
    if (Object.keys(bondCounts).length === 0) {
      fieldBonds.innerHTML = '<div style="color:#99a;font-size:11px;padding:8px">暂无角色</div>';
      return;
    }

    const sorted = Object.entries(bondCounts).sort((a, b) => {
      const aIndieAct = independentSet.has(a[0]) && a[1] >= 1;
      const bIndieAct = independentSet.has(b[0]) && b[1] >= 1;
      if (aIndieAct !== bIndieAct) return bIndieAct - aIndieAct;
      const aAct = a[1] >= (campNum[a[0]]?.[0] || Infinity);
      const bAct = b[1] >= (campNum[b[0]]?.[0] || Infinity);
      if (aAct !== bAct) return bAct - aAct;
      return b[1] - a[1] || a[0].localeCompare(b[0], 'zh');
    });
    sorted.forEach(([bond, count]) => {
      const info = getBondTierInfo(bond, count);
      const item = document.createElement('div');
      item.className = 'field-bond-item';
      if (info.tierClass) item.classList.add(info.tierClass);
      if (window.__trackedBonds.includes(bond)) item.classList.add('tracked');
      item.innerHTML = '<span>' + bond + '</span><span class="bond-count">' + info.display + '</span>';
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        showBondInfoPopup(bond, item);
      });
      fieldBonds.appendChild(item);
    });
  }

  function reorderCompendium() {
    const fieldChars = new Set(window.__slotCards.filter(Boolean));
    for (const [a, b] of MUTUAL_EXCLUSIONS) {
      if (fieldChars.has(a)) fieldChars.add(b);
      if (fieldChars.has(b)) fieldChars.add(a);
    }
    const cards = [...compendiumList.children];
    const hasTracked = window.__trackedBonds.length > 0 || window.__searchedBond;

    cards.forEach(c => {
      const ch = c.getAttribute('data-char');
      c.style.display = fieldChars.has(ch) ? 'none' : '';
      const inTracked = charMap[ch].bonds.some(b => window.__trackedBonds.includes(b)) || charMap[ch].bonds.includes(window.__searchedBond);
      c.classList.toggle('tracked-char', hasTracked && inTracked);
      c.classList.toggle('searched-char', window.__searchedChar === ch);
    });

    const visible = cards.filter(c => c.style.display !== 'none');
    visible.sort((a, b) => {
      const aSearch = a.classList.contains('searched-char');
      const bSearch = b.classList.contains('searched-char');
      if (aSearch !== bSearch) return Number(bSearch) - Number(aSearch);
      if (hasTracked) {
        const aIn = a.classList.contains('tracked-char');
        const bIn = b.classList.contains('tracked-char');
        if (aIn !== bIn) return Number(bIn) - Number(aIn);
      }
      return a.getAttribute('data-char').localeCompare(b.getAttribute('data-char'), 'zh');
    });
    visible.forEach(c => compendiumList.appendChild(c));
  }


  // ===== Clear All =====
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    const effectiveMax = getEffectiveMaxSlots();
    window.__slotCards = new Array(effectiveMax).fill(null);
    window.__slotWeapons = new Array(effectiveMax).fill(null).map(() => []);
    window.__slotDiceWeapons = new Array(effectiveMax).fill(null).map(() => new Set());
    window.__trackedBonds = [];
    window.__superstar = null;
    window.__starHunters = [];
    window.__placeOrderSeq = 0;
    window.__equipOrderSeq = 0;
    window.__slotPlaceOrder = new Array(effectiveMax).fill(0);
    window.__slotEquipOrder = new Array(effectiveMax).fill(0);
    window.__searchedChar = null;
    window.__searchedBond = null;
    document.getElementById('team-search-input').value = '';
    document.getElementById('team-search-result').textContent = '';
    document.getElementById('team-search-result').className = '';
    weaponList.querySelectorAll('.weapon-item.weapon-searched').forEach(el => el.classList.remove('weapon-searched'));
    renderSlots();
    updateLeftPanel();
    reorderCompendium();
    updateWeaponListState();
  });

  // ===== Home Confirm Modal =====
  (function() {
    var overlay = document.createElement('div');
    overlay.id = 'home-confirm-overlay';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-dialog">' +
        '<p class="confirm-message">返回首页将丢失当前全部内容，确定要返回吗？</p>' +
        '<div class="confirm-buttons">' +
          '<button class="confirm-btn confirm-cancel">取消</button>' +
          '<button class="confirm-btn confirm-ok">确定返回</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    function dismiss(confirmed) {
      overlay.classList.remove('show');
      if (confirmed) window.location.href = 'index.html';
    }

    overlay.querySelector('.confirm-cancel').addEventListener('click', function() { dismiss(false); });
    overlay.querySelector('.confirm-ok').addEventListener('click', function() { dismiss(true); });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) dismiss(false);
    });

    document.getElementById('tab-home-btn').addEventListener('click', function() {
      var mode = new URLSearchParams(window.location.search).get('mode');
      if (mode === 'team') {
        overlay.classList.add('show');
      } else {
        window.location.href = 'index.html';
      }
    });
  })();

  // ===== Left Panel Toggle =====
  // No separate left panel anymore — it's merged into compendium panel's "field" mode.
  // Left panel effective width is always 0 for compendium width calculation.
  function getLeftPanelEffectiveWidth() {
    return 0;
  }

  // ===== Compendium Resize =====
  const compendiumPanel = document.getElementById('compendium-panel');
  const compendiumToggleBtn = document.getElementById('compendium-toggle');
  const MIN_COMPENDIUM_WIDTH = 150;
  let lastCompendiumWidth = 300;
  let compendiumResizing = false;
  let compendiumResizeMoved = false;
  let resizeStartWidth = 0;
  let resizeStartX = 0;

  function getSlotAreaMinWidth() {
    const bottomSlots = getEffectiveMaxSlots() - TOTAL_FIXED_TOP;
    const topRowWidth = TOTAL_FIXED_TOP * 100 + (TOTAL_FIXED_TOP - 1) * 12;
    const bottomRowWidth = bottomSlots * 100 + (bottomSlots - 1) * 12;
    return Math.max(topRowWidth, bottomRowWidth) + 40; // 20px padding each side
  }

  function updateCompendiumMaxWidth() {
    const tb = document.getElementById('team-builder');
    if (!tb || !tb.offsetParent) return;
    const minSlotArea = getSlotAreaMinWidth();
    slotArea.style.minWidth = minSlotArea + 'px';
    const rect = tb.getBoundingClientRect();
    const maxW = rect.width - getLeftPanelEffectiveWidth() - minSlotArea;
    compendiumPanel.style.maxWidth = Math.max(MIN_COMPENDIUM_WIDTH, maxW) + 'px';
  }

  compendiumToggleBtn.addEventListener('mousedown', (e) => {
    compendiumResizing = true;
    compendiumResizeMoved = false;
    resizeStartX = e.clientX;
    resizeStartWidth = parseInt(compendiumPanel.style.width) || compendiumPanel.getBoundingClientRect().width;
    compendiumPanel.style.transition = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!compendiumResizing) return;
    compendiumResizeMoved = true;
    const deltaX = resizeStartX - e.clientX;
    const rawWidth = resizeStartWidth + deltaX;
    const containerRect = document.getElementById('team-builder').getBoundingClientRect();
    const minSlotArea = getSlotAreaMinWidth();
    const maxAvailable = containerRect.width - getLeftPanelEffectiveWidth() - minSlotArea;

    // Lock at max: stop processing when already at or past the limit
    if (rawWidth >= maxAvailable) {
      if (compendiumPanel.classList.contains('collapsed') || compendiumPanel.style.width !== maxAvailable + 'px') {
        compendiumPanel.classList.remove('collapsed');
        compendiumPanel.style.width = maxAvailable + 'px';
        lastCompendiumWidth = maxAvailable;
        compendiumToggleBtn.innerHTML = '&#9654;';
        compendiumToggleBtn.title = '折叠图鉴';
      }
      return;
    }

    if (rawWidth < MIN_COMPENDIUM_WIDTH) {
      compendiumPanel.classList.add('collapsed');
      compendiumToggleBtn.innerHTML = '&#9664;';
      compendiumToggleBtn.title = '展开图鉴';
    } else {
      compendiumPanel.classList.remove('collapsed');
      compendiumPanel.style.width = rawWidth + 'px';
      lastCompendiumWidth = rawWidth;
      compendiumToggleBtn.innerHTML = '&#9654;';
      compendiumToggleBtn.title = '折叠图鉴';
    }
  });

  document.addEventListener('mouseup', () => {
    if (!compendiumResizing) return;
    compendiumResizing = false;
    compendiumPanel.style.transition = '';
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.dispatchEvent(new Event('resize'));
  });

  compendiumToggleBtn.addEventListener('click', () => {
    if (compendiumResizeMoved) return;
    if (compendiumPanel.classList.contains('collapsed')) {
      compendiumPanel.classList.remove('collapsed');
      compendiumPanel.style.width = lastCompendiumWidth + 'px';
      compendiumToggleBtn.innerHTML = '&#9654;';
      compendiumToggleBtn.title = '折叠图鉴';
    } else {
      lastCompendiumWidth = parseInt(compendiumPanel.style.width) || parseInt(getComputedStyle(compendiumPanel).width) || 300;
      compendiumPanel.classList.add('collapsed');
      compendiumToggleBtn.innerHTML = '&#9664;';
      compendiumToggleBtn.title = '展开图鉴';
    }
    window.dispatchEvent(new Event('resize'));
  });

  // Right-side toggle for compendium panel
  const compendiumToggleRight = document.getElementById('compendium-toggle-right');
  compendiumToggleRight.addEventListener('click', () => {
    if (compendiumPanel.classList.contains('collapsed')) {
      compendiumPanel.classList.remove('collapsed');
      compendiumPanel.style.width = lastCompendiumWidth + 'px';
      compendiumToggleBtn.innerHTML = '&#9654;';
      compendiumToggleBtn.title = '折叠图鉴';
    } else {
      lastCompendiumWidth = parseInt(compendiumPanel.style.width) || parseInt(getComputedStyle(compendiumPanel).width) || 300;
      compendiumPanel.classList.add('collapsed');
      compendiumToggleBtn.innerHTML = '&#9664;';
      compendiumToggleBtn.title = '展开图鉴';
    }
    window.dispatchEvent(new Event('resize'));
  });

  // Header toggle — 在"角色列表"和"场上羁绊"之间切换
  const compendiumHeaderToggle = document.getElementById('compendium-header-toggle');
  compendiumHeaderToggle.addEventListener('click', () => {
    var current = window.__compendiumMode || 'character';
    var next = current === 'character' ? 'field' : 'character';
    switchCompendiumMode(next);
    compendiumHeaderToggle.innerHTML = next === 'field' ? '◀' : '▶';
    compendiumHeaderToggle.title = next === 'field' ? '切换为角色列表' : '切换为场上羁绊';
  });

  // ===== Init =====
  weaponList.style.display = 'none';

  function initTeamBuilder() {
    initAhaWeapons();
    buildCompendium();
    buildWeaponList();
    renderSlots();
    updateLeftPanel();
    updateCompendiumMaxWidth();
    switchCompendiumMode('character');
  }

  window.addEventListener('resize', updateCompendiumMaxWidth);

  // Expose public functions for cross-module use
  window.__initTeamBuilder = initTeamBuilder;
  window.__renderSlots = renderSlots;
  window.__updateLeftPanel = updateLeftPanel;
  window.__reorderCompendium = reorderCompendium;

  // Legacy
  window.initTeamBuilder = initTeamBuilder;

  // If team builder is already visible (e.g. entered with ?mode=team), init now
  if (teamBuilder.style.display === 'flex') {
    initTeamBuilder();
  }
})();
