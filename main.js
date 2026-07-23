/* ============================================================
   main.js — shared interactions for every page
   cursor · nav overlay · clock · reveal · magnetic · ambient canvas

   SCROLLING
   ─────────
   Every page uses Lenis for smooth scrolling — the same slow, cinematic feel
   as the Resona research page (duration 1.2, expo-out easing, no scroll-
   jacking; native scroll position and keyboard/anchor navigation still work
   exactly as before). See useLenis() below.

   Where GSAP + ScrollTrigger are also loaded on a page, Lenis is driven by
   GSAP's own ticker so there is a single animation loop; on pages that don't
   load GSAP, Lenis drives itself via its own requestAnimationFrame loop.

   Most entrance animations use a single lightweight IntersectionObserver that
   adds an `.on` class once an element enters the viewport (CSS handles the
   transition — see .reveal in style.css).

   Sections that need a *sequenced*, cinematic reveal (elements appearing one
   after another rather than all at once) use `revealSequence()` — a reusable
   GSAP + ScrollTrigger timeline. GSAP is only loaded on pages that need it
   (currently the home page, for the Experience section); everywhere else the
   IntersectionObserver path handles reveals and `revealSequence` is a no-op.

   Continuous decorative motion (the ambient trace canvas) uses its own small
   requestAnimationFrame loop and is skipped entirely under reduced-motion.
   ============================================================ */

/* ── UTIL: reusable helpers ── */
const onIdle = (fn, timeout = 1500) =>
  ('requestIdleCallback' in window) ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

/* ── HOOK: useLenis() — the same smooth-scroll feel as the research page.
   Reuses window.__lenis if another script on the page (e.g. the research
   page's own narrative script) already created one, so there's never more
   than one Lenis instance running. Returns null under reduced-motion or if
   the CDN failed to load, so callers fall back to plain native scrolling. */
function useLenis() {
  if (reduceMotion || typeof window.Lenis === 'undefined') return null;
  if (window.__lenis) return window.__lenis;

  const lenis = new Lenis({
    duration: 1.2,                                   // slow, cinematic — but still native-feeling
    easing: t => 1 - Math.pow(2, -10 * t),           // expo-out: natural accel + soft deceleration
    smoothWheel: true,
    touchMultiplier: 1.1,                            // no excessive fling on mobile
  });

  if (hasGSAP) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  window.__lenis = lenis;
  return lenis;
}

/* ── revealSequence(section, steps, opts) — cinematic staggered entrance ──
   Builds ONE GSAP timeline that reveals the given elements in order (opacity
   0→1, translateY 40→0, power3.out), started by ScrollTrigger when the section
   is ~80% up the viewport, firing once. Reusable across sections — pass the
   selectors in the order you want them to appear.

   A selector may match several elements (e.g. a group of paragraphs); they are
   expanded in document order and de-duplicated, so the stagger flows naturally
   across every matched element.

   No-op without GSAP or under reduced-motion: since these elements carry no
   CSS `.reveal` rule, they simply stay at their natural, fully-visible state
   in those cases (graceful degradation — nothing is left stuck hidden). */
function revealSequence(sectionSelector, stepSelectors, opts = {}) {
  if (!hasGSAP || reduceMotion) return;
  const section = document.querySelector(sectionSelector);
  if (!section) return;
  const seen = new Set();
  const els = stepSelectors
    .flatMap(sel => Array.from(section.querySelectorAll(sel)))
    .filter(el => !seen.has(el) && seen.add(el));
  if (!els.length) return;

  const { start = 'top 80%', y = 40, duration = 0.7, stagger = 0.2 } = opts;
  gsap.set(els, { opacity: 0, y });                 // hidden until the timeline runs
  gsap.timeline({
    scrollTrigger: { trigger: section, start, once: true }
  }).to(els, {
    opacity: 1, y: 0, duration, ease: 'power3.out', stagger,
    clearProps: 'transform'                          // free `transform` so CSS :hover works afterward
  });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── SMOOTH SCROLL ENGINE — same feel everywhere (see useLenis above) ── */
  const lenis = useLenis();

  /* ── DEFERRED HERO VIDEO (heavy asset — load after first paint, not blocking) ── */
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    onIdle(() => {
      const src = heroVideo.querySelector('source[data-src]');
      if (src) {
        src.src = src.dataset.src;
        heroVideo.load();
        heroVideo.play().catch(() => {}); // autoplay can be blocked; fail silently
      }
    });
  }

  /* ── SPLASH SCREEN (detection-box intro, once per session) ── */
  const splash = document.getElementById('splash');
  if (splash && sessionStorage.getItem('splashShown')) {
    splash.remove();
  } else if (splash) {
    sessionStorage.setItem('splashShown', '1');
    document.body.classList.add('splash-lock');
    const box   = document.getElementById('splashBox');
    const label = document.getElementById('splashLabel');
    const pctEl = document.getElementById('splashPct');

    const DURATION = 1700;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      pctEl.textContent = pct + '%';
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        label.textContent = 'portfolio detected ✓';
        box.classList.add('detected');
        setTimeout(() => {
          box.classList.add('expand');
          setTimeout(() => {
            splash.classList.add('fade-out');
            document.body.classList.remove('splash-lock');
            setTimeout(() => splash.remove(), 550);
          }, 700);
        }, 550);
      }
    }
    requestAnimationFrame(tick);
  }


  /* ── CURSOR EFFECTS (detection-box + trace-web) ──
     No dot/ring cursor — the browser's native pointer is used throughout.
     Position is written with transform:translate() only (never left/top), so
     tracking stays off the browser's layout path. The ambient trace canvas is
     decorative motion and is skipped under reduced-motion. */
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  if (window.matchMedia('(pointer: fine)').matches) {
    /* ── DETECTION-BOX CURSOR ──
       Position is transform-only; width/height are only rewritten when the
       hovered target's measured size actually changes, so repositioning on
       every mousemove/scroll never forces an unnecessary layout recalc. */
    const CV_SELECTOR = 'a, button, .bub, .card, .pcard-l, .job-card, .info-card, .stag, .acard, ' +
      '.nav-logo, .nav-cta, .placeholder-card, .exp-item, .fact, .clink';
    const CV_COLORS = ['#0064FF', '#2FE6C7', '#FF6B6B', '#FFD93D'];

    const cvBox = document.createElement('div');
    cvBox.className = 'cv-box';
    cvBox.setAttribute('aria-hidden', 'true');
    const cvLabel = document.createElement('div');
    cvLabel.className = 'cv-label';
    cvBox.appendChild(cvLabel);
    document.body.appendChild(cvBox);

    let cvActive = null;
    let cvW = -1, cvH = -1;

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
      cvBox.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
      const w = r.width + pad * 2, h = r.height + pad * 2;
      if (w !== cvW || h !== cvH) {
        cvBox.style.width = w + 'px';
        cvBox.style.height = h + 'px';
        cvW = w; cvH = h;
      }
    }

    function cvShow(el) {
      cvW = -1; cvH = -1; // force a size write for the newly-hovered target
      cvPlace(el);
      const color = cvColorFor(cvLabelFor(el));
      cvBox.style.borderColor = color;
      cvLabel.style.background = color;
      cvLabel.textContent = cvLabelFor(el);
      cvBox.classList.add('show');
    }

    function cvHide() {
      cvBox.classList.remove('show');
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

    /* ── TRACE WEB (unpredictable boxes + lines trailing the cursor) ──
       Decorative continuous motion — skipped under reduced-motion. */
    if (!reduceMotion) {
      const trace = document.createElement('canvas');
      trace.id = 'traceCanvas';
      trace.setAttribute('aria-hidden', 'true');
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
    }
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


  /* ── REVEAL (one IntersectionObserver, adds `.on` once per element) ──
     Under reduced-motion the CSS shows everything immediately, so there's
     nothing to observe. Otherwise each element reveals once and is unobserved. */
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('on'));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('on');
            obs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      revealEls.forEach(el => el.classList.contains('on') || io.observe(el));
    }
  }


  /* ── ABOUT ("a bit about me") — cinematic sequenced reveal (home page) ──
     Photo first, then the eyebrow label, then each paragraph one by one. Like
     Experience, these elements carry no `.reveal` class so GSAP owns them and
     the IntersectionObserver leaves them alone (no double animation). */
  revealSequence('#about', [
    '.about-photo-frame',
    '.about-photo-text .eyebrow',
    '.about-photo-text p'
  ]);

  /* ── EXPERIENCE — cinematic sequenced reveal (home page) ──
     Reveals one element at a time as the section scrolls into view: the label,
     then the centre photo, then each role top-to-bottom, then the CTA. These
     elements deliberately carry no `.reveal` class (so the IntersectionObserver
     above ignores them and GSAP owns them exclusively — no double animation). */
  revealSequence('#experience', [
    '.exp-mock-label',
    '.exp-mock-photo',
    '.exp-mock-tl',
    '.exp-mock-tr',
    '.exp-mock-bl',
    '.exp-mock-btn'
  ]);

  /* ── REFRESH SCROLLTRIGGER AFTER LAYOUT-AFFECTING LOADS (debounced) ──
     Lazy images above the Experience section shift its position as they load;
     recompute trigger positions once things settle so the start point is right. */
  if (hasGSAP) {
    let refreshTimer = null;
    const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150); };
    window.addEventListener('load', refresh);
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
  }


  /* ── MAGNETIC BUTTONS (cursor-follow nudge — mouse-driven, not scroll) ── */
  if (!reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }


  /* ── HASH LINKS (Lenis-aware smooth scroll + focus management) ──
     Uses lenis.scrollTo when Lenis is active, so anchor jumps share the same
     eased feel as regular scrolling; falls back to the browser's own
     scrollIntoView otherwise (still smooth via CSS scroll-behavior). */
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el || el === document.body || el === document.documentElement) return;

    // Allow default browser behavior for modified clicks / new tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;

    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(el, { offset: 0 });
    } else {
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    // Accessibility: move focus without additional scrolling.
    if (typeof el.focus === 'function') {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }, { passive: false });

});
