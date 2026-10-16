// The 404: the same mat and the same postcard as the portfolio, lying back up, addressed to a page that
// isn't there. It takes the cursor the way the postcard does (the side under it dips, the light moves),
// the button on it goes home, and anywhere else on it gets a RETURN TO SENDER stamp.
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const raf = /[?&]tick/.test(location.search) ? (f) => setTimeout(() => f(performance.now()), 16) : (f) => requestAnimationFrame(f);

  const cvs = document.getElementById('scene');
  let scene = null;
  try { scene = Scene.create(cvs); } catch (e) { console.error(e); }
  if (!scene) return;
  document.body.classList.add('gl');

  const COLORS = { base: [0.98, 0.83, 0.835], dye: [0.8, 0.1, 0.18] };
  const today = new Date();
  const DATE = [`${today.toLocaleString('en', { month: 'short' }).toUpperCase()} ${today.getDate()}`, String(today.getFullYear())];
  let path = location.pathname;
  try { path = decodeURI(path); } catch (e) {}

  let vw = 0, vh = 0, dpr = 1, portrait = false, cw = 0, ch = 0;
  let art = null, work = null, tex = null, front = null, key = '', go = null;
  let stampImg = null, photo = null, photoDone = false, fontsReady = false, startAt = 0;
  const inks = [];

  function layout() {
    vw = innerWidth; vh = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    portrait = vw < vh * 0.85;
    if (portrait) {
      cw = Math.min(vw * 0.88, 480); ch = cw * 1.42;
      if (ch > vh * 0.8) { ch = vh * 0.8; cw = ch / 1.42; }
    } else {
      cw = clamp(Math.min(vw * 0.6, vh * 0.72 * 1.5), 300, 860); ch = cw / 1.5;
    }
    const Lm = Math.max(vw, vh), B = [], K = [];
    const add = (x, y, a, len, blur, seed, bend) => B.push([x, y, a, len, blur, seed, bend, 0]);
    if (portrait) {
      add(vw / 2 + 60, -vh / 2 - 60, 2.2, vh * 0.42, 10, 1.3, 0.05);
      add(-vw / 2 - 50, vh / 2 + 40, -0.9, vh * 0.34, 14, 4.1, 0.06);
      K.push([vw / 2 + 50, -vh / 2 - 20, 170, 0]);
    } else {
      add(vw / 2 + 70, -vh / 2 - 90, 2.3, Math.max(620, Lm * 0.52), 10, 1.3, 0.05);
      add(vw / 2 + 90, vh * 0.1, 3.1, Math.max(420, Lm * 0.34), 17, 2.7, -0.07);
      add(-vw / 2 - 70, vh / 2 + 70, -0.8, Math.max(460, Lm * 0.36), 14, 4.1, 0.06);
      K.push([vw / 2 + 30, -vh / 2 - 10, Math.max(300, Lm * 0.26), 0]);
    }
    scene.resize(vw, vh, dpr, vw, vh);
    scene.branches(B, K);
    build();
  }

  // RETURN TO SENDER, in red ink with the rubber's gaps in it (in card units)
  function rubber(seed, W) {
    const rand = Print.rng(seed), K = 3, H = W * 0.35, s = W / 300;
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K);
    x.strokeStyle = x.fillStyle = '#c8283a';
    x.lineWidth = 5 * s; x.strokeRect(4 * s, 4 * s, W - 8 * s, H - 8 * s);
    x.lineWidth = 1.6 * s; x.strokeRect(12 * s, 12 * s, W - 24 * s, H - 24 * s);
    x.textAlign = 'center';
    x.font = `800 ${30 * s}px 'Geist', sans-serif`; x.fillText('RETURN TO SENDER', W / 2, 54 * s, W - 44 * s);
    x.font = `700 ${14 * s}px 'Geist', sans-serif`;
    const t = 'ADDRESS UNKNOWN', sp = 3.2 * s;
    let w = -sp; for (const chr of t) w += x.measureText(chr).width + sp;
    let cx = W / 2 - w / 2; x.textAlign = 'left';
    for (const chr of t) { x.fillText(chr, cx, 80 * s); cx += x.measureText(chr).width + sp; }
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { x.globalAlpha = 0.3 + rand() * 0.7; x.beginPath(); x.arc(rand() * W, rand() * H, rand() * 1.4 * s, 0, Math.PI * 2); x.fill(); }
    const gx = rand() * W, gy = rand() * H, gr = x.createRadialGradient(gx, gy, 0, gx, gy, 120 * s);
    gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 1; x.fillStyle = gr; x.fillRect(0, 0, W, H);
    return c;
  }

  // the card as printed, with every stamp on it so far
  function paint() {
    const k = work.width / 1000, ctx = work.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(art.canvas, 0, 0);
    ctx.scale(k, k);
    ctx.globalCompositeOperation = 'multiply';
    for (const s of inks) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.globalAlpha = 0.88;
      ctx.drawImage(s.c, -s.w / 2, -s.w * 0.175, s.w, s.w * 0.35);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (tex) scene.upload(tex, work);
  }

  function build() {
    if (!fontsReady || !stampImg || !photoDone) return;
    const TW = Math.round(clamp(cw * dpr * 1.35, 1024, 2048));
    const k2 = `${portrait}|${TW}|${Math.round((ch / cw) * 100)}`;
    if (k2 === key) return;
    key = k2;
    const mark = Print.lostMark(portrait, DATE);
    const cover = Print.coverStamp(portrait, mark, stampImg);
    art = Print.lost({ cw, ch, TW, portrait, cover, mark, path });
    work = document.createElement('canvas'); work.width = art.canvas.width; work.height = art.canvas.height;
    if (tex) scene.gl.deleteTexture(tex);
    if (front) scene.gl.deleteTexture(front);
    tex = null;
    paint();
    tex = scene.texture(work);
    front = scene.texture(Print.front(cw, ch, TW, photo));
    // the button, as a sticker in card units
    const b = art.button, g = Print.goSticker(b.label, b.w, b.h);
    if (go) scene.gl.deleteTexture(go.tex);
    go = { tex: scene.texture(g.canvas), w: g.w * cw / 1000, h: g.h * cw / 1000, x: b.x + b.w / 2, y: b.y + b.h / 2 };
    // stamps keep their place on the card through a resize, but the first lands over the address
    if (!startAt) startAt = performance.now();
  }

  // stamp the card at a point on it, in card units
  let thudAt = -1e9, firstDone = false;
  function press(x, y, r) {
    const W = portrait ? 520 : 330;
    inks.push({ x, y, r, w: W, c: rubber(inks.length * 97 + 11, W) });
    if (inks.length > 8) inks.shift();
    paint();
    thudAt = performance.now();
  }

  // assets
  const img = new Image();
  img.onload = () => { stampImg = img; build(); };
  img.src = 'stamps/404.webp';
  const ph = new Image();
  ph.onload = () => { photo = ph; photoDone = true; build(); };
  ph.onerror = () => { photoDone = true; build(); };
  ph.src = 'aarya.jpg';
  document.fonts.load("700 30px 'Geist'").then(() => document.fonts.load("400 30px 'Yellowtail'")).then(() => document.fonts.load("500 10px 'Geist Mono'")).finally(() => document.fonts.ready.then(() => { fontsReady = true; build(); }));

  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  layout();

  // the cursor drags the cloth along with it, as on the portfolio
  const ptr = { x: -1, y: -1, speed: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0 };
  const trail = [];
  addEventListener('pointermove', (e) => {
    const now = performance.now(), dt = Math.max(8, now - ptr.lt);
    if (ptr.lt && now - ptr.lt < 200) {
      const vx = ((e.clientX - ptr.lx) / dt) * 1000, vy = ((e.clientY - ptr.ly) / dt) * 1000;
      ptr.vx += (vx - ptr.vx) * 0.5; ptr.vy += (vy - ptr.vy) * 0.5;
      ptr.speed = Math.max(ptr.speed, Math.hypot(vx, vy));
    } else { ptr.vx = ptr.vy = 0; }
    ptr.lx = ptr.x = e.clientX; ptr.ly = ptr.y = e.clientY; ptr.lt = now; ptr.touch = e.pointerType === 'touch';
    const wx = e.clientX - vw / 2, wy = e.clientY - vh / 2, lastP = trail[trail.length - 1];
    if (!lastP || Math.hypot(wx - lastP.x, wy - lastP.y) > 14 || now - lastP.t > 60) {
      trail.push({ x: wx, y: wy, vx: ptr.vx, vy: ptr.vy, t: now });
      if (trail.length > 12) trail.shift();
    }
  });
  document.addEventListener('pointerleave', () => { ptr.x = -1; });
  const drags = new Float32Array(48), dragR = new Float32Array(12);

  // pointer on the card, -0.5..0.5 when inside
  const CARD_R = 0.02;
  let cardZ = 56;
  function onCard(px = ptr.x, py = ptr.y) {
    if (px < 0) return null;
    const k = Scene.D / (Scene.D - cardZ);
    const dx = (px - vw / 2) / k, dy = (py - vh / 2) / k;
    const c = Math.cos(-CARD_R), s = Math.sin(-CARD_R);
    const u = (dx * c - dy * s) / cw, v = (dx * s + dy * c) / ch;
    return Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5 ? [u, v] : null;
  }
  const toUnits = (q) => [(q[0] + 0.5) * 1000, (q[1] + 0.5) * art.H];
  const onButton = (q) => {
    if (!q || !art) return false;
    const [x, y] = toUnits(q), b = art.button;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  };

  cvs.addEventListener('click', (e) => {
    const q = onCard(e.clientX, e.clientY);
    if (!q || !art) return;
    if (onButton(q)) { goState.at = performance.now(); setTimeout(() => { location.href = '/'; }, 380); return; }
    const [x, y] = toUnits(q);
    press(x, y, (Math.random() - 0.5) * 0.6);
  });

  // the sticker: a corner lifts when you point at it, a tap peels it right up, then it takes you home
  const goState = { a: 0, at: -1e9 };
  function surfaceAt(o, si, t) {
    const p = scene.point(o, si, t), a = scene.point(o, si + 2, t), b = scene.point(o, si, t + 2);
    const u = [a[0] - p[0], a[1] - p[1], a[2] - p[2]], v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n);
    return { p, n: n.map((x) => x / l) };
  }
  function orient(n, yaw) {
    const c = Math.cos(-yaw), sn = Math.sin(-yaw);
    return [Math.asin(clamp(-(n[0] * sn + n[1] * c), -1, 1)), Math.atan2(n[0] * c - n[1] * sn, n[2])];
  }

  const fall = Nature.create(scene);
  const hover = { z: 0, rx: 0, ry: 0, bow: 0 };
  let last = performance.now(), gust = 1, kappa = 0, kappaV = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!tex) { raf(frame); return; }
    document.body.classList.add('on');

    // the welcome: the camera comes down while the card floats down onto the mat, back up
    const wt = (now - startAt) / 1000;
    const wz = ease(clamp(wt / 2.4));
    const zoom = lerp(0.42, 1, wz), spin = -0.12 * (1 - wz);
    const it = clamp(wt / 2.2), intro = 1 - easeOut(it);
    if (!firstDone && wt > 2.5) {
      firstDone = true;
      press(art.address.x, art.address.y + (portrait ? 30 : 20), -0.2);
    }

    // the press of the cursor: the side under it dips, the far side lifts, the plastic bows
    const q = it >= 1 && !ptr.touch ? onCard() : null;
    const kk = 1 - Math.exp(-dt * 8);
    hover.z += ((q ? 14 : 0) - hover.z) * kk;
    hover.rx += ((q ? -q[1] * 0.3 : 0) - hover.rx) * kk;
    hover.ry += ((q ? -q[0] * 0.34 : 0) - hover.ry) * kk;
    hover.bow += ((q ? 1 : 0) - hover.bow) * kk;
    cvs.style.cursor = onButton(q) ? 'pointer' : q ? 'crosshair' : '';

    // a stamp coming down knocks the card flat for a moment
    const ts = (now - thudAt) / 1000, thud = ts < 0.5 ? Math.sin(Math.min(ts / 0.08, 1) * Math.PI / 2) * Math.exp(-ts * 9) : 0;
    const kTarget = (-hover.bow * 0.3 + intro * (0.6 + 0.4 * Math.sin(wt * 3.1)) + thud * 0.5) / cw;
    kappaV += ((kTarget - kappa) * 130 - kappaV * 13) * dt;
    kappa += kappaV * dt;
    const card = {
      mode: 1, pos: [intro * 70 * Math.sin(wt * 1.9), -intro * 40, 0], size: [cw, ch],
      rot: [CARD_R - intro * 0.55, hover.rx * 0.6 + intro * 0.25 * Math.sin(wt * 2.3), hover.ry * 0.6 + intro * 0.2 * Math.cos(wt * 1.7)], bend: [Math.PI, kappa],
      texA: front, texB: tex, gloss: 0.55, glossBack: 0.18, sheen: 0.14,
    };
    let zmin = Infinity;
    for (let i = 0; i <= 12; i++) for (const t of [-0.5, 0.5]) zmin = Math.min(zmin, scene.point(card, (i / 12 - 0.5) * cw, t * ch)[2]);
    card.pos[2] = Math.max(55 + intro * 900 + hover.z * 0.6 - thud * 30, -zmin + 1.5);
    cardZ = card.pos[2];
    const objects = [card];
    {
      const over = onButton(q), want = now - goState.at < 420 ? 1 : over ? 0.4 : 0;
      goState.a += (want - goState.a) * (1 - Math.exp(-dt * (want > goState.a ? 14 : 7)));
      // the back is face up, so across the card runs the other way
      const S = surfaceAt(card, -(go.x / 1000 - 0.5) * cw, (go.y / art.H - 0.5) * ch);
      S.n = S.n.map((v) => -v);
      const [ax, ay] = orient(S.n, CARD_R), up = 2 + goState.a * 40;
      objects.push({
        pos: S.p.map((v, m) => v + S.n[m] * up), size: [go.w, go.h], rot: [CARD_R + goState.a * 0.1, ax, ay],
        bend: [-0.55 * goState.a, (3 * goState.a) / go.w - kappa], texA: go.tex, gloss: 0.3, sheen: 0.12, alpha: clamp((wt - 0.2) / 0.4),
      });
    }
    const supports = [{ id: 'card', obj: card, stable: it >= 1 && thud < 0.01 }];

    const tt = now / 1000;
    const moving = ptr.x >= 0 && now - ptr.lt < 80;
    const hand = moving ? { x: ptr.x - vw / 2, y: ptr.y - vh / 2, vx: ptr.vx, vy: ptr.vy, speed: Math.hypot(ptr.vx, ptr.vy) } : null;
    fall.step(tt, dt, { cam: 0, camY: 0, vw, vh, supports, ptr: it >= 1 ? hand : null }, objects);
    objects.sort((a, b) => a.pos[2] - b.pos[2]);

    while (trail.length && now - trail[0].t > 1600) trail.shift();
    drags.fill(0); dragR.fill(1);
    trail.forEach((p, i) => {
      const age = (now - p.t) / 1000;
      const k = Math.min(1, age / 0.05) * Math.exp(-age / 0.42) * Math.cos(age * 5.5);
      let ax = p.vx * 0.012, ay = p.vy * 0.012;
      const m = Math.hypot(ax, ay);
      if (m > 14) { ax *= 14 / m; ay *= 14 / m; }
      drags.set([p.x, p.y, ax * k, ay * k], i * 4);
      dragR[i] = 55 + age * 50;
    });
    ptr.speed *= Math.exp(-dt * 2.5);
    const gg = 0.85 + 0.3 * Math.sin(tt * 0.21) * Math.sin(tt * 0.13 + 2) + Math.min(ptr.speed / 1800, 1.1);
    gust += (gg - gust) * (1 - Math.exp(-dt * 1.5));
    scene.render({ cam: 0, camY: 0, time: tt, gust, soft: 1.25, drags, dragR, colors: COLORS, objects, zoom, spin });
    raf(frame);
  }
  raf(frame);
})();
