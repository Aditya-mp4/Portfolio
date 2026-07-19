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

    /* ── DETECTION-BOX CURSOR ── */
    const CV_SELECTOR = 'a, button, .bub, .card, .pcard-l, .job-card, .info-card, .stag, .acard, ' +
      '.nav-logo, .nav-cta, .placeholder-card, .exp-item, .fact, .clink';
    const CV_COLORS = ['#7C5CFF', '#2FE6C7', '#FF6B6B', '#FFD93D'];

    const cvBox = document.createElement('div');
    cvBox.className = 'cv-box';
    const cvLabel = document.createElement('div');
    cvLabel.className = 'cv-label';
    cvBox.appendChild(cvLabel);
    document.body.appendChild(cvBox);

    let cvActive = null;

    function cvColorFor(label) {
      let h = 0;
      for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
      return CV_COLORS[h % CV_COLORS.length];
    }

    function cvLabelFor(el) {
      if (el.dataset.cvLabel) return el.dataset.cvLabel;
      const titled = el.querySelector('.pcard-l-title, h3, h4, .bento-title');
      let text = (titled ? titled.textContent : el.textContent) || '';
      text = text.replace(/[→←]/g, '').replace(/\s+/g, ' ').trim();
      if (text.length > 26) text = text.slice(0, 24) + '…';
      return text || el.tagName.toLowerCase();
    }

    function cvPlace(el) {
      const r = el.getBoundingClientRect();
      const pad = 6;
      cvBox.style.left   = (r.left - pad) + 'px';
      cvBox.style.top    = (r.top - pad) + 'px';
      cvBox.style.width  = (r.width + pad * 2) + 'px';
      cvBox.style.height = (r.height + pad * 2) + 'px';
    }

    function cvShow(el) {
      cvPlace(el);
      const color = cvColorFor(cvLabelFor(el));
      cvBox.style.borderColor = color;
      cvLabel.style.background = color;
      cvLabel.textContent = cvLabelFor(el);
      cvBox.classList.add('show');
      ring.style.opacity = '0';
    }

    function cvHide() {
      cvBox.classList.remove('show');
      ring.style.opacity = '';
    }

    document.addEventListener('mousemove', e => {
      const target = e.target.closest ? e.target.closest(CV_SELECTOR) : null;
      if (target !== cvActive) {
        cvActive = target;
        target ? cvShow(target) : cvHide();
      } else if (target) {
        cvPlace(target);
      }
    });

    window.addEventListener('scroll', () => { if (cvActive) cvPlace(cvActive); }, { passive: true });

    /* ── TRACE WEB (unpredictable boxes + lines trailing the cursor) ── */
    const trace = document.createElement('canvas');
    trace.id = 'traceCanvas';
    trace.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9996;';
    document.body.appendChild(trace);
    const tctx = trace.getContext('2d');

    function traceResize() { trace.width = innerWidth; trace.height = innerHeight; }
    traceResize();
    window.addEventListener('resize', traceResize);

    const nodes = [];          // {x,y,w,h,label,born,life}
    const links = [];          // {a,b} extra cross-links between random nodes
    const MAX_NODES = 14;
    let lastSpawnX = -1e4, lastSpawnY = -1e4;
    let nextSpawnDist = 80;

    function spawnNode(cx, cy) {
      const node = {
        x: cx + (Math.random() - 0.5) * 260,
        y: cy + (Math.random() - 0.5) * 220,
        w: 26 + Math.random() * 70,
        h: 20 + Math.random() * 54,
        label: (Math.random() * 2).toFixed(4),
        born: performance.now(),
        life: 2200 + Math.random() * 1600
      };
      nodes.push(node);
      if (nodes.length > 2 && Math.random() < 0.35) {
        links.push({ a: node, b: nodes[Math.floor(Math.random() * (nodes.length - 2))] });
      }
      while (nodes.length > MAX_NODES) {
        const dead = nodes.shift();
        for (let i = links.length - 1; i >= 0; i--) {
          if (links[i].a === dead || links[i].b === dead) links.splice(i, 1);
        }
      }
    }

    document.addEventListener('mousemove', e => {
      const dx = e.clientX - lastSpawnX, dy = e.clientY - lastSpawnY;
      if (Math.hypot(dx, dy) > nextSpawnDist) {
        lastSpawnX = e.clientX; lastSpawnY = e.clientY;
        nextSpawnDist = 70 + Math.random() * 90;
        spawnNode(e.clientX, e.clientY);
      }
    });

    function nodeAlpha(n, now) {
      const age = now - n.born;
      if (age >= n.life) return 0;
      const fadeIn  = Math.min(age / 140, 1);
      const fadeOut = Math.min((n.life - age) / 650, 1);
      return Math.min(fadeIn, fadeOut);
    }

    function drawLink(x1, y1, x2, y2, alpha) {
      tctx.strokeStyle = `rgba(16,16,26,${0.35 * alpha})`;
      tctx.beginPath();
      tctx.moveTo(x1, y1);
      tctx.lineTo(x2, y2);
      tctx.stroke();
    }

    (function traceDraw() {
      const now = performance.now();
      tctx.clearRect(0, 0, trace.width, trace.height);
      tctx.lineWidth = 1;
      tctx.font = '9px "Space Mono", monospace';

      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodeAlpha(nodes[i], now) === 0) {
          const dead = nodes[i];
          nodes.splice(i, 1);
          for (let j = links.length - 1; j >= 0; j--) {
            if (links[j].a === dead || links[j].b === dead) links.splice(j, 1);
          }
        }
      }

      // chain lines between consecutive nodes + newest node → cursor
      for (let i = 1; i < nodes.length; i++) {
        const p = nodes[i - 1], n = nodes[i];
        drawLink(p.x + p.w / 2, p.y + p.h / 2, n.x + n.w / 2, n.y + n.h / 2,
          Math.min(nodeAlpha(p, now), nodeAlpha(n, now)));
      }
      if (nodes.length) {
        const n = nodes[nodes.length - 1];
        drawLink(n.x + n.w / 2, n.y + n.h / 2, mx, my, nodeAlpha(n, now));
      }
      links.forEach(l => {
        drawLink(l.a.x + l.a.w / 2, l.a.y + l.a.h / 2, l.b.x + l.b.w / 2, l.b.y + l.b.h / 2,
          Math.min(nodeAlpha(l.a, now), nodeAlpha(l.b, now)) * 0.7);
      });

      nodes.forEach(n => {
        const a = nodeAlpha(n, now);
        tctx.strokeStyle = `rgba(16,16,26,${0.5 * a})`;
        tctx.strokeRect(n.x, n.y, n.w, n.h);
        tctx.fillStyle = `rgba(16,16,26,${0.65 * a})`;
        tctx.fillText(n.label, n.x + 2, n.y - 4);
      });

      requestAnimationFrame(traceDraw);
    })();
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


  /* ── SMOOTH SCROLL (damped wheel scrolling) ── */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
    let current = window.scrollY;
    let target  = window.scrollY;
    let ticking = false;

    function smoothTick() {
      current += (target - current) * 0.22;
      if (Math.abs(target - current) < 0.5) current = target;
      window.scrollTo(0, current);
      if (current !== target) {
        requestAnimationFrame(smoothTick);
      } else {
        ticking = false;
      }
    }

    window.addEventListener('wheel', e => {
      if (document.body.classList.contains('nav-locked')) return;
      e.preventDefault();
      target += e.deltaY;
      target = Math.max(0, Math.min(target, maxScroll()));
      if (!ticking) { ticking = true; requestAnimationFrame(smoothTick); }
    }, { passive: false });

    window.addEventListener('resize', () => {
      target = Math.max(0, Math.min(target, maxScroll()));
    });

    // keep in sync with programmatic / anchor / keyboard scrolls
    window.addEventListener('scroll', () => {
      if (!ticking) { current = window.scrollY; target = window.scrollY; }
    }, { passive: true });
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

  /* ── ROBUST SMOOTH SCROLL FOR HASH LINKS ── */
  // CSS already sets html { scroll-behavior: smooth; }, but this makes behavior consistent
  // when navigating via hash links and across different browsers.
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    // If the link is for another page, don’t intercept.
    // (We only handle same-page hash links like href="#contact".)
    // href^="#" already guarantees that, but keep logic explicit.
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el || el === document.body || el === document.documentElement) return;

    // Allow default browser behavior for modified clicks / new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;

    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Accessibility: move focus without additional scrolling.
    if (typeof el.focus === 'function') {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }, { passive: false });

});

