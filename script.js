(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* If the animation library is unavailable, show the content plainly. */
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    const l = $('#loader'); if (l) l.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- waveform figure ---------- */
  const wave = $('#waveSvg');
  if (wave) {
    const n = 96, ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < n; i++) {
      const env = Math.sin((i / n) * Math.PI * 3.2) * .5 + .5;
      const h = 30 + env * 260 * (.35 + .65 * Math.abs(Math.sin(i * 12.9898)));
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', 40 + i * 11.6); r.setAttribute('width', 5);
      r.setAttribute('y', 260 - h / 2); r.setAttribute('height', h);
      r.setAttribute('fill', i > 58 ? '#E45B3B' : '#EAE8E2');
      r.setAttribute('fill-opacity', i > 58 ? 1 : .55);
      r.style.animationDelay = (-(i % 17) * .14) + 's';
      wave.appendChild(r);
    }
  }

  /* ---------- hero canvas: drifting ridgelines (signal / mountain) ---------- */
  const cv = $('#heroCanvas');
  let heroVisible = true, drawHero = () => {};
  if (cv) {
    const ctx = cv.getContext('2d');
    let W, H;
    const build = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const N = 22;
    drawHero = t => {
      ctx.fillStyle = '#090A0B'; ctx.fillRect(0, 0, W, H);
      const top = H * .42, span = H * .52, step = W < 700 ? 10 : 8;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1), y0 = top + k * span;
        const amp = 14 + k * 46;
        ctx.beginPath(); ctx.moveTo(-10, H + 10);
        for (let x = -10; x <= W + 10; x += step) {
          const u = x / W, ph = t * .00018 + i * .35;
          const bump = Math.exp(-Math.pow((u - .68) / .22, 2));
          const n = Math.sin(u * 9 + ph) * .5 + Math.sin(u * 23 - ph * 1.7 + i) * .22 + Math.sin(u * 4 - ph * .6) * .4;
          ctx.lineTo(x, y0 - amp * (n * .5 + .5) * (.25 + bump * 1.5));
        }
        ctx.lineTo(W + 10, H + 10); ctx.closePath();
        ctx.fillStyle = '#090A0B'; ctx.fill();
        const hot = i === N - 5;
        ctx.strokeStyle = hot ? 'rgba(228,91,59,.85)' : `rgba(234,232,226,${.1 + k * .22})`;
        ctx.lineWidth = hot ? 1.4 : 1; ctx.stroke();
      }
    };
    build(); drawHero(0);
    addEventListener('resize', () => { build(); drawHero(performance.now()); });
    new IntersectionObserver(e => heroVisible = e[0].isIntersecting).observe(cv);
    let last = 0;
    if (!reduce) gsap.ticker.add(() => { const n = performance.now(); if (heroVisible && !document.hidden && n - last > 33) { last = n; drawHero(n); } });
  }

  /* ---------- scroll behaviour (native scrolling) ---------- */
  const scrollMasks = () => $$('.mask').filter(m => !m.closest('.loader') && !m.closest('.hero'));
  const initScroll = () => {
    if (!reduce) {
      const hero = $('#hero');
      gsap.set('#intro', { visibility: 'visible' });
      gsap.set('.portrait', { clipPath: 'inset(0 50% 0 50%)', autoAlpha: 0 });
      gsap.set('.nm span', { yPercent: 110 });
      gsap.set('.roles li', { opacity: 0, y: 16 });
      gsap.set('.credit', { opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=240%', pin: true, scrub: .7, anticipatePin: 1 } });
      tl.to('.hero-title .mask:nth-child(odd)', { xPercent: -45, opacity: 0, duration: 3 }, 0)
        .to('.hero-title .mask:nth-child(even)', { xPercent: 45, opacity: 0, duration: 3 }, 0)
        .to('.hero-meta, .hero-foot', { opacity: 0, duration: 2 }, 0)
        .set('.portrait', { autoAlpha: 1 }, 1.5)
        .to('.portrait', { clipPath: 'inset(0 0% 0 0%)', duration: 4 }, 1.5)
        .to('.nm-a span', { yPercent: 0, duration: 2.5 }, 3.5)
        .to('.nm-b span', { yPercent: 0, duration: 2.5 }, 4.2)
        .to('.roles li', { opacity: 1, y: 0, stagger: .4, duration: 1.2 }, 5.5)
        .to('.credit', { opacity: 1, duration: 1.5 }, 6.2)
        .to({}, { duration: 2 });
    }
    scrollMasks().forEach(m => ScrollTrigger.create({ trigger: m, start: 'top 90%', once: true, onEnter: () => m.classList.add('in') }));

    $$('.img-in').forEach(el => {
      if (reduce) return;
      gsap.fromTo(el, { clipPath: 'inset(0 46% 0 46%)' }, { clipPath: 'inset(0 0% 0 0%)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 30%', scrub: .6 } });
    });

    $$('[data-count]').forEach(el => {
      const end = +el.dataset.count, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => {
        if (reduce) return;
        gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v).toLocaleString('en-US') });
      } });
    });

    const bar = $('#progress');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => bar.style.transform = `scaleX(${s.progress})` });

    const label = $('#chapterLabel'), num = $('#railNum'), fill = $('#railFill');
    $$('[data-chapter]').forEach(sec => {
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: s => { if (!s.isActive) return;
          label.textContent = `${sec.dataset.chapter} — ${sec.dataset.label.replace(/&amp;/g, '&')}`;
          num.textContent = sec.dataset.chapter;
          fill.style.transform = `scaleX(${(+sec.dataset.chapter - 1) / 5})`;
          fill.style.transition = 'transform .6s cubic-bezier(.76,0,.24,1)';
        } });
    });

    const tl = $('#tlFill');
    if (tl) gsap.to(tl, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
  };

  /* ---------- chapter index overlay ---------- */
  const idx = $('#index'), btn = $('#idxBtn');
  const setIndex = open => {
    btn.setAttribute('aria-expanded', open);
    $('span', btn).textContent = open ? 'CLOSE' : 'INDEX';
    if (open) { idx.hidden = false; idx.offsetHeight; idx.classList.add('open'); document.body.style.overflow = 'hidden'; }
    else { idx.classList.remove('open'); document.body.style.overflow = '';
      setTimeout(() => { if (!idx.classList.contains('open')) idx.hidden = true; }, 850); }
  };
  btn.addEventListener('click', () => setIndex(btn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', e => { if (e.key === 'Escape' && idx.classList.contains('open')) setIndex(false); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    if (idx.classList.contains('open')) setIndex(false);
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));

  /* ---------- GitHub activity ---------- */
  (async () => {
    const list = $('#exList'), status = $('#exStatus');
    const fail = msg => { status.textContent = msg; list.innerHTML = '<li class="ex-empty mono">Activity unavailable right now. See the profile for the full record.</li>'; };
    try {
      const q = encodeURIComponent('author:HamidKhan1001 type:pr -user:HamidKhan1001');
      let d = null;
      try { const c = JSON.parse(sessionStorage.getItem('hn-gh') || 'null'); if (c && Date.now() - c.t < 6e5) d = c.d; } catch (e) {}
      if (!d) {
        const r = await fetch(`https://api.github.com/search/issues?q=${q}&sort=updated&order=desc&per_page=8`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(r.status);
        d = await r.json();
        try { sessionStorage.setItem('hn-gh', JSON.stringify({ t: Date.now(), d })); } catch (e) {}
      }
      if (!d.items.length) return fail('NO PUBLIC PULL REQUESTS FOUND');
      status.textContent = `${d.total_count} PULL REQUESTS TO OTHER PROJECTS · LATEST ${d.items.length}`;
      list.innerHTML = '';
      d.items.forEach(p => {
        const merged = p.pull_request && p.pull_request.merged_at;
        const st = merged ? 'merged' : p.state;
        const repo = p.repository_url.split('/').slice(-2).join('/');
        const li = document.createElement('li'), a = document.createElement('a');
        a.href = p.html_url; a.target = '_blank'; a.rel = 'noopener';
        const s = document.createElement('span'); s.className = 'st mono ' + st; s.textContent = st;
        const t = document.createElement('span'); t.className = 'ti'; t.textContent = p.title;
        const rp = document.createElement('span'); rp.className = 'rp mono'; rp.textContent = `${repo} #${p.number}`;
        a.append(s, t, rp); li.appendChild(a); list.appendChild(li);
      });
    } catch (e) { fail('GITHUB API UNAVAILABLE'); }
  })();

  /* ---------- loader + entrance ---------- */
  const loader = $('#loader');
  const returning = (() => { try { return sessionStorage.getItem('hn-seen') === '1'; } catch (e) { return false; } })();
  try { sessionStorage.setItem('hn-seen', '1'); } catch (e) {}

  const heroIn = () => $$('.hero .mask').forEach(m => m.classList.add('in'));
  const finish = () => { loader.remove(); document.body.style.overflow = ''; heroIn(); initScroll(); ScrollTrigger.refresh(); };

  if (reduce) { finish(); return; }

  document.body.style.overflow = 'hidden';
  const assetsReady = new Promise(res => {
    const go = () => Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2500))]).then(res);
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  });

  const pct = $('#ldPct'), line = $('#ldLine'), wipe = $('#ldWipe');
  const dur = returning ? .55 : 1.25, o = { v: 0 };
  const intro = gsap.timeline();
  if (!returning) {
    intro.to('.ld-top', { opacity: 1, duration: .4 }, 0)
         .to('.ld-bottom', { opacity: 1, duration: .4 }, .1)
         .to(line, { scaleX: 1, duration: .7, ease: 'power3.inOut' }, .15)
         .add(() => $$('.ld-head .mask').forEach(m => m.classList.add('in')), .5);
  } else {
    intro.set('.ld-top,.ld-bottom', { opacity: 1 }).to(line, { scaleX: 1, duration: .3, ease: 'power3.inOut' }, 0)
         .add(() => $$('.ld-head .mask').forEach(m => m.classList.add('in')), .1);
  }
  intro.to(o, { v: 100, duration: dur, ease: 'power2.inOut', onUpdate: () => pct.textContent = Math.round(o.v) + '%' }, 0);

  Promise.all([assetsReady, new Promise(r => intro.eventCallback('onComplete', r))]).then(() => {
    pct.textContent = '100%';
    gsap.timeline()
      .to(wipe, { x: '0%', duration: .7, ease: 'power3.inOut', delay: .15 })
      .set(loader, { backgroundColor: 'transparent' })
      .set('.ld-top,.ld-center,.ld-bottom,.ld-line', { display: 'none' })
      .add(() => { document.body.style.overflow = ''; heroIn(); })
      .to(wipe, { x: '101%', duration: .8, ease: 'power3.inOut' })
      .add(finish);
  });
})();
