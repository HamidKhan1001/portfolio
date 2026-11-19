/* "Lately": real GitHub activity, fetched in the visitor's browser.
   - Heatmap: GitHub has no public endpoint for the contribution calendar, so this uses a community
     proxy (github-contributions-api.jogruber.de). If it is down, only the feed shows.
   - Feed: GitHub's public events API. Unauthenticated limit is 60 requests/hour per visitor IP,
     so results are cached for 30 minutes in sessionStorage.
   If nothing loads, the whole section stays hidden. Everything from the network is inserted as text, never HTML. */
(() => {
  const USER = 'HamidKhan1001';
  const sec = document.getElementById('activity');
  if (!sec) return;
  const $ = id => document.getElementById(id);
  const heatCard = $('actHeat'), feed = $('feed');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getJSON = async (url, key) => {
    try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 30 * 60e3) return c.d; } catch (e) {}
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
      return d;
    } finally { clearTimeout(to); }
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmtDay = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const ago = iso => {
    const s = Math.max(1, (Date.now() - new Date(iso)) / 1000);
    const u = [[31536000, 'y'], [2592000, 'mo'], [86400, 'd'], [3600, 'h'], [60, 'm']];
    for (const [n, l] of u) if (s >= n) return Math.floor(s / n) + l + ' ago';
    return 'just now';
  };

  /* ---------- heatmap ---------- */
  const drawHeat = days => {
    const CELL = 11, GAP = 3, STEP = CELL + GAP, LEFT = 26, TOP = 18, NS = 'http://www.w3.org/2000/svg';
    const first = new Date(days[0].date + 'T00:00:00Z');
    const offset = first.getUTCDay();
    const cols = Math.ceil((offset + days.length) / 7);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${LEFT + cols * STEP} ${TOP + 7 * STEP}`);
    svg.setAttribute('aria-hidden', 'true');
    ['Mon', 'Wed', 'Fri'].forEach((d, i) => {
      const t = document.createElementNS(NS, 'text'); t.textContent = d;
      t.setAttribute('x', 0); t.setAttribute('y', TOP + (i * 2 + 1) * STEP + 9); svg.appendChild(t);
    });
    let lastLabelCol = -9;
    days.forEach((d, i) => {
      const idx = offset + i, col = Math.floor(idx / 7), row = idx % 7;
      const dt = new Date(d.date + 'T00:00:00Z');
      // label each month at the column holding its 1st (skip if it would crowd the previous label)
      if ((dt.getUTCDate() === 1 || i === 0) && col - lastLabelCol >= 3) {
        const t = document.createElementNS(NS, 'text'); t.textContent = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        t.setAttribute('x', LEFT + col * STEP); t.setAttribute('y', 9); svg.appendChild(t); lastLabelCol = col;
      }
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', LEFT + col * STEP); r.setAttribute('y', TOP + row * STEP);
      r.setAttribute('width', CELL); r.setAttribute('height', CELL); r.setAttribute('rx', 2.5);
      r.setAttribute('class', 'l' + Math.min(4, d.level || 0));
      r.style.setProperty('--c', col);
      const ti = document.createElementNS(NS, 'title');
      ti.textContent = `${d.count} contribution${d.count === 1 ? '' : 's'} on ${fmtDay(d.date)}`;
      r.appendChild(ti); svg.appendChild(r);
    });
    const host = $('heat'); host.textContent = ''; host.appendChild(svg);
    requestAnimationFrame(() => { host.scrollLeft = host.scrollWidth; }); // phones: land on "now"
  };

  const stats = days => {
    const total = days.reduce((s, d) => s + d.count, 0);
    let streak = 0, i = days.length - 1;
    if (days[i] && days[i].count === 0) i--; // today may not have happened yet
    for (; i >= 0 && days[i].count > 0; i--) streak++;
    const best = days.reduce((b, d) => (d.count > b.count ? d : b), days[0]);
    $('aTotal').textContent = total.toLocaleString('en-US');
    $('aStreak').textContent = streak + (streak === 1 ? ' day' : ' days');
    $('aBest').textContent = best.count ? `${best.count} · ${fmtDay(best.date)}` : '–';
    $('heat').setAttribute('aria-label', `${total} contributions in the last 12 months. Current streak ${streak} days.`);
  };

  /* ---------- feed ---------- */
  const toItems = events => {
    const out = [];
    for (const ev of events) {
      const repo = ev.repo && ev.repo.name || '', short = repo.startsWith(USER + '/') ? repo.slice(USER.length + 1) : repo;
      const p = ev.payload || {}, base = 'https://github.com/' + repo;
      let it = null;
      if (ev.type === 'PushEvent') {
        const n = p.size || (p.commits && p.commits.length) || 0;
        const msg = p.commits && p.commits.length ? p.commits[p.commits.length - 1].message.split('\n')[0] : '';
        it = { kind: 'Push', title: msg || (n ? `${n} commit${n === 1 ? '' : 's'}` : 'New commits'), url: base };
      } else if (ev.type === 'PullRequestEvent' && p.pull_request) {
        const merged = p.pull_request.merged;
        it = { kind: merged ? 'PR merged' : p.action === 'closed' ? 'PR closed' : 'PR ' + (p.action || 'opened'), title: p.pull_request.title, url: p.pull_request.html_url };
      } else if (ev.type === 'IssuesEvent' && p.issue) {
        it = { kind: 'Issue ' + (p.action || 'opened'), title: p.issue.title, url: p.issue.html_url };
      } else if (ev.type === 'CreateEvent' && p.ref_type === 'repository') {
        it = { kind: 'New repo', title: short, url: base };
      } else if (ev.type === 'ForkEvent') {
        it = { kind: 'Fork', title: short, url: base };
      }
      if (!it) continue;
      it.repo = short; it.when = ev.created_at;
      const prev = out[out.length - 1];
      if (prev && prev.kind === it.kind && prev.repo === it.repo && it.kind === 'Push') continue; // collapse push runs
      out.push(it);
      if (out.length === 5) break;
    }
    return out;
  };
  const drawFeed = items => {
    feed.textContent = '';
    items.forEach(it => {
      const li = el('li'), a = el('a');
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      const left = el('span', 'af-main');
      left.appendChild(el('span', 'kind', `${it.kind} · ${it.repo}`));
      left.appendChild(el('span', 'what', it.title));
      a.appendChild(left);
      const t = el('time', null, ago(it.when)); t.dateTime = it.when; a.appendChild(t);
      li.appendChild(a); feed.appendChild(li);
    });
  };

  /* ---------- go ---------- */
  Promise.allSettled([
    getJSON(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`, 'act-heat'),
    getJSON(`https://api.github.com/users/${USER}/events/public?per_page=40`, 'act-feed')
  ]).then(([h, f]) => {
    let shown = false;
    if (h.status === 'fulfilled' && h.value && Array.isArray(h.value.contributions) && h.value.contributions.length) {
      const days = h.value.contributions.filter(d => d.date).sort((a, b) => (a.date < b.date ? -1 : 1));
      if (days.length) { drawHeat(days); stats(days); heatCard.hidden = false; shown = true; }
    }
    if (f.status === 'fulfilled' && Array.isArray(f.value)) {
      const items = toItems(f.value);
      if (items.length) { drawFeed(items); feed.hidden = false; shown = true; }
    }
    if (!shown) return; // nothing real to show: leave the section out entirely
    if (heatCard.hidden || feed.hidden) sec.querySelector('.act-grid').classList.add('solo');
    sec.hidden = false;
    if (window.gsap && window.ScrollTrigger && !reduce) {
      const parts = [heatCard, feed].filter(n => !n.hidden);
      gsap.from(parts, { y: 48, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: sec, start: 'top 80%', once: true } });
      ScrollTrigger.refresh();
    }
  });
})();
