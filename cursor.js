/* Custom cursor (dot + lagging ring + optional label chip) and magnetic pull on buttons.
   Desktop pointers only. The native cursor is only hidden after the first real mouse move. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce || !window.gsap) return;
  const root = document.documentElement;

  const mk = cls => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); return d; };
  const dot = mk('cur-dot'), ring = mk('cur-ring'), tag = mk('cur-tag');
  gsap.set([dot, ring, tag], { xPercent: -50, yPercent: -50, opacity: 0 });

  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
  const tx = gsap.quickTo(tag, 'x', { duration: 0.3, ease: 'power3' }), ty = gsap.quickTo(tag, 'y', { duration: 0.3, ease: 'power3' });

  let started = false, state = 'idle';
  const show = v => gsap.to([dot, ring], { opacity: v, duration: 0.25, overwrite: 'auto' });

  const setState = (next, label) => {
    if (next === state && (next !== 'tag' || tag.textContent === label)) return;
    state = next;
    if (next === 'tag') tag.textContent = label;
    gsap.to(ring, { scale: next === 'link' ? 1.7 : next === 'tag' ? 0 : 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    gsap.to(dot, { scale: next === 'tag' || next === 'text' ? 0 : 1, duration: 0.25, overwrite: 'auto' });
    gsap.to(tag, { opacity: next === 'tag' ? 1 : 0, scale: next === 'tag' ? 1 : 0.6, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
  };

  addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!started) {
      started = true;
      root.classList.add('has-cursor');
      gsap.set([dot, ring, tag], { x: e.clientX, y: e.clientY });
      show(1);
    }
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); tx(e.clientX); ty(e.clientY + 0);
  }, { passive: true });

  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('[data-cursor],a,button,[role="button"],[role="option"],.flip,input,textarea');
    if (!t) return setState('idle');
    if (t.matches('input,textarea')) return setState('text');
    const lbl = t.closest('[data-cursor]');
    if (lbl) return setState('tag', lbl.dataset.cursor);
    setState('link');
  });
  document.addEventListener('pointerdown', () => { if (state === 'idle' || state === 'link') gsap.to(ring, { scale: state === 'link' ? 1.25 : 0.7, duration: 0.2, overwrite: 'auto' }); });
  document.addEventListener('pointerup', () => { if (state === 'idle' || state === 'link') gsap.to(ring, { scale: state === 'link' ? 1.7 : 1, duration: 0.5, ease: 'elastic.out(1,.5)', overwrite: 'auto' }); });
  root.addEventListener('pointerleave', () => { if (started) show(0); });
  root.addEventListener('pointerenter', () => { if (started) show(1); });

  /* ---------- magnetic pull (uses the independent `translate` property so hover transforms still work) ---------- */
  const mags = [...document.querySelectorAll('.btn, .theme-btn, .cmd-btn, .cx-sticker')].map(el => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    for (const m of mags) {
      const r = m.el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > innerHeight + 60) { m.tx = m.ty = 0; continue; }
      const cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y; // undo our own offset
      const ex = e.clientX - cx, ey = e.clientY - cy, pad = 34;
      const inside = Math.abs(ex) < r.width / 2 + pad && Math.abs(ey) < r.height / 2 + pad;
      m.tx = inside ? ex * 0.3 : 0; m.ty = inside ? ey * 0.3 : 0;
    }
  }, { passive: true });
  gsap.ticker.add(() => {
    for (const m of mags) {
      if (m.x === m.tx && m.y === m.ty) continue;
      m.x += (m.tx - m.x) * 0.16; m.y += (m.ty - m.y) * 0.16;
      if (Math.abs(m.tx - m.x) < 0.05 && Math.abs(m.ty - m.y) < 0.05) { m.x = m.tx; m.y = m.ty; }
      m.el.style.translate = m.x || m.y ? `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px` : '';
    }
  });
})();
