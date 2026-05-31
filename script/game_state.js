// ===== Shared Game State =====
// Mutable state shared across team_builder modules.
// Initialized by team_builder.js IIFE, read/written by all modules.
window.__state = {};

// Shared HTML escape utility
window.__escHtml = function(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// Shared grouped gallery builder:
// secOrder = [{key,label}] sorted; groupMap = {key: [names]}; cardFn(name) → HTML string
window.__buildGroupedHTML = function(secOrder, groupMap, cardFn, sectionClass) {
  var html = '';
  var cls = sectionClass || 'others-section';
  var esc = window.__escHtml;
  secOrder.forEach(function(sec) {
    var secNames = groupMap[sec.key];
    if (!secNames || secNames.length === 0) return;
    secNames.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
    var cardsHtml = '';
    secNames.forEach(function(name) { cardsHtml += cardFn(name); });
    html += '<div class="gallery-section ' + cls + '">' +
      '<div class="gallery-section-header ' + cls + '-header">' +
        '<span class="section-arrow">&#9660;</span>' +
        '<span class="section-label">' + esc(sec.label) + '</span>' +
        '<span class="section-count">' + secNames.length + '</span>' +
      '</div>' +
      '<div class="gallery-section-body ' + cls + '-body">' +
        '<div class="gallery-section-cards ' + cls + '-cards">' + cardsHtml + '</div>' +
      '</div>' +
    '</div>';
  });
  return html;
};
