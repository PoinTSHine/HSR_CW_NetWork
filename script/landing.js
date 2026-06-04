// ===== Theme Toggle =====
(function() {
  function setTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('cw-theme', theme);
    // Update toggle buttons
    var btns = document.querySelectorAll('#theme-toggle, #theme-toggle-landing');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = theme === 'light' ? '☀️' : '🌙';
    }
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

  // Wire toggle buttons
  document.addEventListener('DOMContentLoaded', function() {
    var btns = document.querySelectorAll('#theme-toggle, #theme-toggle-landing');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', toggleTheme);
    }
  });
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
