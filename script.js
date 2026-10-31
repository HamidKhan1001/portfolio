(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- rolling-letter text (pure DOM + CSS hover) ---------- */
  $$('[data-roll]').forEach(el => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    [...text].forEach((c, i) => {
      const ch = document.createElement('span');
      ch.className = 'ch' + (c === ' ' ? ' sp' : '');
      ch.setAttribute('aria-hidden', 'true');
      ch.style.setProperty('--i', i);
      ch.innerHTML = c === ' ' ? '&nbsp;' : `<span>${c}</span><span>${c}</span>`;
      el.appendChild(ch);
    });
  });

  /* ---------- theme toggle (dark by default) ---------- */
  const root = document.documentElement, tbtn = $('#theme');
  const applyTheme = t => {
    root.setAttribute('data-theme', t);
    tbtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#0f0f0f' : '#faf7f3';
  };
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  tbtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.classList.add('theming');
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    setTimeout(() => root.classList.remove('theming'), 600);
  });

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), menu = $('#menu');
  let lenis = null;
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    menu.classList.toggle('open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));

  if (!window.gsap || !window.ScrollTrigger) return; // page stays fully usable without motion

  gsap.registerPlugin(ScrollTrigger, window.Draggable);
  // mobile URL bar showing/hiding fires resize constantly; don't recompute every time
  ScrollTrigger.config({ ignoreMobileResize: true });
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- smooth scroll (Lenis) ---------- */
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    setMenu(false);
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -10, duration: 1.4 });
    else (target === 0 ? window.scrollTo({ top: 0 }) : target.scrollIntoView());
  }));

  /* ---------- scroll progress + nav hide/show ---------- */
  const bar = $('.progress'), nav = $('#nav');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      bar.style.transform = `scaleX(${self.progress})`;
      const y = self.scroll();
    }
  });

  if (reduce) return;

  /* ---------- hero intro ---------- */
  $$('.hero h1 .split').forEach(w => {
    const t = w.textContent;
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = [...t].map(c => `<span class="lt" style="display:inline-block">${c}</span>`).join('');
  });
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  intro
    .from('.hero h1 .lt', { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.045, delay: 0.2 })
    .from('.shape, .cx-sticker, .cx-pill', { scale: 0, opacity: 0, rotate: -60, duration: 1.4, stagger: 0.15, ease: 'elastic.out(1,.6)' }, 0.9)
    .from('.copy, .since', { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, 1.1)
    .from('.nav', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.6);

  const avatar = $('#avatar'), move = $('#avatarMove'), tilt = $('#avatarTilt');
  gsap.set(avatar, { rotateY: 180 });
  let introDone = false;
  gsap.to(avatar, { rotateY: 0, duration: 1.8, delay: 1, ease: 'power3.inOut', onComplete: () => (introDone = true) });
  gsap.from(move, { opacity: 0, duration: 0.8, delay: 0.6 });

  // click / tap to flip the portrait
  let flipped = false;
  avatar.addEventListener('click', () => {
    if (!introDone) return;
    flipped = !flipped;
    gsap.to(avatar, { rotateY: flipped ? 180 : 0, duration: 1.1, ease: 'power3.inOut' });
  });

  // draggable stickers
  if (window.Draggable && fine) {
    gsap.set('.bolt', { rotation: 8 });
    Draggable.create('.shape', {
      type: 'x,y', bounds: '.hb',
      onPress() { gsap.to(this.target, { scale: 1.12, duration: 0.3 }); },
      onRelease() { gsap.to(this.target, { scale: 1, duration: 0.8, ease: 'elastic.out(1,.5)' }); },
      onDrag() { gsap.to(this.target, { rotation: '+=' + this.deltaX * 0.4, duration: 0.2, overwrite: 'auto' }); }
    });
  }

  /* ---------- sticky portrait: small at hero bottom -> tilts in 3D -> big in About ---------- */
  gsap.set(tilt, { transformPerspective: 1200 });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 810px)', () => {
    const st = { trigger: '#hb', start: 'top top', end: () => '+=' + innerHeight * 1.05, scrub: 0.7, invalidateOnRefresh: true };
    // starts as a small card sitting at the bottom of the hero
    gsap.fromTo(move,
      { scale: 0.5, y: () => innerHeight / 2 - move.offsetHeight * 0.25 - 36 },
      { scale: 1, y: 0, ease: 'power1.inOut', scrollTrigger: st });
    // 3D tilt that peaks mid-scroll then settles flat
    gsap.timeline({ scrollTrigger: st, defaults: { ease: 'none' } })
      .fromTo(tilt, { rotateY: 0, rotateZ: 0 }, { rotateY: 34, rotateZ: -5, duration: 0.5, ease: 'sine.out' })
      .to(tilt, { rotateY: 0, rotateZ: 0, duration: 0.5, ease: 'sine.inOut' });
  });
  // mobile: layout is pure CSS (portrait sits under the title). Scroll adds a light tilt-and-lift,
  // transform-only and scrubbed, with no innerHeight maths to go stale when the URL bar moves.
  mm.add('(max-width: 809px)', () => {
    gsap.fromTo(tilt, { rotateY: 0, rotateZ: -3 },
      { rotateY: 28, rotateZ: 3, ease: 'none',
        scrollTrigger: { trigger: '#hb', start: 'top top', end: '+=70%', scrub: 0.5 } });
    gsap.to('.hero-title', { yPercent: -12, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '#hb', start: 'top top', end: '+=70%', scrub: true } });
  });

  /* ---------- generic reveals ---------- */
  gsap.utils.toArray('.reveal-up, .row, .pcard, .orow, .stat, .stack > div' + (fine ? '' : ', .flip')).forEach(el => {
    gsap.from(el, {
      y: fine ? 56 : 28, opacity: 0, duration: fine ? 1.1 : 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  /* ---------- count-up numbers ---------- */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '', o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-US') + suf),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  /* ---------- quote: word-by-word scroll reveal ---------- */
  const q = $('#quote');
  q.setAttribute('aria-label', q.textContent);
  q.innerHTML = q.textContent.trim().split(/\s+/).map(w => `<span class="w" aria-hidden="true">${w}</span>`).join('');
  gsap.to('#quote .w', {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: { trigger: '.quote', start: 'top 72%', end: 'bottom 55%', scrub: true }
  });

  /* ---------- projects: parallax + mouse tilt ---------- */
  if (fine) $$('.pcard').forEach(card => {
    const inner = $('.pin', card);
    gsap.fromTo(inner, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
    });
    const svg = $('svg', inner);
    const rx = gsap.quickTo(svg, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(svg, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(svg, { transformPerspective: 1000 });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  /* ---------- community: 3D flip cards ---------- */
  const flips = $$('.flip');
  if (fine) {
    gsap.set(flips, { rotateY: 180 });
    gsap.to(flips, {
      rotateY: 0, duration: 1.5, stagger: 0.16, ease: 'power3.out',
      scrollTrigger: { trigger: '.flips', start: 'top 78%', once: true }
    });
  } // touch: cards just fade up with the generic reveals, tap to flip
  const canHover = matchMedia('(hover: hover)').matches;
  flips.forEach(f => {
    let on = false;
    const to = v => { on = v; gsap.to(f, { rotateY: v ? 180 : 0, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }); };
    if (canHover) {
      f.addEventListener('pointerenter', () => to(true));
      f.addEventListener('pointerleave', () => to(false));
    }
    f.addEventListener('click', () => to(!on));
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); to(!on); } });
  });

  /* ---------- contact + footer ---------- */
  const lt = $('#letstalk');
  lt.setAttribute('aria-label', lt.textContent);
  lt.innerHTML = lt.textContent.trim().split(/\s+/).map(w => `<span class="wd" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  gsap.from('#letstalk .wd > span', {
    yPercent: 110, duration: 1.4, stagger: 0.12, ease: 'power4.out',
    scrollTrigger: { trigger: lt, start: 'top 85%', once: true }
  });
  gsap.from('.giant', {
    yPercent: 40, opacity: 0, duration: 1.4, ease: 'power3.out',
    scrollTrigger: { trigger: '.giant', start: 'top 100%', once: true }
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
