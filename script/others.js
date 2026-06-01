// ===== Others Mode — 侧边栏切换控制器 =====
(function () {
  var initialized = false;
  var grid = null;
  var currentView = 'environment';

  var BUILDERS = {
    'enemy-labels': function() { return window.buildEnemyLabelsHTML ? window.buildEnemyLabelsHTML() : ''; },
    'enemy-groups': function() { return window.buildEnemyGroupsHTML ? window.buildEnemyGroupsHTML() : ''; },
    'environment':  function() { return window.buildEnvironmentHTML  ? window.buildEnvironmentHTML()  : ''; },
    'strategy':     function() { return window.buildStrategyHTML     ? window.buildStrategyHTML()     : ''; },
    'bond':         function() { return window.buildBondHTML         ? window.buildBondHTML()         : ''; },
    'character':    function() { return window.buildCharacterHTML    ? window.buildCharacterHTML()    : ''; }
  };

  function renderCards() {
    if (!grid) return;
    var fn = BUILDERS[currentView];
    grid.innerHTML = fn ? fn() : '';
    if (currentView === 'bond' && window.ensureBondPopup) window.ensureBondPopup();
  }

  function switchView(view) {
    var allItems = document.querySelectorAll('.others-menu-item');
    allItems.forEach(function(item) { item.classList.remove('active'); });
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

    document.querySelectorAll('.others-menu-item').forEach(function(item) {
      item.addEventListener('click', function() {
        switchView(item.getAttribute('data-view'));
        item.classList.add('active');
      });
    });
  }

  window.initOthers = init;
})();
