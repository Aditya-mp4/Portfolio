/* ============================================================
   resona-research.js — cinematic scroll narrative for the Resona
   research story. Scoped to projects/resona-research.html only.

   Reusable GSAP timelines (the "components" of this experience):
     initSmoothScroll()  — one Lenis engine on one GSAP-ticker loop
     revealChapter(el)   — sequenced entrance for a chapter's lines
     pinnedChapter(el)   — pin a chapter, scrub its beats one by one
     parallaxLayer(el)   — subtle depth on figures
     buildHand(el)       — the 21-point MediaPipe hand, animated
     drawPipeline(el)    — architecture nodes + connections, animated

   Native scroll is preserved (no scroll-jacking); Lenis only eases the
   wheel, and ScrollTrigger is synced to it through a single ticker.
   Everything degrades gracefully under prefers-reduced-motion and if
   the GSAP/Lenis CDN fails to load (content simply shows, static).
   ============================================================ */

(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ── One smooth-scroll engine, one animation loop ──
       main.js (loaded just before this file) already creates the site's
       shared Lenis instance via window.__lenis — reuse it instead of
       spinning up a second one on this page. */
  function initSmoothScroll() {
    if (window.__lenis) return window.__lenis;
    if (reduce || typeof window.Lenis === 'undefined' || !hasGSAP) return null;
    const lenis = new Lenis({
      duration: 1.2,                                   // slow, cinematic — but still native-feeling
      easing: t => 1 - Math.pow(2, -10 * t),           // expo-out: natural accel + soft deceleration
      smoothWheel: true,
      touchMultiplier: 1.1,                            // no excessive fling on mobile
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    return lenis;
  }

  /* ── revealChapter — non-pinned chapters: reveal [data-reveal]/[data-step] in
       sequence. Chapters normally reserved for pinning (04/06/07/09) fall back
       to this same reveal on narrow viewports, so mobile still gets the
       staggered entrance instead of everything appearing at once. ── */
  function revealChapter(chapter) {
    const items = gsap.utils.toArray(chapter.querySelectorAll('[data-reveal], [data-step]'));
    if (!items.length) return;
    if (reduce || !hasGSAP) { if (hasGSAP) gsap.set(items, { clearProps: 'all' }); return; }
    gsap.set(items, { opacity: 0, y: 42 });
    gsap.timeline({ scrollTrigger: { trigger: chapter, start: 'top 75%', once: true } })
      .to(items, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.22,
        clearProps: 'transform'
      });
  }

  /* ── pinnedChapter — pin the chapter and scrub its [data-step] beats one by
       one as the reader scrolls. Optional dim: when several steps share the
       same stacked position (e.g. rr-beats' absolutely-positioned lines),
       every earlier step is fully hidden — not just dimmed — as each new one
       appears, so only one idea is ever legible at a time. ── */
  function pinnedChapter(chapter) {
    const steps = gsap.utils.toArray(chapter.querySelectorAll('[data-step]'));
    if (!steps.length) { revealChapter(chapter); return; }
    if (reduce || !hasGSAP) { if (hasGSAP) gsap.set(steps, { clearProps: 'all' }); return; }

    const dim = chapter.dataset.dim === 'true';
    gsap.set(steps, { opacity: 0, y: 46 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: chapter,
        start: 'top top',
        end: '+=' + (steps.length * 62 + 40) + '%',
        pin: true,
        scrub: 0.4,
        anticipatePin: 1,
      }
    });

    steps.forEach((step, i) => {
      if (dim && i > 0) {
        // Fully hide every step shown so far — not just the last one — so
        // stacked lines never accumulate into overlapping ghost text.
        tl.to(steps.slice(0, i), { opacity: 0, y: -24, duration: 0.7, ease: 'power2.out' });
      }
      tl.to(step, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, dim && i > 0 ? '<0.15' : undefined);
      tl.to({}, { duration: 0.45 });                   // hold before the next beat
    });
  }

  /* ── parallaxLayer — subtle vertical drift for depth ── */
  function parallaxLayer(el) {
    if (reduce || !hasGSAP) return;
    const amount = parseFloat(el.dataset.parallax) || 0.3;
    gsap.to(el, {
      yPercent: -18 * amount, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.4 }
    });
  }

  /* ── buildHand — draw MediaPipe's 21-point hand as a constellation ── */
  const HAND_PTS = {
    0: [150, 332],                                     // wrist
    1: [112, 292], 2: [86, 258], 3: [70, 228], 4: [58, 200],           // thumb
    5: [122, 222], 6: [117, 176], 7: [114, 146], 8: [112, 118],        // index
    9: [151, 216], 10: [151, 166], 11: [151, 133], 12: [151, 103],     // middle
    13: [180, 221], 14: [185, 173], 15: [188, 143], 16: [190, 116],    // ring
    17: [207, 233], 18: [219, 199], 19: [227, 173], 20: [233, 149],    // pinky
  };
  const HAND_LINKS = [
    [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12], [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20], [5,9],[9,13],[13,17],
  ];
  function buildHand(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 300 380');
    svg.setAttribute('class', 'rr-hand-svg');
    svg.setAttribute('aria-hidden', 'true');
    const lineEls = [], dotEls = [];
    HAND_LINKS.forEach(([a, b]) => {
      const l = document.createElementNS(svg.namespaceURI, 'line');
      l.setAttribute('x1', HAND_PTS[a][0]); l.setAttribute('y1', HAND_PTS[a][1]);
      l.setAttribute('x2', HAND_PTS[b][0]); l.setAttribute('y2', HAND_PTS[b][1]);
      l.setAttribute('class', 'rr-hand-line');
      svg.appendChild(l); lineEls.push(l);
    });
    Object.keys(HAND_PTS).forEach(k => {
      const [x, y] = HAND_PTS[k];
      const c = document.createElementNS(svg.namespaceURI, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      c.setAttribute('r', k === '0' ? 5.5 : 4);
      c.setAttribute('class', 'rr-hand-dot');
      svg.appendChild(c); dotEls.push(c);
    });
    container.appendChild(svg);
    return { svg, lineEls, dotEls };
  }

  /* Animate the hand in when its chapter's step becomes active. */
  function animateHand(container) {
    const { lineEls, dotEls } = buildHand(container);
    if (reduce || !hasGSAP) return;
    gsap.set(dotEls, { scale: 0, transformOrigin: 'center' });
    gsap.set(lineEls, { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: container, start: 'top 80%', once: true } })
      .to(dotEls, { scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.03 })
      .to(lineEls, { opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.02 }, 0.2);
  }

  /* ── boot ── */
  document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();

    const desktopPin = window.innerWidth > 820;

    gsap.utils.toArray('.rr-chapter').forEach(ch => {
      if (ch.dataset.mode === 'pin' && desktopPin && !reduce && hasGSAP) pinnedChapter(ch);
      else revealChapter(ch);
    });

    gsap.utils.toArray('[data-parallax]').forEach(parallaxLayer);

    const handHost = document.getElementById('rr-hand');
    if (handHost) animateHand(handHost);

    /* thin scroll-progress rail */
    const rail = document.getElementById('rr-progress');
    if (rail && hasGSAP && !reduce) {
      gsap.to(rail, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
      });
    }

    /* recompute trigger positions once fonts/layout settle */
    if (hasGSAP) {
      let t;
      const refresh = () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 150); };
      window.addEventListener('load', refresh);
      window.addEventListener('resize', refresh);
    }
  });
})();
