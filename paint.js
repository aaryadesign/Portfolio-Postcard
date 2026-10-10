// Generated placeholder pictures for the postcard photo and the stamp art, plus stickers and postmarks.
window.Paint = (() => {
  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(seed) {
    const r = rng(seed), T = Array.from({ length: 512 }, r);
    return (x) => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      const a = T[i & 511], b = T[(i + 1) & 511];
      return a + (b - a) * u;
    };
  }
  function fbm(n, x, oct = 4) {
    let s = 0, a = 0.5, f = 1, tot = 0;
    for (let o = 0; o < oct; o++) { s += a * n(x * f + o * 31.7); tot += a; a *= 0.5; f *= 2.07; }
    return s / tot;
  }

  function sky(ctx, w, h, stops, y1 = h) {
    const g = ctx.createLinearGradient(0, 0, 0, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // fill from a ridge line down to yBottom (or the bottom edge)
  function land(ctx, w, h, yOf, fill, x0 = -2, x1 = w + 2, yBottom = h + 2) {
    ctx.beginPath();
    ctx.moveTo(x0, yBottom);
    for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, yOf(x));
    ctx.lineTo(x1, yBottom);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function disc(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
  // blurred ellipse via an offset shadow (works in Safari, unlike ctx.filter)
  function soft(ctx, x, y, rx, ry, color, blur) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 10000;
    ctx.beginPath(); ctx.ellipse(x - 10000, y, rx, ry, 0, 0, TAU);
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
  }
  function finish(ctx, w, h, { warm = 'rgba(255,196,140,.2)', vig = 0.3, grain = 24, seed = 1 } = {}) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = warm; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(40,20,10,0)'); g.addColorStop(1, `rgba(40,20,10,${vig})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const im = ctx.getImageData(0, 0, w, h), d = im.data, r = rng(seed);
    for (let i = 0; i < d.length; i += 4) { const v = (r() - 0.5) * grain; d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.9; }
    ctx.putImageData(im, 0, 0);
  }

  // A hillside town above the sea, in the spirit of an old holiday postcard
  function town(ctx, w, h) {
    const r = rng(7), n = noise1(3), m = noise1(9);
    const S = w / 1200;
    const sea = h * 0.66;
    sky(ctx, w, h, [[0, '#86aed0'], [0.55, '#c6d7de'], [1, '#f2e2c8']], sea);
    soft(ctx, w * 0.78, h * 0.2, w * 0.28, h * 0.12, 'rgba(255,242,218,.75)', 90 * S);
    land(ctx, w, h, (x) => sea - h * 0.05 - fbm(n, (x / w) * 4) * h * 0.2, 'rgba(146,166,182,.92)');
    const sg = ctx.createLinearGradient(0, sea, 0, h);
    sg.addColorStop(0, '#4f93a6'); sg.addColorStop(1, '#1a4860');
    ctx.fillStyle = sg; ctx.fillRect(0, sea, w, h - sea);
    for (let i = 0; i < 1600; i++) {
      const k = Math.pow(r(), 1.5), y = sea + k * (h - sea), x = r() * w;
      const len = (5 + r() * 24) * S * (0.4 + k * 1.8), th = Math.max(1, (0.6 + k * 2.2) * S);
      ctx.fillStyle = r() < 0.45 ? `rgba(240,248,250,${0.1 + 0.25 * r()})` : `rgba(8,40,58,${0.12 + 0.22 * r()})`;
      ctx.fillRect(x, y, len, th);
    }
    // headland on the right
    const head = (x) => sea - Math.pow(Math.max(0, (x / w - 0.8) / 0.2), 0.7) * h * 0.34 - fbm(n, x / w * 9 + 5) * h * 0.04;
    land(ctx, w, h, head, '#56603b', w * 0.79, w + 2, sea + 2);
    for (let i = 0; i < 260; i++) {
      const x = w * (0.8 + r() * 0.2), y = head(x) + r() * (sea - head(x));
      disc(ctx, x, y, (2 + r() * 5) * S, r() < 0.5 ? '#6c6447' : '#3f4c2c');
    }
    // the hill the town is built on
    const hill = (x) => {
      const u = x / w;
      let y = u < 0.3 ? 0.04 + u * 0.12 : 0.076 + ((u - 0.3) / 0.52) * (0.66 - 0.076);
      y += (fbm(m, u * 7) - 0.5) * 0.08;
      return Math.min(sea, y * h);
    };
    land(ctx, w, h, hill, '#727648', -2, w * 0.84, sea + 2);
    const greens = ['#5d6b3a', '#7d7f4e', '#8e8456', '#4a5a32', '#66733f'];
    for (let i = 0; i < 1300; i++) {
      const x = r() * w * 0.84, top = hill(x);
      const y = top + r() * (sea - top);
      disc(ctx, x, y, (2 + r() * 6) * S, greens[(r() * greens.length) | 0]);
    }
    const pal = ['#f4e7d4', '#f7dcc6', '#efcdb5', '#faf2e6', '#ecd8ae', '#f3c0a6', '#e9e1d0', '#f6d3c7', '#f1e9dc'];
    for (let y = h * 0.1; y < sea - h * 0.008; y += h * 0.011) {
      for (let x = r() * w * 0.02; x < w * 0.83;) {
        const k = y / sea;
        const hw = w * (0.012 + r() * 0.016) * (0.7 + k * 0.6);
        const hh = hw * (0.7 + r() * 0.5);
        if (y - hh > hill(x + hw / 2) + h * 0.008 && r() < 0.3 + k * 0.45) {
          if (r() < 0.16) {
            for (let b = 0; b < 4; b++) disc(ctx, x + r() * hw, y - r() * hh, hw * (0.25 + r() * 0.2), r() < 0.5 ? '#3f522c' : '#536238');
          } else {
            ctx.fillStyle = pal[(r() * pal.length) | 0];
            ctx.fillRect(x, y - hh, hw, hh);
            ctx.fillStyle = 'rgba(120,70,50,.22)';
            ctx.fillRect(x + hw * 0.68, y - hh, hw * 0.32, hh);
            ctx.fillStyle = 'rgba(255,255,255,.4)';
            ctx.fillRect(x, y - hh, hw, Math.max(1, S));
            ctx.fillStyle = 'rgba(70,46,44,.55)';
            const nw = 1 + ((r() * 3) | 0);
            for (let k2 = 0; k2 < nw; k2++) ctx.fillRect(x + hw * (0.12 + k2 * 0.28), y - hh * 0.62, hw * 0.13, hh * 0.24);
          }
        }
        x += hw * (0.85 + r() * 0.9);
      }
    }
    // a majolica dome
    const dx = w * 0.46, dy = hill(dx) + h * 0.12;
    ctx.fillStyle = '#f2e6d2'; ctx.fillRect(dx - 18 * S, dy - 10 * S, 36 * S, 22 * S);
    ctx.beginPath(); ctx.ellipse(dx, dy - 10 * S, 16 * S, 15 * S, 0, Math.PI, TAU); ctx.fillStyle = '#3f8a7a'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(dx + 5 * S, dy - 14 * S, 5 * S, 9 * S, 0, 0, TAU); ctx.fillStyle = 'rgba(240,210,120,.55)'; ctx.fill();
    // shoreline and boats
    ctx.fillStyle = '#433d31'; ctx.fillRect(0, sea - 2 * S, w * 0.84, 4 * S);
    for (let i = 0; i < 7; i++) {
      const bx = w * (0.08 + r() * 0.8), by = sea + h * (0.06 + r() * 0.25), bs = (0.8 + (by - sea) / (h - sea)) * S;
      ctx.fillStyle = 'rgba(245,250,250,.5)';
      ctx.fillRect(bx - 40 * bs, by + 4 * bs, 36 * bs, 1.5 * bs);
      ctx.beginPath(); ctx.ellipse(bx, by, 14 * bs, 4 * bs, 0, 0, TAU); ctx.fillStyle = '#f7f4ee'; ctx.fill();
      ctx.fillStyle = '#2f3f52'; ctx.fillRect(bx - 4 * bs, by - 6 * bs, 8 * bs, 4 * bs);
    }
    finish(ctx, w, h, { warm: 'rgba(255,190,130,.24)', vig: 0.3, grain: 26, seed: 3 });
  }

  // Cover stamp: one big tree on a hill, a tiny gingham mat under it
  function tree(ctx, w, h) {
    const r = rng(21), n = noise1(5);
    sky(ctx, w, h, [[0, '#f2c58c'], [0.55, '#f8e1b8'], [1, '#fbecd0']], h * 0.7);
    disc(ctx, w * 0.72, h * 0.4, w * 0.12, '#fff4da');
    land(ctx, w, h, (x) => h * 0.6 - fbm(n, (x / w) * 3) * h * 0.14, '#bcc58f');
    land(ctx, w, h, (x) => h * 0.71 - fbm(n, (x / w) * 2.4 + 9) * h * 0.12, '#93a65d');
    land(ctx, w, h, (x) => h * 0.84 - fbm(n, (x / w) * 2 + 20) * h * 0.06, '#6f8c40');
    const tx = w * 0.36, ty = h * 0.84;
    ctx.fillStyle = 'rgba(38,58,20,.35)';
    ctx.beginPath(); ctx.ellipse(tx + w * 0.07, ty + h * 0.015, w * 0.27, h * 0.035, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3423'; ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.035;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - w * 0.01, h * 0.6, tx + w * 0.005, h * 0.45); ctx.stroke();
    ctx.lineWidth = w * 0.014;
    for (const [a, b] of [[-0.12, 0.33], [0.13, 0.35], [-0.06, 0.28]]) {
      ctx.beginPath(); ctx.moveTo(tx, h * 0.55); ctx.quadraticCurveTo(tx + a * w * 0.5, h * 0.45, tx + a * w, h * b); ctx.stroke();
    }
    const cx = tx, cy = h * 0.33, rx = w * 0.27, ry = h * 0.22;
    for (const [col, k, dx, dy] of [['#2b4527', 1, 0, 0], ['#3e5d2f', 0.75, -0.18, -0.18], ['#62803c', 0.45, -0.32, -0.34]]) {
      for (let i = 0; i < 110 * k; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * k;
        const x = cx + (Math.cos(a) * d + dx) * rx, y = cy + (Math.sin(a) * d * 0.9 + dy) * ry;
        disc(ctx, x, y, w * (0.03 + r() * 0.035) * (0.6 + k * 0.4), col);
      }
    }
    // the picnic mat, red and pink checks
    ctx.save();
    ctx.translate(tx + w * 0.16, ty + h * 0.025);
    ctx.transform(1, 0, -0.6, 0.38, 0, 0);
    const cs = w * 0.022;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#f6c9cc' : '#c8283a';
      ctx.fillRect(i * cs - cs * 2.5, j * cs - cs * 2, cs, cs);
    }
    ctx.restore();
    finish(ctx, w, h, { warm: 'rgba(255,200,140,.2)', vig: 0.26, grain: 22, seed: 5 });
  }

  // Big layered waves under a red sun
  function waves(ctx, w, h) {
    const r = rng(41);
    sky(ctx, w, h, [[0, '#f0d6ae'], [1, '#f7e8cf']], h * 0.6);
    disc(ctx, w * 0.68, h * 0.27, w * 0.13, '#e2553a');
    for (let i = 0; i < 4; i++) soft(ctx, w * (0.2 + r() * 0.7), h * (0.12 + r() * 0.28), w * (0.18 + r() * 0.2), h * 0.012, 'rgba(250,238,215,.95)', w * 0.012);
    const cols = ['#a7bccb', '#7899bb', '#4a73aa', '#2e5492', '#213f7a', '#162d5e'];
    for (let k = 0; k < 6; k++) {
      const y0 = h * (0.47 + k * 0.095), amp = h * (0.014 + k * 0.013), fr = ((2.6 - k * 0.28) * TAU) / w, ph = k * 1.7;
      const yOf = (x) => y0 - Math.pow(Math.max(0, Math.sin(x * fr + ph)), 1.6) * amp * 1.9 + Math.sin(x * fr * 2.3 + ph) * amp * 0.22;
      land(ctx, w, h, yOf, cols[k]);
      ctx.strokeStyle = 'rgba(250,244,230,.9)';
      ctx.lineWidth = Math.max(1, w * 0.004 * (1 + k * 0.45));
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) ctx.lineTo(x, yOf(x) + ctx.lineWidth * 0.6);
      ctx.stroke();
      // foam curls on the crests
      for (let x = 0; x < w; x += 3) {
        if (Math.sin(x * fr + ph) > 0.93 && r() < 0.5) disc(ctx, x + (r() - 0.5) * 8, yOf(x) - r() * amp * 0.4, w * 0.006 * (1 + k * 0.4), 'rgba(252,248,236,.95)');
      }
    }
    finish(ctx, w, h, { warm: 'rgba(255,190,130,.14)', vig: 0.3, grain: 22, seed: 7 });
  }

  function conifer(ctx, x, base, hgt, wid, col, r) {
    const steps = 10, pts = [];
    for (let i = 1; i <= steps; i++) {
      const y = base - hgt + (hgt * i) / steps, ww = wid * (i / steps) * (0.75 + r() * 0.5);
      pts.push([ww, y]);
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, base - hgt);
    for (const [ww, y] of pts) { ctx.lineTo(x + ww, y); ctx.lineTo(x + ww * 0.4, y - (hgt / steps) * 0.3); }
    ctx.lineTo(x, base);
    for (let i = pts.length - 1; i >= 0; i--) { const [ww, y] = pts[i]; ctx.lineTo(x - ww * 0.4, y - (hgt / steps) * 0.3); ctx.lineTo(x - ww, y); }
    ctx.closePath();
    ctx.fill();
  }

  // Moonlit mountains and a lit cabin in the pines
  function night(ctx, w, h) {
    const r = rng(31), n = noise1(4), n2 = noise1(14);
    sky(ctx, w, h, [[0, '#1f3570'], [0.6, '#40619e'], [1, '#6383b6']], h * 0.75);
    for (let i = 0; i < 5; i++) soft(ctx, r() * w, h * (0.1 + r() * 0.3), w * (0.12 + r() * 0.15), h * 0.022, 'rgba(210,222,240,.6)', w * 0.03);
    disc(ctx, w * 0.36, h * 0.13, w * 0.034, '#fbf7ea');
    const peak = (x) => Math.pow(fbm(n, (x / w) * 2.2 + 1), 1.7);
    land(ctx, w, h, (x) => h * 0.64 - peak(x) * h * 0.55, '#cfd7e3');
    land(ctx, w, h, (x) => h * 0.66 - peak(x + w * 0.02) * h * 0.45 + (fbm(n2, (x / w) * 9) - 0.5) * h * 0.05, 'rgba(112,134,172,.6)');
    land(ctx, w, h, (x) => h * 0.74 - fbm(n2, (x / w) * 4 + 4) * h * 0.09, '#24332f');
    const trees = [];
    for (let i = 0; i < 16; i++) trees.push([w * (0.42 + r() * 0.66), h * (0.78 + r() * 0.24), h * (0.3 + r() * 0.55)]);
    trees.sort((a, b) => a[1] - b[1]);
    for (const [x, base, th] of trees) conifer(ctx, x, base, th, th * 0.22, r() < 0.5 ? '#121c18' : '#1b2a23', r);
    const cx = w * 0.3, cy = h * 0.9;
    ctx.fillStyle = '#2a211b'; ctx.fillRect(cx - w * 0.07, cy - h * 0.06, w * 0.14, h * 0.06);
    ctx.beginPath(); ctx.moveTo(cx - w * 0.085, cy - h * 0.06); ctx.lineTo(cx, cy - h * 0.12); ctx.lineTo(cx + w * 0.085, cy - h * 0.06); ctx.fillStyle = '#dfe4ec'; ctx.fill();
    soft(ctx, cx - w * 0.025, cy - h * 0.03, w * 0.05, h * 0.03, 'rgba(255,196,96,.55)', w * 0.03);
    ctx.fillStyle = '#f6c86a';
    ctx.fillRect(cx - w * 0.045, cy - h * 0.042, w * 0.026, h * 0.022);
    ctx.fillRect(cx + w * 0.015, cy - h * 0.042, w * 0.026, h * 0.022);
    finish(ctx, w, h, { warm: 'rgba(120,150,220,.12)', vig: 0.42, grain: 26, seed: 9 });
  }

  // A meadow of wildflowers with a path through it
  function meadow(ctx, w, h) {
    const r = rng(51), n = noise1(6);
    sky(ctx, w, h, [[0, '#93bddc'], [1, '#e6eee9']], h * 0.55);
    for (let c = 0; c < 3; c++) {
      const cx = w * (0.15 + c * 0.33 + r() * 0.1), cy = h * (0.13 + r() * 0.16);
      for (let i = 0; i < 8; i++) soft(ctx, cx + (r() - 0.5) * w * 0.18, cy + (r() - 0.5) * h * 0.05, w * (0.04 + r() * 0.04), w * (0.03 + r() * 0.03), 'rgba(255,255,255,.95)', w * 0.012);
    }
    land(ctx, w, h, (x) => h * 0.5 - fbm(n, (x / w) * 14) * h * 0.08, '#56713f');
    const g = ctx.createLinearGradient(0, h * 0.52, 0, h);
    g.addColorStop(0, '#a9c564'); g.addColorStop(1, '#6b9638');
    land(ctx, w, h, () => h * 0.53, g);
    ctx.fillStyle = '#eadfb9';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.53);
    ctx.bezierCurveTo(w * 0.42, h * 0.68, w * 0.7, h * 0.78, w * 0.48, h + 2);
    ctx.lineTo(w * 0.86, h + 2);
    ctx.bezierCurveTo(w * 0.86, h * 0.8, w * 0.52, h * 0.68, w * 0.515, h * 0.53);
    ctx.fill();
    for (let i = 0; i < 420; i++) {
      const k = Math.pow(r(), 0.8), y = h * 0.54 + k * h * 0.46, x = r() * w;
      ctx.strokeStyle = r() < 0.5 ? 'rgba(62,98,40,.7)' : 'rgba(120,156,70,.7)';
      ctx.lineWidth = Math.max(1, w * 0.002 * (0.5 + k));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * w * 0.01, y - h * 0.03 * (0.4 + k)); ctx.stroke();
    }
    const fl = ['#ffffff', '#f4d54b', '#f39cb3', '#b59bdc', '#ffffff'];
    for (let i = 0; i < 900; i++) {
      const k = Math.pow(r(), 0.7), y = h * 0.54 + k * h * 0.46, x = r() * w;
      disc(ctx, x, y, w * (0.002 + k * 0.007) * (0.6 + r() * 0.6), fl[(r() * fl.length) | 0]);
    }
    finish(ctx, w, h, { warm: 'rgba(255,214,150,.16)', vig: 0.26, grain: 22, seed: 11 });
  }

  // Rows of fruit trees under a low orange sun
  function orchard(ctx, w, h) {
    const r = rng(61);
    sky(ctx, w, h, [[0, '#f6d27a'], [1, '#f1a65c']], h * 0.5);
    disc(ctx, w * 0.26, h * 0.24, w * 0.1, '#fff1c8');
    land(ctx, w, h, () => h * 0.47, '#a3a453');
    for (let j = 0; j < 7; j++) {
      const k = j / 6, y = h * (0.5 + Math.pow(k, 1.4) * 0.52), s = 0.28 + k * 0.95;
      ctx.fillStyle = j % 2 ? 'rgba(201,152,85,.55)' : 'rgba(118,148,64,.5)';
      ctx.fillRect(0, y - h * 0.02 * s, w, h * 0.02 * s);
      const step = w * 0.11 * s;
      for (let x = (j % 2) * step * 0.5 - step * 0.3; x < w + step; x += step) {
        const tx = x + (r() - 0.5) * step * 0.15, cr = w * 0.042 * s;
        ctx.fillStyle = 'rgba(60,40,20,.35)';
        ctx.beginPath(); ctx.ellipse(tx + cr * 0.4, y, cr * 1.1, cr * 0.25, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a3d25'; ctx.fillRect(tx - cr * 0.1, y - cr * 1.1, cr * 0.2, cr * 1.1);
        for (let b = 0; b < 7; b++) disc(ctx, tx + (r() - 0.5) * cr * 1.2, y - cr * 1.5 + (r() - 0.5) * cr * 0.9, cr * (0.45 + r() * 0.25), '#3b5a29');
        for (let b = 0; b < 4; b++) disc(ctx, tx - cr * 0.3 + (r() - 0.5) * cr * 0.8, y - cr * 1.75 + (r() - 0.5) * cr * 0.5, cr * (0.3 + r() * 0.15), '#5f7f35');
        for (let b = 0; b < 6; b++) disc(ctx, tx + (r() - 0.5) * cr * 1.6, y - cr * 1.5 + (r() - 0.5) * cr * 1.1, Math.max(1, cr * 0.09), '#f08328');
      }
    }
    finish(ctx, w, h, { warm: 'rgba(255,180,110,.18)', vig: 0.3, grain: 22, seed: 13 });
  }

  const SCENES = { town, tree, waves, night, meadow, orchard };
  function paint(canvas, name) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    SCENES[name](ctx, canvas.width, canvas.height);
  }

  // Die-cut stickers: white border, flat colour, dashed stitching
  function sticker(kind, text, bg, fg) {
    const lines = text.split('\n');
    const size = Math.max(...lines.map((l) => l.length)) > 7 ? 12 : 17;
    const txt = (cx, cy) => lines.map((l, i) => `<text x="${cx}" y="${cy + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.35}" text-anchor="middle" font-family="Geist, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-.02em" fill="${fg}">${l}</text>`).join('');
    if (kind === 'sun') {
      let d = '';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * TAU - Math.PI / 2, rr = i % 2 ? 36 : 47;
        d += `${i ? 'L' : 'M'}${(50 + Math.cos(a) * rr).toFixed(1)} ${(50 + Math.sin(a) * rr).toFixed(1)}`;
      }
      return `<svg viewBox="0 0 100 100"><path d="${d}Z" fill="#fffdf7" stroke="#fffdf7" stroke-width="7" stroke-linejoin="round"/><path d="${d}Z" fill="${bg}"/><circle cx="50" cy="50" r="27" fill="none" stroke="${fg}" stroke-width="1.2" stroke-dasharray="3 3"/>${txt(50, 50)}</svg>`;
    }
    if (kind === 'oval') {
      return `<svg viewBox="0 0 140 84"><ellipse cx="70" cy="42" rx="64" ry="36" fill="${bg}" stroke="#fffdf7" stroke-width="6"/><ellipse cx="70" cy="42" rx="55" ry="28" fill="none" stroke="${fg}" stroke-width="1.2" stroke-dasharray="4 3"/>${txt(70, 42)}</svg>`;
    }
    if (kind === 'square') {
      return `<svg viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="12" fill="${bg}" stroke="#fffdf7" stroke-width="6"/><rect x="15" y="15" width="70" height="70" rx="6" fill="none" stroke="${fg}" stroke-width="1.2" stroke-dasharray="4 3"/>${txt(50, 50)}</svg>`;
    }
    return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="${bg}" stroke="#fffdf7" stroke-width="6"/><circle cx="50" cy="50" r="35" fill="none" stroke="${fg}" stroke-width="1.2" stroke-dasharray="3 3"/>${txt(50, 50)}</svg>`;
  }

  // Circular ink postmark with wavy cancellation lines; the ink is patchy, like a real rubber stamp
  let pmId = 0;
  function postmark(top, bottom, l1, l2) {
    const id = `pm${pmId++}`;
    const wave = (y) => `<path d="M112 ${y} q8 -7 16 0 t16 0 t16 0 t16 0 t16 0" stroke-width="2.6"/>`;
    return `<svg viewBox="0 0 200 120" aria-hidden="true">
      <defs>
        <path id="${id}t" d="M22,60 a38,38 0 0,1 76,0"/>
        <path id="${id}b" d="M15,60 a45,45 0 0,0 90,0"/>
        <filter id="${id}f" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${pmId * 7}" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" result="d"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="${pmId * 3 + 1}" result="m"/>
          <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.2" result="mask"/>
          <feComposite in="d" in2="mask" operator="in"/>
        </filter>
      </defs>
      <g filter="url(#${id}f)" fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="52" stroke-width="2.6"/>
        <circle cx="60" cy="60" r="29" stroke-width="1.4"/>
        <g fill="currentColor" stroke="none" font-family="Geist, sans-serif" font-weight="700" letter-spacing="1.6">
          <text font-size="11"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${top}</textPath></text>
          <text font-size="10"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${bottom}</textPath></text>
          <text x="16" y="64" font-size="9">★</text><text x="96" y="64" font-size="9">★</text>
          <text x="60" y="58" text-anchor="middle" font-size="13" letter-spacing="0">${l1}</text>
          <text x="60" y="73" text-anchor="middle" font-size="10" letter-spacing=".5">${l2}</text>
        </g>
        ${wave(40)}${wave(54)}${wave(68)}${wave(82)}
      </g>
    </svg>`;
  }

  return { paint, sticker, postmark };
})();
