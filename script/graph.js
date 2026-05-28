// ===== Data Processing =====
function processData(raw, experts, spendData, posData) {
  const charBonds = {};   // charName -> Set of bond names
  const bondChars = {};   // bondName -> unique char array
  const soloChars = new Set();
  const expertSet = new Set(experts || []);

  const buildMap = (data) => {
    const map = {};
    if (data) for (const [key, chars] of Object.entries(data)) chars.forEach(ch => map[ch] = key);
    return map;
  };
  const charSpend = buildMap(spendData);
  const charPosition = buildMap(posData);

  for (const [bond, chars] of Object.entries(raw)) {
    const unique = [...new Set(chars)];
    bondChars[bond] = unique;
    if (unique.length === 1) soloChars.add(unique[0]);
    for (const ch of unique) {
      if (!charBonds[ch]) charBonds[ch] = new Set();
      charBonds[ch].add(bond);
    }
  }

  // Nodes
  const nodes = Object.entries(charBonds).map(([name, bonds]) => ({
    id: name,
    bonds: [...bonds],
    bondCount: bonds.size,
    isSolo: soloChars.has(name),
    isExpert: expertSet.has(name),
    spend: charSpend[name] || null,
    position: charPosition[name] || null
  }));

  // Lookup map
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Links: connect all pairs within each bond, merge duplicates
  const linkMap = {};
  for (const [bond, chars] of Object.entries(bondChars)) {
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const key = [chars[i], chars[j]].sort().join('|||');
        if (!linkMap[key]) linkMap[key] = { source: chars[i], target: chars[j], bonds: [] };
        linkMap[key].bonds.push(bond);
      }
    }
  }
  const links = Object.values(linkMap).map(l => ({
    source: l.source,
    target: l.target,
    bonds: l.bonds,
    weight: l.bonds.length
  }));

  // Compute degree (number of links) for each node
  const degree = {};
  nodes.forEach(n => degree[n.id] = 0);
  links.forEach(l => {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  });
  nodes.forEach(n => { n.degree = degree[n.id]; });

  return { nodes, links, nodeMap, bondChars };
}

// ===== Main =====
(function () {
  const { nodes, links, nodeMap, bondChars } = processData(window.__CAMP_MEM, window.__CHR_EXPERTS, window.__CHR_SPEND, window.__CHR_POSITION);



// State
let filteredNodes = null;   // null = show all, Set = show only these IDs
let selectedId = null;
let preDragFilter = null;
let activeBond = null;
let svg, g, zoom, simulation;
let linkEls;

// ===== Helpers =====
function nodeRadius(d) {
  if (d.isSolo && !d.isExpert) return 18;
  if (d.isExpert) return 16;
  return 8 + Math.min(d.bondCount, 8);
}

function linkId(endpoint) {
  return typeof endpoint === 'object' ? endpoint.id : endpoint;
}

function collapseAllSidebar() {
  const sel = '.bond-item.expanded, .bond-chars.expanded, .char-item.selected, .bond-section-header.expanded, .bond-section-body.expanded';
  document.querySelectorAll(sel).forEach(el => {
    el.classList.remove('expanded', 'active', 'selected');
  });
}

function centerOnPoint(cx, cy, scale) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  return svg.transition().duration(400).call(zoom.transform,
    d3.zoomIdentity.translate(w / 2, h / 2).scale(scale).translate(-cx, -cy)
  );
}

// ===== SVG Setup =====
const container = document.getElementById('graph-container');
const width = container.clientWidth;
const height = container.clientHeight;

svg = d3.select('#graph-svg')
  .attr('width', width)
  .attr('height', height);

// Zoom layer
g = svg.append('g');

zoom = d3.zoom()
  .scaleExtent([0.2, 4])
  .on('zoom', (event) => { g.attr('transform', event.transform); });

svg.call(zoom);

// Legend
const legend = document.createElement('div');
legend.id = 'legend';
legend.innerHTML = `
  <div class="legend-item"><span class="legend-dot normal"></span> 普通角色</div>
  <div class="legend-item"><span class="legend-dot solo"></span> 独立羁绊角色</div>
  <div class="legend-item"><span class="legend-dot expert"></span> 专家顾问角色</div>
`;
container.appendChild(legend);

// ===== Background click =====
svg.on('click', (event) => {
  if (event.target === svg.node()) {
    resetFilter();
  }
});

// ===== Detail Box =====
const detailBox = document.getElementById('detail-box');
const detailName = document.getElementById('detail-name');
const detailBonds = document.getElementById('detail-bonds');
document.getElementById('detail-close').addEventListener('click', deselectNode);

// Make detail box draggable by header
(function () {
  const header = detailBox.querySelector('.detail-header');
  let dragging = false, offX, offY;
  header.addEventListener('mousedown', (e) => {
    if (e.target === document.getElementById('detail-close')) return;
    dragging = true;
    const rect = detailBox.getBoundingClientRect();
    offX = e.clientX - rect.left;
    offY = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const containerRect = document.getElementById('graph-container').getBoundingClientRect();
    detailBox.style.left = (e.clientX - containerRect.left - offX) + 'px';
    detailBox.style.top = (e.clientY - containerRect.top - offY) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      header.style.cursor = 'grab';
    }
  });
  header.style.cursor = 'grab';
})();

function showDetailBox(node, cx, cy) {
  selectedId = node.id;
  detailName.innerHTML = '';
  var nameSpan = document.createElement('span');
  nameSpan.textContent = node.id;
  detailName.appendChild(nameSpan);
  if (node.spend) {
    var spendBadge = document.createElement('span');
    spendBadge.className = 'detail-spend spend-' + node.spend;
    spendBadge.textContent = node.spend === 'special' ? '特' : node.spend + '费';
    detailName.appendChild(spendBadge);
  }
  if (node.position) {
    var posSpan = document.createElement('span');
    posSpan.className = 'detail-pos';
    posSpan.title = node.position;
    posSpan.innerHTML = '<span class="pos-block pos-top ' + (node.position === '后台' ? 'pos-hollow' : 'pos-solid') + '"></span><span class="pos-block pos-bottom ' + (node.position === '前台' ? 'pos-hollow' : 'pos-solid') + '"></span>';
    detailName.appendChild(posSpan);
  }

  // Clear and rebuild
  detailBonds.innerHTML = '';
  var oldMeta = document.getElementById('detail-meta');
  if (oldMeta) oldMeta.remove();

  // Character intro from __CHR_INTRO
  var intros = window.__CHR_INTRO?.[node.id];
  if (intros) {
    var introDiv = document.createElement('div');
    introDiv.id = 'detail-meta';
    Object.keys(intros).forEach(function(key) {
      var sec = document.createElement('div');
      sec.className = 'wip-section';
      sec.innerHTML = '<div class="wip-title">' + key + '</div>';
      var line = document.createElement('div');
      line.className = 'wip-line wip-desc-text';
      line.innerHTML = intros[key].replace(/\n/g, '<br>');
      sec.appendChild(line);
      introDiv.appendChild(sec);
    });
    detailBonds.parentNode.insertBefore(introDiv, detailBonds);
  }

  node.bonds.forEach(function(bond) {
    var tag = document.createElement('span');
    tag.className = 'detail-bond-tag' + (bondChars[bond].length === 1 ? ' solo-bond' : '');
    tag.textContent = bond;
    tag.addEventListener('click', function(e) {
      e.stopPropagation();
      selectBond(bond);
    });
    detailBonds.appendChild(tag);
  });
  detailBox.classList.remove('hidden');

  // Position near node
  const rect = container.getBoundingClientRect();
  const transform = d3.zoomTransform(svg.node());
  const sx = transform.applyX(cx) + rect.left;
  const sy = transform.applyY(cy) + rect.top;
  let left = sx + 25;
  let top = sy - 40;
  if (left + 270 > rect.right) left = sx - 280;
  if (top < rect.top + 10) top = rect.top + 10;
  if (top + 200 > rect.bottom) top = rect.bottom - 210;
  detailBox.style.left = (left - rect.left) + 'px';
  detailBox.style.top = (top - rect.top) + 'px';
}

function hideDetailBox() {
  detailBox.classList.add('hidden');
  selectedId = null;
}

// ===== Filter Logic =====
function applyFilter(nodeSet) {
  filteredNodes = nodeSet;
  const active = nodeSet !== null;

  nodeG.classed('dimmed', d => active && !nodeSet.has(d.id));
  linkEls.classed('dimmed', d => {
    if (!active) return false;
    return !nodeSet.has(linkId(d.source)) || !nodeSet.has(linkId(d.target));
  });
}

function resetFilter() {
  activeBond = null;
  applyFilter(null);
  hideDetailBox();
  collapseAllSidebar();
  svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
}

// ===== Selection =====
function selectNode(node) {
  hideDetailBox();
  applyFilter(new Set([node.id]));
  centerOnPoint(node.x, node.y, 1.5)
    .on('end', () => { showDetailBox(node, node.x, node.y); });
}

function deselectNode() {
  hideDetailBox();
  if (activeBond) {
    applyFilter(new Set(bondChars[activeBond]));
  } else {
    resetFilter();
  }
}

function selectBond(bond) {
  hideDetailBox();
  applyFilter(new Set(bondChars[bond]));
  const bondNodes = bondChars[bond].map(name => nodeMap[name]).filter(Boolean);
  if (bondNodes.length > 0) {
    if (bondNodes.length === 1) {
      centerOnPoint(bondNodes[0].x, bondNodes[0].y, 1.5);
    } else {
      const PAD = 60;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const xs = bondNodes.map(n => n.x);
      const ys = bondNodes.map(n => n.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const bw = maxX - minX + PAD * 2;
      const bh = maxY - minY + PAD * 2;
      const scale = Math.min(1.5, Math.min(w / bw, h / bh));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      centerOnPoint(cx, cy, scale);
    }
  }

  if (activeBond === bond) return; // already on this bond (e.g. from detail tag)

  activeBond = bond;
  collapseAllSidebar();

  const header = document.querySelector(`.bond-item[data-bond="${CSS.escape(bond)}"]`);
  const charList = document.querySelector(`.bond-chars[data-bond="${CSS.escape(bond)}"]`);
  if (header) {
    // Expand parent section so the target bond is visible
    const sectionBody = header.closest('.bond-section-body');
    if (sectionBody) {
      sectionBody.classList.add('expanded');
      const sectionHeader = document.querySelector(`.bond-section-header[data-section="${CSS.escape(sectionBody.dataset.section)}"]`);
      if (sectionHeader) sectionHeader.classList.add('expanded');
    }
    header.classList.add('expanded', 'active');
    header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (charList) charList.classList.add('expanded');
}

// ===== Force Simulation =====
simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(d => 60 + 15 * (3 - Math.min(d.weight, 3))))
  .force('charge', d3.forceManyBody().strength(-350))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collide', d3.forceCollide().radius(d => nodeRadius(d) + 2))
  // Stronger centering for isolated nodes (no edges)
  .force('x', d3.forceX(width / 2).strength(d => d.degree === 0 ? 0.3 : 0.02))
  .force('y', d3.forceY(height / 2).strength(d => d.degree === 0 ? 0.3 : 0.02));

// ===== Render Links =====
linkEls = g.append('g')
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('class', 'link')
  .attr('stroke-width', d => Math.min(d.weight, 3) * 0.7);

// Classify links by connected node types for color tinting
linkEls.each(function(d) {
  const src = nodeMap[linkId(d.source)];
  const tgt = nodeMap[linkId(d.target)];
  const el = d3.select(this);
  if (src.isSolo || tgt.isSolo) el.classed('link-solo', true);
  if (src.isExpert || tgt.isExpert) el.classed('link-expert', true);
});

// ===== Render Nodes =====
const nodeG = g.append('g')
  .selectAll('g')
  .data(nodes)
  .join('g')
  .attr('class', d => {
    let type = 'normal';
    if (d.isExpert) type = 'expert';
    else if (d.isSolo) type = 'solo';
    return 'node ' + type;
  })
  .call(d3.drag()
    .on('start', onDragStart)
    .on('drag', onDrag)
    .on('end', onDragEnd)
  )
  .on('click', (event, d) => {
    event.stopPropagation();
    if (selectedId === d.id) {
      deselectNode();
    } else {
      selectNode(d);
    }
  });

// Circles
nodeG.append('circle')
  .attr('r', nodeRadius);

// Solo rings: glow aura + rotating dashed ring
nodeG.filter(d => d.isSolo && !d.isExpert)
  .append('circle')
  .attr('class', 'solo-aura')
  .attr('r', 28)
  .attr('fill', 'none')
  .attr('stroke', '#f0a030')
  .attr('stroke-width', 5)
  .attr('opacity', 0.6);

nodeG.filter(d => d.isSolo && !d.isExpert)
  .append('circle')
  .attr('class', 'solo-ring')
  .attr('r', 24)
  .attr('fill', 'none')
  .attr('stroke', '#f0a030')
  .attr('stroke-width', 3)
  .attr('pathLength', 120)
  .attr('stroke-dasharray', '5 5')
  .attr('stroke-linecap', 'round')
  .attr('opacity', 0.95);

// Expert ring: breathing ring
nodeG.filter(d => d.isExpert)
  .append('circle')
  .attr('class', 'expert-ring')
  .attr('r', 26)
  .attr('fill', 'none')
  .attr('stroke', '#20c0a0')
  .attr('stroke-width', 3)
  .attr('opacity', 0.7);

// Labels
nodeG.append('text')
  .text(d => d.id)
  .attr('dy', d => nodeRadius(d) + 11)
  .attr('text-anchor', 'middle')
  .attr('font-size', '11px')
  .attr('fill', '#ddd');

// ===== Drag Handlers =====
function getConnectedNodes(d) {
  const connected = new Set([d.id]);
  links.forEach(l => {
    const sid = linkId(l.source);
    const tid = linkId(l.target);
    if (sid === d.id) connected.add(tid);
    if (tid === d.id) connected.add(sid);
  });
  return connected;
}

function onDragStart(event, d) {
  preDragFilter = filteredNodes;
  const connected = getConnectedNodes(d);
  applyFilter(connected);
  container.classList.add('grabbing');
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function onDrag(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function onDragEnd(event, d) {
  container.classList.remove('grabbing');
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
  applyFilter(preDragFilter);
  preDragFilter = null;
}

// ===== Simulation Tick =====
simulation.on('tick', () => {
  linkEls
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
});

// ===== Sidebar =====
function createCharItem(ch) {
  const item = document.createElement('div');
  item.className = 'char-item';
  item.setAttribute('data-char', ch);
  item.textContent = ch;
  const d = nodeMap[ch];
  if (d?.isSolo && !d.isExpert) item.classList.add('solo-char');
  else if (d?.isExpert) item.classList.add('expert-char');
  return item;
}

function buildSidebar() {
  const bondList = document.getElementById('bond-list');
  const campClass = window.__CAMP_CLASS || {};

  Object.entries(campClass).forEach(([key, bonds]) => {
    if (!bonds?.length) return;

    // Section header (clickable to toggle)
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header bond-section-header';
    sectionHeader.innerHTML = `<span class="section-arrow">▶</span>${key}`;
    sectionHeader.setAttribute('data-section', key);

    // Section body wrapping all bonds in this category
    const sectionBody = document.createElement('div');
    sectionBody.className = 'section-body bond-section-body';
    sectionBody.setAttribute('data-section', key);

    // Sort bonds within category
    const sortedBonds = [...bonds].sort((a, b) => a.localeCompare(b[0], 'zh'));

    sortedBonds.forEach(bond => {
      const chars = bondChars[bond];
      if (!chars) return;

      const entry = document.createElement('div');
      entry.className = 'bond-entry';

      // Bond header
      const header = document.createElement('div');
      header.className = 'bond-item';
      if (chars.length === 1) header.classList.add('solo-bond');
      header.setAttribute('data-bond', bond);
      header.innerHTML = `
        <span class="bond-arrow">▶</span>
        <span class="bond-name">${bond}</span>
        <span class="bond-count">${chars.length}人</span>
      `;
      header.addEventListener('click', (e) => { e.stopPropagation(); toggleBond(bond); });

      // Character list
      const charList = document.createElement('div');
      charList.className = 'bond-chars';
      charList.setAttribute('data-bond', bond);
      chars.sort((a, b) => a.localeCompare(b[0], 'zh')).forEach(ch => {
        const charItem = createCharItem(ch);
        const charData = nodeMap[ch];
        if (charData && charData.spend) {
          const badge = document.createElement('span');
          badge.className = 'char-spend-badge spend-' + charData.spend;
          badge.textContent = charData.spend === 'special' ? '特' : charData.spend + '费';
          charItem.appendChild(badge);
        }
        charItem.addEventListener('click', (e) => {
          e.stopPropagation();
          selectCharacter(ch, bond);
        });
        charList.appendChild(charItem);
      });

      entry.appendChild(header);
      entry.appendChild(charList);
      sectionBody.appendChild(entry);
    });

    sectionHeader.addEventListener('click', () => toggleBondSection(sectionHeader, sectionBody));

    bondList.appendChild(sectionHeader);
    bondList.appendChild(sectionBody);
  });
}

function toggleBondSection(header, body) {
  const wasExpanded = header.classList.contains('expanded');
  collapseAllSidebar();
  if (!wasExpanded) { header.classList.add('expanded'); body.classList.add('expanded'); }
}

function buildExpertSidebar() {
  const expertList = document.getElementById('expert-list');
  expertList.innerHTML = '';
  const experts = window.__CHR_EXPERTS || [];

  experts.sort((a, b) => a.localeCompare(b[0], 'zh')).forEach(name => {
    const node = nodeMap[name];
    if (!node) return;

    const item = document.createElement('div');
    item.className = 'bond-item expert-item';
    item.innerHTML = `
      <span class="bond-name">${name}</span>
      <span class="bond-count">${node.bondCount}羁绊</span>
    `;
    // Show bond tags for this expert
    const bondContainer = document.createElement('div');
    bondContainer.className = 'expert-bonds';
    node.bonds.forEach(b => {
      const tag = document.createElement('span');
      tag.className = 'expert-bond-tag';
      tag.textContent = b;
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseAllSidebar();
        selectBond(b);
      });
      bondContainer.appendChild(tag);
    });
    item.appendChild(bondContainer);
    item.addEventListener('click', () => {
      collapseAllSidebar();
      document.querySelectorAll('.bond-item.selected').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectNode(node);
    });

    expertList.appendChild(item);
  });
}

function buildGroupSidebar(listId, data, order, attr, labels) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  order.forEach(key => {
    const chars = data[key];
    if (!chars || chars.length === 0) return;

    const entry = document.createElement('div');
    entry.className = 'bond-entry';

    const header = document.createElement('div');
    header.className = `bond-item ${attr}-header ${attr}-${key}`;
    header.setAttribute(`data-${attr}`, key);
    header.innerHTML = `
      <span class="bond-arrow">▶</span>
      <span class="bond-name">${labels?.[key] ?? key}</span>
      <span class="bond-count">${chars.length}人</span>
    `;
    header.addEventListener('click', () => toggleGroup(attr, key));

    const charList = document.createElement('div');
    charList.className = 'bond-chars';
    charList.setAttribute(`data-${attr}`, key);
    chars.sort((a, b) => a.localeCompare(b[0], 'zh')).forEach(ch => {
      const charItem = createCharItem(ch);
      charItem.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.char-item.selected').forEach(c => c.classList.remove('selected'));
        charItem.classList.add('selected');
        const node = nodeMap[ch];
        if (node) selectNode(node);
      });
      charList.appendChild(charItem);
    });

    entry.appendChild(header);
    entry.appendChild(charList);
    list.appendChild(entry);
  });
}

function toggleGroup(attr, value) {
  const header = document.querySelector(`.bond-item[data-${attr}="${CSS.escape(value)}"]`);
  const charList = document.querySelector(`.bond-chars[data-${attr}="${CSS.escape(value)}"]`);
  if (!header) return;
  const wasExpanded = header.classList.contains('expanded');
  collapseAllSidebar();
  if (!wasExpanded) {
    header.classList.add('expanded');
    if (charList) charList.classList.add('expanded');
  }
}

function buildSpendSidebar() {
  const labels = { '1': '1费', '2': '2费', '3': '3费', '4': '4费', '5': '5费', 'special': '特殊' };
  buildGroupSidebar('spend-list', window.__CHR_SPEND || {}, ['1', '2', '3', '4', '5', 'special'], 'spend', labels);
}

function buildPositionSidebar() {
  buildGroupSidebar('position-list', window.__CHR_POSITION || {}, ['前台', '后台', '前后台'], 'position');
}

const SIDEBAR_MODES = ['bond', 'expert', 'spend', 'position'];
const SIDEBAR_TITLES = { bond: '羁绊列表', expert: '专家顾问', spend: '费用列表', position: '站位列表' };
let sidebarMode = 'bond';

function switchSidebarMode(mode) {
  sidebarMode = mode;
  SIDEBAR_MODES.forEach(m => {
    document.getElementById(m + '-list').style.display = m === mode ? 'block' : 'none';
  });
  document.getElementById('sidebar-title').textContent = SIDEBAR_TITLES[mode];
  document.querySelectorAll('#sidebar-menu .menu-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-mode') === mode);
  });
  document.getElementById('sidebar-menu').classList.remove('open');
  resetFilter();
}

function toggleSidebarMenu() {
  document.getElementById('sidebar-menu').classList.toggle('open');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('sidebar-menu');
  const btn = document.getElementById('nav-sidebar-btn');
  if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('open');
  }
});

function toggleBond(bond) {
  const header = document.querySelector(`.bond-item[data-bond="${CSS.escape(bond)}"]`);
  const charList = document.querySelector(`.bond-chars[data-bond="${CSS.escape(bond)}"]`);

  if (!header.classList.contains('expanded')) {
    selectBond(bond);
    return;
  }

  if (selectedId && activeBond === bond) {
    document.querySelectorAll('.char-item.selected').forEach(c => c.classList.remove('selected'));
    selectBond(bond);
    return;
  }

  header.classList.remove('expanded', 'active');
  charList.classList.remove('expanded');
  activeBond = null;
  applyFilter(null);
  hideDetailBox();
  svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
}

function selectCharacter(charName, bond) {
  // Update char-item selection
  document.querySelectorAll('.char-item.selected').forEach(c => c.classList.remove('selected'));
  const charList = document.querySelector(`.bond-chars[data-bond="${CSS.escape(bond)}"]`);
  if (charList) {
    const item = charList.querySelector(`.char-item[data-char="${CSS.escape(charName)}"]`);
    if (item) item.classList.add('selected');
  }
  const node = nodeMap[charName];
  if (node) selectNode(node);
}

// Sidebar resize
const sidebarEl = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const MIN_SIDEBAR_WIDTH = 150;
let lastSidebarWidth = 400;
let resizing = false;
let resizeMoved = false;

toggleBtn.addEventListener('mousedown', (e) => {
  resizing = true;
  resizeMoved = false;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!resizing) return;
  resizeMoved = true;
  const containerRect = document.getElementById('graph-container').parentElement.getBoundingClientRect();
  const newWidth = containerRect.right - e.clientX;
  if (newWidth < MIN_SIDEBAR_WIDTH) {
    sidebarEl.classList.add('collapsed');
    toggleBtn.innerHTML = '&#9664;';
    toggleBtn.title = '展开侧边栏';
  } else {
    sidebarEl.classList.remove('collapsed');
    sidebarEl.style.width = newWidth + 'px';
    lastSidebarWidth = newWidth;
    toggleBtn.innerHTML = '&#9654;';
    toggleBtn.title = '折叠侧边栏';
  }
});

document.addEventListener('mouseup', () => {
  if (!resizing) return;
  resizing = false;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  window.dispatchEvent(new Event('resize'));
});

// Click to toggle
toggleBtn.addEventListener('click', () => {
  if (resizeMoved) return;
  if (sidebarEl.classList.contains('collapsed')) {
    sidebarEl.classList.remove('collapsed');
    sidebarEl.style.width = lastSidebarWidth + 'px';
    toggleBtn.innerHTML = '&#9654;';
    toggleBtn.title = '折叠侧边栏';
  } else {
    lastSidebarWidth = parseInt(sidebarEl.style.width) || parseInt(getComputedStyle(sidebarEl).width) || 400;
    sidebarEl.classList.add('collapsed');
    toggleBtn.innerHTML = '&#9664;';
    toggleBtn.title = '展开侧边栏';
  }
  window.dispatchEvent(new Event('resize'));
});

// Reset buttons
document.getElementById('reset-btn').addEventListener('click', resetFilter);
document.getElementById('init-btn').addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Initialize sidebar
buildSidebar();
buildExpertSidebar();
buildSpendSidebar();
buildPositionSidebar();
document.getElementById('nav-sidebar-btn').addEventListener('click', toggleSidebarMenu);
document.querySelectorAll('#sidebar-menu .menu-item').forEach(item => {
  item.addEventListener('click', () => switchSidebarMode(item.getAttribute('data-mode')));
});

// ===== Resize Handler =====
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  svg.attr('width', w).attr('height', h);
  simulation.force('center', d3.forceCenter(w / 2, h / 2));
  simulation.alpha(0.1).restart();
});

// ===== Search (delegated to shared utility) =====
var searchInput = document.getElementById('search-input');
var searchResult = document.getElementById('search-result');

__createFuzzySearch({
  input: searchInput,
  btn: document.getElementById('search-btn'),
  resultEl: searchResult,
  container: document.getElementById('search-box'),
  sources: [
    {
      name: '角色',
      items: new Set(nodes.map(function(n) { return n.id; })),
      onSelect: function(v) { resetFilter(); selectNode(nodeMap[v]); },
    },
    {
      name: '羁绊',
      items: new Set(Object.keys(bondChars)),
      onSelect: function(v) { selectBond(v); },
    },
  ],
  onNoMatch: function() {
    resetFilter();
    var cx = nodes.reduce(function(s, n) { return s + n.x; }, 0) / nodes.length;
    var cy = nodes.reduce(function(s, n) { return s + n.y; }, 0) / nodes.length;
    centerOnPoint(cx, cy, 1);
  },
  onSelect: function() { hideSearchBox(); },
});

var searchBox = document.getElementById('search-box');
var searchToggle = document.getElementById('sidebar-search-btn');

function hideSearchBox() {
  searchBox.classList.remove('visible');
  searchInput.value = '';
  searchResult.textContent = '';
  searchResult.className = '';
}

searchToggle.addEventListener('click', function(e) {
  e.stopPropagation();
  var isVisible = searchBox.classList.toggle('visible');
  if (isVisible) {
    searchInput.focus();
  } else {
    hideSearchBox();
  }
});

  // Expose for tab switching
  window.graphResize = () => window.dispatchEvent(new Event('resize'));
})();

// ===== Mode Switching =====
(function () {
  const tabBtns = document.querySelectorAll('#tab-bar .tab-btn');
  const graphContainer = document.getElementById('graph-container');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const teamBuilder = document.getElementById('team-builder');
  let currentMode = 'graph';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode === currentMode) return;
      currentMode = mode;

      tabBtns.forEach(b => b.classList.toggle('active', b === btn));

      const isGraph = mode === 'graph';
      graphContainer.style.display = isGraph ? '' : 'none';
      sidebarToggle.style.display = isGraph ? '' : 'none';
      sidebar.style.display = isGraph ? '' : 'none';
      teamBuilder.style.display = isGraph ? 'none' : 'flex';
      if (!isGraph && window.initTeamBuilder) {
        window.initTeamBuilder();
      }
      window.dispatchEvent(new Event('resize'));
    });
  });
})();