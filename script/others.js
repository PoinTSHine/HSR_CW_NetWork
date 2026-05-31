// ===== Others Mode — 侧边栏切换控制器 =====
(function () {
  var initialized = false;
  var grid = null;
  var currentView = 'environment';

  function renderCards() {
    if (!grid) return;
    var html = '';
    if (currentView === 'enemy-labels') html = window.buildEnemyLabelsHTML ? window.buildEnemyLabelsHTML() : '';
    else if (currentView === 'enemy-groups') html = window.buildEnemyGroupsHTML ? window.buildEnemyGroupsHTML() : '';
    else if (currentView === 'environment') html = window.buildEnvironmentHTML ? window.buildEnvironmentHTML() : '';
    else if (currentView === 'strategy') html = window.buildStrategyHTML ? window.buildStrategyHTML() : '';
    grid.innerHTML = html;
  }

  function init() {
    if (initialized) return;
    initialized = true;

    grid = document.getElementById('others-grid');
    renderCards();

    grid.addEventListener('click', function(e) {
      var header = e.target.closest('.gallery-section-header');
      if (!header) return;
      var body = header.nextElementSibling;
      if (!body || !body.classList.contains('gallery-section-body')) return;
      header.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });

    // Sidebar: enemy parent toggle
    var enemyParent = document.querySelector('.others-menu-item[data-view="enemy"]');
    var enemySubmenu = document.querySelector('.others-submenu');
    if (enemyParent && enemySubmenu) {
      enemyParent.addEventListener('click', function() {
        enemyParent.classList.toggle('collapsed');
        enemySubmenu.classList.toggle('collapsed');
      });
    }

    // Sidebar: sub-item clicks
    var subItems = document.querySelectorAll('.others-menu-item.sub');
    var topItems = document.querySelectorAll('.others-menu-item[data-view="environment"], .others-menu-item[data-view="strategy"]');
    subItems.forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        subItems.forEach(function(si) { si.classList.remove('active'); });
        topItems.forEach(function(ti) { ti.classList.remove('active'); });
        if (enemyParent) enemyParent.classList.remove('collapsed');
        if (enemySubmenu) enemySubmenu.classList.remove('collapsed');
        item.classList.add('active');
        currentView = item.getAttribute('data-view');
        renderCards();
      });
    });

    // Sidebar: top-level non-enemy items
    topItems.forEach(function(item) {
      item.addEventListener('click', function() {
        subItems.forEach(function(si) { si.classList.remove('active'); });
        topItems.forEach(function(ti) { ti.classList.remove('active'); });
        if (enemyParent) enemyParent.classList.add('collapsed');
        if (enemySubmenu) enemySubmenu.classList.add('collapsed');
        item.classList.add('active');
        currentView = item.getAttribute('data-view');
        renderCards();
      });
    });
  }

  window.initOthers = init;
})();
