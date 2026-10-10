/* Lightweight confetti (no library). Skipped when the user prefers reduced motion. */
(function () {
  "use strict";
  var raf = null;

  window.QFConfetti = {
    burst: function (count) {
      var canvas = document.getElementById("confetti");
      if (!canvas || !canvas.getContext) return;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (raf) cancelAnimationFrame(raf);

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var colors = ["#ffc933", "#157a3f", "#c62828", "#14213d", "#ff7a00", "#2f80ed"];
      var n = count || 90, parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 120,
          y: canvas.height * 0.3,
          vx: (Math.random() - 0.5) * 11,
          vy: -Math.random() * 10 - 3,
          s: 5 + Math.random() * 6,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          c: colors[i % colors.length]
        });
      }
      var frames = 0;
      (function step() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j];
          p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          ctx.restore();
        }
        frames++;
        if (frames < 150) raf = requestAnimationFrame(step);
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); raf = null; }
      })();
    }
  };
})();
