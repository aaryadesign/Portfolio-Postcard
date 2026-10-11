// Leaves and frangipani drifting down from the tree overhead. Each one is painted once (top and underside),
// then falls the way real ones do: swinging like a pendulum, banking into each swing, flexing as the air
// pushes on it, sometimes rolling over, landing with a little slide, and later blown off by the wind.
window.Nature = (() => {
  const TAU = Math.PI * 2;
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // ---------- painting ----------

  const LEAVES = {
    // a glossy fig leaf
    fig: { aspect: 0.4, stalk: 0.13, veins: 9, angle: 0.95, reach: 0.15, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85),
      top: [[98, 44, 24], [104, 46, 22], [92, 42, 29]], under: [88, 22, 47], vein: [78, 42, 44], stalkCol: [80, 38, 34] },
    // a long mango leaf, darker, its veins almost square to the rib
    mango: { aspect: 0.25, stalk: 0.1, veins: 15, angle: 1.2, reach: 0.08, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 1.05),
      top: [[112, 38, 20], [118, 40, 18], [104, 36, 24]], under: [96, 18, 44], vein: [70, 40, 46], stalkCol: [20, 40, 34] },
    // a young leaf, lighter and thinner
    young: { aspect: 0.37, stalk: 0.12, veins: 8, angle: 0.9, reach: 0.16, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 0.8),
      top: [[86, 50, 38], [90, 52, 35], [80, 50, 42]], under: [80, 30, 58], vein: [76, 46, 50], stalkCol: [76, 40, 46] },
    // fallen a while ago: amber, browning at the edges, spotted
    dry: { aspect: 0.4, stalk: 0.13, veins: 9, angle: 0.95, reach: 0.15, dry: true, shape: (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85),
      top: [[40, 72, 44], [32, 70, 40], [26, 62, 36]], under: [36, 40, 58], vein: [42, 70, 60], stalkCol: [24, 45, 28] },
  };

  function leaf(kind, seed) {
    const K = LEAVES[kind], r = rng(seed);
    const W = 512, pad = 6, Lpx = (W - pad * 2) / (1 + K.stalk);
    const half = Lpx * K.aspect * 0.5, H = Math.ceil(half * 2 * 1.08 + pad * 2);
    const x0 = pad + K.stalk * Lpx, cy = H / 2;
    const bow = (r() - 0.5) * 0.05 * Lpx; // the midrib is never quite straight
    const asym = 1 + (r() - 0.5) * 0.14;
    const rib = (u) => cy + bow * Math.sin(Math.PI * u);
    const N = 90, nz = [];
    for (let i = 0; i <= N; i++) nz.push(1 + (r() - 0.5) * (K.dry ? 0.05 : 0.02));
    const edge = (u, side) => {
      const i = Math.round(u * N);
      return rib(u) + side * half * K.shape(u) * nz[i] * (side > 0 ? asym : 1 / asym);
    };
    const outline = (ctx) => {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const u = i / N; ctx.lineTo(x0 + u * Lpx, edge(u, -1)); }
      for (let i = N; i >= 0; i--) { const u = i / N; ctx.lineTo(x0 + u * Lpx, edge(u, 1)); }
      ctx.closePath();
    };
    // side veins are never evenly spaced or quite parallel
    const jit = [];
    for (let k = 0; k < K.veins * 2; k++) jit.push([(r() - 0.5) * 0.5, (r() - 0.5) * 0.25, r()]);
    const veinPath = (ctx, k, side) => {
      const j = jit[k * 2 + (side > 0 ? 1 : 0)];
      const us = 0.05 + (k + 0.5 + j[0]) * (0.88 / K.veins);
      const ue = Math.min(0.97, us + K.reach + 0.05 * j[2]);
      const ux = x0 + us * Lpx, ex = x0 + ue * Lpx;
      const ey = rib(ue) + (edge(ue, side) - rib(ue)) * (0.84 + 0.1 * j[2]);
      const a = K.angle + j[1];
      const cx = ux + Math.cos(a) * half * 0.5, cyy = rib(us) + side * Math.sin(a) * half * 0.55;
      ctx.beginPath(); ctx.moveTo(ux, rib(us)); ctx.quadraticCurveTo(cx, cyy, ex, ey);
    };

    function paint(under) {
      const c = canvas(W, H), ctx = c.getContext('2d');
      // the stalk
      const sc = K.stalkCol;
      ctx.lineCap = 'round';
      const sg = ctx.createLinearGradient(pad, 0, x0, 0);
      sg.addColorStop(0, hsl(sc[0], sc[1], sc[2] - 6)); sg.addColorStop(1, hsl(sc[0], sc[1], sc[2] + 8));
      ctx.strokeStyle = sg;
      for (let w = 7; w >= 3; w -= 2) {
        ctx.lineWidth = w * (Lpx / 420);
        ctx.beginPath(); ctx.moveTo(pad + 2, cy + bow * 0.4 + 3); ctx.quadraticCurveTo((pad + x0) / 2, cy + 2, x0 + 4, rib(0.01));
        ctx.stroke();
      }
      // the blade
      ctx.save(); outline(ctx); ctx.clip();
      const top = K.top, g = ctx.createLinearGradient(x0, 0, x0 + Lpx, 0);
      if (under) {
        const u = K.under;
        g.addColorStop(0, hsl(u[0], u[1], u[2] + 4)); g.addColorStop(1, hsl(u[0] - 4, u[1], u[2] - 2));
      } else top.forEach((t, i) => g.addColorStop(i / (top.length - 1), hsl(t[0] + (r() - 0.5) * 6, t[1], t[2])));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // darker toward the margins, as the blade thins and curls
      for (let i = 0; i < 2; i++) {
        ctx.save(); outline(ctx);
        ctx.lineWidth = K.dry ? 26 + i * 18 : 14 + i * 10;
        ctx.strokeStyle = K.dry ? hsl(20, 55, 22, under ? 0.18 : 0.38) : hsl(top[0][0] + 10, 50, 14, under ? 0.06 : 0.16);
        ctx.filter = `blur(${6 + i * 6}px)`; ctx.stroke(); ctx.restore();
      }
      ctx.filter = 'none';
      // mottling: no leaf is one flat colour
      for (let i = 0; i < 70; i++) {
        const x = x0 + r() * Lpx, y = cy + (r() - 0.5) * half * 2, rr = 6 + r() * 26;
        const light = r() < 0.5;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, rr);
        gg.addColorStop(0, K.dry ? (light ? hsl(46, 80, 60, 0.18) : hsl(22, 60, 26, 0.16)) : (light ? hsl(70, 60, 55, under ? 0.03 : 0.05) : hsl(120, 40, 12, under ? 0.03 : 0.07)));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      if (K.dry) {
        // rot creeping in from the margin
        for (let i = 0; i < 4; i++) {
          const u = 0.15 + r() * 0.75, side = r() < 0.5 ? -1 : 1, x = x0 + u * Lpx, y = edge(u, side), rr = 14 + r() * 26;
          ctx.filter = 'blur(5px)'; ctx.fillStyle = hsl(22, 55, 24, under ? 0.25 : 0.5);
          ctx.beginPath(); ctx.ellipse(x, y, rr * 1.3, rr, r() * 3, 0, TAU); ctx.fill();
        }
        // blotches: clusters of small irregular dots, a pale halo around each cluster
        for (let i = 0; i < 9; i++) {
          const x = x0 + (0.1 + r() * 0.85) * Lpx, y = cy + (r() - 0.5) * half * 1.3, rr = 3 + r() * 7;
          ctx.filter = 'blur(4px)'; ctx.fillStyle = hsl(46, 70, 60, under ? 0.15 : 0.3);
          ctx.beginPath(); ctx.arc(x, y, rr * 2.2, 0, TAU); ctx.fill();
          ctx.filter = 'blur(0.8px)';
          for (let j = 0; j < 7; j++) {
            ctx.fillStyle = hsl(18, 50, 16 + r() * 12, under ? 0.35 : 0.55 + r() * 0.3);
            ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * rr * 1.6, y + (r() - 0.5) * rr * 1.6, rr * (0.25 + r() * 0.5), rr * (0.2 + r() * 0.4), r() * 3, 0, TAU); ctx.fill();
          }
        }
        ctx.filter = 'none';
      }
      // the fine net of small veins
      const v = K.vein;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 260; i++) {
        const x = x0 + r() * Lpx, y = cy + (r() - 0.5) * half * 2;
        ctx.strokeStyle = hsl(v[0], v[1], v[2] + 10, under ? 0.16 : 0.07);
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 22, y + (r() - 0.5) * 22); ctx.stroke();
      }
      // side veins: pale, with a faint groove beside them on top, raised underneath
      for (let k = 0; k < K.veins; k++) for (const side of [-1, 1]) {
        const w = (under ? 2.4 : 1.5) * (1 - (k / K.veins) * 0.5) * (Lpx / 420);
        if (!under) {
          ctx.save(); ctx.translate(0, 1.2);
          veinPath(ctx, k, side); ctx.lineWidth = w * 1.8; ctx.strokeStyle = hsl(top[1][0] + 10, 45, 10, 0.12); ctx.stroke();
          ctx.restore();
        }
        veinPath(ctx, k, side); ctx.lineWidth = w;
        ctx.strokeStyle = under ? hsl(v[0], v[1] - 10, v[2] + 18, 0.5) : hsl(v[0], v[1], v[2], K.dry ? 0.32 : 0.3); ctx.stroke();
      }
      // the midrib, tapering to the tip
      for (let i = 0; i < 40; i++) {
        const u0 = i / 40, u1 = (i + 1) / 40;
        const w = ((under ? 7 : 4.5) * (1 - u0) + 0.8) * (Lpx / 420);
        ctx.lineWidth = w;
        ctx.strokeStyle = under ? hsl(v[0], v[1] - 6, v[2] + 22, 0.9) : hsl(v[0], v[1], v[2] + 2, 0.7);
        ctx.beginPath(); ctx.moveTo(x0 + u0 * Lpx, rib(u0)); ctx.lineTo(x0 + u1 * Lpx + 0.5, rib(u1)); ctx.stroke();
      }
      // speckle, the leaf's own grain
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,230,.05)' : 'rgba(0,20,0,.06)';
        ctx.fillRect(x0 + r() * Lpx, cy + (r() - 0.5) * half * 2, 1.2, 1.2);
      }
      ctx.restore();
      // a crisp, slightly darker rim
      outline(ctx); ctx.lineWidth = 1.1; ctx.strokeStyle = K.dry ? hsl(20, 50, 20, 0.6) : hsl(top[1][0], 40, 14, 0.45); ctx.stroke();
      return c;
    }
    // a couple of insect bites on the older ones
    const front = paint(false), back = paint(true);
    if (kind !== 'young' && r() < 0.55) {
      for (const c of [front, back]) {
        const ctx = c.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        const u = 0.3 + r() * 0.5, side = r() < 0.5 ? -1 : 1, x = x0 + u * Lpx, y = edge(u, side), rr = 6 + r() * 9;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.arc(x + rr * 0.9, y + side * rr * 0.1, rr * 0.7, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    return { front, back, aspect: H / W };
  }

  // a frangipani: five waxy petals overlapping like a pinwheel, yolk-yellow at the heart
  const FLOWERS = {
    white: { stops: [[0, '#e99a14'], [0.2, '#f6c33c'], [0.36, '#fbe49a'], [0.52, '#fff6dc'], [0.75, '#fffaf0'], [1, '#fffdf7']],
      under: [[0, '#d9cf86'], [0.3, '#f4eccd'], [1, '#fffaf0']], rim: 'rgba(190,150,90,.25)' },
    pink: { stops: [[0, '#ec8f16'], [0.18, '#f7b53a'], [0.3, '#f6a0a4'], [0.5, '#ec5d8c'], [0.8, '#d93a74'], [1, '#c92a68']],
      under: [[0, '#e8b46a'], [0.3, '#f2a3b8'], [1, '#e2709a']], rim: 'rgba(140,20,60,.3)' },
  };
  function flower(kind, seed) {
    const F = FLOWERS[kind], r = rng(seed);
    const S = 384, C = S / 2, L = S * 0.47, rot0 = r() * TAU;
    const petals = [];
    for (let i = 0; i < 5; i++) petals.push({ a: rot0 + (i / 5) * TAU + (r() - 0.5) * 0.12, l: L * (0.93 + r() * 0.08), w: 0.95 + r() * 0.12 });
    const petal = (ctx, p) => {
      ctx.save(); ctx.translate(C, C); ctx.rotate(p.a);
      const l = p.l, w = p.w;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(l * 0.12, -l * 0.26 * w, l * 0.38, -l * 0.58 * w, l * 0.74, -l * 0.47 * w);
      ctx.bezierCurveTo(l * 1.02, -l * 0.38 * w, l * 1.07, -l * 0.04, l * 0.92, l * 0.14 * w);
      ctx.bezierCurveTo(l * 0.74, l * 0.3 * w, l * 0.28, l * 0.14 * w, 0, 0);
      ctx.restore();
    };
    function paint(under) {
      const c = canvas(S, S), ctx = c.getContext('2d');
      const grad = () => {
        const g = ctx.createRadialGradient(C, C, 0, C, C, L);
        (under ? F.under : F.stops).forEach(([o, col]) => g.addColorStop(o, col));
        return g;
      };
      const one = (p, shadow) => {
        ctx.save();
        if (shadow) { ctx.shadowColor = 'rgba(110,70,20,.34)'; ctx.shadowBlur = S * 0.035; }
        petal(ctx, p); ctx.fillStyle = grad(); ctx.fill();
        ctx.restore();
        // a soft crease down the middle of each petal, and fine lines fanning out
        ctx.save(); petal(ctx, p); ctx.clip();
        ctx.translate(C, C); ctx.rotate(p.a);
        const cg = ctx.createLinearGradient(0, -p.l * 0.2, 0, p.l * 0.2);
        cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(0.55, 'rgba(150,110,60,.09)'); cg.addColorStop(1, 'rgba(255,255,255,.12)');
        ctx.fillStyle = cg; ctx.fillRect(0, -p.l * 0.6, p.l * 1.1, p.l * 1.2);
        ctx.lineWidth = 0.8;
        for (let k = 0; k < 9; k++) {
          const a = -0.42 + (k / 8) * 0.6;
          ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,.12)' : 'rgba(160,120,70,.06)';
          ctx.beginPath(); ctx.moveTo(p.l * 0.1, 0); ctx.quadraticCurveTo(p.l * 0.5, Math.sin(a) * p.l * 0.3, p.l * 0.95, Math.sin(a) * p.l * 0.55); ctx.stroke();
        }
        ctx.restore();
        ctx.save(); petal(ctx, p); ctx.lineWidth = 1; ctx.strokeStyle = F.rim; ctx.stroke(); ctx.restore();
      };
      petals.forEach((p) => one(p, true));
      // the first petal tucks over the last, closing the pinwheel
      ctx.save();
      ctx.beginPath(); ctx.moveTo(C, C); ctx.arc(C, C, S, petals[0].a - 1.45, petals[0].a + 0.05); ctx.closePath(); ctx.clip();
      one(petals[0], true);
      ctx.restore();
      if (!under) {
        const g = ctx.createRadialGradient(C, C, 0, C, C, S * 0.05);
        g.addColorStop(0, 'rgba(150,90,10,.9)'); g.addColorStop(1, 'rgba(230,150,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C, C, S * 0.05, 0, TAU); ctx.fill();
      }
      return c;
    }
    return { front: paint(false), back: paint(true), aspect: 1 };
  }

  // ---------- falling, landing, lying ----------

  // The page hands over, every frame, the things a leaf can come to rest on (the card, stamps, stickers,
  // title letters), each with its current shape and whether it is holding still. A leaf that lands on one
  // rides along with it; if it starts to move (the card being picked up), the leaf slides off onto the mat.
  // A quick swipe of the cursor knocks a leaf away; when too many are lying around, the wind slides one off.
  // Nothing ever fades out: leaves only ever leave by moving out of view.
  function create(scene) {
    const r = rng(7 + Math.floor(Math.random() * 1e6));
    const tex = (p) => ({ front: scene.texture(p.front), back: scene.texture(p.back), aspect: p.aspect });
    const leafKinds = [tex(leaf('fig', 11)), tex(leaf('fig', 23)), tex(leaf('mango', 5)), tex(leaf('young', 8)), tex(leaf('dry', 31)), tex(leaf('dry', 44))];
    const dryFrom = 4;
    const flowerKinds = [tex(flower('white', 3)), tex(flower('white', 9)), tex(flower('pink', 4))];
    const items = [];
    let nextAt = 3.8;
    const smooth = (t) => t * t * (3 - 2 * t);
    const wrap = (a) => a - TAU * Math.round(a / TAU);

    // where a falling thing is, relative to where it started, t seconds in
    function pose(f, t) {
      const th = f.w * t + f.ph, sw = Math.sin(th);
      // the swing heads off across the leaf's width, slowly turning as it turns
      const yaw = f.yaw0 + f.yawR * t + 0.25 * Math.sin(t * 0.7 + f.ph2);
      const psi = f.flower ? f.ph2 : yaw + f.across;
      const x = f.vx * t + Math.cos(psi) * f.amp * sw, y = f.vy * t + Math.sin(psi) * f.amp * sw;
      // a pendulum: it rises a touch at either end of each swing and drops fastest through the middle
      const z = f.z0 - f.vz * t + f.amp * 0.32 * sw * sw;
      const bank = f.tilt * (f.flower ? 1 : sw);
      const bdir = f.flower ? yaw * 0.9 + f.ph2 : psi;
      // bank so the leading edge of the swing rides high, expressed as the two tilts the shader applies
      const dl = bdir - yaw, sx = Math.cos(dl), sy = Math.sin(dl), sb = Math.sin(bank);
      let ax = Math.asin(clamp(sb * sy, -1, 1));
      const ay = Math.asin(clamp((-sb * sx) / Math.cos(ax), -1, 1));
      // now and then a leaf rolls right over
      if (f.rollAt) ax += TAU * smooth(clamp((t - f.rollAt) / 0.9));
      // the air bends it as it swings
      const q = f.flower
        ? [f.cup + f.flex * Math.sin(th * 2), f.cup + f.flex * Math.cos(th * 2), 0]
        : [f.curl + f.flex * Math.sin(2 * th + 0.5), f.cup + f.flex * 1.4 * Math.cos(th), f.twist * Math.sin(th + 1)];
      return { x, y, z, yaw, ax, ay, q, vx: f.vx + Math.cos(psi) * f.amp * f.w * Math.cos(th), vy: f.vy + Math.sin(psi) * f.amp * f.w * Math.cos(th) };
    }
    const restShape = (f) => (f.flower ? [f.cup, f.cup, 0] : [f.curl, f.cup, 0]);

    // ---- surfaces ----
    function toLocal(o, x, y) {
      const dx = x - o.pos[0], dy = y - o.pos[1], c = Math.cos(-o.rot[0]), s = Math.sin(-o.rot[0]);
      return [dx * c - dy * s, dx * s + dy * c];
    }
    function surface(o, s, t) {
      const p = scene.point(o, s, t), a = scene.point(o, s + 2, t), b = scene.point(o, s, t + 2);
      const u = [a[0] - p[0], a[1] - p[1], a[2] - p[2]], v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(...n) || 1;
      n = n.map((x) => x / l);
      if (n[2] < 0) n = n.map((x) => -x); // the card's back, once it is turned over
      return { p, n };
    }
    // the two tilts that lay something with this heading flat against a surface with normal n
    function orient(n, yaw) {
      const c = Math.cos(-yaw), s = Math.sin(-yaw);
      const nx = n[0] * c - n[1] * s, ny = n[0] * s + n[1] * c;
      return [Math.asin(clamp(-ny, -1, 1)), Math.atan2(nx, n[2])];
    }
    // the highest still thing under a point, or null for the mat itself
    function supportAt(c, x, y) {
      let best = null, bz = 0.05;
      for (const sp of c.supports) {
        if (!sp.stable || sp.obj.alpha === 0) continue;
        const [s, t] = toLocal(sp.obj, x, y), fit = (sp.fit || 0.96) / 2;
        if (Math.abs(s) > sp.obj.size[0] * fit || Math.abs(t) > sp.obj.size[1] * fit) continue;
        const z = scene.point(sp.obj, s, t)[2];
        if (z > bz) { bz = z; best = { sp, s, t }; }
      }
      return best;
    }

    // ---- touching down ----
    function land(f, t, c, P) {
      const slide = [P.vx * 0.12, P.vy * 0.12];
      const ex = P.x + slide[0], ey = P.y + slide[1];
      const hit = supportAt(c, ex, ey);
      f.state = 'rest';
      f.settle = { t0: t, ax: wrap(P.ax), ay: P.ay, q0: P.q };
      if (hit) {
        const rz = hit.sp.obj.rot[0], cc = Math.cos(-rz), ss = Math.sin(-rz);
        f.on = hit.sp.id; f.s = hit.s; f.t = hit.t; f.yawL = P.yaw - rz;
        f.settle.ds = [slide[0] * cc - slide[1] * ss, slide[0] * ss + slide[1] * cc];
      } else {
        f.on = null; f.s = ex; f.t = ey; f.yawL = P.yaw;
        f.settle.ds = slide;
      }
    }
    // where a lying leaf is now, following whatever it lies on
    function restPose(f, t, c, byId) {
      const k = clamp((t - f.settle.t0) / 0.55), e = easeOut(k), rock = (1 - k) * (1 - k) * Math.cos(k * 9);
      const s = f.s - f.settle.ds[0] * (1 - e), tt = f.t - f.settle.ds[1] * (1 - e);
      const q = f.settle.q0.map((v, i) => v + (restShape(f)[i] - v) * e);
      let pos, yaw, ax, ay, n = [0, 0, 1];
      if (f.on) {
        const sp = byId[f.on];
        if (!sp) return f.cur ? { ...f.cur, q } : null; // what it lies on is out of view: it waits there
        if (!sp.stable) return 'detach';
        const S = surface(sp.obj, s, tt);
        yaw = sp.obj.rot[0] + f.yawL;
        [ax, ay] = orient(S.n, yaw);
        pos = S.p.map((v, i) => v + S.n[i] * f.clear);
        n = S.n;
      } else {
        pos = [s, tt, f.clear]; yaw = f.yawL; ax = 0; ay = 0;
      }
      return { pos, yaw, ax: ax + f.settle.ax * rock, ay: ay + f.settle.ay * rock, q, n };
    }

    function spawn(t, c) {
      const isFlower = r() < 0.3;
      const unit = Math.min(c.vw, c.vh * 1.2);
      let f;
      if (isFlower) {
        const k = flowerKinds[Math.floor(r() * flowerKinds.length)];
        const d = unit * (0.07 + r() * 0.02);
        const spin = (r() < 0.5 ? -1 : 1) * (3.5 + r() * 3);
        f = { flower: true, k, w_: d, h: d, amp: 6 + r() * 8, tilt: 0.16 + r() * 0.14, z0: 380 + r() * 200, vz: 140 + r() * 40,
          yaw0: r() * TAU, yawR: spin, w: Math.abs(spin), ph: r() * TAU, ph2: r() * TAU, across: 0, cup: 1.1 / d, flex: 0.25 / d, gloss: 0.18, glossBack: 0.08 };
      } else {
        const ki = Math.floor(r() * leafKinds.length), k = leafKinds[ki], dry = ki >= dryFrom;
        const len = unit * (0.12 + r() * 0.05), wid = len * k.aspect;
        f = { k, w_: len, h: wid, w: TAU / (1.5 + r() * 0.9), amp: len * (0.3 + r() * 0.3), tilt: (dry ? 0.75 : 0.55) + r() * 0.3,
          z0: 380 + r() * 220, vz: 70 + r() * 35, yaw0: r() * TAU, yawR: (r() - 0.5) * 0.9, ph: r() * TAU, ph2: r() * TAU,
          across: Math.PI / 2 + (r() - 0.5) * 0.8, curl: (dry ? 0.5 : 0.25) / len, cup: (dry ? 0.9 : 0.5) / wid, flex: 0.12 / len, twist: ((r() - 0.5) * 1.2) / (len * wid) * 4,
          rollAt: r() < (dry ? 0.55 : 0.2) ? 0.8 + r() * 2.5 : 0, gloss: dry ? 0.05 : 0.32, glossBack: 0.04 };
      }
      f.vx = 18 + r() * 40; f.vy = (r() - 0.35) * 24;
      f.rest = 0.9; f.clear = 0.6 + r() * 1.4 + (f.flower ? 0.5 : 0);
      let T = 0;
      while (T < 20 && pose(f, T).z > f.rest) T += 0.02;
      f.T = T;
      if (f.rollAt && f.rollAt + 1.1 > T) f.rollAt = 0;
      // aim for anywhere in view; it will settle on whatever is there when it gets down
      const P = pose(f, T);
      const gx = c.cam + (r() - 0.5) * 0.92 * c.vw, gy = (c.camY || 0) + (r() - 0.5) * 0.92 * c.vh;
      f.ox = gx - P.x; f.oy = gy - P.y;
      f.born = t; f.state = 'air';
      items.push(f);
    }

    const inView = (c, x, y, m) => Math.abs(x - c.cam) < c.vw / 2 + m && Math.abs(y - (c.camY || 0)) < c.vh / 2 + m;

    // one step of everything; pushes what to draw onto `out`
    function step(t, dt, c, out) {
      const byId = {};
      for (const sp of c.supports) byId[sp.id] = sp;
      // kept sparse: a few at a time, now and then
      const cap = c.vw < 700 ? 4 : 6;

      if (t >= nextAt) {
        nextAt = t + 7 + r() * 6;
        const air = items.filter((f) => f.state === 'air').length;
        if (items.length >= cap) {
          // make room: forget one lying out of sight, or let the wind carry one off the mat
          const lying = items.filter((f) => f.state === 'rest' && f.cur);
          const gone = lying.find((f) => !inView(c, f.cur.pos[0], f.cur.pos[1], 200));
          if (gone) items.splice(items.indexOf(gone), 1);
          else {
            const old = lying.find((f) => !f.on);
            if (old) push(old, t, 260 + r() * 140, (r() - 0.4) * 60, true);
          }
        }
        if (air < 1 && items.length < cap) spawn(t, c);
      }

      // a quick swipe of the cursor knocks lying leaves aside
      const p = c.ptr;
      if (p && p.speed > 260) {
        for (const f of items) {
          if ((f.state !== 'rest' && f.state !== 'slide') || !f.cur || t - (f.pushAt || 0) < 0.2) continue;
          const d = Math.hypot(f.cur.pos[0] - p.x, f.cur.pos[1] - p.y);
          if (d < Math.max(f.w_, f.h) * 0.6) {
            const k = Math.min(1, 900 / p.speed) * 0.65;
            push(f, t, p.vx * k, p.vy * k, false);
          }
        }
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const f = items[i], e = t - f.born;
        let cur = null;
        if (f.state === 'air') {
          const P0 = pose(f, Math.min(e, f.T));
          const P = { ...P0, x: P0.x + f.ox, y: P0.y + f.oy };
          const hit = supportAt(c, P.x, P.y);
          const zs = hit ? scene.point(hit.sp.obj, hit.s, hit.t)[2] : 0;
          if (P.z <= zs + f.rest || e >= f.T) land(f, t, c, P);
          else cur = { pos: [P.x, P.y, P.z], yaw: P.yaw, ax: P.ax, ay: P.ay, q: P.q, alpha: clamp(e / 0.7) };
        }
        if (f.state === 'drop' || f.state === 'slide') {
          const m = f.m;
          if (f.state === 'drop') {
            m.vz -= 1500 * dt;
            m.z += m.vz * dt;
          }
          if (m.gust) { m.vx += 420 * dt; m.vy *= Math.exp(-dt * 0.5); } else if (f.state === 'slide') { m.vx *= Math.exp(-dt * 2.4); m.vy *= Math.exp(-dt * 2.4); }
          m.x += m.vx * dt; m.y += m.vy * dt;
          m.yaw += m.spin * dt; m.spin *= Math.exp(-dt * 1.8);
          m.ax *= Math.exp(-dt * 4); m.ay *= Math.exp(-dt * 4);
          const hit = supportAt(c, m.x, m.y);
          const zs = hit ? scene.point(hit.sp.obj, hit.s, hit.t)[2] : 0;
          const speed = Math.hypot(m.vx, m.vy);
          if (f.state === 'slide') {
            const zt = zs + f.clear + Math.min(14, speed * 0.025);
            // slid off the edge of something: it drops
            if (m.z - zt > 6) { f.state = 'drop'; m.vz = 0; } else m.z = zt;
          }
          if (m.gust && !inView(c, m.x, m.y, Math.max(f.w_, f.h))) { items.splice(i, 1); continue; }
          if ((f.state === 'drop' && m.z <= zs + f.clear) || (f.state === 'slide' && !m.gust && speed < 14)) {
            land(f, t, c, { x: m.x, y: m.y, z: m.z, vx: f.state === 'drop' ? m.vx : 0, vy: f.state === 'drop' ? m.vy : 0, yaw: m.yaw, ax: m.ax, ay: m.ay, q: m.q });
          } else cur = { pos: [m.x, m.y, m.z], yaw: m.yaw, ax: m.ax, ay: m.ay, q: m.q, alpha: 1 };
        }
        if (f.state === 'rest') {
          const R = restPose(f, t, c, byId);
          if (R === 'detach') {
            // what it was lying on is being picked up: it slides off, downhill, and drops to the mat
            const P = f.cur, n = P.n || [0, 0, 1], l = Math.hypot(n[0], n[1]);
            const dir = l > 0.05 ? [n[0] / l, n[1] / l] : [Math.cos(r() * TAU), Math.sin(r() * TAU)];
            f.state = 'drop'; f.on = null;
            f.m = { x: P.pos[0], y: P.pos[1], z: P.pos[2], vx: dir[0] * 130, vy: dir[1] * 130, vz: 40, yaw: P.yaw, ax: P.ax, ay: P.ay, q: P.q, spin: (r() - 0.5) * 3 };
            cur = { ...P, alpha: 1 };
          } else if (R) cur = { ...R, alpha: 1 };
        }
        if (cur) {
          f.cur = cur;
          out.push({
            mode: 2, quad: cur.q, pos: cur.pos, size: [f.w_, f.h], rot: [cur.yaw, cur.ax, cur.ay],
            texA: f.k.front, texB: f.k.back, alpha: cur.alpha, gloss: f.gloss, glossBack: f.glossBack,
          });
        }
      }
    }

    // set a lying leaf moving along the mat: knocked by the cursor, or carried off by the wind
    function push(f, t, vx, vy, gust) {
      const P = f.cur;
      if (!P) return;
      f.state = 'slide'; f.on = null; f.pushAt = t;
      f.m = { x: P.pos[0], y: P.pos[1], z: P.pos[2], vx, vy, vz: 0, yaw: P.yaw, ax: P.ax, ay: P.ay, q: P.q,
        spin: (r() < 0.5 ? -1 : 1) * Math.min(6, Math.hypot(vx, vy) * 0.006), gust };
    }

    return { step, drop() { nextAt = 0; } };
  }

  return { create, leaf, flower };
})();
