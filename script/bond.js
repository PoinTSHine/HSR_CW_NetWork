// ===== Bond Data — 羁绊图鉴 HTML 构建 =====
(function () {
  var escHtml = window.__escHtml;
  var popupReady = false;

  function ensurePopup() {
    var grid = document.getElementById('others-grid');
    if (!grid) return;
    var existing = grid.querySelector('.bond-detail-popup');
    if (existing) existing.remove();

    var popup = document.createElement('div');
    popup.className = 'bond-detail-popup';
    popup._currentTarget = null;
    grid.appendChild(popup);

    if (!popupReady) {
      popupReady = true;
      document.addEventListener('click', function(e) {
        var nameEl = e.target.closest('.bond-supp-clickable');
        var popupEl = document.querySelector('.bond-detail-popup');
        if (!popupEl) return;

        if (nameEl) {
          if (popupEl._currentTarget) popupEl._currentTarget.classList.remove('active');
          if (popupEl.classList.contains('show') && popupEl._currentTarget === nameEl) {
            popupEl.classList.remove('show');
            popupEl._currentTarget = null;
          } else {
            nameEl.classList.add('active');
            var tiers = JSON.parse(decodeURIComponent(nameEl.getAttribute('data-tiers')));
            var html = '<div class="popup-name">' + nameEl.textContent + '</div>';
            tiers.forEach(function(t) {
              html += '<div class="popup-tier"><span class="popup-tier-num">' + t.num + '</span>' + escHtml(t.text) + '</div>';
            });
            popupEl.innerHTML = html;
            popupEl.classList.add('show');
            popupEl._currentTarget = nameEl;
            var tagRect = nameEl.getBoundingClientRect();
            var gridRect = grid.getBoundingClientRect();
            popupEl.style.left = (tagRect.right - gridRect.left + grid.scrollLeft + 8) + 'px';
            popupEl.style.top = (tagRect.top - gridRect.top + grid.scrollTop) + 'px';
          }
          e.stopPropagation();
        } else {
          if (popupEl._currentTarget) popupEl._currentTarget.classList.remove('active');
          popupEl.classList.remove('show');
          popupEl._currentTarget = null;
        }
      });
    }
  }

  function classifyBond(name) {
    var classes = window.__CAMP_CLASS;
    if (!classes) return '其它';
    if (classes['阵营羁绊'] && classes['阵营羁绊'].indexOf(name) !== -1) return '阵营羁绊';
    if (classes['流派羁绊'] && classes['流派羁绊'].indexOf(name) !== -1) return '流派羁绊';
    if (classes['独立羁绊'] && classes['独立羁绊'].indexOf(name) !== -1) return '独立羁绊';
    return '其它';
  }

  window.ensureBondPopup = function() {
    ensurePopup();
  };

  window.buildBondHTML = function() {
    var data = window.__CAMP_STATS;
    if (!data) return '';
    var names = Object.keys(data);
    names.sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });

    var groups = { '阵营羁绊': [], '流派羁绊': [], '独立羁绊': [], '其它': [] };
    names.forEach(function(n) { groups[classifyBond(n)].push(n); });

    var groupOrder = ['阵营羁绊', '流派羁绊', '独立羁绊', '其它'];
    var html = '';

    groupOrder.forEach(function(groupName) {
      var secNames = groups[groupName];
      if (secNames.length === 0) return;

      var cardsHtml = '';
      secNames.forEach(function(name) {
        var entry = data[name];
        var intro = entry['介绍'] || '';
        var supp = entry['补充'] || '';

        var tiers = [];
        Object.keys(entry).forEach(function(k) {
          if (/^\d+$/.test(k)) tiers.push({ num: parseInt(k), text: entry[k] });
        });
        tiers.sort(function(a, b) { return a.num - b.num; });
        var tiersHtml = '';
        tiers.forEach(function(t) {
          tiersHtml += '<div class="bond-tier-line"><span class="bond-tier-num">' + t.num + '</span>' + escHtml(t.text) + '</div>';
        });

        var suppHtml = '';
        if (typeof supp === 'object') {
          suppHtml = '<div class="bond-supp">';
          Object.keys(supp).forEach(function(key) {
            var val = supp[key];
            if (typeof val === 'object') {
              var tierData = [];
              Object.keys(val).forEach(function(k) {
                if (/^\d+$/.test(k)) tierData.push({ num: parseInt(k), text: val[k] });
              });
              tierData.sort(function(a, b) { return a.num - b.num; });
              if (tierData.length > 0) {
                var tierJson = encodeURIComponent(JSON.stringify(tierData));
                suppHtml += '<div class="bond-supp-line">' +
                  '<div class="bond-supp-name bond-supp-clickable" data-tiers="' + tierJson + '">' + escHtml(key) + '</div>' +
                  '<div class="bond-supp-item">' + escHtml(val['介绍'] || '') + '</div>' +
                '</div>';
              } else {
                suppHtml += '<div class="bond-supp-line"><span class="bond-supp-name">' + escHtml(key) + '</span>' + escHtml(val) + '</div>';
              }
            } else {
              suppHtml += '<div class="bond-supp-line"><span class="bond-supp-name">' + escHtml(key) + '</span>' + escHtml(val) + '</div>';
            }
          });
          suppHtml += '</div>';
        } else if (supp) {
          suppHtml = '<div class="bond-supp">' + escHtml(supp) + '</div>';
        }

        var members = (window.__CAMP_MEM && window.__CAMP_MEM[name]) || [];
        var membersHtml = '';
        members.forEach(function(m) {
          membersHtml += '<span class="bond-member-tag">' + escHtml(m) + '</span>';
        });
        if (membersHtml) membersHtml = '<div class="bond-members">' + membersHtml + '</div>';

        cardsHtml += '<div class="gallery-card bond-card">' +
          '<div class="bond-name">' + escHtml(name) + '</div>' +
          membersHtml +
          '<div class="bond-intro">' + escHtml(intro) + '</div>' +
          tiersHtml +
          suppHtml +
        '</div>';
      });

      html += '<div class="gallery-section others-section">' +
        '<div class="gallery-section-header others-section-header">' +
          '<span class="section-arrow">&#9660;</span>' +
          '<span class="section-label">' + escHtml(groupName) + '</span>' +
          '<span class="section-count">' + secNames.length + '</span>' +
        '</div>' +
        '<div class="gallery-section-body others-section-body">' +
          '<div class="gallery-section-cards bond-section-cards">' + cardsHtml + '</div>' +
        '</div>' +
      '</div>';
    });

    return html;
  };
})();
