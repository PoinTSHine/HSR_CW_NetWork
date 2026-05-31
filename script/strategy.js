// ===== Strategy Mode — 策略图鉴卡片展示 =====
(function () {
  var initialized = false;
  var grid = null;

  var SECTION_ORDER = (function() {
    var sections = [
      { key: '星徽套组', label: '星徽套组', match: function(n) { return n.slice(-4) === '星徽套组'; } },
      { key: '星徽',     label: '星徽',     match: function(n) { return n.slice(-2) === '星徽'; } },
      { key: '祝福',     label: '祝福',     match: function(n) { return n.slice(-2) === '祝福'; } },
      { key: '专家',       label: '专家顾问',   match: function(n) { return n.indexOf('骇客专家') === 0 || n.indexOf('潜行专家') === 0 || n.slice(-2) === '顾问' || n.indexOf('摸个鱼吧') === 0; } },
      { key: '榜样的力量', label: '榜样的力量', match: function(n) { return n.indexOf('榜样的力量') === 0; } },
      { key: '爆晶矿', label: '爆晶矿', match: function(n) { return n.indexOf('爆晶矿') === 0; } },
      { key: '好运令牌', label: '好运令牌', match: function(n) { return n.indexOf('好运令牌') === 0; } },
      { key: '援军',     label: '援军',     match: function(n) { return n.slice(-2) === '援军'; } },
      { key: '公司军火更新', label: '公司军火更新', match: function(n) { return n.indexOf('公司军火更新') === 0; } },
      { key: '大使叽米', label: '叽米', match: function(n) { return n.slice(-4) === '大使叽米'; } },
      { key: '战术义眼', label: '战术义眼', match: function(n) { return n.indexOf('战术义眼') === 0; } },
      { key: '采购专员', label: '采购专员', match: function(n) { return n.indexOf('采购专员') === 0; } },
      { key: '打捞人才库', label: '打捞人才库', match: function(n) { return n.indexOf('打捞人才库') === 0; } },
      { key: '打通上下游', label: '打通上下游', match: function(n) { return n.indexOf('打通上下游') === 0; } },
      { key: '返利', label: '返利', match: function(n) { return n.indexOf('返利') === 0; } },
      { key: '固定理财', label: '固定理财', match: function(n) { return n.indexOf('固定理财') === 0; } },
      { key: '回收计划', label: '回收计划', match: function(n) { return n.indexOf('回收计划') === 0; } },
      { key: '精密拆装', label: '精密拆装', match: function(n) { return n.indexOf('精密拆装') === 0; } },
      { key: '军火贸易', label: '军火贸易', match: function(n) { return n.indexOf('军火贸易') === 0; } },
      { key: '空仓', label: '空仓', match: function(n) { return n.indexOf('空仓') === 0; } },
      { key: '买彩票', label: '买彩票', match: function(n) { return n.indexOf('买彩票') === 0; } },
      { key: '溜佩佩', label: '溜佩佩', match: function(n) { return n.indexOf('溜佩佩') === 0; } },
      { key: '秘密典籍', label: '秘密典籍', match: function(n) { return n.indexOf('秘密典籍') === 0; } },
      { key: '气氛组', label: '气氛组', match: function(n) { return n.indexOf('气氛组') === 0; } },
      { key: '枪在手', label: '枪在手', match: function(n) { return n.indexOf('枪在手') === 0; } },
      { key: '人才激励', label: '人才激励', match: function(n) { return n.indexOf('人才激励') === 0; } },
      { key: '特战资金', label: '特战资金', match: function(n) { return n.indexOf('特战资金') === 0; } },
      { key: '团队力量', label: '团队力量', match: function(n) { return n.indexOf('团队力量') === 0; } },
      { key: '小复制', label: '小复制', match: function(n) { return n.indexOf('小复制') === 0; } },
      { key: '长期主义', label: '长期主义', match: function(n) { return n.indexOf('长期主义') === 0; } },
      { key: '招聘资金', label: '招聘资金', match: function(n) { return n.indexOf('招聘资金') === 0; } },
      { key: '武器支援', label: '武器支援', match: function(n) { return n.indexOf('武器支援') === 0; } },
      { key: '闪耀', label: '红/蓝钻闪耀', match: function(n) { return n.slice(-2) === '闪耀'; } },
      { key: '装备方案', label: '装备方案', match: function(n) { return n.indexOf('装备方案') === 0; } },
      { key: '专家招募', label: '专家招募', match: function(n) { return n.indexOf('专家招募') === 0; } },
      { key: '垃圾', label: '垃圾', match: function(n) { return n.slice(-2) === '垃圾'; } },
      { key: '策略三选一', label: '策略三选一', match: function(n) { return n.slice(-2) === '期货' || n.slice(-3) === '期货+' || n.slice(-2) === '投资'; } },
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

  function renderCards() {
    if (!grid) return;
    var data = window.strategy;
    if (!data) return;

    var names = Object.keys(data);

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
        var entry = data[name];
        var desc = entry['介绍'];
        var rarity = entry['稀有度'];
        var descHtml = desc ? '<div class="strategy-desc">' + escHtml(desc) + '</div>' : '';
        cardsHtml += '<div class="gallery-card strategy-card rarity-' + rarity + '">' +
          '<div class="strategy-name">' + escHtml(name) + '</div>' +
          descHtml +
        '</div>';
      });

      html += '<div class="gallery-section strategy-section">' +
        '<div class="gallery-section-header strategy-section-header">' +
          '<span class="section-arrow">&#9660;</span>' +
          '<span class="section-label">' + escHtml(sec.label) + '</span>' +
          '<span class="section-count">' + secNames.length + '</span>' +
        '</div>' +
        '<div class="gallery-section-body strategy-section-body">' +
          '<div class="gallery-section-cards strategy-section-cards">' + cardsHtml + '</div>' +
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

    grid = document.getElementById('strategy-grid');
    renderCards();

    grid.addEventListener('click', function(e) {
      var header = e.target.closest('.gallery-section-header');
      if (!header) return;
      var body = header.nextElementSibling;
      if (!body || !body.classList.contains('gallery-section-body')) return;
      header.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });
  }

  window.initStrategy = init;
})();
