// ===== Others Mode — 侧边栏切换控制器 =====
(function () {
  var initialized = false;
  var grid = null;
  var currentView = 'environment';

  var BUILDERS = {
    'enemy-labels': function() { return window.buildEnemyLabelsHTML ? window.buildEnemyLabelsHTML() : ''; },
    'enemy-groups': function() { return window.buildEnemyGroupsHTML ? window.buildEnemyGroupsHTML() : ''; },
    'environment':  function() { return window.buildEnvironmentHTML  ? window.buildEnvironmentHTML()  : ''; },
    'strategy':     function() {
      var r = getActiveRarities();
      return window.buildStrategyHTML ? window.buildStrategyHTML(r) : '';
    },
    'bond':         function() { return window.buildBondHTML         ? window.buildBondHTML()         : ''; },
    'character':    function() {
      var f = null;
      // Only apply filters if checkboxes have been populated
      if (document.querySelector('#cf-bond input')) f = getCharacterFilters();
      return window.buildCharacterHTML ? window.buildCharacterHTML(f) : '';
    },
  };

  function renderCards() {
    if (!grid) return;
    var fn = BUILDERS[currentView];
    grid.innerHTML = fn ? fn() : '';
    if (currentView === 'bond' && window.ensureBondPopup) window.ensureBondPopup();
  }

  function getActiveRarities() {
    var checks = document.querySelectorAll('#strategy-filter .filter-opt input');
    var result = [];
    checks.forEach(function(cb) { if (cb.checked) result.push(cb.value); });
    return result;
  }

  function getCharacterFilters() {
    var getChecked = function(sel) {
      var result = [];
      document.querySelectorAll(sel + ' input:checked').forEach(function(cb) { result.push(cb.value); });
      return result;
    };
    return {
      bonds: getChecked('#cf-bond'),
      spends: getChecked('#cf-spend'),
      positions: getChecked('#cf-position'),
      experts: getChecked('#cf-expert')
    };
  }

  function toggleFilter(filterId, active, isSame) {
    var el = document.getElementById(filterId);
    if (!el) return;
    if (active) {
      if (isSame) el.classList.toggle('collapsed');
      else el.classList.remove('collapsed');
    } else {
      el.classList.add('collapsed');
    }
  }

  function switchView(view) {
    var allItems = document.querySelectorAll('.others-menu-item');
    allItems.forEach(function(item) { item.classList.remove('active'); });

    var isSame = (view === currentView);
    toggleFilter('strategy-filter', view === 'strategy', isSame);
    toggleFilter('character-filter', view === 'character', isSame);

    currentView = view;
    renderCards();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    grid = document.getElementById('others-grid');
    renderCards();

    // Sidebar toggle
    var sidebarToggle = document.getElementById('others-sidebar-toggle');
    var sidebar = document.getElementById('others-sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
      });
    }

    grid.addEventListener('click', function(e) {
      var header = e.target.closest('.gallery-section-header');
      if (!header) return;
      var body = header.nextElementSibling;
      if (!body || !body.classList.contains('gallery-section-body')) return;
      header.classList.toggle('collapsed');
      body.classList.toggle('collapsed');
    });

    document.querySelectorAll('.others-menu-item').forEach(function(item) {
      item.addEventListener('click', function() {
        switchView(item.getAttribute('data-view'));
        item.classList.add('active');
      });
    });

    // Filter checkbox change (delegated on both panels)
    ['strategy-filter', 'character-filter'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function(e) {
        if (!e.target.matches('input[type="checkbox"]')) return;
        var viewMap = { 'strategy-filter': 'strategy', 'character-filter': 'character' };
        if (currentView === viewMap[id]) renderCards();
      });
    });
  }

  window.initOthers = init;
})();
