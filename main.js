/* ============================================================
   main.js — shared interactions for every page
   cursor · nav overlay · marquee · clock · reveal · magnetic · ambient canvas
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── CUSTOM CURSOR ── */
  const dot  = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');

  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
      if (!dot.classList.contains('seen')) {
        rx = mx; ry = my;
        dot.classList.add('seen');
        ring.classList.add('seen');
      }
    });

    (function followRing() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(followRing);
    })();

    document.querySelectorAll('a, button, .bub, .card, .pcard-l, .job-card, .info-card, .stag').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hov'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hov'));
    });

    document.querySelectorAll('[data-cursor="note"]').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('note'));
      el.addEventListener('mouseleave', () => ring.classList.remove('note'));
    });
  } else {
    if (dot) dot.style.display = 'none';
    if (ring) ring.style.display = 'none';
  }


  /* ── NAV OVERLAY (fullscreen menu) ── */
  const burger  = document.getElementById('navBurger');
  const overlay = document.getElementById('navOverlay');
  const closeBtn = document.getElementById('navClose');

  function openNav() {
    overlay.classList.add('open');
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-locked');
  }
  function closeNav() {
    overlay.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-locked');
  }
  if (burger && overlay) {
    burger.addEventListener('click', () => {
      overlay.classList.contains('open') ? closeNav() : openNav();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  }


  /* ── LIVE CLOCK (IST) ── */
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    function tick() {
      const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      clockEl.textContent = now + ' IST';
    }
    tick();
    setInterval(tick, 1000);
  }


  /* ── SCROLL REVEAL ── */
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('on'), i * 60);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(r => obs.observe(r));


  /* ── KINETIC TYPE DRIFT (hero lines shear apart on scroll) ── */
  const drifters = document.querySelectorAll('[data-drift]');
  if (drifters.length) {
    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      drifters.forEach(el => {
        el.style.transform = `translateX(${sy * parseFloat(el.dataset.drift)}px)`;
      });
    }, { passive: true });
  }


  /* ── MAGNETIC BUTTONS ── */
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });


  /* ── AMBIENT PARTICLE CANVAS ── */
  const canvas = document.getElementById('ambientCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#7C5CFF', '#2FE6C7', '#FF6B6B'];
    const particles = Array.from({ length: 34 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 1 + Math.random() * 1.8,
      sp: 0.12 + Math.random() * 0.22,
      t: Math.random() * Math.PI * 2,
      cl: COLORS[Math.floor(Math.random() * COLORS.length)],
      op: 0.15 + Math.random() * 0.25
    }));

    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.t += 0.006;
        p.y -= p.sp;
        p.x += Math.sin(p.t) * 0.25;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.globalAlpha = p.op;
        ctx.fillStyle = p.cl;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    })();
  }

});
