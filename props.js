// Things lying on the mat: an instant camera, an iced coffee, a transistor radio and a cap. Each is real
// geometry, built here in centimetres and painted
// with procedural textures, so the sun, the leaf light and the shadows treat it like any solid thing.
// Two of them do something: the camera takes a photo, the radio turns the sound on.
window.Props = (() => {
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // ---------------- geometry ----------------

  const G = () => ({ p: [], n: [], t: [], i: [] });
  // a patch of surface from a function of (u, v) in 0..1 -> [position, normal, texcoord]
  function surf(g, nu, nv, f) {
    const b = g.p.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const [p, n, t] = f(i / nu, j / nv);
      g.p.push(...p); g.n.push(...n); g.t.push(...t);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = b + j * (nu + 1) + i, c = a + nu + 1;
      g.i.push(a, a + 1, c, a + 1, c + 1, c);
    }
    return g;
  }
  // turned around the z axis; prof is [[r, z], ...]. uv: 'arc' (around, along), 'z' (around, height), or a planar size
  function lathe(g, prof, seg, { uv = 'arc', zMax = 1, v0 = 0, v1 = 1, rj = null, cx = 0, cy = 0 } = {}) {
    const len = [0];
    for (let j = 1; j < prof.length; j++) len.push(len[j - 1] + Math.hypot(prof[j][0] - prof[j - 1][0], prof[j][1] - prof[j - 1][1]));
    const tot = len[len.length - 1] || 1;
    return surf(g, seg, prof.length - 1, (u, v) => {
      const j = Math.round(v * (prof.length - 1));
      const a = u * TAU, c = Math.cos(a), s = Math.sin(a);
      const pr = prof[Math.max(0, j - 1)], nx = prof[Math.min(prof.length - 1, j + 1)];
      const dr = nx[0] - pr[0], dz = nx[1] - pr[1], l = Math.hypot(dr, dz) || 1;
      const k = rj ? rj(a, j) : 1, r = prof[j][0] * k, z = prof[j][1];
      const t = typeof uv === 'number' ? [(r * c) / uv + 0.5, (r * s) / uv + 0.5] : uv === 'z' ? [u, 1 - z / zMax] : [u, lerp(v0, v1, len[j] / tot)];
      return [[cx + r * c, cy + r * s, z], [(-dz / l) * c, (-dz / l) * s, dr / l], t];
    });
  }
  // a box with rounded edges, its top mapped flat onto a texture
  function rbox(g, hx, hy, hz, r, { cx = 0, cy = 0, cz = 0, n = 10 } = {}) {
    const band = (t, h) => {
      // put more of the grid on the rounded edges than on the flat middle
      if (t < 0.3) return -h + r * (t / 0.3);
      if (t > 0.7) return h - r + r * ((t - 0.7) / 0.3);
      return -h + r + (h - r) * 2 * ((t - 0.3) / 0.4);
    };
    const H = [hx, hy, hz];
    for (let ax = 0; ax < 3; ax++) for (const sg of [-1, 1]) {
      const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3;
      surf(g, n, n, (u, v) => {
        const q = [0, 0, 0];
        q[ax] = sg * H[ax]; q[a1] = band(sg > 0 ? u : 1 - u, H[a1]); q[a2] = band(v, H[a2]);
        const inner = q.map((x, i) => clamp(x, -(H[i] - r), H[i] - r));
        let d = q.map((x, i) => x - inner[i]);
        if (Math.hypot(...d) < 1e-6) { d = [0, 0, 0]; d[ax] = sg; }
        const nn = norm(d), p = inner.map((x, i) => x + nn[i] * r);
        return [[cx + p[0], cy + p[1], cz + p[2]], nn, [p[0] / (2 * hx) + 0.5, p[1] / (2 * hy) + 0.5]];
      });
    }
    return g;
  }
  // a smooth path through points
  function spline(pts, per = 8, closed = false) {
    const out = [], n = pts.length, at = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push(p1.map((_, d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    if (!closed) out.push(at(n - 1));
    return out;
  }
  // a tube along a path, with an oval section (rx across, ry up); rx may vary along the path
  function tube(g, path, rx, ry, { sides = 14, closed = false, up = [0, 0, 1], uvLen = 1 } = {}) {
    const n = path.length, frames = [], lens = [0];
    for (let i = 1; i < n; i++) lens.push(lens[i - 1] + Math.hypot(...path[i].map((x, d) => x - path[i - 1][d])));
    for (let i = 0; i < n; i++) {
      const a = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const T = norm(b.map((x, d) => x - a[d]));
      let B = cross(T, up);
      if (Math.hypot(...B) < 1e-3) B = cross(T, [1, 0, 0]);
      B = norm(B);
      frames.push([T, B, norm(cross(B, T))]);
    }
    const rows = closed ? n : n - 1;
    const total = closed ? lens[n - 1] + Math.hypot(...path[0].map((x, d) => x - path[n - 1][d])) : lens[n - 1];
    const b0 = g.p.length / 3;
    for (let i = 0; i <= rows; i++) {
      const k = i % n, [, B, N] = frames[k], c = path[k];
      const wx = typeof rx === 'function' ? rx(k / n, c) : rx;
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        g.p.push(...c.map((x, d) => x + B[d] * ca * wx + N[d] * sa * ry));
        g.n.push(...norm(B.map((x, d) => (x * ca) / wx + (N[d] * sa) / ry)));
        // along the tube 0..1 (textures are not tiled), around it 0..1
        g.t.push((i === n ? 1 : lens[k] / total) * uvLen, j / sides);
      }
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < sides; j++) {
      const a = b0 + i * (sides + 1) + j, c = a + sides + 1;
      g.i.push(a, a + 1, c, a + 1, c + 1, c);
    }
    return g;
  }
  // move/turn the vertices of a finished geometry
  function bake(g, f) {
    for (let i = 0; i < g.p.length; i += 3) {
      const [p, n] = f([g.p[i], g.p[i + 1], g.p[i + 2]], [g.n[i], g.n[i + 1], g.n[i + 2]]);
      g.p[i] = p[0]; g.p[i + 1] = p[1]; g.p[i + 2] = p[2];
      g.n[i] = n[0]; g.n[i + 1] = n[1]; g.n[i + 2] = n[2];
    }
    return g;
  }
  const rotZ = (a) => (v) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
  const rotX = (a) => (v) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotY = (a) => (v) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  const turn = (g, ...rs) => bake(g, (p, n) => { for (const r of rs) { p = r(p); n = r(n); } return [p, n]; });
  const move = (g, d) => bake(g, (p, n) => [p.map((x, i) => x + d[i]), n]);

  // ---------------- textures ----------------

  function grain(ctx, w, h, r, n, a) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(r() * w, r() * h, 1.2, 1.2);
    }
  }
  function blot(ctx, x, y, rad, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  // plastic with a faint moulded texture
  function plastic(base, w = 512, h = 512, seed = 1, draw) {
    const c = canvas(w, h), ctx = c.getContext('2d'), r = rng(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, r, w * h * 0.08, 0.035);
    if (draw) draw(ctx, w, h, r);
    return c;
  }
  function cork() {
    const S = 512, c = canvas(S, S), ctx = c.getContext('2d'), r = rng(9);
    ctx.fillStyle = '#b98a58'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
      const x = r() * S, y = r() * S, s = 1 + r() * 4;
      ctx.fillStyle = r() < 0.5 ? `rgba(90,52,24,${0.15 + r() * 0.35})` : `rgba(230,190,140,${0.1 + r() * 0.25})`;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * 3, 0, TAU); ctx.fill();
    }
    // a damp ring where the glass has been standing
    ctx.strokeStyle = 'rgba(70,40,18,.28)'; ctx.lineWidth = 10; ctx.filter = 'blur(3px)';
    ctx.beginPath(); ctx.arc(S / 2 + 6, S / 2 - 4, S * 0.33, 0, TAU); ctx.stroke();
    ctx.filter = 'none';
    return c;
  }
  // the outside of a cold glass: mostly clear, misted lower down, beaded with drops
  function condensation() {
    const W = 1024, H = 512, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(4);
    ctx.fillStyle = 'rgba(235,242,245,.07)'; ctx.fillRect(0, 0, W, H);
    // mist below the coffee line (v = 1 - z/zMax, so lower on the glass is further down the image)
    const mist = ctx.createLinearGradient(0, H * 0.18, 0, H);
    mist.addColorStop(0, 'rgba(235,242,245,0)'); mist.addColorStop(0.15, 'rgba(235,242,245,.16)'); mist.addColorStop(1, 'rgba(235,242,245,.24)');
    ctx.fillStyle = mist; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 1300; i++) {
      const x = r() * W, y = H * (0.2 + r() * 0.78), s = 1 + Math.pow(r(), 3) * 7;
      ctx.fillStyle = 'rgba(250,253,255,.55)';
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.35, s * 0.3, 0, TAU); ctx.fill();
    }
    // a few drops have run, leaving clear tracks
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y0 = H * (0.25 + r() * 0.3);
      ctx.lineWidth = 3 + r() * 3; ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (r() - 0.5) * 6, H); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }
  // iced latte from above: milk clouding into coffee, a few bubbles at the edge
  function latteTop() {
    const S = 512, c = canvas(S, S), ctx = c.getContext('2d'), r = rng(12), C = S / 2;
    ctx.fillStyle = '#b07a4a'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, d = r() * C * 0.8;
      blot(ctx, C + Math.cos(a) * d, C + Math.sin(a) * d, 20 + r() * 70, r() < 0.55 ? `rgba(236,214,186,${0.25 + r() * 0.3})` : `rgba(92,52,24,${0.2 + r() * 0.3})`);
    }
    ctx.lineWidth = 6;
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(240,222,196,${0.18 + r() * 0.2})`; ctx.filter = 'blur(4px)';
      ctx.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const a = t * (2 + r() * 0.3) + i * 0.8, d = C * (0.1 + t * 0.6) * (0.85 + 0.3 * r());
        ctx.lineTo(C + Math.cos(a) * d, C + Math.sin(a) * d);
      }
      ctx.stroke();
    }
    ctx.filter = 'none';
    for (let i = 0; i < 160; i++) {
      const a = r() * TAU, d = C * (0.82 + r() * 0.16), s = 1 + r() * 4;
      ctx.strokeStyle = 'rgba(255,245,230,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, s, 0, TAU); ctx.stroke();
    }
    return c;
  }
  // the coffee seen through the glass wall: espresso below, milk swirling down into it
  function latteSide() {
    const W = 512, H = 512, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(13);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d9b48a'); g.addColorStop(0.35, '#b37b4c'); g.addColorStop(0.7, '#6e3f1e'); g.addColorStop(1, '#4a2812');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) blot(ctx, r() * W, r() * H * 0.6, 20 + r() * 50, `rgba(240,220,190,${0.15 + r() * 0.2})`);
    return c;
  }
  function stripes(a, b, n = 10, W = 512, H = 64) {
    const c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = b;
    for (let i = -2; i < n + 2; i++) {
      ctx.beginPath(); const x = (i / n) * W;
      ctx.moveTo(x, 0); ctx.lineTo(x + W / n / 2, 0); ctx.lineTo(x + W / n / 2 + H * 0.6, H); ctx.lineTo(x + H * 0.6, H); ctx.fill();
    }
    return c;
  }
  // instant-camera front: moulded plastic with a parting line and a light sensor
  function cameraFront(col) {
    return plastic(col, 512, 600, 3, (ctx, w, h) => {
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2;
      rr(ctx, w * 0.05, h * 0.045, w * 0.9, h * 0.91, w * 0.16); ctx.stroke();
      ctx.fillStyle = 'rgba(20,20,22,.85)'; ctx.beginPath(); ctx.arc(w * 0.77, h * 0.17, 5, 0, TAU); ctx.fill();
      // the shutter button, a slightly paler disc
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(w * 0.83, h * 0.86, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2; ctx.stroke();
    });
  }
  function lensRing() {
    const S = 512, c = canvas(S, S), ctx = c.getContext('2d'), C = S / 2;
    ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(235,235,235,.85)'; ctx.font = '600 15px "Geist", sans-serif'; ctx.textAlign = 'center';
    const txt = 'LENS 60mm  1:12.7  ·  0.3m – ∞  ·  ', rad = C * 0.8;
    [...txt].forEach((ch, i) => {
      const a = -Math.PI / 2 + (i / txt.length) * TAU;
      ctx.save(); ctx.translate(C + Math.cos(a) * rad, C + Math.sin(a) * rad); ctx.rotate(a + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
    });
    return c;
  }
  function flashTex() {
    const c = canvas(256, 128), ctx = c.getContext('2d');
    ctx.fillStyle = '#eef0ee'; ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.7)' : 'rgba(150,160,160,.25)'; ctx.fillRect(0, i * 5, 256, 2.5); }
    return c;
  }
  function strapTex() {
    const c = canvas(512, 64), ctx = c.getContext('2d');
    ctx.fillStyle = '#e9e4d8'; ctx.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 6) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(x, 0, 3, 64); }
    ctx.fillStyle = 'rgba(120,150,135,.6)'; ctx.fillRect(0, 26, 512, 12);
    return c;
  }
  // the instant photo: white frame, wider at the bottom
  function photo(name) {
    const W = 270, H = 430, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(name.length * 7);
    ctx.fillStyle = '#f7f6f1'; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, r, 4000, 0.03);
    const ix = 20, iy = 30, iw = W - 40, ih = 310;
    const undeveloped = canvas(W, H), u = undeveloped.getContext('2d');
    u.drawImage(c, 0, 0);
    const g = u.createLinearGradient(0, iy, 0, iy + ih);
    g.addColorStop(0, '#3a403f'); g.addColorStop(1, '#2b302f');
    u.fillStyle = g; u.fillRect(ix, iy, iw, ih);
    u.fillStyle = 'rgba(255,255,255,.06)'; u.fillRect(ix, iy, iw, ih * 0.3);
    if (name) {
      const art = canvas(iw * 2, ih * 2);
      Paint.paint(art, name);
      ctx.drawImage(art, ix, iy, iw, ih);
      // instant film: lifted blacks, warm cast, soft corners
      ctx.fillStyle = 'rgba(255,236,205,.12)'; ctx.fillRect(ix, iy, iw, ih);
      const v = ctx.createRadialGradient(ix + iw / 2, iy + ih / 2, ih * 0.3, ix + iw / 2, iy + ih / 2, ih * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,10,.28)');
      ctx.fillStyle = v; ctx.fillRect(ix, iy, iw, ih);
    }
    return { developed: c, undeveloped };
  }
  // transistor radio face: ivory body, chrome-framed grille on the left, dial on the right
  function radioFace() {
    return plastic('#ece3cf', 1040, 640, 7, (ctx, w, h) => {
      // dial window
      ctx.fillStyle = '#f6efdc'; rr(ctx, w * 0.66, h * 0.16, w * 0.28, h * 0.42, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,40,.35)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#7a1e22'; ctx.font = "600 22px 'Geist', sans-serif"; ctx.textAlign = 'center';
      ['55', '70', '90', '110', '130', '160'].forEach((t, i) => {
        const y = h * 0.21 + i * h * 0.066;
        ctx.fillText(t, w * 0.76, y + 8);
        ctx.fillStyle = 'rgba(60,40,30,.6)'; ctx.fillRect(w * 0.83, y, w * 0.06, 2); ctx.fillStyle = '#7a1e22';
      });
      ctx.fillStyle = 'rgba(60,40,30,.65)'; ctx.font = "500 15px 'Geist Mono', monospace";
      ctx.fillText('KC', w * 0.86, h * 0.2);
      // a little badge
      ctx.fillStyle = '#b48a3c'; rr(ctx, w * 0.69, h * 0.68, w * 0.22, h * 0.13, 10); ctx.fill();
      ctx.fillStyle = '#3a2a12'; ctx.font = "700 21px 'Geist', sans-serif"; ctx.fillText('8 TRANSISTOR', w * 0.8, h * 0.76);
      ctx.fillStyle = 'rgba(60,40,30,.45)'; ctx.font = "500 16px 'Geist Mono', monospace"; ctx.fillText('SOLID STATE', w * 0.8, h * 0.88);
    });
  }
  // perforated aluminium
  function grilleTex() {
    const W = 600, H = 560, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.fillStyle = '#c9cbcc'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) { ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.05})`; ctx.fillRect(0, y, W, 1); }
    for (let y = 18; y < H; y += 20) for (let x = (y / 20) % 2 ? 18 : 28; x < W; x += 20) {
      ctx.fillStyle = '#232425'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y + 0.8, 5.5, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    // rounded to sit inside its chrome frame
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = '#000'; rr(ctx, 0, 0, W, H, 150); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }
  function knurl() {
    const c = canvas(512, 64), ctx = c.getContext('2d');
    ctx.fillStyle = '#c69a45'; ctx.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 4) { ctx.fillStyle = 'rgba(70,45,10,.45)'; ctx.fillRect(x, 0, 2, 64); }
    return c;
  }
  // a six-panel cap in royal-blue cotton twill
  const CAP = '#2442c6';
  function twill(ctx, W, H, r) {
    // short diagonal ribs scattered over the cloth
    ctx.save();
    ctx.lineWidth = 1.2;
    const light = new Path2D(), dark = new Path2D();
    for (let i = 0; i < W * H * 0.05; i++) {
      const x = r() * W, y = r() * H;
      const p = r() < 0.5 ? light : dark;
      p.moveTo(x, y); p.lineTo(x + 3, y - 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.stroke(light);
    ctx.strokeStyle = 'rgba(0,0,30,.08)'; ctx.stroke(dark);
    // washed cotton: soft patches a touch lighter or darker
    for (let i = 0; i < 40; i++) blot(ctx, r() * W, r() * H, 40 + r() * 160, r() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,40,.045)');
    ctx.restore();
  }
  function stitches(ctx, pts, dash, col = 'rgba(14,30,120,.75)', w = 2.2) {
    // a row of running stitches along a polyline: short raised dashes with a gap
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.setLineDash([dash, dash * 0.7]);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
  }
  // painted in plan, as the crown is seen from above: six panels meeting at the button, each seam
  // topstitched either side, the twill running across each panel, an eyelet in each. crown(f, t) gives the shape.
  const CAP_SPAN = 20; // cm across the texture
  function capCrown(crown) {
    const S = 1536, c = canvas(S, S), ctx = c.getContext('2d'), r = rng(71), px = S / CAP_SPAN;
    const P = (p) => [(p[0] / CAP_SPAN + 0.5) * S, (p[1] / CAP_SPAN + 0.5) * S];
    ctx.fillStyle = CAP; ctx.fillRect(0, 0, S, S);
    // twill: fine diagonal ribs, turned to suit each panel
    const ribs = [];
    for (let k = 0; k < 6; k++) ribs.push([new Path2D(), new Path2D()]);
    for (let i = 0; i < S * S * 0.07; i++) {
      const x = r() * S, y = r() * S, a = Math.atan2(y - S / 2, x - S / 2);
      const k = ((Math.floor(((a + TAU) % TAU) / (TAU / 6)) % 6) + 6) % 6, d = (k + 0.5) * (TAU / 6) + Math.PI / 4;
      const p = ribs[k][r() < 0.5 ? 0 : 1];
      p.moveTo(x, y); p.lineTo(x + Math.cos(d) * 4, y + Math.sin(d) * 4);
    }
    ctx.lineWidth = 1.3;
    for (const [l, d] of ribs) { ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.stroke(l); ctx.strokeStyle = 'rgba(0,0,30,.1)'; ctx.stroke(d); }
    for (let i = 0; i < 30; i++) blot(ctx, r() * S, r() * S, 60 + r() * 200, r() < 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,40,.04)');
    // seams: a sunken crease, the cloth puffing up a little either side, a row of stitches each side
    const line = (pts, col, w, dash) => {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
    };
    for (let k = 0; k < 6; k++) {
      const f = k * (TAU / 6), pts = [];
      for (let t = 0; t <= 1.0001; t += 0.02) pts.push(P(crown(f, Math.min(t, 0.985))));
      for (const side of [-1, 1]) {
        const off = pts.map(([x, y], i) => {
          const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1;
          return [x - (dy / l) * side * 0.32 * px, y + (dx / l) * side * 0.32 * px];
        }).slice(0, -5);
        line(off.map(([x, y], i) => [(x + pts[i][0]) / 2, (y + pts[i][1]) / 2]), 'rgba(255,255,255,.07)', 0.32 * px);
        line(off, 'rgba(0,0,40,.35)', 3);
        line(off, 'rgba(150,170,255,.55)', 2.2, [10, 7]);
      }
      line(pts, 'rgba(0,0,40,.5)', 3.5);
    }
    // eyelets: a ring of satin stitch round a small hole
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.5) * (TAU / 6), front = Math.cos(f) > 0.5, [x, y] = P(crown(f, front ? 0.38 : 0.5)), rr = 0.3 * px;
      ctx.fillStyle = 'rgba(0,0,40,.35)'; ctx.beginPath(); ctx.arc(x + 1, y + 2, rr * 1.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2c4bd0'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,180,255,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rr * 0.75, Math.PI, TAU * 0.95); ctx.stroke();
      ctx.fillStyle = '#0b1446'; ctx.beginPath(); ctx.arc(x, y, rr * 0.38, 0, TAU); ctx.fill();
    }
    return c;
  }
  // the peak: across (u) and out from the crown (v), rows of stitching following the edge
  function capBill() {
    const W = 1024, H = 512, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(73);
    ctx.fillStyle = CAP; ctx.fillRect(0, 0, W, H);
    twill(ctx, W, H, r);
    for (let i = 1; i <= 7; i++) {
      const y = H * (1 - i * 0.072);
      ctx.fillStyle = 'rgba(0,0,40,.16)'; ctx.fillRect(0, y - 3, W, 6);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, y + 3, W, 4);
      stitches(ctx, [[0, y], [W, y]], 7, 'rgba(150,170,255,.5)', 2);
    }
    // the edge where it rolls over
    ctx.fillStyle = 'rgba(0,0,40,.18)'; ctx.fillRect(0, H - 12, W, 12);
    return c;
  }
  // the oval patch: embroidered fill, a merrowed white border, raised satin-stitch letters
  function capPatch() {
    const W = 900, H = 500, c = canvas(W, H), ctx = c.getContext('2d'), r = rng(77);
    const cx = W / 2, cy = H / 2, ax = W / 2, ay = H / 2;
    ctx.fillStyle = '#f3f1ea'; ctx.fillRect(0, 0, W, H);
    // the blue ground, stitched in fine horizontal rows
    const inset = 44;
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, ax - inset, ay - inset, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = '#2140c0'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 3) { ctx.fillStyle = y % 6 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,40,.12)'; ctx.fillRect(0, y, W, 1.4); }
    // the border's shadow on the ground
    ctx.strokeStyle = 'rgba(0,0,30,.4)'; ctx.lineWidth = 14; ctx.filter = 'blur(5px)';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 4, ax - inset, ay - inset, 0, 0, TAU); ctx.stroke(); ctx.filter = 'none';
    // the letters: shadow first for relief, then white thread, then the stitch direction
    const lines = ['NO RISK', 'NO STORY'], fs = 132;
    ctx.font = `700 ${fs}px 'Source Serif 4', Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const maxW = (ax - inset) * 2 * 0.74;
    const draw = (fill, dx, dy) => lines.forEach((t, i) => {
      const w = ctx.measureText(t).width, sx = Math.min(1, maxW / w) * 0.94;
      ctx.save(); ctx.translate(cx + dx, cy + (i ? 112 : -10) + dy); ctx.scale(sx, 1);
      ctx.fillStyle = fill; ctx.fillText(t, 0, 0); ctx.restore();
    });
    ctx.filter = 'blur(3px)'; draw('rgba(0,0,30,.6)', 3, 6); ctx.filter = 'none';
    const txt = canvas(W, H), tc = txt.getContext('2d');
    tc.font = ctx.font; tc.textAlign = 'center'; tc.textBaseline = 'alphabetic';
    // the thread goes on its own layer so the stitch texture stays inside the letters
    lines.forEach((t, i) => {
      const w = ctx.measureText(t).width, sx = Math.min(1, maxW / w) * 0.94;
      tc.save(); tc.translate(cx, cy + (i ? 112 : -10)); tc.scale(sx, 1); tc.fillStyle = '#f6f4ee'; tc.fillText(t, 0, 0); tc.restore();
    });
    tc.globalCompositeOperation = 'source-atop';
    for (let x = -H; x < W; x += 4) { tc.strokeStyle = 'rgba(150,150,160,.28)'; tc.lineWidth = 1.3; tc.beginPath(); tc.moveTo(x, H); tc.lineTo(x + H * 0.35, 0); tc.stroke(); }
    // each stroke rounds over: lighter on top, a little shade below
    const g = tc.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i < 2; i++) { const y0 = (cy + (i ? 112 : -10) - fs * 0.72) / H, y1 = (cy + (i ? 112 : -10)) / H; g.addColorStop(y0, 'rgba(255,255,255,.25)'); g.addColorStop((y0 + y1) / 2, 'rgba(255,255,255,0)'); g.addColorStop(Math.min(1, y1), 'rgba(0,0,40,.18)'); }
    tc.fillStyle = g; tc.fillRect(0, 0, W, H);
    ctx.drawImage(txt, 0, 0);
    ctx.restore();
    // merrowed edge: a thick band of slanted white stitches round the oval
    const ring = (rad, n, len, col, wd) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const x0 = cx + ca * (ax - rad), y0 = cy + sa * (ay - rad), nx = ca / ax, ny = sa / ay, l = Math.hypot(nx, ny);
        const tx = -sa * ax, ty = ca * ay, tl = Math.hypot(tx, ty);
        ctx.strokeStyle = col; ctx.lineWidth = wd;
        ctx.beginPath(); ctx.moveTo(x0 - (nx / l) * len, y0 - (ny / l) * len);
        ctx.lineTo(x0 + (nx / l) * len + (tx / tl) * 6, y0 + (ny / l) * len + (ty / tl) * 6); ctx.stroke();
      }
    };
    ring(22, 420, 21, '#fbfaf5', 4);
    ring(22, 420, 21, 'rgba(120,120,130,.25)', 1);
    grain(ctx, W, H, r, W * H * 0.02, 0.04);
    return c;
  }

  function causticTex() {
    const W = 256, H = 160, c = canvas(W, H), ctx = c.getContext('2d');
    blot(ctx, W * 0.5, H * 0.5, H * 0.5, 'rgba(255,190,110,.55)');
    ctx.save(); ctx.translate(W * 0.6, H * 0.5); ctx.scale(1, 0.55);
    ctx.strokeStyle = 'rgba(255,226,170,.55)'; ctx.lineWidth = 10; ctx.filter = 'blur(7px)';
    ctx.beginPath(); ctx.arc(0, 0, H * 0.42, -1.2, 1.2); ctx.stroke();
    ctx.restore(); ctx.filter = 'none';
    blot(ctx, W * 0.64, H * 0.5, H * 0.2, 'rgba(255,232,190,.6)');
    return c;
  }

  // ---------------- materials ----------------
  const M_ = (o) => o; // a material: just its settings

  // ---------------- the props ----------------

  function build(scene) {
    const T = (c) => scene.texture(c);
    const mk = (g) => scene.mesh(g);

    // -- instant camera, lying on its back, lens up --
    function camera() {
      const mint = '#a9ccba';
      const body = M_({ tex: T(cameraFront(mint)), gloss: 0.18, specPow: 50, sheen: 0.06 });
      const glossy = M_({ color: [0.7, 0.82, 0.75, 1], gloss: 0.5, specPow: 90, sheen: 0.08, refl: 0.08 });
      const parts = [
        { mesh: mk(rbox(G(), 5.2, 6.1, 3.33, 1.9, { cz: 3.33, n: 14 })), mat: body },
        // lens barrel, ring, glass
        { mesh: mk(lathe(G(), [[2.3, 8.5], [2.55, 8.55], [2.75, 8.42], [2.9, 8.15], [2.95, 7.3], [3.05, 6.95], [3.35, 6.72], [3.6, 6.66]], 64, { cy: 0.8 })), mat: glossy },
        { mesh: mk(lathe(G(), [[1.25, 8.43], [1.8, 8.45], [2.3, 8.5]], 64, { uv: 4.8, cy: 0.8 })), mat: M_({ tex: T(lensRing()), gloss: 0.2, specPow: 60 }) },
        { mesh: mk(lathe(G(), [[0, 8.78], [0.5, 8.74], [0.95, 8.6], [1.25, 8.43]], 48, { cy: 0.8 })), mat: M_({ color: [0.04, 0.05, 0.08, 1], gloss: 1, specPow: 500, refl: 0.9 }) },
        // flash, viewfinder, mirror
        { mesh: mk(rbox(G(), 1.45, 0.72, 0.12, 0.1, { cx: -2.9, cy: -4.35, cz: 6.7, n: 6 })), mat: M_({ tex: T(flashTex()), gloss: 0.7, specPow: 120, refl: 0.25 }) },
        { mesh: mk(rbox(G(), 0.55, 0.45, 0.1, 0.08, { cx: 3.4, cy: -4.4, cz: 6.68, n: 5 })), mat: M_({ color: [0.06, 0.07, 0.09, 1], gloss: 1, specPow: 400, refl: 0.85 }) },
        { mesh: mk(lathe(G(), [[0, 6.72], [0.45, 6.72], [0.5, 6.68]], 32, { cx: 3.2, cy: -2.3 })), mat: M_({ color: [0.62, 0.64, 0.66, 1], metal: 1, gloss: 1, specPow: 400, refl: 0.15 }) },
        // wrist strap, looping onto the mat
        { mesh: mk(tube(G(), spline([[4.4, 5.6, 4.6], [5.6, 6.3, 3.3], [6.6, 7.1, 1.4], [7.5, 8.2, 0.32], [8.8, 10, 0.25], [8.4, 12.2, 0.25], [6.6, 12.9, 0.25], [5.1, 11.8, 0.3], [4.9, 9.9, 0.45], [5.2, 8.3, 1.1], [4.9, 6.9, 2.9], [4.2, 6.0, 4.1]], 10), 0.42, 0.13)), mat: M_({ tex: T(strapTex()), gloss: 0.05 }) },
      ];
      return { id: 'camera', parts, w: 10.4, h: 12.2, top: 6.66, interactive: true, shot: [] };
    }

    // -- iced coffee on a cork coaster --
    function coffee() {
      const r = rng(5);
      const parts = [
        { mesh: mk(lathe(G(), [[0, 0.45], [5.1, 0.45], [5.32, 0.38], [5.4, 0.22], [5.32, 0.03], [0, 0]], 72, { uv: 10.8 })), mat: M_({ tex: T(cork()), gloss: 0.02 }) },
        { mesh: mk(lathe(G(), [[3.38, 1.6], [3.74, 10.72]], 64, { uv: 'z', zMax: 10.8 })), mat: M_({ tex: T(latteSide()), gloss: 0.2, specPow: 60 }) },
        { mesh: mk(lathe(G(), [[0, 10.8], [2.6, 10.8], [3.5, 10.86], [3.74, 10.98]], 64, { uv: 7.6 })), mat: M_({ tex: T(latteTop()), gloss: 0.55, specPow: 140, refl: 0.22 }) },
        // the straw, leaning on the rim
        { mesh: mk(tube(G(), [[-1.3, 1.1, 1.8], [0.9, -0.8, 10.4], [3.4, -2.9, 19.6]], 0.38, 0.38, { sides: 18, up: [1, 0, 0] })), mat: M_({ tex: T(stripes('#f6f2ea', '#3f8a5c', 14, 1024, 64)), gloss: 0.08 }) },
      ];
      // ice, floating at the top
      [[-1.2, -0.9, 10.9], [1.2, -0.3, 11.0], [0.1, 1.4, 10.75], [-1.8, 1.1, 10.5]].forEach(([x, y, z]) => {
        const g = turn(rbox(G(), 1.1, 1.05, 1.0, 0.42, { n: 6 }), rotX(r() * 0.8), rotY(r() * 0.8), rotZ(r() * 3));
        parts.push({ mesh: mk(move(g, [x, y, z])), mat: M_({ clear: true, color: [0.94, 0.98, 1, 1], opacity: 0.42, refl: 0.55, gloss: 1, specPow: 260, shadow: 0.3 }) });
      });
      parts.push(
        { mesh: mk(lathe(G(), [[3.5, 0.55], [3.62, 1.5], [4.02, 13.3], [4.0, 13.42], [3.92, 13.47]], 72, { uv: 'z', zMax: 13.5 })), mat: M_({ clear: true, tex: T(condensation()), refl: 0.75, gloss: 1, specPow: 320, shadow: 0.25 }) },
        { mesh: mk(lathe(G(), [[3.92, 13.47], [3.84, 13.42], [3.8, 13.3], [3.42, 1.9], [3.2, 1.62], [0, 1.55]], 72)), mat: M_({ clear: true, color: [0.93, 0.97, 0.98, 1], opacity: 0.06, refl: 0.6, gloss: 1, specPow: 320, shadow: 0.2 }) },
      );
      return { id: 'coffee', parts, w: 10.8, h: 10.8, top: 13.47, rimR: 4, caustic: T(causticTex()) };
    }

    // -- a pocket transistor radio: click it to turn the garden sound on --
    function radio() {
      const chrome = M_({ color: [0.72, 0.73, 0.75, 1], metal: 1, gloss: 1, specPow: 400, refl: 0.1 });
      const face = rbox(G(), 6.5, 4.0, 1.8, 0.9, { cz: 1.8, n: 12 });
      const frame = [];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * TAU, c = Math.cos(a), s = Math.sin(a);
        frame.push([-1.75 + Math.sign(c) * Math.pow(Math.abs(c), 0.3) * 3.95, Math.sign(s) * Math.pow(Math.abs(s), 0.3) * 3.3, 3.62]);
      }
      const ant = [[-6.0, -3.5, 3.2], [-10, -5.0, 2.4], [-14, -6.4, 1.6], [-17.5, -7.6, 1.0], [-20.5, -8.6, 0.55]];
      const parts = [
        { mesh: mk(face), mat: M_({ tex: T(radioFace()), gloss: 0.4, specPow: 80, sheen: 0.08, refl: 0.06 }) },
        { mesh: mk(rbox(G(), 3.8, 3.15, 0.06, 0.05, { cx: -1.75, cz: 3.6, n: 4 })), mat: M_({ tex: T(grilleTex()), metal: 0.6, gloss: 0.6, specPow: 60 }) },
        { mesh: mk(tube(G(), frame, 0.16, 0.12, { closed: true })), mat: chrome },
        { mesh: mk(lathe(G(), [[0, 2.3], [1.9, 2.3], [2.05, 2.1], [2.05, 1.5], [1.9, 1.3], [0, 1.3]], 64, { uv: 'arc', cx: 0, cy: 0 })), mat: M_({ tex: T(knurl()), metal: 0.85, gloss: 1, specPow: 200, color: [1, 0.86, 0.6, 1] }), wheel: [5.7, 1.4] },
        { mesh: mk(rbox(G(), 1.2, 0.035, 0.02, 0.02, { cz: 3.62, n: 2 })), mat: M_({ color: [0.75, 0.1, 0.1, 1] }), needle: true },
      ];
      for (let i = 0; i < ant.length - 1; i++) parts.push({ mesh: mk(tube(G(), [ant[i], ant[i + 1]], 0.3 - i * 0.05, 0.3 - i * 0.05, { sides: 12, up: [0, 0, 1] })), mat: chrome });
      parts.push({ mesh: mk(lathe(G(), [[0, 0.85], [0.18, 0.8], [0.3, 0.55], [0.18, 0.3], [0, 0.25]], 16, { cx: ant[4][0], cy: ant[4][1] })), mat: chrome });
      return { id: 'radio', parts, w: 13, h: 8, top: 3.6, interactive: true };
    }

    // -- a six-panel cap lying crown up, peak forward (local +x is the front) --
    // Seen from above: the button near the middle, the back panels rounding down steeply, the stiffened front
    // panels sloping gently to the peak, and a long U-shaped peak lying almost flat.
    function cap() {
      const BF = 8.4, BB = 9.4, BW = 9.2, H = 11, PH = 1.42, L = 10;
      const base = (f) => { const c = Math.cos(f); return [c * (c > 0 ? BF : BB), BW * Math.sin(f)]; };
      const rim = (f) => 0.9 * Math.pow(Math.max(0, Math.cos(f)), 2);
      // t runs from the rim (0) to the button (1): a dome at the back, a straighter slope at the front
      const crown = (f, t) => {
        const wf = Math.pow(Math.max(0, Math.cos(f)), 1.5), q = (t * Math.PI) / 2;
        const rho = lerp(Math.cos(q), 1 - t, wf), b = base(f), r0 = rim(f);
        return [b[0] * rho, b[1] * rho, r0 + (H - r0) * Math.sin(q)];
      };
      // normals by finite differences, so every surface below follows the same shape
      const nrm = (F, u, v, e = 1e-3) => {
        const p0 = F(u, v), du = F(u + e, v), dv = F(u, v + e);
        return norm(cross(du.map((x, i) => x - p0[i]), dv.map((x, i) => x - p0[i])));
      };
      const crownN = (f, t) => nrm(crown, f, Math.min(t, 0.99));
      const plan = (p) => [p[0] / CAP_SPAN + 0.5, p[1] / CAP_SPAN + 0.5];
      const fabric = M_({ tex: T(capCrown(crown)), gloss: 0.03, specPow: 10, sheen: 0.06 });
      const cloth = M_({ tex: T(capBill()), gloss: 0.03, specPow: 10, sheen: 0.06 });
      const parts = [{ mesh: mk(surf(G(), 120, 40, (u, v) => { const p = crown(u * TAU, v); return [p, crownN(u * TAU, v), plan(p)]; })), mat: fabric }];
      // the button
      parts.push({ mesh: mk(lathe(G(), [[0, H + 0.42], [0.42, H + 0.4], [0.7, H + 0.28], [0.8, H + 0.1], [0.72, H - 0.08]], 32)), mat: fabric });

      // the patch over the centre seam: laid out as seen from the front (across, up), then found on the crown
      const PW = 4.4, PHt = 2.3, PZ = 4.9, lift = (r) => (r <= 1 ? 0.16 + 0.05 * (1 - r * r) : 0.16 * (1 - (r - 1) / 0.035));
      const onCrown = (Y, Z) => {
        let f = Math.asin(clamp(Y / BW, -1, 1)) * 0.8, t = Math.asin(clamp(Z / H, 0, 1)) / (Math.PI / 2);
        for (let it = 0; it < 14; it++) {
          const p0 = crown(f, t), pf = crown(f + 1e-4, t), pt = crown(f, t + 1e-4);
          const a11 = (pf[1] - p0[1]) / 1e-4, a12 = (pt[1] - p0[1]) / 1e-4, a21 = (pf[2] - p0[2]) / 1e-4, a22 = (pt[2] - p0[2]) / 1e-4;
          const ey = Y - p0[1], ez = Z - p0[2], det = a11 * a22 - a12 * a21 || 1e-6;
          f += (a22 * ey - a12 * ez) / det; t = clamp(t + (a11 * ez - a21 * ey) / det, 0, 0.98);
        }
        return [f, t];
      };
      const patchP = (al, r) => {
        const rc = Math.min(r, 1), [f, t] = onCrown(-Math.cos(al) * rc * PW, PZ + Math.sin(al) * rc * PHt);
        const p = crown(f, t), n = crownN(f, t), o = lift(r);
        return [p[0] + n[0] * o, p[1] + n[1] * o, p[2] + n[2] * o];
      };
      parts.push({ mesh: mk(surf(G(), 96, 16, (u, v) => {
        const al = u * TAU, r = v * 1.035, rc = Math.min(r, 1);
        let n = nrm(patchP, al, Math.max(r, 0.03)); if (n[0] < 0) n = n.map((x) => -x);
        return [patchP(al, r), n, [0.5 + Math.cos(al) * rc * 0.5, 0.5 - Math.sin(al) * rc * 0.5]];
      })), mat: M_({ tex: T(capPatch()), gloss: 0.06, specPow: 20, sheen: 0.12 }) });

      // the peak: from the front of the rim out to a U-shaped edge, curving down a little toward the sides
      const sp = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
      const e0 = base(PH), Ax = BF + L - e0[0];
      const peak = (s, r) => {
        const f = s * PH, b = base(f), ps = (s * Math.PI) / 2;
        const o = [e0[0] + Ax * sp(Math.cos(ps), 0.72), e0[1] * sp(Math.sin(ps), 0.72)];
        const zi = rim(f), zo = 0.32 + 0.5 * (1 - s * s);
        return [lerp(b[0], o[0], r), lerp(b[1], o[1], r), lerp(zi, zo, r) + 0.18 * Math.sin(r * Math.PI) * (1 - s * s)];
      };
      parts.push({ mesh: mk(surf(G(), 72, 20, (u, v) => {
        const s = u * 2 - 1; let n = nrm(peak, s, v); if (n[2] < 0) n = n.map((x) => -x);
        return [peak(s, v), n, [u, v]];
      })), mat: cloth });
      // its rolled edge
      const edge = [];
      for (let i = 0; i <= 64; i++) { const p = peak(-1 + (i / 64) * 2, 1); edge.push([p[0], p[1], p[2] - 0.1]); }
      parts.push({ mesh: mk(tube(G(), edge, 0.17, 0.14, { sides: 10 })), mat: M_({ color: [0.12, 0.22, 0.7, 1], gloss: 0.03, specPow: 10, sheen: 0.05 }) });
      // where a leaf can settle: round the button, and on the peak
      return { id: 'cap', parts, w: 18.4, h: 27, top: H, rest: [[0, H, 8, 8], [BF + 5, 0.8, 5, 14]] };
    }

    const photos = ['meadow', 'waves', 'town', 'orchard'].map((n) => { const p = photo(n); return { a: T(p.undeveloped), b: T(p.developed) }; });
    return { camera: camera(), coffee: coffee(), radio: radio(), cap: cap(), photos };
  }

  // ---------------- placing, drawing, touching ----------------

  function create(scene, hooks) {
    const P = build(scene);
    const all = [P.camera, P.coffee, P.radio, P.cap];
    let k = 16, place = {};
    let radioOn = false, wheelA = 0;
    const L = Scene.L, sd = norm([-L[0], -L[1], 0]);

    // where everything lies, in world px; k is px per cm
    function layout(o) {
      const { vw, vh, cw, portrait } = o;
      k = clamp(Math.min(vw, vh * 1.25) * 0.0165, 5.5, 22);
      const bottom = vh / 2, top = -vh / 2;
      if (portrait) {
        // a phone has room above and below the card: bigger things, tucked into those bands
        k = clamp(vw * 0.03, 6, 14);
        place = {
          coffee: [-vw / 2 + 6.5 * k, top + 7.5 * k, 0.2],
          cap: [vw / 2 - 2 * k, top + 3.5 * k, 2.5],
          camera: [vw / 2 - 6 * k, bottom - 10 * k, -1.9],
          radio: [-vw / 2 + 9 * k, bottom - 5.5 * k, 0.1],
        };
      } else {
        place = {
          cap: [-vw / 2 + 7.5 * k, top + 3.5 * k, 1.38],
          coffee: [cw / 2 + 8 * k, top + 8.5 * k, 0.2],
          camera: [cw / 2 + 5 * k, bottom - 7 * k, 0.9],
          radio: [-cw / 2 - 4 * k, bottom - 6.8 * k, -0.14],
        };
      }
    }

    const mat3 = (yaw, s, extra) => {
      // rotation about z (and optionally a further local rotation) times uniform scale, column-major
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      let R = [c, sn, 0, -sn, c, 0, 0, 0, 1];
      if (extra) R = mul(R, extra);
      return { M: R.map((x) => x * s), MN: R };
    };
    const mul = (A, B) => {
      const o = new Array(9);
      for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) o[col * 3 + row] = A[row] * B[col * 3] + A[3 + row] * B[col * 3 + 1] + A[6 + row] * B[col * 3 + 2];
      return o;
    };
    const rzM = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
    // local cm -> world px for a placed prop
    const toWorld = (pl, x, y, z = 0) => {
      const c = Math.cos(pl[2]), s = Math.sin(pl[2]);
      return [pl[0] + (x * c - y * s) * k, pl[1] + (x * s + y * c) * k, z * k];
    };
    const visible = (pl, cam, vw, r) => Math.abs(pl[0] - cam) < vw / 2 + r * k + 40;

    // the photos the camera has taken
    const shots = [];
    let shotIx = 0;

    function frame({ now, cam, vw, vh, objects, meshes, supports, hover, dt }) {
      const t = now / 1000;
      for (const p of all) {
        const pl = place[p.id];
        if (!pl || !visible(pl, cam, vw, 22)) continue;
        const base = mat3(pl[2], k);
        const at = [pl[0], pl[1], 0];
        for (const part of p.parts) {
          let m = { mesh: part.mesh, mat: part.mat, M: base.M, MN: base.MN, pos: at };
          if (part.wheel) {
            // the tuning wheel turns when the radio is switched
            const c = toWorld(pl, part.wheel[0], part.wheel[1]);
            const R = mat3(pl[2], k, rzM(wheelA));
            m = { ...m, M: R.M, MN: R.MN, pos: c };
          }
          // the dial needle travels down the scale as the wheel turns
          if (part.needle) m = { ...m, pos: toWorld(pl, 3.9, -2.2 + clamp(wheelA / 4.2) * 2.4) };
          meshes.push(m);
        }
        supports.push(...boxSupports(p, pl));
      }
      // the radio's wheel eases round when it is switched on or off
      wheelA += ((radioOn ? 4.2 : 0) - wheelA) * (1 - Math.exp(-dt * 3));

      // the coffee's caustic: sunlight gathered by the glass, thrown beyond its shadow
      {
        const pl = place.coffee;
        if (pl && visible(pl, cam, vw, 30)) {
          const h = 13.5 * k * 0.42, c = toWorld(pl, 0, 0);
          objects.push({ mode: 3, pos: [c[0] + sd[0] * h * 0.72 / 0.81, c[1] + sd[1] * h * 0.72 / 0.81, 0.6 * k], size: [9 * k, 5.6 * k],
            rot: [Math.atan2(sd[1], sd[0]), 0, 0], texA: P.coffee.caustic, alpha: 0.75 });
        }
      }

      // photos: pushed out of the camera's top slot, dropped beside it, slowly developing
      {
        const pl = place.camera;
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i], e = t - s.t0;
          const out = easeOut(clamp(e / 1.4));
          let x = 0, y = -6.1 + 4.3 - out * 7.4, z = 3.3, tilt = 0, yaw = 0;
          if (e > 1.4) {
            // tips off the edge of the camera and lands on the mat
            const f = easeOut(clamp((e - 1.4) / 0.5));
            y -= f * (4 + s.j * 2); x += f * s.dx; z = lerp(3.3, 0.06, f); tilt = Math.sin(f * Math.PI) * 0.35; yaw = f * s.dyaw;
          }
          if (s.gone) {
            const g = t - s.gone;
            y -= g * g * 120; if (g > 2) { shots.splice(i, 1); continue; }
          }
          const c = toWorld(pl, x, y, 0);
          const dev = clamp((e - 2.2) / 7);
          const o = { pos: [c[0], c[1], z * k + 0.6], size: [5.4 * k, 8.6 * k], rot: [pl[2] + yaw, tilt, 0], texA: s.tex.a, texB: s.tex.b, mixB: dev * dev * (3 - 2 * dev), gloss: 0.3, sheen: 0.12 };
          objects.push(o);
          if (e > 2) supports.push({ id: 'shot' + s.n, obj: o, stable: !s.gone });
        }
      }
    }

    // flat stand-ins for the tops of solid things, so a leaf can come to rest on them
    function boxSupports(p, pl) {
      const box = (id, z, w, h, fit, dx = 0) => {
        const c = toWorld(pl, dx, 0);
        return { id, obj: { pos: [c[0], c[1], z * k], size: [w * k, h * k], rot: [pl[2], 0, 0] }, stable: true, fit };
      };
      if (p.id === 'cap') return p.rest.map(([dx, z, w, h], i) => box('cap' + i, z, w, h, 0.9, dx));
      if (p.id === 'coffee') return [box('coffee', p.top, 8, 8, 0.95), box('coaster', 0.45, 10.8, 10.8, 0.9)];
      return [box(p.id, p.top, p.w, p.h, 0.92)];
    }

    // which interactive thing is under a screen point
    function pick(sx, sy, cam, vw, vh, camY = 0) {
      for (const p of all) {
        if (!p.interactive) continue;
        const pl = place[p.id];
        if (!pl) continue;
        const z = p.top * k, f = Scene.D / (Scene.D - z);
        const cx = (pl[0] - cam) * f + vw / 2, cy = (pl[1] - camY) * f + vh / 2;
        const dx = (sx - cx) / (f * k), dy = (sy - cy) / (f * k);
        const c = Math.cos(-pl[2]), s = Math.sin(-pl[2]);
        const u = dx * c - dy * s, v = dx * s + dy * c;
        if (Math.abs(u) < p.w / 2 && Math.abs(v) < p.h / 2) return p.id;
      }
      return null;
    }
    function click(id, now) {
      const t = now / 1000;
      if (id === 'camera') {
        if (shots.some((s) => t - s.t0 < 1.6)) return;
        const live = shots.filter((s) => !s.gone);
        if (live.length >= 3) live[0].gone = t;
        shotIx++;
        shots.push({ t0: t, n: shotIx, tex: P.photos[shotIx % P.photos.length], j: live.length % 3, dx: (Math.random() - 0.5) * 3, dyaw: (Math.random() - 0.5) * 0.5 });
      } else if (id === 'radio') {
        hooks.radio && hooks.radio();
      }
    }
    function setRadio(v) { radioOn = v; }

    return { layout, frame, pick, click, setRadio };
  }

  return { create };
})();
