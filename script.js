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

  /* ---------- scroll lock, menu, anchors (shared with palette.js via window.site) ---------- */
  const burger = $('#burger'), menu = $('#menu');
  let lenis = null;
  const lock = on => {
    if (lenis) on ? lenis.stop() : lenis.start();
    else document.body.style.overflow = on ? 'hidden' : '';
  };
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    menu.classList.toggle('open', open);
    lock(open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));

  const goTo = id => {
    let target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    // a pinned section lives inside a spacer; scroll to the spacer or the offset is wrong once pinned
    if (target && target.parentElement && target.parentElement.classList.contains('pin-spacer')) target = target.parentElement;
    setMenu(false);
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -10, duration: 1.4 });
    else (target === 0 ? window.scrollTo({ top: 0 }) : target.scrollIntoView());
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id !== '#top' && !$(id)) return;
    e.preventDefault();
    goTo(id);
  }));
  window.site = { goTo, lock, toggleTheme: () => tbtn.click(), flip: null };

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

  /* ---------- scroll progress ---------- */
  const bar = $('.progress');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => { bar.style.transform = `scaleX(${self.progress})`; }
  });
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

  if (reduce) return;

  /* ---------- hero intro ---------- */
  $$('.hero h1 .split').forEach(w => {
    const t = w.textContent;
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = [...t].map(c => `<span class="lt" style="display:inline-block">${c}</span>`).join('');
  });
  let heroReady = false;
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' }, onComplete: () => (heroReady = true) });
  intro
    .from('.hero h1 .lt', { yPercent: 118, rotate: 5, duration: 1.2, stagger: 0.04 })
    .from('.cx-sticker, .cx-pill', { scale: 0, opacity: 0, rotate: -40, duration: 1.2, stagger: 0.12, ease: 'back.out(1.6)' }, 0.55)
    .from('.hero-meta span', { y: 24, opacity: 0, duration: 1, stagger: 0.1 }, 0.7)
    .from('.nav', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.4);

  const avatar = $('#avatar'), move = $('#avatarMove'), tilt = $('#avatarTilt');
  gsap.set(avatar, { rotateY: 180 });
  gsap.set(move, { opacity: 0 });
  let introDone = false;
  // wait for the loader curtain (loader.js sets window.__loaded and fires "loaded")
  const begin = () => {
    intro.play();
    gsap.to(move, { opacity: 1, duration: 0.8, delay: 0.3 });
    gsap.to(avatar, { rotateY: 0, duration: 1.8, delay: 0.5, ease: 'power3.inOut', onComplete: () => (introDone = true) });
  };
  if (window.__loaded) begin(); else addEventListener('loaded', begin, { once: true });

  // live local time in Peshawar
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Karachi' });
    const upd = () => { clock.textContent = fmt.format(new Date()) + ' PKT'; };
    upd(); setInterval(upd, 15000);
  }

  // click / tap to flip the portrait
  let flipped = false;
  const flipPortrait = () => {
    if (!introDone) return;
    flipped = !flipped;
    gsap.to(avatar, { rotateY: flipped ? 180 : 0, duration: 1.1, ease: 'power3.inOut' });
  };
  avatar.addEventListener('click', flipPortrait);
  window.site.flip = flipPortrait;

  /* ---------- marquee: drifts on its own, speeds up and reverses with scroll ---------- */
  const track = $('.mq-track');
  if (track) {
    track.style.animation = 'none';
    let x = 0, dir = -1, boost = 0;
    gsap.ticker.add((_t, dt) => {
      const v = lenis ? lenis.velocity : 0;
      boost += (Math.min(Math.abs(v), 40) - boost) * 0.08;
      if (Math.abs(v) > 0.4) dir += ((v < 0 ? 1 : -1) - dir) * 0.1;
      else dir += (-1 - dir) * 0.02;
      x += dir * (1.47 + boost * 0.35) * (dt / 1000);
      if (x <= -50) x += 50;
      if (x > 0) x -= 50;
      track.style.transform = `translate3d(${x.toFixed(3)}%,0,0)`;
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
  gsap.utils.toArray('.reveal-up, .row, .orow, .stat, .stack > div' + (fine ? '' : ', .flip')).forEach(el => {
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

  /* ---------- projects: index list with a cursor-following preview ---------- */
  const rows = $$('.prow'), prev = $('#pprev');
  rows.forEach(row => gsap.from(row, {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: row, start: 'top 92%', once: true }
  }));
  if (fine && prev) {
    const tiles = rows.map(r => {
      const t = $('.pimg', r).cloneNode(true);
      prev.appendChild(t);
      return t;
    });
    const mx = gsap.quickTo(prev, 'x', { duration: 0.55, ease: 'power3' });
    const my = gsap.quickTo(prev, 'y', { duration: 0.55, ease: 'power3' });
    const rot = gsap.quickTo(prev, 'rotation', { duration: 0.6, ease: 'power3' });
    let lastX = 0, active = -1;
    const list = $('#plist');
    list.addEventListener('pointerenter', e => {
      gsap.set(prev, { x: e.clientX + 28, y: e.clientY - prev.offsetHeight / 2 });
      gsap.to(prev, { opacity: 1, duration: 0.3 });
    });
    list.addEventListener('pointermove', e => {
      mx(e.clientX + 28); my(e.clientY - prev.offsetHeight / 2);
      rot(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.4))); lastX = e.clientX;
    });
    list.addEventListener('pointerleave', () => {
      gsap.to(prev, { opacity: 0, duration: 0.3 });
      tiles.forEach(t => t.classList.toggle('on', false));
      active = -1;
    });
    rows.forEach((row, i) => row.addEventListener('pointerenter', () => {
      if (active === i) return;
      tiles.forEach((t, k) => t.classList.toggle('on', k === i));
      active = i;
    }));
  }

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
