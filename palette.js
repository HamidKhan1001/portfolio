/* Command palette. Cmd/Ctrl+K or the search button in the nav. Keyboard-first, accessible combobox/listbox. */
(() => {
  const trigger = document.getElementById('cmdk');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const kbd = trigger && trigger.querySelector('.kbd');
  if (kbd) kbd.textContent = isMac ? '⌘K' : 'Ctrl K';

  const site = () => window.site || {};
  const ext = u => () => window.open(u, '_blank', 'noopener');
  const go = id => () => site().goTo && site().goTo(id);

  const commands = () => {
    const list = [
      { g: 'Go to', t: 'About', k: 'hey bio hamid', run: go('#about') },
      { g: 'Go to', t: 'Campus Expert', k: 'github program uet', run: go('#campus') },
      { g: 'Go to', t: 'Services', k: 'skills stack backend cloud', run: go('#services') },
      { g: 'Go to', t: 'Projects', k: 'work featured cache sentinel gopulse', run: go('#work') },
      { g: 'Go to', t: 'Open source', k: 'prs contributions openeverest eduaid', run: go('#opensource') },
      ...(document.getElementById('activity') && !document.getElementById('activity').hidden
        ? [{ g: 'Go to', t: 'Lately', k: 'github activity heatmap commits', run: go('#activity') }] : []),
      { g: 'Go to', t: 'Community', k: 'events cncf peshawar', run: go('#community') },
      { g: 'Go to', t: 'Contact', k: 'reach talk message', run: go('#contact') },
      { g: 'Do', t: 'Toggle light / dark theme', k: 'theme dark light mode', run: () => site().toggleTheme && site().toggleTheme() },
      { g: 'Do', t: 'Back to top', k: 'home scroll', run: go('#top') }
    ];
    if (site().flip) list.push({ g: 'Do', t: 'Flip the portrait', k: 'avatar photo card', run: () => { go('#top')(); setTimeout(() => site().flip(), 1300); } });
    list.push(
      { g: 'Links', t: 'GitHub', k: 'code repos', hint: '↗', run: ext('https://github.com/HamidKhan1001') },
      { g: 'Links', t: 'LinkedIn', k: 'profile', hint: '↗', run: ext('https://www.linkedin.com/in/hamid-naeem-khan-278413402') },
      { g: 'Links', t: 'LeetCode', k: 'problems', hint: '↗', run: ext('https://leetcode.com/u/hamidkhan1001/') },
      { g: 'Links', t: 'Tales of OpenEverest (blog)', k: 'writing go open source', hint: '↗', run: ext('https://lnkd.in/gbSnTJjF') }
    );
    return list;
  };

  const score = (c, q) => {
    const t = c.t.toLowerCase(), k = (c.k || '').toLowerCase();
    let total = 0;
    for (const w of q.split(/\s+/).filter(Boolean)) {
      const i = t.indexOf(w);
      if (i === 0) total += 120; else if (i > 0) total += 90 - i;
      else if (k.includes(w)) total += 50;
      else {
        let p = 0; for (const ch of t) if (ch === w[p]) p++;
        if (p === w.length) total += 10; else return -1;
      }
    }
    return total;
  };

  const wrap = document.createElement('div');
  wrap.className = 'pal'; wrap.hidden = true;
  wrap.innerHTML =
    '<div class="pal-backdrop" data-close></div>' +
    '<div class="pal-box" role="dialog" aria-modal="true" aria-label="Command menu">' +
      '<div class="pal-top">' +
        '<input class="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="palList" aria-autocomplete="list" aria-label="Search commands" placeholder="Jump to a section or run a command" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<kbd>esc</kbd>' +
      '</div>' +
      '<ul class="pal-list" id="palList" role="listbox" aria-label="Commands"></ul>' +
      '<div class="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> select</span></div>' +
    '</div>';
  document.body.appendChild(wrap);
  const input = wrap.querySelector('.pal-input'), listEl = wrap.querySelector('.pal-list');

  let items = [], active = 0, lastFocus = null, isOpen = false, closeTimer = 0;

  const render = () => {
    const q = input.value.trim().toLowerCase();
    let all = commands();
    if (q) all = all.map(c => ({ c, s: score(c, q) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s).map(x => x.c);
    items = all;
    active = Math.min(active, Math.max(0, items.length - 1));
    listEl.textContent = '';
    if (!items.length) {
      const li = document.createElement('li'); li.className = 'pal-empty'; li.textContent = 'Nothing matches that.'; li.setAttribute('role', 'presentation');
      listEl.appendChild(li); input.removeAttribute('aria-activedescendant'); return;
    }
    let group = '';
    items.forEach((c, i) => {
      if (!q && c.g !== group) {
        group = c.g;
        const h = document.createElement('li'); h.className = 'pal-group'; h.setAttribute('role', 'presentation'); h.textContent = group;
        listEl.appendChild(h);
      }
      const li = document.createElement('li');
      li.className = 'pal-item'; li.id = 'pal-' + i; li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      const span = document.createElement('span'); span.textContent = c.t; li.appendChild(span);
      const sm = document.createElement('small'); sm.textContent = c.hint || (q ? c.g : ''); li.appendChild(sm);
      li.addEventListener('pointermove', () => { if (active !== i) { active = i; mark(false); } });
      li.addEventListener('click', () => run(i));
      listEl.appendChild(li);
    });
    input.setAttribute('aria-activedescendant', 'pal-' + active);
  };
  const mark = scroll => {
    [...listEl.querySelectorAll('.pal-item')].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', 'pal-' + active);
    const el = listEl.querySelector('#pal-' + active);
    if (el && scroll) el.scrollIntoView({ block: 'nearest' });
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true; clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    input.value = ''; active = 0; render();
    wrap.hidden = false;
    if (site().lock) site().lock(true);
    requestAnimationFrame(() => { wrap.classList.add('open'); input.focus(); });
  };
  const close = (restore = true) => {
    if (!isOpen) return;
    isOpen = false;
    wrap.classList.remove('open');
    if (site().lock) site().lock(false);
    closeTimer = setTimeout(() => { wrap.hidden = true; }, 260);
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  const run = i => {
    const c = items[i]; if (!c) return;
    close(false);
    setTimeout(c.run, 120); // let the scroll lock release first so smooth-scroll works
  };

  input.addEventListener('input', () => { active = 0; render(); });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, items.length); mark(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % Math.max(1, items.length); mark(true); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }
  });
  wrap.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) close(); });
  if (trigger) trigger.addEventListener('click', open);
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen ? close() : open(); }
  });
})();
