/* Boot-sequence loader. Plain JS so it runs before GSAP arrives. Shown once per session;
   script.js waits for the "loaded" event (or window.__loaded) before starting the hero intro. */
(() => {
  const root = document.documentElement;
  const el = document.getElementById('loader');
  const markLoaded = () => {
    root.classList.remove('loading');
    root.classList.add('loaded');
    window.__loaded = true;
    window.dispatchEvent(new Event('loaded'));
  };
  if (!el || !root.classList.contains('loading')) {
    if (el) el.remove();
    markLoaded();
    return;
  }
  try { sessionStorage.setItem('seen', '1'); } catch (e) {}

  const num = document.getElementById('ldNum');
  const bar = document.getElementById('ldBar');
  const log = document.getElementById('ldLog');
  const steps = [
    [0.02, 'booting hamid.dev'],
    [0.28, 'resolving kubernetes, go, python'],
    [0.52, 'spawning goroutines'],
    [0.76, 'warming caches'],
    [0.94, 'negotiating the rest']
  ];
  let shown = 0, ready = false, start = performance.now(), finished = false;
  const MIN = 2300;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const addLine = text => {
    const li = document.createElement('li');
    li.innerHTML = '<span>' + text + '</span><b>ok</b>';
    log.appendChild(li);
    requestAnimationFrame(() => li.classList.add('in'));
    // the previous line gets its "ok"
    const prev = log.children[log.children.length - 2];
    if (prev) prev.classList.add('done');
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    if (log.lastElementChild) log.lastElementChild.classList.add('done');
    el.classList.add('out');
    setTimeout(markLoaded, 520);
    setTimeout(() => el.remove(), 1500);
  };

  const tick = now => {
    const t = Math.min(1, (now - start) / MIN);
    const p = Math.min(ease(t), ready ? 1 : 0.92);
    num.textContent = String(Math.round(p * 100)).padStart(3, '0');
    bar.style.transform = 'scaleX(' + p + ')';
    while (shown < steps.length && p >= steps[shown][0]) addLine(steps[shown++][1]);
    if (p >= 1) setTimeout(finish, 180);
    else requestAnimationFrame(tick);
  };

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(r => addEventListener('load', r));
  Promise.all([fontsReady, loaded]).then(() => (ready = true));
  setTimeout(() => (ready = true), 5000); // never trap the visitor behind a slow CDN
  requestAnimationFrame(tick);
})();
