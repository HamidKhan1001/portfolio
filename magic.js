/* Magic layer: sparkle wand cursor, lantern glow, glyph-scramble "decryption", an incantation
   that types itself in the hero, and a hidden spell (Konami code, or just type "magic").
   Vanilla JS, no dependencies. Pointer effects are desktop-only and everything honours reduced motion. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  console.log(
    '%c✦ hamid.dev ✦\n%cpoking around in devtools? a fellow wizard.\ntry typing "magic" anywhere on the page.',
    'font:600 20px monospace;color:#ff5a1f', 'font:13px monospace;color:#999'
  );

  /* ---------- incantation: types itself in the hero ---------- */
  const spell = $('#spellTxt');
  if (spell) {
    const lines = [
      'go run wizardry.go',
      'kubectl rollout restart magic',
      'git commit -m "abracadabra"',
      'docker run --rm -it sorcery:latest',
      'sudo make it work',
      'curl -X POST /summon/goroutines'
    ];
    if (reduce) spell.textContent = lines[0];
    else {
      let li = 0, ci = 0, del = false;
      const step = () => {
        const full = lines[li];
        ci += del ? -1 : 1;
        spell.textContent = full.slice(0, ci);
        let wait = del ? 28 : 55 + Math.random() * 70;
        if (!del && ci === full.length) { del = true; wait = 1700; }
        else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 350; }
        setTimeout(step, wait);
      };
      setTimeout(step, 2800);
    }
  }

  /* ---------- grimoire: rotating magical one-liners ---------- */
  const SPELLS = [
    ['Any sufficiently advanced backend is indistinguishable from magic.', 'Clarke, but make it Go'],
    ['It works on my machine. That is not a bug, that is a spell with local scope.', 'Ancient developer proverb'],
    ['I do not fix bugs. I banish them.', 'Exorcist, pull request #42'],
    ['Kubernetes is just herding invisible cats with scrolls of YAML.', 'The Cluster Whisperer'],
    ['Latency is a curse. Caching is the counter-spell.', 'Redis, the grey wizard'],
    ['A race condition is two wizards casting at once and the universe picking a favourite.', 'Concurrency, volume II'],
    ['git blame: the only divination I trust.', 'Seer of the main branch'],
    ['Off-by-one: the oldest curse in the grimoire.', 'Every array, ever'],
    ['Have you tried turning the dragon off and on again?', 'Tier-1 sorcery support'],
    ['Rate limiter: the bouncer that tells a stampede to take a number.', 'Token Bucket, bouncer']
  ];
  const gq = $('#gq'), gby = $('#gby'), gnext = $('#gnext');
  let gi = 0, gtimer = 0;
  const showSpell = i => {
    gi = (i + SPELLS.length) % SPELLS.length;
    if (reduce) { gq.textContent = SPELLS[gi][0]; gby.textContent = SPELLS[gi][1]; return; }
    scramble(gq, SPELLS[gi][0], 900);
    scramble(gby, SPELLS[gi][1], 600);
  };
  if (gq) {
    gq.textContent = SPELLS[0][0]; gby.textContent = SPELLS[0][1];
    const auto = () => { clearInterval(gtimer); if (!reduce) gtimer = setInterval(() => showSpell(gi + 1), 7000); };
    gnext.addEventListener('click', () => { showSpell(gi + 1); auto(); });
    auto();
  }

  if (reduce) return;

  /* ---------- glyph scramble ("decrypt") ---------- */
  const GL = '01<>/{}[]*#$%&=+~?';
  const scramble = (el, final, dur = 650) => {
    if (el._sc) cancelAnimationFrame(el._sc);
    const n = final.length, t0 = performance.now();
    const frame = now => {
      const p = Math.min(1, (now - t0) / dur);
      let out = '';
      for (let i = 0; i < n; i++) {
        const c = final[i];
        out += c === ' ' || i < p * n * 1.15 - 1 ? c : GL[(Math.random() * GL.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._sc = requestAnimationFrame(frame);
      else { el.textContent = final; el._sc = 0; }
    };
    el._sc = requestAnimationFrame(frame);
  };

  // section labels decrypt as they scroll into view
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    scramble(e.target, e.target.dataset.final, 800);
  }), { threshold: 0.6 });
  $$('.eyebrow, .otag').forEach(el => {
    el.dataset.final = el.textContent;
    el.setAttribute('aria-label', el.textContent);
    io.observe(el);
  });

  // hero letters flicker into runes when touched, then settle (width is pinned so nothing jumps)
  if (fine) $$('.hero h1 .lt').forEach(l => {
    const ch = l.textContent;
    l.addEventListener('pointerenter', () => {
      if (l._busy) return;
      l._busy = true;
      l.style.display = 'inline-block';
      l.style.width = l.getBoundingClientRect().width + 'px';
      l.style.textAlign = 'center';
      scramble(l, ch, 420);
      setTimeout(() => { l._busy = false; l.style.width = ''; }, 460);
    });
  });

  if (!fine) return;

  /* ---------- lantern: soft glow that follows the cursor ---------- */
  const lantern = document.createElement('div');
  lantern.className = 'lantern';
  lantern.setAttribute('aria-hidden', 'true');
  document.body.appendChild(lantern);
  let lx = innerWidth / 2, ly = innerHeight / 2, tx = lx, ty = ly;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; lantern.classList.add('on'); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => lantern.classList.remove('on'));

  /* ---------- sparkle wand ---------- */
  const cv = document.createElement('canvas');
  cv.className = 'sparkles';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);

  const COLORS = ['#ff5a1f', '#ffb547', '#ffe9a8', '#ffffff'];
  const ps = [];
  let running = false;
  const star = (x, y, r, rot) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.28, Math.sin(a + Math.PI / 4) * r * 0.28);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  const spawn = (x, y, burst) => {
    const a = Math.random() * Math.PI * 2, sp = burst ? 1.5 + Math.random() * 5 : Math.random() * 0.9;
    ps.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (burst ? 0 : 0.25),
      life: 0, max: burst ? 55 + Math.random() * 35 : 30 + Math.random() * 25,
      r: burst ? 3 + Math.random() * 6 : 2 + Math.random() * 4.5,
      rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.15,
      c: COLORS[(Math.random() * COLORS.length) | 0]
    });
    if (ps.length > 400) ps.shift();
  };
  const loop = () => {
    // lantern easing runs on the same frame
    lx += (tx - lx) * 0.14; ly += (ty - ly) * 0.14;
    lantern.style.transform = `translate3d(${lx - 260}px,${ly - 260}px,0)`;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life++;
      if (p.life >= p.max) { ps.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.vx *= 0.985; p.rot += p.vr;
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.c;
      star(p.x, p.y, p.r * (0.4 + k * 0.6), p.rot);
    }
    ctx.globalAlpha = 1;
    if (ps.length || Math.abs(tx - lx) > 0.5 || Math.abs(ty - ly) > 0.5) requestAnimationFrame(loop);
    else running = false;
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

  let px = 0, py = 0;
  addEventListener('pointermove', e => {
    const d = Math.hypot(e.clientX - px, e.clientY - py);
    px = e.clientX; py = e.clientY;
    const n = Math.min(3, Math.floor(d / 14));
    for (let i = 0; i < n; i++) spawn(px + (Math.random() - 0.5) * 8, py + (Math.random() - 0.5) * 8, false);
    kick();
  }, { passive: true });
  addEventListener('pointerdown', e => {
    for (let i = 0; i < 22; i++) spawn(e.clientX, e.clientY, true);
    kick();
  });

  /* ---------- the hidden spell ---------- */
  const toast = msg => {
    const t = document.createElement('div');
    t.className = 'spell-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => t.classList.remove('in'), 3200);
    setTimeout(() => t.remove(), 3800);
  };
  const cast = () => {
    for (let k = 0; k < 6; k++) setTimeout(() => {
      for (let i = 0; i < 40; i++) spawn(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.4), true);
      kick();
    }, k * 160);
    toast('✦ spell cast — you found the grimoire');
    document.documentElement.classList.add('arcane');
    setTimeout(() => document.documentElement.classList.remove('arcane'), 2600);
    if (window.site && window.site.toggleTheme) setTimeout(() => window.site.toggleTheme(), 350);
  };
  window.site = window.site || {};
  window.site.cast = cast;

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let ki = 0, typed = '';
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    ki = e.key === KONAMI[ki] ? ki + 1 : e.key === KONAMI[0] ? 1 : 0;
    if (ki === KONAMI.length) { ki = 0; cast(); }
    if (e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-5);
      if (typed === 'magic') { typed = ''; cast(); }
    }
  });
})();
