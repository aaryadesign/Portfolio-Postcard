// Everything printed: the postcard (front, signature, back), the stamps, postmarks, stickers and the section title.
// All of it is drawn to canvases that become textures in the scene.
window.Print = (() => {
  const TAU = Math.PI * 2;
  const INK = '#2b2824', PAPER = '#f4eee0';

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise2(seed) {
    const r = rng(seed), T = new Float32Array(4096);
    for (let i = 0; i < T.length; i++) T[i] = r();
    const h = (x, y) => T[((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) & 4095];
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(ctx, weight, size, family = 'Geist') {
    ctx.font = `${weight} ${size}px ${family === 'Geist' ? "'Geist', sans-serif" : family === 'mono' ? "'Geist Mono', monospace" : "'Yellowtail', cursive"}`;
  }
  function spaced(ctx, text, x, y, sp, align = 'left') {
    const chars = [...text], ws = chars.map((c) => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const keep = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += ws[i] + sp; });
    ctx.textAlign = keep;
    return total;
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function arcText(ctx, text, cx, cy, r, mid, sp, dir) {
    const chars = [...text], ws = chars.map((c) => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let acc = 0;
    chars.forEach((c, i) => {
      const a = mid + (dir * (acc + ws[i] / 2 - total / 2)) / r;
      ctx.save();
      ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.rotate(a + (dir * Math.PI) / 2);
      ctx.fillText(c, -ws[i] / 2, 0);
      ctx.restore();
      acc += ws[i] + sp;
    });
  }
  // paper: flat colour, fine grain, a few fibres
  function paper(ctx, _w, _h, color, seed, amount = 14) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed), n = noise2(seed + 1);
    const im = ctx.getImageData(0, 0, w, h), d = im.data;
    const sc = Math.max(w, h) / 180;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const v = (r() - 0.5) * amount + (n(x / sc, y / sc) - 0.5) * amount * 0.8;
      d[i] += v; d[i + 1] += v; d[i + 2] += v * 0.9;
    }
    ctx.putImageData(im, 0, 0);
    ctx.save();
    ctx.lineWidth = Math.max(1, w / 1400);
    for (let i = 0; i < (w * h) / 9000; i++) {
      const x = r() * w, y = r() * h, a = r() * TAU, l = (4 + r() * 10) * (w / 1000);
      ctx.strokeStyle = r() < 0.5 ? 'rgba(120,96,70,.12)' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a + 1) * l * 0.5, y + Math.sin(a + 1) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  // rubber-stamp ink: mostly solid, with lighter patches and specks
  function inkify(c, seed) {
    const ctx = c.getContext('2d'), im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
    const n = noise2(seed), m = noise2(seed + 9), r = rng(seed + 3), s = c.width / 60;
    for (let y = 0, i = 0; y < c.height; y++) for (let x = 0; x < c.width; x++, i += 4) {
      if (!d[i + 3]) continue;
      const k = Math.min(1, Math.max(0.12, (n(x / s, y / s) * 0.7 + m(x / (s * 0.3), y / (s * 0.3)) * 0.3 - 0.18) * 2.6));
      d[i + 3] *= k * (r() < 0.04 ? 0.3 : 1);
    }
    ctx.putImageData(im, 0, 0);
  }

  // A circular postmark with cancellation waves; returns { canvas, cx, cy } in units (k px per unit)
  function postmark({ R, top, bottom, l1, l2, color, waves = 0, waveLen = 0, seed = 1, k = 2 }) {
    const pad = R * 0.12;
    const W = 2 * R + 2 * pad + waveLen, H = 2 * R + 2 * pad;
    const c = canvas(W * k, H * k), ctx = c.getContext('2d');
    ctx.scale(k, k);
    const cx = waves < 0 ? W - R - pad : R + pad, cy = H / 2;
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = R * 0.055;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = R * 0.03;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.56, 0, TAU); ctx.stroke();
    font(ctx, 700, R * 0.19);
    arcText(ctx, top, cx, cy, R * 0.7, -Math.PI / 2, R * 0.035, 1);
    arcText(ctx, bottom, cx, cy, R * 0.86, Math.PI / 2, R * 0.035, -1);
    ctx.beginPath(); ctx.arc(cx - R * 0.78, cy, R * 0.045, 0, TAU); ctx.arc(cx + R * 0.78, cy, R * 0.045, 0, TAU); ctx.fill();
    ctx.textAlign = 'center';
    font(ctx, 800, R * 0.25);
    ctx.fillText(l1, cx, cy + R * 0.02);
    font(ctx, 600, R * 0.17);
    spaced(ctx, l2, cx, cy + R * 0.3, R * 0.02, 'center');
    if (waves) {
      ctx.lineWidth = R * 0.05;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const y = cy - R * 0.48 + i * R * 0.32;
        const x0 = waves > 0 ? cx + R * 1.06 : cx - R * 1.06;
        ctx.beginPath();
        for (let t = 0; t <= waveLen - R * 0.1; t += 1) ctx.lineTo(x0 + waves * t, y + Math.sin((t / (R * 0.36)) * Math.PI) * R * 0.08);
        ctx.stroke();
      }
    }
    inkify(c, seed);
    return { canvas: c, W, H, cx, cy };
  }

  // ---- stamps: 440 x 308 units. The art is Aarya's own (stamps/*.webp), perforations and all; it is drawn
  // to fill the stamp, and the postmark goes on top ----
  const SW = 440, SH = 308, SK = 2.5;
  function perforate(ctx, W, H, r = 7.5) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    const nx = Math.round(W / (r * 2.7)), ny = Math.round(H / (r * 2.7));
    for (let i = 0; i <= nx; i++) { const x = (i * W) / nx; ctx.moveTo(x + r, 0); ctx.arc(x, 0, r, 0, TAU); ctx.moveTo(x + r, H); ctx.arc(x, H, r, 0, TAU); }
    for (let i = 0; i <= ny; i++) { const y = (i * H) / ny; ctx.moveTo(r, y); ctx.arc(0, y, r, 0, TAU); ctx.moveTo(W + r, y); ctx.arc(W, y, r, 0, TAU); }
    ctx.fill();
    ctx.restore();
  }
  function stamp(img, mark) {
    const c = canvas(SW * SK, SH * SK), ctx = c.getContext('2d');
    if (img) ctx.drawImage(img, 0, 0, c.width, c.height);
    if (!mark) return c;
    const inked = canvas(c.width, c.height), ic = inked.getContext('2d');
    ic.drawImage(c, 0, 0);
    ic.scale(SK, SK);
    const pm = postmark({ ...mark, k: SK });
    ic.globalAlpha = 0.88;
    ic.drawImage(pm.canvas, mark.x - pm.cx, mark.y - pm.cy, pm.W, pm.H);
    ic.globalAlpha = 1;
    ic.globalCompositeOperation = 'destination-in';
    ic.setTransform(1, 0, 0, 1, 0, 0);
    ic.drawImage(c, 0, 0);
    return { plain: c, inked };
  }

  // ---- stickers ----
  function sticker(kind, text, bg, fg, w, h) {
    const K = 3, pad = 6, c = canvas((w + pad * 2) * K, (h + pad * 2) * K), ctx = c.getContext('2d');
    ctx.scale(K, K); ctx.translate(pad, pad);
    const shape = () => {
      ctx.beginPath();
      if (kind === 'sun') {
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * TAU - Math.PI / 2, r = (i % 2 ? 0.38 : 0.48) * w;
          ctx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
        }
        ctx.closePath();
      } else if (kind === 'oval') ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU);
      else if (kind === 'square') rr(ctx, 2, 2, w - 4, h - 4, w * 0.13);
      else ctx.arc(w / 2, h / 2, w / 2 - 2, 0, TAU);
    };
    shape(); ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = ctx.fillStyle = '#fffdf6'; ctx.stroke(); ctx.fill();
    shape(); ctx.fillStyle = bg; ctx.fill();
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(0.8, 0.8); ctx.translate(-w / 2, -h / 2);
    shape(); ctx.restore();
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1.1; ctx.strokeStyle = fg; ctx.stroke(); ctx.setLineDash([]);
    const lines = text.split('\n'), size = Math.max(...lines.map((l) => l.length)) > 7 ? w * 0.13 : w * 0.19;
    font(ctx, 800, size); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    return { canvas: c, w: w + pad * 2, h: h + pad * 2 };
  }

  // ---- the postcard ----
  function front(cw, ch, TW) {
    const k = TW / cw, c = canvas(TW, ch * k), ctx = c.getContext('2d');
    paper(ctx, c.width, c.height, '#f6f0e3', 61, 10);
    const b = cw * 0.034 * k;
    const ph = canvas(c.width - 2 * b, c.height - 2 * b);
    Paint.paint(ph, 'town');
    ctx.save(); rr(ctx, b, b, ph.width, ph.height, k * 2); ctx.clip(); ctx.drawImage(ph, b, b); ctx.restore();
    return c;
  }
  function signature(cw, ch, TW, portrait) {
    const k = TW / cw, c = canvas(TW, ch * k), ctx = c.getContext('2d');
    const size = cw * (portrait ? 0.17 : 0.152) * k;
    ctx.translate(cw * 0.08 * k, ch * (portrait ? 0.9 : 0.86) * k);
    ctx.rotate(-0.12);
    font(ctx, 400, size, 'script');
    ctx.shadowColor = 'rgba(40,18,10,.32)'; ctx.shadowBlur = size * 0.06; ctx.shadowOffsetY = size * 0.015;
    ctx.fillStyle = '#fbf3e2';
    ctx.fillText('Aarya Shah', 0, 0);
    return c;
  }

  // little printed pictograms, two inks slightly out of register
  function pictogram(ctx, kind, x, y, S) {
    const C = { research: '#3a8a55', design: '#e2533a', prototype: '#2c56c4', build: '#f2b52f' }[kind];
    const shape = () => {
      ctx.beginPath();
      if (kind === 'research') {
        for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, r = S * (0.46 + 0.035 * Math.cos(a * 12)); ctx.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
      } else if (kind === 'design') {
        ctx.moveTo(S * 0.08, S); ctx.lineTo(S * 0.08, S * 0.46); ctx.arc(S / 2, S * 0.46, S * 0.42, Math.PI, 0); ctx.lineTo(S * 0.92, S);
      } else if (kind === 'prototype') rr(ctx, S * 0.04, S * 0.04, S * 0.92, S * 0.92, S * 0.2);
      else {
        for (let i = 0; i <= 80; i++) { const a = (i / 80) * TAU, r = S * (0.44 + 0.05 * Math.sign(Math.cos(a * 9)) * Math.min(1, Math.abs(Math.cos(a * 9)) * 3)); ctx.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
      }
      ctx.closePath();
    };
    ctx.save();
    ctx.translate(x, y);
    shape(); ctx.fillStyle = C; ctx.fill();
    // halftone in the colour layer
    ctx.save(); shape(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    for (let yy = 0; yy < S; yy += S * 0.07) for (let xx = (yy / (S * 0.07)) % 2 ? S * 0.035 : 0; xx < S; xx += S * 0.07) { ctx.beginPath(); ctx.arc(xx, yy, S * 0.012, 0, TAU); ctx.fill(); }
    ctx.restore();
    const fg = kind === 'build' ? '#3a2b25' : '#f7f0df';
    ctx.fillStyle = ctx.strokeStyle = fg;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'research') {
      ctx.lineWidth = S * 0.075; ctx.beginPath(); ctx.arc(S * 0.44, S * 0.44, S * 0.17, 0, TAU); ctx.stroke();
      ctx.lineWidth = S * 0.1; ctx.beginPath(); ctx.moveTo(S * 0.57, S * 0.57); ctx.lineTo(S * 0.71, S * 0.71); ctx.stroke();
      ctx.beginPath(); ctx.arc(S * 0.4, S * 0.4, S * 0.04, 0, TAU); ctx.fill();
    } else if (kind === 'design') {
      ctx.beginPath();
      ctx.moveTo(S * 0.5, S * 0.84); ctx.lineTo(S * 0.31, S * 0.55); ctx.lineTo(S * 0.37, S * 0.34); ctx.lineTo(S * 0.63, S * 0.34); ctx.lineTo(S * 0.69, S * 0.55); ctx.closePath(); ctx.fill();
      ctx.fillRect(S * 0.36, S * 0.22, S * 0.28, S * 0.09);
      ctx.strokeStyle = C; ctx.lineWidth = S * 0.035;
      ctx.beginPath(); ctx.moveTo(S * 0.5, S * 0.82); ctx.lineTo(S * 0.5, S * 0.56); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(S * 0.5, S * 0.53, S * 0.045, 0, TAU); ctx.fill();
    } else if (kind === 'prototype') {
      ctx.beginPath(); ctx.moveTo(S * 0.18, S * 0.5); ctx.lineTo(S * 0.83, S * 0.22); ctx.lineTo(S * 0.55, S * 0.8); ctx.lineTo(S * 0.45, S * 0.58); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C; ctx.lineWidth = S * 0.03; ctx.beginPath(); ctx.moveTo(S * 0.83, S * 0.22); ctx.lineTo(S * 0.45, S * 0.58); ctx.stroke();
      ctx.strokeStyle = fg; ctx.setLineDash([S * 0.04, S * 0.05]); ctx.lineWidth = S * 0.025;
      ctx.beginPath(); ctx.moveTo(S * 0.4, S * 0.66); ctx.quadraticCurveTo(S * 0.22, S * 0.8, S * 0.1, S * 0.7); ctx.stroke(); ctx.setLineDash([]);
    } else {
      [[0.25, 0.52], [0.53, 0.52], [0.39, 0.27]].forEach(([bx, by]) => { rr(ctx, S * bx, S * by, S * 0.23, S * 0.22, S * 0.03); ctx.fill(); });
      ctx.fillStyle = C; ctx.fillRect(S * 0.3, S * 0.57, S * 0.06, S * 0.03); ctx.fillRect(S * 0.58, S * 0.57, S * 0.06, S * 0.03);
    }
    // key line, slightly off register
    ctx.translate(S * 0.022, S * 0.018);
    shape(); ctx.strokeStyle = 'rgba(31,29,26,.8)'; ctx.lineWidth = S * 0.022; ctx.stroke();
    ctx.restore();
  }

  // Layout of the back in units: the card is 1000 units wide
  function backLayout(portrait, H) {
    return portrait
      ? { H, slot: { x: 700, y: 120, w: 240 }, pm: { x: 585, y: 205, R: 66, waveLen: 170 } }
      : { H, slot: { x: 752, y: 98, w: 190 }, pm: { x: 700, y: 178, R: 58, waveLen: 150 } };
  }
  const SLOT_ROT = 0.05;

  function back({ cw, ch, TW, portrait, cover, mark, peeled, intro, lines }) {
    const U = 1000, H = (ch / cw) * U, k = TW / U;
    const c = canvas(TW, H * k), ctx = c.getContext('2d');
    paper(ctx, c.width, c.height, PAPER, 71, 12);
    ctx.scale(k, k);
    const Lo = backLayout(portrait, H), s = Lo.slot, sh = (s.w * SH) / SW;
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';

    // header, the way old cards were printed
    font(ctx, 700, portrait ? 30 : 24); spaced(ctx, 'POST CARD', 500, portrait ? 74 : 62, portrait ? 16 : 13, 'center');

    // stamp box, seen once the stamp is gone
    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + sh / 2); ctx.rotate(SLOT_ROT);
    ctx.strokeStyle = 'rgba(43,40,36,.45)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.strokeRect(-s.w / 2 + 6, -sh / 2 + 6, s.w - 12, sh - 12); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(43,40,36,.5)'; font(ctx, 500, 9, 'mono'); ctx.textAlign = 'center';
    spaced(ctx, 'PLACE STAMP', 0, -2, 1.6, 'center'); spaced(ctx, 'HERE', 0, 12, 1.6, 'center');
    if (peeled) { ctx.fillStyle = 'rgba(214,190,120,.16)'; ctx.fillRect(-s.w / 2 + 3, -sh / 2 + 3, s.w - 6, sh - 6); }
    ctx.restore();
    ctx.textAlign = 'left';

    // divider with a printed imprint along it
    ctx.strokeStyle = '#3f6e50'; ctx.lineWidth = 1.6;
    ctx.fillStyle = 'rgba(43,40,36,.55)';
    font(ctx, 500, portrait ? 12 : 8.5, 'mono');
    if (portrait) {
      ctx.beginPath(); ctx.moveTo(70, 650); ctx.lineTo(930, 650); ctx.stroke();
      spaced(ctx, 'AARYA SHAH · PORTFOLIO · EDITION OF 2026 · NO. 001', 500, 680, 2, 'center');
    } else {
      ctx.beginPath(); ctx.moveTo(566, 96); ctx.lineTo(566, 612); ctx.stroke();
      ctx.save(); ctx.translate(552, 354); ctx.rotate(-Math.PI / 2);
      spaced(ctx, 'AARYA SHAH · PORTFOLIO · EDITION OF 2026 · NO. 001', 0, 0, 1.8, 'center');
      ctx.restore();
    }

    // the address side: name, role, experience, set in the same type as the message
    const ax0 = portrait ? 70 : 600, ax1 = portrait ? 930 : 944;
    const ay = portrait ? [420, 500, 580] : [330, 404, 478];
    ctx.strokeStyle = 'rgba(43,40,36,.38)'; ctx.lineWidth = 1.2;
    ay.forEach((y) => { ctx.beginPath(); ctx.moveTo(ax0, y + 12); ctx.lineTo(ax1, y + 12); ctx.stroke(); });
    ctx.fillStyle = INK;
    lines.forEach((l, i) => { font(ctx, i ? 500 : 700, portrait ? (i ? 32 : 38) : i ? 23 : 28); ctx.fillText(l, ax0 + 6, ay[i]); });

    // the message
    const mx = portrait ? 70 : 60, mw = portrait ? 860 : 455;
    let y = portrait ? 790 : 156;
    ctx.fillStyle = INK;
    font(ctx, 700, portrait ? 50 : 36);
    ctx.fillText('Hello there,', mx, y);
    y += portrait ? 66 : 48;
    ctx.fillStyle = INK;
    // pictograms under it; the message gets smaller until it fits above them
    const py = portrait ? 1205 : 500, S = portrait ? 112 : 74, gap = portrait ? 104 : 40;
    const room = py - (portrait ? 70 : 44) - y;
    let fs = portrait ? 33 : 21.5, lh, msg;
    for (;; fs -= 0.5) {
      lh = fs * (portrait ? 1.5 : 1.56);
      font(ctx, 400, fs);
      msg = wrap(ctx, intro, mw);
      if ((msg.length - 1) * lh <= room || fs <= 12) break;
    }
    msg.forEach((l) => { ctx.fillText(l, mx, y); y += lh; });

    const labels = ['research', 'design', 'prototype', 'build'];
    labels.forEach((kd, i) => {
      const x = mx + i * (S + gap);
      pictogram(ctx, kd, x, py, S);
      ctx.fillStyle = INK; font(ctx, 600, portrait ? 13 : 9.5, 'mono');
      spaced(ctx, kd.toUpperCase(), x + S / 2, py + S + (portrait ? 30 : 20), portrait ? 2 : 1.4, 'center');
    });

    if (!portrait) {
      ctx.fillStyle = 'rgba(43,40,36,.55)'; font(ctx, 500, 8.5, 'mono');
      spaced(ctx, 'NO. 001 · PRINTED 2026', 944, 612, 1.6, 'right');
    }

    // the postmark, then the stamp (which carries its share of the ink)
    const p = Lo.pm;
    const pmLayer = canvas(c.width, c.height), pl = pmLayer.getContext('2d');
    pl.scale(k, k);
    pl.globalAlpha = 0.86;
    pl.drawImage(mark.canvas, p.x - mark.cx, p.y - mark.cy, mark.W, mark.H);
    if (peeled) {
      pl.globalAlpha = 1;
      pl.globalCompositeOperation = 'destination-out';
      pl.translate(s.x + s.w / 2, s.y + sh / 2); pl.rotate(SLOT_ROT);
      pl.drawImage(cover.plain, -s.w / 2, -sh / 2, s.w, sh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(pmLayer, 0, 0);
    if (!peeled) {
      ctx.scale(k, k);
      ctx.translate(s.x + s.w / 2, s.y + sh / 2); ctx.rotate(SLOT_ROT);
      ctx.save(); ctx.shadowColor = 'rgba(60,40,20,.25)'; ctx.shadowBlur = 3 * k; ctx.shadowOffsetY = 0.6 * k;
      ctx.drawImage(cover.inked, -s.w / 2, -sh / 2, s.w, sh);
      ctx.restore();
    }
    return c;
  }

  // The cover stamp, inked with the part of the card's postmark that landed on it
  function coverStamp(portrait, mark, img) {
    const plain = stamp(img);
    const Lo = backLayout(portrait, 0), s = Lo.slot, sh = (s.w * SH) / SW, p = Lo.pm;
    const inked = canvas(plain.width, plain.height), ic = inked.getContext('2d');
    ic.drawImage(plain, 0, 0);
    ic.save();
    ic.scale(SK, SK);
    ic.translate(SW / 2, SH / 2);
    ic.rotate(-SLOT_ROT);
    ic.scale(SW / s.w, SW / s.w);
    ic.translate(-(s.x + s.w / 2), -(s.y + sh / 2));
    ic.globalAlpha = 0.86;
    ic.drawImage(mark.canvas, p.x - mark.cx, p.y - mark.cy, mark.W, mark.H);
    ic.restore();
    ic.globalCompositeOperation = 'destination-in';
    ic.drawImage(plain, 0, 0);
    return { plain, inked };
  }
  function openMark(portrait, date) {
    const p = backLayout(portrait, 0).pm;
    return postmark({ R: p.R, top: 'OPEN TO WORK', bottom: 'PORTFOLIO', l1: date[0], l2: date[1], color: '#2a3a7a', waves: 1, waveLen: p.waveLen, seed: 5, k: 3 });
  }

  // Cut-paper letters for the section title
  function title(text, size, weight = 800) {
    const K = 2, m = document.createElement('canvas').getContext('2d');
    font(m, weight, size);
    const w = m.measureText(text).width + size * 0.3, h = size * 1.3;
    const c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    font(ctx, weight, size);
    ctx.fillStyle = '#f7f0e1';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, size * 0.15, size * 1.0);
    ctx.globalCompositeOperation = 'source-atop';
    const r = rng(81);
    for (let i = 0; i < (w * h) / 6; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(120,96,70,.08)' : 'rgba(255,255,255,.2)'; ctx.fillRect(r() * w, r() * h, 1, 1); }
    return { canvas: c, w, h };
  }


  // One letter of a ransom-note title: a die-cut vinyl sticker, either cut around the glyph itself or a
  // little tile of colour, always with the white margin a sticker sheet leaves
  function letter(ch, { family, weight = 400, style = '', shape = 'cut', ink = '#141414', bg = '#ffffff' }, size) {
    const K = 2, f = `${style} ${weight} ${size}px '${family}'`;
    const m = document.createElement('canvas').getContext('2d');
    m.font = f;
    const t = m.measureText(ch);
    const asc = t.actualBoundingBoxAscent, desc = t.actualBoundingBoxDescent, lft = t.actualBoundingBoxLeft, rgt = t.actualBoundingBoxRight;
    const gw = lft + rgt, gh = asc + desc, border = size * 0.075;
    let tw, th;
    if (shape === 'cut') { tw = gw + border * 2; th = gh + border * 2; } else {
      const pad = size * 0.16;
      tw = Math.max(gw + pad * 2, size * 0.5); th = Math.max(gh + pad * 2, size * 0.62);
      if (shape === 'circle') tw = th = Math.max(tw, th);
    }
    const w = tw + border * 2 + 6, h = th + border * 2 + 6;
    const c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    const cx = w / 2, cy = h / 2, gx = cx + (lft - rgt) / 2, gy = cy + (asc - desc) / 2;
    ctx.font = f; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const tile = (grow) => {
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(cx, cy, tw / 2 + grow, 0, TAU);
      else rr(ctx, cx - tw / 2 - grow, cy - th / 2 - grow, tw + grow * 2, th + grow * 2, size * 0.06 + grow);
    };
    // the white backing, with the faintest line where the die cut it
    if (shape === 'cut') {
      ctx.strokeStyle = 'rgba(60,40,30,.16)'; ctx.lineWidth = border * 2 + 1.4; ctx.strokeText(ch, gx, gy);
      ctx.strokeStyle = '#fffdf8'; ctx.lineWidth = border * 2; ctx.strokeText(ch, gx, gy);
      ctx.fillStyle = '#fffdf8'; ctx.fillText(ch, gx, gy);
    } else {
      tile(border + 0.7); ctx.fillStyle = 'rgba(60,40,30,.16)'; ctx.fill();
      tile(border); ctx.fillStyle = '#fffdf8'; ctx.fill();
      tile(0); ctx.fillStyle = bg; ctx.fill();
    }
    ctx.fillStyle = ink; ctx.fillText(ch, gx, gy);
    // vinyl: a faint sheen across the top
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.04)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    return { canvas: c, w, h };
  }


  // ---- testimonials: written on the back of a stamp, so the same perforated paper, gummed side up ----
  // 440 units wide; H is taller on a phone so the words can be bigger. Drawn sharp enough to be held up and read.
  const QUOTE_INK = '#27304a', OCHRE = '#e39904';
  function testimonial({ quote, name, role }, n, H) {
    const K = 4.5, W = SW, c = canvas(W * K, H * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    paper(ctx, W, H, '#f2ead6', 70 + n, 9);
    // the gum: a faint glaze, a little uneven where it dried
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,248,225,.35)'); g.addColorStop(0.5, 'rgba(255,248,225,0)'); g.addColorStop(1, 'rgba(210,190,140,.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const m = 36, foot = 64;
    // a big opening quote in the title's ochre
    ctx.fillStyle = OCHRE; ctx.font = "italic 400 74px 'DM Serif Display', serif"; ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', m - 6, m + 44);
    // the words, in the writer's hand: as large as the card allows
    const top = m + 40, room = H - top - foot - m;
    let fs = H > 400 ? 24 : 19, lines, lh;
    for (; fs > 11; fs -= 0.5) {
      ctx.font = `400 ${fs}px 'Kalam', cursive`;
      lines = wrap(ctx, quote, W - m * 2); lh = fs * 1.38;
      if (lines.length * lh <= room) break;
    }
    ctx.fillStyle = QUOTE_INK;
    lines.forEach((l, i) => ctx.fillText(l, m, top + fs + i * lh));
    // who wrote it, typed underneath a pencil rule
    const fy = H - m - foot + 14;
    ctx.strokeStyle = 'rgba(80,70,55,.28)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(m, fy); ctx.lineTo(W - m, fy); ctx.stroke();
    font(ctx, 600, 16); ctx.fillStyle = INK; ctx.fillText(name, m, fy + 28);
    font(ctx, 400, 12.5); ctx.fillStyle = '#6f675a'; ctx.fillText(role, m, fy + 47);
    perforate(ctx, W, H);
    return c;
  }

  // the back of a project stamp, seen when it is turned over: the same gummed paper as the testimonials,
  // the stamp itself small in the corner, the project's name and what it was
  function stampBack({ name, summary }, img, n) {
    const K = 3, W = SW, H = SH, c = canvas(W * K, H * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    paper(ctx, W, H, '#f2ead6', 90 + n, 9);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,248,225,.35)'); g.addColorStop(0.5, 'rgba(255,248,225,0)'); g.addColorStop(1, 'rgba(210,190,140,.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const m = 30, sw = 118, sh = (sw * SH) / SW;
    if (img) {
      ctx.save();
      ctx.translate(W - m - sw / 2, m + sh / 2); ctx.rotate(0.05);
      ctx.shadowColor = 'rgba(60,40,20,.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 0.8;
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
      ctx.restore();
    }
    ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
    // the name beside the little stamp, as large as fits there
    const nw = W - m * 2 - sw - 16;
    let ns = 26, nl;
    for (; ns > 15; ns -= 1) { font(ctx, 700, ns); nl = wrap(ctx, name, nw); if (nl.length * ns * 1.15 <= sh) break; }
    const ny = m + sh / 2 - (nl.length * ns * 1.15) / 2 + ns * 0.9;
    nl.forEach((l, i) => ctx.fillText(l, m, ny + i * ns * 1.15));
    // and under them both, what it was
    const top = m + sh + 22, room = H - top - m + 4;
    let fs = 17, lines, lh;
    for (; fs > 10; fs -= 0.5) {
      font(ctx, 400, fs); lh = fs * 1.42;
      lines = wrap(ctx, summary, W - m * 2);
      if (lines.length * lh <= room) break;
    }
    ctx.fillStyle = '#4a443b';
    lines.forEach((l, i) => ctx.fillText(l, m, top + fs + i * lh));
    perforate(ctx, W, H);
    return c;
  }

  // a die-cut vinyl sticker around any artwork: a white margin following its outline
  function dieCut(img, w, h, border, K = 2) {
    const pad = border + 4, c = canvas((w + pad * 2) * K, (h + pad * 2) * K), ctx = c.getContext('2d');
    const sil = canvas(c.width, c.height), sc = sil.getContext('2d');
    sc.drawImage(img, pad * K, pad * K, w * K, h * K);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#000'; sc.fillRect(0, 0, sil.width, sil.height);
    // the margin is the outline grown outward, made solid and then laid down once so nothing builds up
    const ring = (r, col) => {
      const o = canvas(c.width, c.height), oc = o.getContext('2d');
      for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; oc.drawImage(sil, Math.cos(a) * r * K, Math.sin(a) * r * K); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; oc.drawImage(sil, Math.cos(a) * r * 0.55 * K, Math.sin(a) * r * 0.55 * K); }
      oc.drawImage(sil, 0, 0);
      oc.globalCompositeOperation = 'source-in'; oc.fillStyle = col; oc.fillRect(0, 0, o.width, o.height);
      return o;
    };
    // the faint line where the die cut, then the white vinyl
    ctx.globalAlpha = 0.16; ctx.drawImage(ring(border + 0.8, '#3c281e'), 0, 0); ctx.globalAlpha = 1;
    ctx.drawImage(ring(border, '#fffdf8'), 0, 0);
    ctx.drawImage(img, pad * K, pad * K, w * K, h * K);
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 0, c.width * 0.4, c.height);
    g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.04)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    return { canvas: c, w: w + pad * 2, h: h + pad * 2 };
  }

  // a client's sticker as supplied, minus the drop shadow painted into it (the scene makes its own):
  // whatever is reachable from the edge without crossing the white margin is shadow or air
  function cleanSticker(img) {
    const W = img.naturalWidth, H = img.naturalHeight, c = canvas(W, H), ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const im = ctx.getImageData(0, 0, W, H), d = im.data, out = new Uint8Array(W * H), q = [];
    const solid = (i) => d[i * 4 + 3] > 200 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 600;
    for (let x = 0; x < W; x++) { q.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++) { q.push(y * W, y * W + W - 1); }
    while (q.length) {
      const i = q.pop();
      if (out[i] || solid(i)) continue;
      out[i] = 1;
      const x = i % W, y = (i / W) | 0;
      if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < H - 1) q.push(i + W);
    }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < W * H; i++) {
      if (out[i]) {
        // keep the soft edge of the white margin, lose the grey of the shadow
        const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3, k = Math.max(0, Math.min(1, (l - 150) / 100));
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 253; d[i * 4 + 3] *= k * k;
      }
      if (d[i * 4 + 3] > 8) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    ctx.putImageData(im, 0, 0);
    const o = canvas(x1 - x0 + 3, y1 - y0 + 3);
    o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  }

  // ---- the sticker sheet: kiss-cut vinyl on a glossy liner ----
  // the shape of a sticker, filled with one colour, at K pixels per unit
  function tint(img, w, h, K, color) {
    const t = canvas(w * K, h * K), x = t.getContext('2d');
    x.drawImage(img, 0, 0, t.width, t.height);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, t.width, t.height);
    return t;
  }
  // where a sticker was peeled off: the cut line, and the shiny liner showing through, a hair below the vinyl
  function hole(ctx, img, cx, cy, w, h, K) {
    const x = cx - w / 2, y = cy - h / 2, line = tint(img, w, h, K, '#6f685c');
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.drawImage(line, x + Math.cos(a) * 0.8, y + Math.sin(a) * 0.8, w, h); }
    ctx.globalAlpha = 1;
    const inner = tint(img, w, h, K, '#d3d6d3'), ic = inner.getContext('2d');
    ic.globalCompositeOperation = 'source-atop';
    ic.drawImage(tint(img, w, h, K, '#e8ebe8'), 0.6 * K, 1.6 * K);
    const g = ic.createLinearGradient(0, 0, inner.width, inner.height);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,.3)');
    ic.fillStyle = g; ic.fillRect(0, 0, inner.width, inner.height);
    ctx.drawImage(inner, x, y, w, h);
  }
  // s: { W, H, K, pad, band, title, titleSize, perf: [x0, y0, x1, y1], holes: [{img, x, y, w, h}], you: {x, y, w, h} },
  // all in sheet units from the top left, centres for holes. Printed like a shop sticker sheet: one warm
  // yellow all over, the title stacked in fat round black letters in the top corner, and a hello over the
  // contact stickers in the same letters.
  const SHEET = { yellow: '#ffbe12', ink: '#141210', cream: '#fff8e4', red: '#d8402a', redDeep: '#7e1c12' };
  function stickerSheet(s) {
    const { W, H, K, pad } = s, c = canvas(W * K, H * K), ctx = c.getContext('2d');
    paper(ctx, W, H, '#fbfaf5', 131, 5);
    ctx.scale(K, K);
    // ink laid on the vinyl, so its grain still shows through
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = SHEET.yellow; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // the header: a band of its own colour across the top, its bottom edge scalloped, and the title in a
    // retro script, cream with a deeper red set behind it, like a printed header card
    const band = s.band, sc = band > 110 ? 15 : 12, n = Math.max(6, Math.round(W / (sc * 2.2))), step = W / n;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, band - sc);
    for (let i = n - 1; i >= 0; i--) ctx.arc(i * step + step / 2, band - sc, step / 2, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = SHEET.red; ctx.fill();
    const script = (size) => { ctx.font = `400 ${size}px 'Yellowtail', cursive`; };
    let fs = s.titleSize;
    script(fs);
    const tw = ctx.measureText(s.title).width, room = s.titleRoom || W - pad * 2;
    if (tw > room) { fs *= room / tw; script(fs); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const ty = (band - sc) / 2 + fs * 0.34, off = Math.max(2, fs * 0.045);
    ctx.fillStyle = SHEET.redDeep; ctx.fillText(s.title, W / 2 + off, ty + off);
    ctx.fillStyle = SHEET.cream; ctx.fillText(s.title, W / 2, ty);
    // a sparkle either side of it
    const star = (x, y, r) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr2 = i % 2 ? r * 0.28 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      ctx.closePath(); ctx.fill();
    };
    const half = Math.min(tw, room) / 2, sy = (band - sc) / 2;
    if (W / 2 - half - fs * 0.5 > pad * 0.6) { star(W / 2 - half - fs * 0.42, sy - fs * 0.08, fs * 0.16); star(W / 2 + half + fs * 0.42, sy + fs * 0.06, fs * 0.13); }
    // "Say hi to me", in the same hand, in the header's red
    script(s.hi.size * 1.15); ctx.fillStyle = SHEET.red;
    ctx.fillText(s.hi.text, s.hi.x, s.hi.y);
    ctx.textAlign = 'left';
    // a perforated line to tear the sheet in two
    const [px0, py0, px1, py1] = s.perf, L = Math.hypot(px1 - px0, py1 - py0);
    ctx.fillStyle = 'rgba(70,45,0,.32)';
    for (let d = 0; d < L; d += 9) { ctx.beginPath(); ctx.arc(px0 + ((px1 - px0) * d) / L, py0 + ((py1 - py0) * d) / L, 1.6, 0, TAU); ctx.fill(); }
    s.holes.forEach((h) => hole(ctx, h.img, h.x, h.y, h.w, h.h, K));
    // die-cut corners
    ctx.globalCompositeOperation = 'destination-in'; ctx.globalAlpha = 1; ctx.fillStyle = '#000';
    rr(ctx, 0, 0, W, H, 14); ctx.fill();
    return c;
  }
  // the one still blank on the sheet: cut, its cream vinyl not printed on yet
  function blankSticker(w, h) {
    const K = 3, c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    rr(ctx, 0.5, 0.5, w - 1, h - 1, h * 0.24); ctx.fillStyle = SHEET.cream; ctx.fill();
    rr(ctx, 6, 6, w - 12, h - 12, h * 0.18);
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = SHEET.ink; ctx.globalAlpha = 0.45; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.strokeStyle = SHEET.ink; ctx.lineWidth = 1.5;
    const pc = h / 2 - 9;
    ctx.beginPath(); ctx.moveTo(w / 2 - 6, pc); ctx.lineTo(w / 2 + 6, pc); ctx.moveTo(w / 2, pc - 6); ctx.lineTo(w / 2, pc + 6); ctx.stroke();
    font(ctx, 500, 10, 'mono'); ctx.fillStyle = SHEET.ink;
    spaced(ctx, 'YOUR LOGO HERE', w / 2, h / 2 + 14, 1.4, 'center');
    return { canvas: c, w, h };
  }
  // the ways to reach Aarya, each a sticker still on the sheet; S is the size of the square ones' box
  const CONTACT_DIMS = { email: [1.42, 0.6], linkedin: [0.76, 0.76], instagram: [0.76, 0.76], x: [0.76, 0.76], resume: [0.66, 0.86] };
  function contactSticker(kind, S) {
    const K = 3, [a, b] = CONTACT_DIMS[kind], w = S * a, h = S * b, c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    ctx.lineJoin = ctx.lineCap = 'round';
    if (kind === 'email') {
      rr(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = '#2442c6'; ctx.fill();
      font(ctx, 800, h * 0.36);
      const ew = h * 0.46, eh = h * 0.34, gap = h * 0.16, tw = ctx.measureText('Email').width, x0 = (w - ew - gap - tw) / 2, ey = (h - eh) / 2;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = h * 0.05;
      rr(ctx, x0, ey, ew, eh, h * 0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + h * 0.03, ey + h * 0.04); ctx.lineTo(x0 + ew / 2, ey + eh * 0.58); ctx.lineTo(x0 + ew - h * 0.03, ey + h * 0.04); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText('Email', x0 + ew + gap, h / 2 + h * 0.02);
    } else if (kind === 'linkedin') {
      rr(ctx, 0, 0, w, h, w * 0.2); ctx.fillStyle = '#0a66c2'; ctx.fill();
      font(ctx, 800, h * 0.66); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('in', w * 0.52, h * 0.53);
    } else if (kind === 'instagram') {
      rr(ctx, 0, 0, w, h, w * 0.24);
      const g = ctx.createRadialGradient(w * 0.28, h * 1.05, 0, w * 0.28, h * 1.05, w * 1.25);
      g.addColorStop(0, '#fdf497'); g.addColorStop(0.08, '#fdf497'); g.addColorStop(0.45, '#fd5949'); g.addColorStop(0.62, '#d6249f'); g.addColorStop(0.92, '#285aeb');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.075;
      rr(ctx, w * 0.22, h * 0.22, w * 0.56, h * 0.56, w * 0.17); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.13, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w * 0.655, h * 0.345, w * 0.035, 0, TAU); ctx.fill();
    } else if (kind === 'x') {
      rr(ctx, 0, 0, w, h, w * 0.2); ctx.fillStyle = '#0f0f10'; ctx.fill();
      // the X: a thin stroke one way, broken by a hollow band the other way
      const m = w * 0.25;
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'butt';
      ctx.lineWidth = w * 0.055; ctx.beginPath(); ctx.moveTo(w - m, m); ctx.lineTo(m, h - m); ctx.stroke();
      const dx = w - 2 * m, dy = h - 2 * m, l = Math.hypot(dx, dy), nx = (-dy / l) * w * 0.07, ny = (dx / l) * w * 0.07;
      ctx.beginPath();
      ctx.moveTo(m - w * 0.02 + nx, m + ny); ctx.lineTo(w - m + w * 0.02 + nx, h - m + ny);
      ctx.lineTo(w - m + w * 0.02 - nx, h - m - ny); ctx.lineTo(m - w * 0.02 - nx, m - ny); ctx.closePath();
      ctx.fillStyle = '#0f0f10'; ctx.fill();
      ctx.lineWidth = w * 0.035; ctx.lineJoin = 'miter'; ctx.stroke();
    } else {
      // a little page with a turned corner
      const f = w * 0.24;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w - f, 0); ctx.lineTo(w, f); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = '#fbf6ea'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(w - f, 0); ctx.lineTo(w - f, f); ctx.lineTo(w, f); ctx.closePath(); ctx.fillStyle = '#e4d8bd'; ctx.fill();
      font(ctx, 800, w * 0.2); ctx.fillStyle = '#1b1a18'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Résumé', w * 0.11, h * 0.36);
      ctx.fillStyle = '#c2303a'; ctx.fillRect(w * 0.11, h * 0.43, w * 0.3, h * 0.035);
      ctx.fillStyle = '#d6cdb9';
      [0.54, 0.62, 0.7, 0.78].forEach((y, i) => ctx.fillRect(w * 0.11, h * y, w * (i % 2 ? 0.58 : 0.74), h * 0.025));
    }
    return dieCut(c, w, h, 5, K);
  }
  // a rubber stamp, inked a little unevenly
  function inkStamp(text, ink = '#c2303a') {
    const K = 3, w = 112, h = 38, c = canvas(w * K, h * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    ctx.strokeStyle = ctx.fillStyle = ink; ctx.lineWidth = 2.4;
    rr(ctx, 3, 3, w - 6, h - 6, 6); ctx.stroke();
    font(ctx, 800, 17); ctx.textBaseline = 'middle';
    spaced(ctx, text, w / 2, h / 2 + 1, 3, 'center');
    ctx.globalCompositeOperation = 'destination-out';
    const r = rng(91);
    for (let i = 0; i < 320; i++) { ctx.globalAlpha = r() * 0.7; ctx.beginPath(); ctx.arc(r() * w, r() * h, 0.3 + r() * 1.2, 0, TAU); ctx.fill(); }
    return { canvas: c, w, h };
  }

  // ---- the nav: little stamps, one per part of the page, each with a drawing and its name ----
  function navStamp(kind, label, bg, ink, logo) {
    const W = 92, H = 112, K = 3, c = canvas(W * K, H * K), ctx = c.getContext('2d');
    ctx.scale(K, K);
    paper(ctx, W, H, '#fbf6ea', 60 + kind.length, 10);
    const m = 8;
    ctx.fillStyle = bg; rr(ctx, m, m, W - m * 2, H - m * 2, 3); ctx.fill();
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 2.4; ctx.lineCap = ctx.lineJoin = 'round';
    const cx = W / 2, cy = label ? 44 : H / 2;
    ctx.beginPath();
    if (kind === 'logo' && logo) {
      ctx.drawImage(logo, cx - 34, cy - 18, 68, 36);
    } else if (kind === 'hello') {
      // a postcard, with its stamp and a few lines
      rr(ctx, cx - 26, cy - 17, 52, 34, 2); ctx.stroke();
      ctx.beginPath(); ctx.rect(cx + 10, cy - 11, 10, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 20, cy - 4); ctx.lineTo(cx + 2, cy - 4); ctx.moveTo(cx - 20, cy + 3); ctx.lineTo(cx + 4, cy + 3); ctx.moveTo(cx - 20, cy + 10); ctx.lineTo(cx - 2, cy + 10); ctx.stroke();
    } else if (kind === 'work') {
      // a stamp with a hill and a sun on it
      ctx.setLineDash([2.4, 3]); rr(ctx, cx - 20, cy - 22, 40, 44, 1); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx - 14, cy + 14); ctx.quadraticCurveTo(cx - 4, cy - 6, cx + 4, cy + 4); ctx.quadraticCurveTo(cx + 9, cy - 2, cx + 14, cy + 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 7, cy - 10, 4.5, 0, TAU); ctx.stroke();
    } else if (kind === 'words') {
      // a speech bubble
      ctx.moveTo(cx - 24, cy - 6); ctx.bezierCurveTo(cx - 24, cy - 22, cx + 24, cy - 22, cx + 24, cy - 6);
      ctx.bezierCurveTo(cx + 24, cy + 8, cx - 2, cy + 12, cx - 8, cy + 10); ctx.lineTo(cx - 18, cy + 18); ctx.lineTo(cx - 15, cy + 6);
      ctx.bezierCurveTo(cx - 22, cy + 3, cx - 24, cy - 1, cx - 24, cy - 6); ctx.stroke();
      for (const dx of [-10, 0, 10]) { ctx.beginPath(); ctx.arc(cx + dx, cy - 6, 2.2, 0, TAU); ctx.fill(); }
    } else if (kind === 'colour') {
      // a brush, and the paint it left
      ctx.moveTo(cx - 22, cy + 16); ctx.bezierCurveTo(cx - 10, cy + 2, cx + 2, cy + 22, cx + 16, cy + 10); ctx.lineWidth = 5; ctx.stroke(); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(cx - 4, cy + 2); ctx.lineTo(cx + 18, cy - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 4, cy + 2); ctx.quadraticCurveTo(cx - 12, cy + 4, cx - 10, cy + 10); ctx.quadraticCurveTo(cx - 4, cy + 10, cx - 4, cy + 2); ctx.fill();
    } else if (kind === 'hi') {
      // an envelope
      rr(ctx, cx - 24, cy - 16, 48, 32, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 22, cy - 14); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx + 22, cy - 14); ctx.stroke();
    }
    if (label) {
      ctx.font = "600 10.5px 'Geist Mono', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      spaced(ctx, label.toUpperCase(), cx, H - m - 12, 0.8, 'center');
    }
    perforate(ctx, W, H, 3.6);
    return c;
  }

  return { navStamp, rng, paper, stickerSheet, blankSticker, contactSticker, inkStamp, CONTACT_DIMS, testimonial, stampBack, dieCut, cleanSticker, letter, stamp, sticker, front, signature, back, coverStamp, openMark, title, SW, SH, backLayout, SLOT_ROT };
})();
