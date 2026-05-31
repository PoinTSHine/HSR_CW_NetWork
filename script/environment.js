// ===== Environment Data — 分组定义 + HTML 构建 =====
(function () {
  var SECTION_ORDER = (function() {
    var sections = [
      { key: '特邀专家',  label: '特邀专家',  match: function(n) { return n.indexOf('特邀专家') === 0; } },
      { key: '概念股',    label: '概念股',    match: function(n) { return n.indexOf('概念股') !== -1; } },
      { key: '邀请',      label: '邀请',      match: function(n) { return n.slice(-2) === '邀请'; } },
      { key: '契约',      label: '契约',      match: function(n) { return n.slice(-2) === '契约'; } },
      { key: '人才',      label: '人才',      match: function(n) { return n.indexOf('人才') === 0; } },
      { key: '佩佩',      label: '佩佩',      match: function(n) { return n.indexOf('佩佩') !== -1; } },
      { key: '时代',      label: '时代',      match: function(n) { return n.slice(-2) === '时代'; } },
      { key: '经济',      label: '经济',      match: function(n) { return n.indexOf('经济') === 0; } },
      { key: '贵族',      label: '贵族',      match: function(n) { return n.slice(-2) === '贵族'; } },
      { key: '战斗力',    label: '战斗力',    match: function(n) { return n.indexOf('战斗力') === 0; } },
    ];
    sections.sort(function(a, b) { return a.label.localeCompare(b.label, 'zh-CN'); });
    sections.push({ key: '其它', label: '其它', match: function() { return true; } });
    return sections;
  })();

  function classify(name) {
    for (var i = 0; i < SECTION_ORDER.length; i++) {
      if (SECTION_ORDER[i].match(name)) return SECTION_ORDER[i].key;
    }
    return '其它';
  }

  var escHtml = window.__escHtml;

  window.buildEnvironmentHTML = function() {
    var data = window.__ENVIRONMENT_DATA;
    if (!data) return '';
    var names = Object.keys(data);
    var groups = {};
    SECTION_ORDER.forEach(function(s) { groups[s.key] = []; });
    names.forEach(function(n) { groups[classify(n)].push(n); });

    return window.__buildGroupedHTML(SECTION_ORDER, groups, function(name) {
      return '<div class="gallery-card blessing-card">' +
        '<div class="blessing-name">' + escHtml(name) + '</div>' +
        '<div class="blessing-desc">' + escHtml(data[name]) + '</div>' +
      '</div>';
    });
  };
})();
