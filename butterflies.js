// Butterflies over the mat. Each is two painted wings hinged on a body, flapping as it goes; they wander
// about the part of the mat in view, now and then land on something lying on it (a stamp, a card, the
// sheet) and sit opening and closing their wings, and take off again when the cursor comes near.
window.Butterflies = (() => {
  const TAU = Math.PI * 2;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // the kinds: wing colour, the dark of the edges and veins, and the spots along the edge
  const KINDS = [
    { fill: '#f08a1c', fill2: '#f5a640', edge: '#1a1310', vein: '#1a1310', dots: '#fff8e8' }, // a monarch
    { fill: '#f6dc48', fill2: '#fbe982', edge: '#6b5a14', vein: '#a8902a', dots: null, spot: '#e8721c' }, // a brimstone
    { fill: '#4f86d9', fill2: '#8fb6ee', edge: '#141a2e', vein: '#2a4a8a', dots: '#e8f0ff' }, // a blue
    { fill: '#f6f2e6', fill2: '#ffffff', edge: '#2a2622', vein: '#c9c2b0', dots: null, spot: '#2a2622' }, // a cabbage white
  ];
  const WW = 64, WH = 96, K = 3;
  // one wing, hinge at the left edge: the forewing up and out, the hindwing rounder below it
  function wing(kind, mirror) {
    const c = canvas(WW * K, WH * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    if (mirror) { ctx.translate(WW, 0); ctx.scale(-1, 1); }
    const fore = new Path2D(), hind = new Path2D();
    fore.moveTo(1, 44); fore.bezierCurveTo(8, 18, 34, 2, 58, 6); fore.bezierCurveTo(64, 20, 56, 40, 40, 50); fore.bezierCurveTo(26, 54, 10, 52, 1, 48); fore.closePath();
    hind.moveTo(1, 48); hind.bezierCurveTo(22, 50, 46, 56, 44, 72); hind.bezierCurveTo(42, 86, 22, 94, 10, 88); hind.bezierCurveTo(2, 80, 0, 64, 1, 48); hind.closePath();
    for (const [p, cx, cy] of [[hind, 6, 56], [fore, 6, 44]]) {
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 60);
      g.addColorStop(0, kind.fill2); g.addColorStop(1, kind.fill);
      ctx.fillStyle = g; ctx.fill(p);
      // veins fanning out from the body
      ctx.save(); ctx.clip(p);
      ctx.strokeStyle = kind.vein; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = (p === fore ? -0.95 : 0.1) + i * 0.24;
        ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.quadraticCurveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24 + 4, cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // a dark border
      ctx.lineWidth = kind.dots ? 9 : 3.5; ctx.strokeStyle = kind.edge; ctx.stroke(p);
      ctx.restore();
    }
    if (kind.dots) {
      ctx.fillStyle = kind.dots;
      for (const [x, y, r] of [[54, 10, 1.4], [58, 18, 1.2], [56, 28, 1.3], [50, 40, 1.1], [42, 48, 1], [42, 66, 1.3], [40, 78, 1.2], [30, 87, 1.2], [18, 89, 1.1]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    }
    if (kind.spot) { ctx.fillStyle = kind.spot; ctx.beginPath(); ctx.arc(34, 30, 3, 0, TAU); ctx.fill(); }
    return c;
  }
  // the body, with its two antennae
  function body() {
    const w = 24, h = 52, c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    ctx.strokeStyle = '#1a1310'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(12, 14); ctx.quadraticCurveTo(12 + d * 3, 6, 12 + d * 8, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(12 + d * 8, 1.8, 1.3, 0, TAU); ctx.fillStyle = '#1a1310'; ctx.fill();
    }
    ctx.fillStyle = '#231a14';
    ctx.beginPath(); ctx.ellipse(12, 15, 3.2, 3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, 23, 3.4, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12, 38, 2.6, 11, 0, 0, TAU); ctx.fill();
    return c;
  }

  function create(scene) {
    const tex = KINDS.map((k) => ({ R: scene.texture(wing(k, false)), L: scene.texture(wing(k, true)) }));
    const bodyTex = scene.texture(body());
    const flock = [];
    let u = 1;

    function spawn(b, c, edge) {
      b.kind = Math.floor(Math.random() * KINDS.length);
      if (edge) {
        // coming in from just outside one side of the view
        const side = Math.floor(Math.random() * 4), hw = c.vw * 0.5 * c.zv + 60, hh = c.vh * 0.5 * c.zv + 60;
        b.x = c.cam + (side === 0 ? -hw : side === 1 ? hw : rnd(-hw, hw));
        b.y = c.camY + (side === 2 ? -hh : side === 3 ? hh : rnd(-hh, hh));
      } else { b.x = c.cam + rnd(-0.4, 0.4) * c.vw; b.y = c.camY + rnd(-0.4, 0.4) * c.vh; }
      b.z = rnd(90, 170); b.vx = 0; b.vy = 0; b.h = rnd(0, TAU);
      b.state = 'fly'; b.phase = rnd(0, TAU); b.until = 0; b.land = null; b.flap = 0.6;
      aim(b, c);
    }
    // somewhere new to go: a spot on the mat, or now and then something to land on
    function aim(b, c) {
      b.land = null;
      if (Math.random() < 0.45) {
        const ok = c.supports.filter((s) => s.stable && s.obj.size && /^(p\d+$|q\d+$|cover$|card$|sheet$|foot$|tt$|c\d+$)/.test(s.id)
          && Math.abs(s.obj.pos[0] - c.cam) < c.vw * 0.42 && Math.abs(s.obj.pos[1] - c.camY) < c.vh * 0.42);
        if (ok.length) {
          const s = ok[Math.floor(Math.random() * ok.length)];
          b.land = { id: s.id, s: rnd(-0.32, 0.32), t: rnd(-0.32, 0.32) };
        }
      }
      b.tx = c.cam + rnd(-0.42, 0.42) * c.vw; b.ty = c.camY + rnd(-0.38, 0.38) * c.vh;
      b.until = c.t + rnd(3, 7);
    }
    function takeOff(b, c, away) {
      b.state = 'fly'; b.land = null;
      if (away) { b.vx = away[0] * 300; b.vy = away[1] * 300; b.z += 10; }
      aim(b, c);
      b.land = null;
    }

    // c: { t, dt, cam, camY, vw, vh, zv, supports, ptr: {x, y, moving} | null, surfaceAt, toScreen, on }
    function step(c, out) {
      const want = c.on ? 1 : 0;
      u = c.vw < 700 ? 0.85 : 1;
      while (flock.length < want) { const b = {}; spawn(b, c, flock.length > 0); flock.push(b); }
      if (!want) return;
      const byId = {};
      for (const s of c.supports) byId[s.id] = s;
      for (const b of flock) {
        // gone far out of view (the page moved on): come back in from the edge
        if (Math.abs(b.x - c.cam) > c.vw * 0.5 * c.zv + 500 || Math.abs(b.y - c.camY) > c.vh * 0.5 * c.zv + 500) spawn(b, c, true);
        const sp = c.ptr ? c.toScreen([b.x, b.y, b.z]) : null;
        const near = sp && Math.hypot(sp[0] - c.ptr.x, sp[1] - c.ptr.y) < 110 * u;
        if (b.state === 'sit') {
          const s = byId[b.land.id];
          if (!s || !s.stable || c.t > b.until || (near && c.ptr.moving)) {
            const d = sp && c.ptr ? [sp[0] - c.ptr.x, sp[1] - c.ptr.y] : [rnd(-1, 1), rnd(-1, 1)], l = Math.hypot(...d) || 1;
            takeOff(b, c, [d[0] / l, d[1] / l]);
          } else {
            const S = c.surfaceAt(s.obj, b.land.s * s.obj.size[0], b.land.t * s.obj.size[1]);
            b.x = S.p[0]; b.y = S.p[1]; b.z = S.p[2] + 2;
            // basking: wings mostly open, folding up now and then
            const k = Math.sin(c.t * 1.1 + b.phase);
            b.flap = 0.12 + 1.05 * Math.pow(Math.max(0, k), 3);
          }
        }
        if (b.state === 'fly') {
          if (near && c.ptr.moving && sp) {
            // shooed: away from the cursor, quickly
            const d = [sp[0] - c.ptr.x, sp[1] - c.ptr.y], l = Math.hypot(...d) || 1;
            b.vx += (d[0] / l) * 900 * c.dt; b.vy += (d[1] / l) * 900 * c.dt;
            b.land = null;
          }
          let tx = b.tx, ty = b.ty, tz = 120;
          const s = b.land && byId[b.land.id];
          if (b.land && !s) b.land = null;
          if (s) {
            const S = c.surfaceAt(s.obj, b.land.s * s.obj.size[0], b.land.t * s.obj.size[1]);
            tx = S.p[0]; ty = S.p[1];
            const d = Math.hypot(tx - b.x, ty - b.y);
            tz = S.p[2] + 2 + Math.min(120, d * 0.5);
            if (d < 6 && b.z - (S.p[2] + 2) < 8) { b.state = 'sit'; b.until = c.t + rnd(4, 10); b.vx = b.vy = 0; }
          } else if (Math.hypot(tx - b.x, ty - b.y) < 40 || c.t > b.until) aim(b, c);
          // an unsteady way of going: always a little sideways, bobbing with each beat
          const dx = tx - b.x, dy = ty - b.y, l = Math.hypot(dx, dy) || 1, speed = s ? Math.min(150, 40 + l) : 150;
          const wob = Math.sin(c.t * 2.3 + b.phase) * 0.7 + Math.sin(c.t * 3.7 + b.phase * 2) * 0.4;
          const dvx = (dx / l) * speed - (dy / l) * wob * 70, dvy = (dy / l) * speed + (dx / l) * wob * 70;
          b.vx += (dvx - b.vx) * clamp(c.dt * 2.2); b.vy += (dvy - b.vy) * clamp(c.dt * 2.2);
          b.x += b.vx * c.dt; b.y += b.vy * c.dt;
          b.phase += c.dt * TAU * 5.5;
          b.z += (tz + Math.sin(b.phase) * 6 - b.z) * clamp(c.dt * 3);
          // every few beats a short glide, wings held half open
          const glide = Math.sin(c.t * 0.9 + b.phase * 0.02) > 0.75;
          b.flap = glide ? 0.35 : 0.2 + 0.6 * (1 + Math.sin(b.phase));
        }
        if (Math.hypot(b.vx, b.vy) > 8) {
          const h = Math.atan2(b.vx, -b.vy);
          let d = h - b.h; d = Math.atan2(Math.sin(d), Math.cos(d));
          b.h += d * clamp(c.dt * 6);
        }
        draw(b, out);
      }
    }
    function draw(b, out) {
      const w = 25 * u, hgt = 37.5 * u, a = b.flap, co = Math.cos(b.h), si = Math.sin(b.h), t = tex[b.kind];
      const rotXY = (x, y) => [x * co - y * si, x * si + y * co];
      for (const side of [1, -1]) {
        const [ox, oy] = rotXY(side * (w / 2) * Math.cos(a), 0);
        out.push({ pos: [b.x + ox, b.y + oy, b.z + (w / 2) * Math.sin(a)], size: [w, hgt], rot: [b.h, 0, side > 0 ? -a : a],
          texA: side > 0 ? t.R : t.L, gloss: 0.12, sheen: 0.18 });
      }
      out.push({ pos: [b.x, b.y, b.z + 1.5], size: [9 * u, 19.5 * u], rot: [b.h, 0, 0], texA: bodyTex, gloss: 0.2 });
    }
    return { step, flock };
  }
  return { create };
})();
