/* Hero background: a halftone dot field. Domain-warped noise sets each dot's size; the cursor drags a
   short capsule-shaped wake through it that swells the dots and tints them with the accent colour.
   Desktop pointers only, pauses offscreen, falls back to nothing if WebGL is unavailable. */
(() => {
  const canvas = document.getElementById('heroGL');
  if (!canvas) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) { canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) { canvas.remove(); return; }

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform float uCell; uniform float uEnergy;
uniform vec2 uA; uniform vec2 uB; uniform vec3 uInk; uniform vec3 uAcc;
float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y);
}
float segd(vec2 p, vec2 a, vec2 b){
  vec2 pa=p-a, ba=b-a;
  float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);
  return length(pa-ba*h);
}
void main(){
  vec2 f=gl_FragCoord.xy;
  vec2 c=(floor(f/uCell)+.5)*uCell;       // centre of this dot's cell
  vec2 q=c/uRes.y;
  float t=uTime*.045;
  float w=vnoise(q*2.6+vec2(t,-t));
  float n=vnoise(q*2.2+vec2(w*1.7,w*1.3)+vec2(-t*.6,t*.9));
  float base=smoothstep(.40,.88,n);
  float d=segd(c,uA,uB)/uRes.y;
  float k=exp(-pow(d/(.075+.085*uEnergy),2.));
  float r=clamp(base*.30+k*.52,0.,.5);
  float dist=length(f-c)/uCell;
  float aa=1.1/uCell;
  float a=(1.-smoothstep(r-aa,r+aa,dist))*step(.03,r);
  a*=mix(.17,1.,k);
  vec3 col=mix(uInk,uAcc,smoothstep(.15,.7,k));
  gl_FragColor=vec4(col*a,a);
}`;

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U('uRes'), time: U('uTime'), cell: U('uCell'), energy: U('uEnergy'), a: U('uA'), b: U('uB'), ink: U('uInk'), acc: U('uAcc') };
  gl.uniform3f(u.acc, 0.922, 0.302, 0.427); // #eb4d6d

  const setInk = () => {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if (light) gl.uniform3f(u.ink, 0.07, 0.07, 0.07); else gl.uniform3f(u.ink, 0.98, 0.97, 0.953);
  };
  setInk();
  new MutationObserver(setInk).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let dpr = 1, W = 0, H = 0;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.uniform2f(u.res, W, H);
    gl.uniform1f(u.cell, 15 * dpr);
  };
  resize();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  // pointer -> canvas pixel space (origin bottom-left). Two followers at different speeds form the wake.
  const FAR = -9999;
  let tx = FAR, ty = FAR, ax = FAR, ay = FAR, bx = FAR, by = FAR, energy = 0, seen = false;
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    tx = (e.clientX - r.left) * dpr;
    ty = (r.height - (e.clientY - r.top)) * dpr;
    if (!seen) { ax = bx = tx; ay = by = ty; seen = true; }
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  const t0 = Math.random() * 100;
  let raf = 0, last = performance.now(), shown = false;
  function loop() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (seen) {
      const px = ax, py = ay;
      ax += (tx - ax) * 0.22; ay += (ty - ay) * 0.22;
      bx += (ax - bx) * 0.075; by += (ay - by) * 0.075;
      const sp = Math.hypot(ax - px, ay - py) / dpr;
      energy += (Math.min(1, sp / 28) - energy) * 0.12;
    }
    gl.uniform1f(u.time, t0 + now / 1000);
    gl.uniform1f(u.energy, energy);
    gl.uniform2f(u.a, ax, ay);
    gl.uniform2f(u.b, bx, by);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!shown) { shown = true; canvas.classList.add('on'); }
    raf = requestAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); canvas.remove(); });
  loop();
})();
