// ===== Others Mode — 侧边栏切换控制器 =====
(function () {
  var initialized = false;
  var grid = null;
  var currentView = 'environment';

  var BUILDERS = {
    'enemy-labels': function() { return window.buildEnemyLabelsHTML ? window.buildEnemyLabelsHTML() : ''; },
    'enemy-groups': function() { return window.buildEnemyGroupsHTML ? window.buildEnemyGroupsHTML() : ''; },
    'environment':  function() { return window.buildEnvironmentHTML  ? window.buildEnvironmentHTML()  : ''; },
    'strategy':     function() { return window.buildStrategyHTML     ? window.buildStrategyHTML()     : ''; }
  };

  function renderCards() {
    if (!grid) return;
    var fn = BUILDERS[currentView];
    grid.innerHTML = fn ? fn() : '';
  }

  function switchView(view, collapseEnemy) {
    var subItems = document.querySelectorAll('.others-menu-item.sub');
    var topItems = document.querySelectorAll('.others-menu-item[data-view="environment"], .others-menu-item[data-view="strategy"]');
    var enemyParent = document.querySelector('.others-menu-item[data-view="enemy"]');
    var enemySubmenu = document.querySelector('.others-submenu');

    subItems.forEach(function(si) { si.classList.remove('active'); });
    topItems.forEach(function(ti) { ti.classList.remove('active'); });
    if (collapseEnemy && enemyParent) enemyParent.classList.add('collapsed');
    if (collapseEnemy && enemySubmenu) enemySubmenu.classList.add('collapsed');
    if (!collapseEnemy && enemyParent) enemyParent.classList.remove('collapsed');
    if (!collapseEnemy && enemySubmenu) enemySubmenu.classList.remove('collapsed');

    currentView = view;
    renderCards();
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

    var enemyParent = document.querySelector('.others-menu-item[data-view="enemy"]');
    var enemySubmenu = document.querySelector('.others-submenu');
    if (enemyParent && enemySubmenu) {
      enemyParent.addEventListener('click', function() {
        enemyParent.classList.toggle('collapsed');
        enemySubmenu.classList.toggle('collapsed');
      });
    }

    document.querySelectorAll('.others-menu-item.sub').forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        switchView(item.getAttribute('data-view'), false);
        item.classList.add('active');
      });
    });

    document.querySelectorAll('.others-menu-item[data-view="environment"], .others-menu-item[data-view="strategy"]').forEach(function(item) {
      item.addEventListener('click', function() {
        switchView(item.getAttribute('data-view'), true);
        item.classList.add('active');
      });
    });
  }

  window.initOthers = init;
})();
