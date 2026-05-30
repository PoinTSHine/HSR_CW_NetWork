// ===== Environment Mode — 环境图鉴卡片展示（分组） =====
(function () {
  var initialized = false;
  var grid = null;

  var SECTION_ORDER = [
    { key: '特邀专家',  label: '特邀专家',  match: function(n) { return n.indexOf('特邀专家') === 0; } },
    { key: '概念股',    label: '概念股',    match: function(n) { return n.indexOf('概念股') !== -1; } },
    { key: '邀请',      label: '邀请',      match: function(n) { return n.slice(-2) === '邀请'; } },
    { key: '契约',      label: '契约',      match: function(n) { return n.slice(-2) === '契约'; } },
    { key: '其它',      label: '其它',      match: function()  { return true; } }
  ];

  function classify(name) {
    for (var i = 0; i < SECTION_ORDER.length; i++) {
      if (SECTION_ORDER[i].match(name)) return SECTION_ORDER[i].key;
    }
    return '其它';
  }

  function renderCards() {
    if (!grid) return;
    var data = window.envornment;
    if (!data) return;

    var names = Object.keys(data);

    // Group names
    var groups = {};
    SECTION_ORDER.forEach(function(s) { groups[s.key] = []; });
    names.forEach(function(name) {
      groups[classify(name)].push(name);
    });

    var html = '';

    SECTION_ORDER.forEach(function(sec) {
      var secNames = groups[sec.key];
      if (secNames.length === 0) return;
      secNames.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });

      var cardsHtml = '';
      secNames.forEach(function(name) {
        cardsHtml += '<div class="blessing-card">' +
          '<div class="blessing-name">' + escHtml(name) + '</div>' +
          '<div class="blessing-desc">' + escHtml(data[name]) + '</div>' +
        '</div>';
      });

      html += '<div class="others-section">' +
        '<div class="others-section-header">' +
          '<span class="section-arrow">&#9660;</span>' +
          '<span class="section-label">' + escHtml(sec.label) + '</span>' +
          '<span class="section-count">' + secNames.length + '</span>' +
        '</div>' +
        '<div class="others-section-body">' +
          '<div class="others-section-cards">' + cardsHtml + '</div>' +
        '</div>' +
      '</div>';
    });

    grid.innerHTML = html;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    if (initialized) return;
    initialized = true;

    grid = document.getElementById('others-grid');
    renderCards();

    // Delegate click on section headers to toggle collapse
    grid.addEventListener('click', function(e) {
      var header = e.target.closest('.others-section-header');
      if (!header) return;
      var body = header.nextElementSibling;
      if (!body || !body.classList.contains('others-section-body')) return;
      header.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });
  }

  // Expose for lazy initialization when switching to this mode
  window.initEnvorn = init;
})();
