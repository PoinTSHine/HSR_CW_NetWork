// ===== Update Log — 更新日志渲染 =====
(function () {
  var grid = document.getElementById('update-grid');
  if (!grid) return;

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildSection(title, data, isArray) {
    if (!data) return '';
    var versions = Object.keys(data).sort(function(a, b) { return b.localeCompare(a, undefined, { numeric: true }); });
    var html = '<div class="update-section-header">' + escHtml(title) + '</div>';

    versions.forEach(function(ver) {
      html += '<div class="version-card">' +
        '<div class="version-title">' + escHtml(ver) + ' 版本</div>';

      if (isArray) {
        data[ver].forEach(function(item) {
          html += '<div class="version-item">' + escHtml(item) + '</div>';
        });
      } else {
        var entry = data[ver];
        var info = entry.info || entry;
        if (Array.isArray(info)) {
          info.forEach(function(item) {
            html += '<div class="version-item">' + escHtml(item) + '</div>';
          });
        } else if (typeof info === 'string') {
          html += '<div class="version-item">' + escHtml(info) + '</div>';
        }
        if (entry.herf) {
          html += '<a class="version-link" href="' + escHtml(entry.herf) + '" target="_blank" rel="noopener">查看详情 →</a>';
        }
      }
      html += '</div>';
    });
    return html;
  }

  var html = '';
  html += buildSection('版本更新', window.__UPDATE_DATA);
  html += buildSection('赛季扩充', window.__UPGRADE_DATA);
  html += buildSection('问题修复', window.__FIX_DATA, true);

  grid.innerHTML = html;
})();
