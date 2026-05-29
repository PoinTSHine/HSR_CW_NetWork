// ===== Starry Background =====
(function() {
  var canvas = document.getElementById('star-canvas');
  var ctx = canvas.getContext('2d');
  var stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    var count = Math.floor(window.innerWidth / 10);
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.015 + 0.003
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width
    );
    grad.addColorStop(0, '#edf1f5');
    grad.addColorStop(1, '#e4e9f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(58, 106, 170, ' + s.opacity + ')';
      ctx.fill();
      s.opacity += s.speed;
      if (s.opacity > 1 || s.opacity < 0.1) s.speed *= -1;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

// ===== Mouse Parallax on Cards =====
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
