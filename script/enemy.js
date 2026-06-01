// ===== Enemy Data — 敌方图鉴分组定义 + HTML 构建 =====
(function () {
  var ENEMY_LABEL_ORDER = [
    { key: '强化', label: '强化', match: function(n) { return n.slice(-2) === '强化'; } },
    { key: '熄火', label: '熄火', match: function(n) { return n.slice(-2) === '熄火'; } },
  ];
  ENEMY_LABEL_ORDER.sort(function(a, b) { return a.label.localeCompare(b.label, 'zh-CN'); });
  ENEMY_LABEL_ORDER.push({ key: '其它', label: '其它', match: function() { return true; } });

  function classifyEnemyLabel(name) {
    for (var i = 0; i < ENEMY_LABEL_ORDER.length; i++) {
      if (ENEMY_LABEL_ORDER[i].match(name)) return ENEMY_LABEL_ORDER[i].key;
    }
    return '其它';
  }

  var escHtml = window.__escHtml;

  window.buildEnemyLabelsHTML = function() {
    var labels = window.__ENEMY_LABEL;
    if (!labels) return '';
    var names = Object.keys(labels);
    var groups = {};
    ENEMY_LABEL_ORDER.forEach(function(s) { groups[s.key] = []; });
    names.forEach(function(n) { groups[classifyEnemyLabel(n)].push(n); });

    return window.__buildGroupedHTML(ENEMY_LABEL_ORDER, groups, function(name) {
      return '<div class="gallery-card blessing-card">' +
        '<div class="blessing-name">' + escHtml(name) + '</div>' +
        '<div class="blessing-desc">' + escHtml(labels[name]) + '</div>' +
      '</div>';
    });
  };

  window.buildEnemyGroupsHTML = function() {
    var groups = window.__ENEMY_GROUP;
    if (!groups) return '';
    var groupNames = Object.keys(groups);
    groupNames.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
    var cardsHtml = '';
    groupNames.forEach(function(groupName) {
      var group = groups[groupName];
      var membersHtml = '';

      function buildTier(label, list) {
        if (!list || !list.length) return;
        membersHtml += '<div class="enemy-subtitle">' + label + '</div>' +
          '<div class="enemy-tier">';
        list.forEach(function(m) {
          membersHtml += '<div class="enemy-member">' + escHtml(m) + '</div>';
        });
        membersHtml += '</div>';
      }

      buildTier('首领', group['首领'] ? [group['首领']] : null);
      buildTier('精英敌人', group['精英敌人']);
      buildTier('普通敌人', group['普通敌人']);

      cardsHtml += '<div class="gallery-card blessing-card">' +
        '<div class="blessing-name">' + escHtml(groupName) + '</div>' +
        '<div class="enemy-members">' + membersHtml + '</div>' +
      '</div>';
    });
    return '<div class="gallery-section-cards enemy-section-cards">' + cardsHtml + '</div>';
  };
})();
