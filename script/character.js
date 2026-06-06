// ===== Character Data — 角色图鉴 HTML 构建 =====
(function () {
  var escHtml = window.__escHtml;
  var filterPopulated = false;

  function populateFilter() {
    if (filterPopulated) return;
    filterPopulated = true;

    // Build bond list from CAMP_MEM (all bonds a character belongs to)
    var bondChars = {};
    var mem = window.__CAMP_MEM || {};
    Object.keys(mem).forEach(function(bond) {
      mem[bond].forEach(function(ch) { (bondChars[ch] = bondChars[ch] || []).push(bond); });
    });

    // Bond filter
    var bondNames = Object.keys(window.__CAMP_MEM || {}).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
    var bondHtml = '';
    bondNames.forEach(function(b) {
      bondHtml += '<label class="cf-opt"><input type="checkbox" value="' + escHtml(b) + '" checked> ' + escHtml(b) + '</label>';
    });
    document.getElementById('cf-bond').innerHTML = bondHtml;

    // Spend filter
    var spendNames = Object.keys(window.__CHR_SPEND || {}).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
    var spendHtml = '';
    spendNames.forEach(function(s) {
      spendHtml += '<label class="cf-opt"><input type="checkbox" value="' + escHtml(s) + '" checked> ' + escHtml(s) + '</label>';
    });
    document.getElementById('cf-spend').innerHTML = spendHtml;

    // Position filter
    var posNames = Object.keys(window.__CHR_POSITION || {}).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
    var posHtml = '';
    posNames.forEach(function(p) {
      posHtml += '<label class="cf-opt"><input type="checkbox" value="' + escHtml(p) + '" checked> ' + escHtml(p) + '</label>';
    });
    document.getElementById('cf-position').innerHTML = posHtml;

    // Expert filter
    var experts = window.__CHR_EXPERTS || [];
    var expertHtml = '<label class="cf-opt"><input type="checkbox" value="_expert" checked> 专家顾问</label>' +
      '<label class="cf-opt"><input type="checkbox" value="_normal" checked> 非专家顾问</label>';
    document.getElementById('cf-expert').innerHTML = expertHtml;

    // Section collapse
    document.querySelectorAll('.cf-header').forEach(function(h) {
      h.addEventListener('click', function() {
        h.classList.toggle('collapsed');
        h.nextElementSibling.classList.toggle('collapsed');
      });
    });
  }

  var chrBonds, chrSpend, chrPos, experts;

  function buildLookups() {
    if (chrBonds) return;
    chrBonds = {};
    var mem = window.__CAMP_MEM || {};
    Object.keys(mem).forEach(function(bond) {
      mem[bond].forEach(function(ch) { (chrBonds[ch] = chrBonds[ch] || []).push(bond); });
    });
    chrSpend = {};
    var spend = window.__CHR_SPEND || {};
    Object.keys(spend).forEach(function(s) {
      spend[s].forEach(function(ch) { chrSpend[ch] = s; });
    });
    chrPos = {};
    var pos = window.__CHR_POSITION || {};
    Object.keys(pos).forEach(function(p) {
      pos[p].forEach(function(ch) { chrPos[ch] = p; });
    });
    experts = window.__CHR_EXPERTS || [];
  }

  window.buildCharacterHTML = function(filters) {
    populateFilter();
    buildLookups();

    var data = window.__CHR_INTRO;
    if (!data) return '';

    var names = Object.keys(data);
    names.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });

    var cardsHtml = '';
    names.forEach(function(name) {
      if (filters) {
        // Bond filter
        if (filters.bonds) {
          if (filters.bonds.length === 0) return;
          var chrBondList = chrBonds[name] || [];
          var matchBond = chrBondList.some(function(b) { return filters.bonds.indexOf(b) !== -1; });
          if (!matchBond) return;
        }
        // Spend filter
        if (filters.spends) {
          if (filters.spends.length === 0) return;
          if (filters.spends.indexOf(chrSpend[name] || '') === -1) return;
        }
        // Position filter
        if (filters.positions) {
          if (filters.positions.length === 0) return;
          if (filters.positions.indexOf(chrPos[name] || '') === -1) return;
        }
        // Expert filter
        if (filters.experts) {
          if (filters.experts.length === 0) return;
          if (filters.experts.length === 1) {
            var isExpert = experts.indexOf(name) !== -1;
            if (filters.experts[0] === '_expert' && !isExpert) return;
            if (filters.experts[0] === '_normal' && isExpert) return;
          }
        }
      }

      var entry = data[name];
      var rolesHtml = '';
      Object.keys(entry).forEach(function(role) {
        rolesHtml += '<div class="chr-role-line">' +
          '<span class="chr-role-name">' + escHtml(role) + '</span>' +
          '<span class="chr-role-desc">' + escHtml(entry[role]) + '</span>' +
        '</div>';
      });

      // Spend badge
      var metaHtml = '';
      var spendVal = chrSpend[name] || '';
      if (spendVal) {
        metaHtml += '<span class="chr-spend spend-' + escHtml(spendVal) + '">' + (spendVal === 'special' ? '特' : spendVal + '费') + '</span>';
      }
      // Position indicator
      var posVal = chrPos[name] || '';
      if (posVal) {
        var topCls = posVal === '后台' ? 'hollow' : 'solid';
        var botCls = posVal === '前台' ? 'hollow' : 'solid';
        metaHtml += '<span class="chr-pos" title="' + escHtml(posVal) + '">' +
          '<span class="pb ' + topCls + '"></span><span class="pb ' + botCls + '"></span>' +
        '</span>';
      }
      // Bond tags
      var bondsList = chrBonds[name] || [];
      var tagsHtml = '';
      if (bondsList.length > 0) {
        tagsHtml = '<div class="chr-tags">';
        bondsList.forEach(function(b) {
          tagsHtml += '<span class="chr-bond-tag">' + escHtml(b) + '</span>';
        });
        tagsHtml += '</div>';
      }

      var isExpert = experts.indexOf(name) !== -1;
      var expertClass = isExpert ? ' expert-card' : '';

      cardsHtml += '<div class="gallery-card chr-card' + expertClass + '">' +
        '<div class="chr-name"><span class="chr-name-text">' + escHtml(name) + '</span>' + metaHtml + '</div>' +
        tagsHtml +
        '<div class="chr-roles">' + rolesHtml + '</div>' +
      '</div>';
    });

    return '<div class="gallery-section-cards chr-section-cards">' + cardsHtml + '</div>';
  };
})();
