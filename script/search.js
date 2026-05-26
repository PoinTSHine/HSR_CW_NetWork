// ===== Shared Fuzzy Search Utility =====
window.__createFuzzySearch = function(config) {
  const {
    input, btn, resultEl, container, sources,
    onDismiss, onEmpty, onNoMatch, onSelect,
  } = config;

  var dropdownEl = null;
  var composing = false;

  function clearResult() {
    resultEl.textContent = '';
    resultEl.className = '';
  }

  function dismiss() {
    if (!dropdownEl) return;
    dropdownEl.remove();
    dropdownEl = null;
    var q = input.value.trim();
    if (onDismiss) {
      onDismiss(q);
    } else if (q) {
      resultEl.textContent = '未找到：' + q;
      resultEl.className = 'not-found';
    }
  }

  function selectResult(match) {
    input.value = match.value;
    dismiss();
    resultEl.textContent = '已找到' + match.source.name + '：' + match.value;
    resultEl.className = 'found';
    if (match.source.onSelect) match.source.onSelect(match.value);
    if (onSelect) onSelect();
  }

  function doSearch() {
    var query = input.value.trim();
    dismiss();

    if (!query) {
      clearResult();
      if (onEmpty) onEmpty();
      return;
    }

    // Single Latin letter: skip (avoids matching English names like "Archer" during pinyin)
    if (query.length === 1 && /[a-zA-Z]/.test(query)) {
      clearResult();
      return;
    }

    var matches = [];
    sources.forEach(function(source) {
      source.items.forEach(function(item) {
        if (item.includes(query)) {
          matches.push({ source: source, value: item, label: source.name + ' ' + item });
        }
      });
    });

    if (matches.length === 0) {
      resultEl.textContent = '未找到：' + query;
      resultEl.className = 'not-found';
      if (onNoMatch) onNoMatch(query);
      return;
    }

    clearResult();
    var dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    matches.forEach(function(m) {
      var item = document.createElement('div');
      item.className = 'search-dropdown-item';
      item.textContent = m.label;
      item.addEventListener('click', function() { selectResult(m); });
      dropdown.appendChild(item);
    });
    container.appendChild(dropdown);
    dropdownEl = dropdown;
  }

  input.addEventListener('compositionstart', function() { composing = true; });
  input.addEventListener('compositionend', function() { composing = false; doSearch(); });

  btn.addEventListener('click', doSearch);
  input.addEventListener('input', function() { if (!composing) doSearch(); });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { composing = false; doSearch(); }
  });

  container.addEventListener('click', function(e) { e.stopPropagation(); });
  document.addEventListener('click', function(e) {
    if (dropdownEl && !container.contains(e.target)) dismiss();
  });

  return { search: doSearch, dismiss: dismiss };
};
