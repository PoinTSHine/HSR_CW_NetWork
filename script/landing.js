// ===== Theme Toggle =====
(function() {
  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('cw-theme', theme);
    // Update app toggle button
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    var isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'dark' : 'light');
  }

  // Load saved theme
  var saved = localStorage.getItem('cw-theme');
  if (saved === 'light') {
    setTheme('light');
  } else {
    setTheme('dark');
  }

  // Wire app toggle button
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  });

  // Expose for lamp to call
  window.__toggleTheme = toggleTheme;
})();

// ===== Lamp Physics =====
(function() {
  var lampEl = document.getElementById('lamp-toggle');
  if (!lampEl) return;

  var canvas = document.getElementById('lamp-cord-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var pullball = document.querySelector('.lamp-pullball');

  // Physics config
  var NUM_SEGMENTS = 24;
  var SEG_LEN = 9;
  var GRAVITY = 0.6;
  var DAMPING = 0.985;
  var ITERATIONS = 12;

  // Points array — current {x,y} and previous {px,py}
  var pts = [];
  var fixed = [];
  var baseX = 50;   // centre of canvas width
  var baseY = 2;    // top of canvas

  function initPhysics() {
    pts = [];
    fixed = [];
    var x = baseX;
    var y = baseY;
    for (var i = 0; i < NUM_SEGMENTS; i++) {
      pts.push({ x: x, y: y, px: x, py: y });
      fixed.push(i === 0); // only first point is fixed
      y += SEG_LEN;
    }
  }

  function applyPhysics() {
    // Gravity + verlet integration
    for (var i = 1; i < pts.length; i++) {
      if (fixed[i]) continue;
      var p = pts[i];
      var vx = (p.x - p.px) * DAMPING;
      var vy = (p.y - p.py) * DAMPING;
      // Clamp velocity
      var maxVel = 15;
      if (vx > maxVel) vx = maxVel;
      if (vx < -maxVel) vx = -maxVel;
      if (vy > maxVel) vy = maxVel;
      if (vy < -maxVel) vy = -maxVel;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;
    }

    // Constrain distances (iterative)
    for (var iter = 0; iter < ITERATIONS; iter++) {
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1];
        var b = pts[i];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) continue;
        var diff = (dist - SEG_LEN) / dist;
        var ox = dx * diff * 0.5;
        var oy = dy * diff * 0.5;
        if (!fixed[i - 1]) { a.x += ox; a.y += oy; }
        if (!fixed[i])     { b.x -= ox; b.y -= oy; }
      }
      // Pin first point
      pts[0].x = baseX;
      pts[0].y = baseY;
    }
  }


  function drawCord() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glow beneath the cord
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(74, 138, 217, 0.08)';
    ctx.stroke();

    // Main cord
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#5a6a8a';
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Small knot at the end
    var last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#5a6a8a';
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function loop() {
    applyPhysics();
    drawCord();

    // Update pullball position (relative to #lamp-toggle container)
    var last = pts[pts.length - 1];
    var scaleX = canvas.width > 0 ? canvas.offsetWidth / canvas.width : 1;
    var scaleY = canvas.height > 0 ? canvas.offsetHeight / canvas.height : 1;
    var canvasTop = canvas.offsetTop;
    pullball.style.left = (last.x * scaleX - 6) + 'px';
    pullball.style.top = (last.y * scaleY + canvasTop - 6) + 'px';
    pullball.style.visibility = 'visible';

    requestAnimationFrame(loop);
  }

  // ===== Interaction =====
  var isDragging = false;
  var PULL_THRESHOLD = 50; // px downward to trigger toggle
  var maxPullY = 0;
  var startX = 0, startY = 0;

  function onPointerDown(e) {
    isDragging = true;
    maxPullY = 0;
    var rect = canvas.getBoundingClientRect();
    startX = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    startY = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    pullball.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    var rect = canvas.getBoundingClientRect();
    var currentY = (e.clientX !== undefined ? e.clientY : e.touches?.[0]?.clientY || 0) - rect.top;
    var dy = currentY - startY;
    if (dy > maxPullY) maxPullY = dy;
    // Move the last point toward the pointer directly
    var lastPt = pts[pts.length - 1];
    var currentX = (e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX || 0) - rect.left;
    var scaleX = canvas.width > 0 ? canvas.width / canvas.offsetWidth : 1;
    var scaleY = canvas.height > 0 ? canvas.height / canvas.offsetHeight : 1;
    var targetX = currentX * scaleX;
    var targetY = currentY * scaleY;
    // Smoothly follow pointer, constraint solver handles length limits
    lastPt.x += (targetX - lastPt.x) * 0.4;
    lastPt.y += (targetY - lastPt.y) * 0.4;
    // Disable damping temporarily during drag for snappier response
    e.preventDefault();
  }

  function settlePhysics() {
    // Freeze all velocities
    for (var i = 0; i < pts.length; i++) {
      pts[i].px = pts[i].x;
      pts[i].py = pts[i].y;
    }
    // Run constraint solver with full correction to relax the chain fast
    for (var iter = 0; iter < 100; iter++) {
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1];
        var b = pts[i];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) continue;
        var diff = (dist - SEG_LEN) / dist;
        var ox = dx * diff;
        var oy = dy * diff;
        if (!fixed[i - 1]) { a.x += ox; a.y += oy; }
        if (!fixed[i])     { b.x -= ox; b.y -= oy; }
      }
      pts[0].x = baseX;
      pts[0].y = baseY;
    }
    // Freeze again after settling — critical to prevent residual bounce
    for (var i = 0; i < pts.length; i++) {
      pts[i].px = pts[i].x;
      pts[i].py = pts[i].y;
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    pullball.style.cursor = 'grab';

    if (maxPullY >= PULL_THRESHOLD) {
      // Release and immediately settle the chain to prevent bounce
      settlePhysics();
      window.__toggleTheme();
    }
  }

  // Mouse events
  pullball.addEventListener('mousedown', onPointerDown);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  // Touch events
  pullball.addEventListener('touchstart', onPointerDown, { passive: false });
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('touchend', onPointerUp, { passive: false });

  // ===== Init =====
  function resizeCanvas() {
    var w = lampEl.offsetWidth;
    var h = canvas.offsetHeight;
    canvas.width = Math.max(100, w * 2);
    canvas.height = Math.max(200, h * 2);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    baseX = canvas.width / 2;
    canvas.width = Math.max(100, w * 2);
    canvas.height = Math.max(220, h * 2);
    canvas.style.width = w + 'px';
    canvas.style.height = (lampEl.offsetHeight - 80) + 'px';
    baseX = canvas.width / 2;
    initPhysics();
  }

  resizeCanvas();
  loop();
})();

// ===== Starry Background =====
(function() {
  var canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stars = [];
  var isDark = true;

  function checkTheme() {
    isDark = !document.documentElement.classList.contains('light');
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    var count = Math.floor(window.innerWidth / 8);
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.003,
        hue: Math.random() * 60 + 200 // blue-ish range
      });
    }
  }

  function draw() {
    checkTheme();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isDark) {
      // Deep space background
      var grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      );
      grad.addColorStop(0, '#0e1424');
      grad.addColorStop(0.5, '#0a0e1a');
      grad.addColorStop(1, '#060a14');
      ctx.fillStyle = grad;
    } else {
      // Light sky background
      var grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      grad.addColorStop(0, '#f4f6fa');
      grad.addColorStop(1, '#e8ecf2');
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      if (isDark) {
        ctx.fillStyle = 'rgba(180, 200, 230, ' + s.opacity + ')';
      } else {
        ctx.fillStyle = 'rgba(74, 138, 217, ' + (s.opacity * 0.4) + ')';
      }
      ctx.fill();
      s.opacity += s.speed;
      if (s.opacity > 1 || s.opacity < 0.1) s.speed *= -1;
    }
    requestAnimationFrame(draw);
  }

  // Watch for theme changes via MutationObserver
  var observer = new MutationObserver(function() {
    checkTheme();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ===== Mouse Parallax on Cards (landing page only) =====
(function() {
  var cards = document.querySelectorAll('.card');
  if (!cards.length) return;

  document.addEventListener('mousemove', function(e) {
    var x = (e.clientX - window.innerWidth / 2) / 80;
    var y = (e.clientY - window.innerHeight / 2) / 80;
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transform = 'translateY(-8px) rotateY(' + x + 'deg) rotateX(' + (-y) + 'deg)';
    }
  });

  document.addEventListener('mouseleave', function() {
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transform = '';
    }
  });
})();
