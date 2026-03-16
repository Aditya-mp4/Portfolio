

document.addEventListener('DOMContentLoaded', () => {


  const cur = document.getElementById('cursor');

  document.addEventListener('mousemove', e => {
    cur.style.left = (e.clientX - 2)  + 'px';
    cur.style.top  = (e.clientY - 6)  + 'px';
  });

  document.querySelectorAll('a, button, .bub, .pcard, .acard').forEach(el => {
    el.addEventListener('mouseenter', () => cur.classList.add('hov'));
    el.addEventListener('mouseleave', () => cur.classList.remove('hov'));
  });


  
  const canvas = document.getElementById('noteCanvas');
  const ctx    = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const NOTES = ['♩','♪','♫','♬','𝄞'];
  const COLS  = ['#FFD93D','#FF6B9D','#4ECDC4','#A855F7','#6BCB77','#FF9F43'];

  const notes = Array.from({ length: 24 }, () => ({
    x:   Math.random() * window.innerWidth,
    y:   Math.random() * window.innerHeight,
    sz:  14 + Math.random() * 18,
    sp:  0.3 + Math.random() * 0.5,
    t:   Math.random() * Math.PI * 2,
    ch:  NOTES[Math.floor(Math.random() * NOTES.length)],
    cl:  COLS [Math.floor(Math.random() * COLS.length)],
    op:  0.1  + Math.random() * 0.15,
    rot: (Math.random() - 0.5) * 0.4
  }));

  (function drawNotes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    notes.forEach(n => {
      n.t += 0.012;
      n.y -= n.sp;
      n.x += Math.sin(n.t) * 0.4;
      if (n.y < -40) { n.y = canvas.height + 20; n.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.globalAlpha = n.op;
      ctx.font        = n.sz + 'px serif';
      ctx.fillStyle   = n.cl;
      ctx.translate(n.x, n.y);
      ctx.rotate(Math.sin(n.t) * n.rot);
      ctx.fillText(n.ch, 0, 0);
      ctx.restore();
    });
    requestAnimationFrame(drawNotes);
  })();


  /* PARALLAX */
  const parallaxItems = [
    { el: document.querySelector('.hero-blob-1'), speed: 0.12 },
    { el: document.querySelector('.hero-blob-2'), speed: 0.07 },
    { el: document.querySelector('.hero-visual'), speed: 0.06 },
  ].filter(p => p.el);

  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    parallaxItems.forEach(({ el, speed }) => {
      el.style.transform = `translateY(${sy * speed}px)`;
    });
  }, { passive: true });


  
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('on'), i * 70);
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.reveal').forEach(r => obs.observe(r));


  /*ACTIVE NAV */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 220) current = s.id;
    });
    navLinks.forEach(a => {
      const active = a.getAttribute('href') === '#' + current;
      a.style.background = active ? 'var(--ink)'    : '';
      a.style.color      = active ? 'var(--yellow)' : '';
    });
  }, { passive: true });

});
