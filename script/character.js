// ===== Character Data — 角色图鉴 HTML 构建 =====
(function () {
  var escHtml = window.__escHtml;

  window.buildCharacterHTML = function() {
    var data = window.__CHR_INTRO;
    if (!data) return '';
    var names = Object.keys(data);
    names.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });

    var cardsHtml = '';
    names.forEach(function(name) {
      var entry = data[name];
      var rolesHtml = '';
      Object.keys(entry).forEach(function(role) {
        rolesHtml += '<div class="chr-role-line">' +
          '<span class="chr-role-name">' + escHtml(role) + '</span>' +
          '<span class="chr-role-desc">' + escHtml(entry[role]) + '</span>' +
        '</div>';
      });

      cardsHtml += '<div class="gallery-card chr-card">' +
        '<div class="chr-name">' + escHtml(name) + '</div>' +
        '<div class="chr-roles">' + rolesHtml + '</div>' +
      '</div>';
    });

    return '<div class="gallery-section-cards chr-section-cards">' + cardsHtml + '</div>';
  };
})();
