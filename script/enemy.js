// ===== Enemy Data — 敌方图鉴分组定义 + HTML 构建 =====
(function () {
  var ENEMY_LABEL_ORDER = (function() {
    var sections = [
      { key: '强化', label: '强化', match: function(n) { return n.slice(-2) === '强化'; } },
      { key: '熄火', label: '熄火', match: function(n) { return n.slice(-2) === '熄火'; } },
    ];
    sections.sort(function(a, b) { return a.label.localeCompare(b.label, 'zh-CN'); });
    sections.push({ key: '其它', label: '其它', match: function() { return true; } });
    return sections;
  })();

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
      if (group['首领']) {
        membersHtml += '<div class="enemy-subtitle">首领</div>' +
          '<div class="enemy-member">' + escHtml(group['首领']) + '</div>';
      }
      ['精英敌人', '普通敌人'].forEach(function(tier) {
        if (group[tier] && group[tier].length) {
          membersHtml += '<div class="enemy-subtitle">' + tier + '</div>';
          group[tier].forEach(function(m) {
            membersHtml += '<div class="enemy-member">' + escHtml(m) + '</div>';
          });
        }
      });
      cardsHtml += '<div class="gallery-card blessing-card">' +
        '<div class="blessing-name">' + escHtml(groupName) + '</div>' +
        membersHtml +
      '</div>';
    });
    return '<div class="gallery-section-cards enemy-section-cards">' + cardsHtml + '</div>';
  };
})();
