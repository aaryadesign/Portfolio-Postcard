// The colouring page at the very end: a line drawing of this same picnic on a sheet of watercolour paper,
// and the paint that goes on it. The paint sits under the lines, soaked into the paper, so the lines
// always stay crisp on top.
window.Colour = (() => {
  const TAU = Math.PI * 2, INK = '#141210', LW = 5;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; };

  // The drawing, in design units: 1000 tall, and as wide as the page (1450 on a wide screen, 840 on a phone).
  // Every line wobbles a little, as if drawn with a brush pen. Things in front rub out the lines behind them
  // rather than covering them, so the page stays clear for paint underneath.
  function lineArt(W, H, K, portrait) {
    const c = canvas(W * K, H * K), ctx = c.getContext('2d');
    const s = (H * K) / 1000;
    ctx.scale(s, s);
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const r = Print.rng(portrait ? 23 : 17);
    const j = (a) => (r() - 0.5) * 2 * a;

    function path(p, closed) {
      const n = p.length, at = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const a = at(i - 1), b = at(i), d = at(i + 1), e = at(i + 2);
        ctx.bezierCurveTo(b[0] + (d[0] - a[0]) / 6, b[1] + (d[1] - a[1]) / 6, d[0] - (e[0] - b[0]) / 6, d[1] - (e[1] - b[1]) / 6, d[0], d[1]);
      }
      if (closed) ctx.closePath();
    }
    function poly(p, closed) {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      if (closed) ctx.closePath();
    }
    // a line through the points; `cut` rubs out what is behind its shape first, `fill` inks it in
    function draw(pts, o = {}) {
      const a = o.j == null ? 1.2 : o.j, p = pts.map(([x, y]) => [x + j(a), y + j(a)]);
      (o.sharp ? poly : path)(p, o.closed);
      if (o.cut) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); ctx.restore(); }
      if (o.fill) ctx.fill();
      ctx.lineWidth = (o.w || LW) * (0.9 + r() * 0.2);
      ctx.stroke();
    }
    // an ellipse, gently out of round
    function ell(cx, cy, rx, ry, rot = 0, n = 18, wob = 0.03) {
      const ph = r() * TAU, out = [], co = Math.cos(rot), si = Math.sin(rot);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, k = 1 + wob * Math.sin(a * 2 + ph) + wob * 0.6 * Math.sin(a * 3 + ph * 1.7);
        const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
        out.push([cx + x * co - y * si, cy + x * si + y * co]);
      }
      return out;
    }
    // a round thing with a scalloped edge: a tree's crown, a cloud
    function scallop(cx, cy, R, bumps, depth, ry = 1) {
      const out = [], n = bumps * 7, ph = r() * TAU;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, k = 1 - depth + depth * Math.abs(Math.sin((a * bumps) / 2 + ph)) + 0.03 * Math.sin(a * 3);
        out.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k * ry]);
      }
      return out;
    }
    // a lumpy top over a flat bottom: bushes, clouds
    function lumps(x0, x1, base, bumps) {
      const out = [], n = 44;
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        let h = 0;
        for (const [cx, R] of bumps) h = Math.max(h, Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx))));
        out.push([x, base - h]);
      }
      out.push([x1 - 6, base + 2], [(x0 + x1) / 2, base + 4], [x0 + 6, base + 2]);
      return out;
    }
    const rotate = (pts, cx, cy, a) => pts.map(([x, y]) => {
      const dx = x - cx, dy = y - cy;
      return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
    });

    function sun(x, y, R) {
      draw(ell(x, y, R, R, 0, 16, 0.02), { closed: true });
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU + 0.3, b = a + 0.12;
        draw([[x + Math.cos(a) * (R + 16), y + Math.sin(a) * (R + 16)], [x + Math.cos(b) * (R + 30), y + Math.sin(b) * (R + 30)], [x + Math.cos(a) * (R + 46), y + Math.sin(a) * (R + 46)]], { j: 0.8 });
      }
    }
    function cloud(x, y, w) {
      draw(lumps(x - w / 2, x + w / 2, y, [[x - w * 0.3, w * 0.17], [x - w * 0.04, w * 0.27], [x + w * 0.27, w * 0.2]]), { closed: true, j: 0.6 });
    }
    function bird(x, y, k) {
      draw([[x - 16 * k, y - 4 * k], [x - 8 * k, y - 10 * k], [x, y], [x + 8 * k, y - 10 * k], [x + 16 * k, y - 4 * k]], { j: 0.4, w: 4 });
    }
    function horizon(x0, x1, y, amp) {
      const p = [];
      for (let i = 0; i <= 10; i++) { const x = x0 + ((x1 - x0) * i) / 10; p.push([x, y + amp * Math.sin((i / 10) * Math.PI * 2.2 + 0.6)]); }
      draw(p, { j: 1.5 });
    }
    function tree(x, base, top, R) {
      // the trunk, flaring at the roots, and the crown over it with a few apples in it
      const by = top + R * 0.78;
      const L = [[x - 34, base + 4], [x - 22, base - 14], [x - 17, (base + by) / 2], [x - 13, by]];
      const Rt = [[x + 14, by], [x + 18, (base + by) / 2], [x + 24, base - 14], [x + 38, base + 6]];
      const trunk = [...L, ...Rt];
      ctx.save(); poly(trunk, true); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); ctx.restore();
      draw(L); draw(Rt);
      draw([[x - 4, base - 40], [x + 2, base - 70], [x - 2, base - 96]], { w: 3.5, j: 0.6 });
      draw(scallop(x, top, R, 9, 0.16, 0.92), { closed: true, cut: true, j: 0.8 });
      for (const [dx, dy] of [[-0.12, -0.6], [0.55, -0.1], [-0.55, 0.12], [0.2, 0.42]]) {
        const ax = x + dx * R, ay = top + dy * R, ar = R * 0.075;
        draw(ell(ax, ay, ar, ar, 0, 12, 0.03), { closed: true, j: 0.4, w: 4 });
        draw([[ax, ay - ar], [ax + 3, ay - ar - 9]], { j: 0.3, w: 3.5 });
      }
    }
    function bush(x0, x1, base, n) {
      const w = x1 - x0, b = [];
      for (let i = 0; i < n; i++) b.push([x0 + w * ((i + 0.5) / n) + j(w * 0.03), w / n * (0.62 + r() * 0.2)]);
      draw(lumps(x0, x1, base, b), { closed: true, cut: true, j: 0.6 });
    }
    function mat(t, tx0, tx1, b, bx0, bx1) {
      // the gingham picnic mat, seen at an angle: its checks get bigger toward you, with a fringe at both ends
      draw([[tx0, t], [tx1, t], [bx1, b], [bx0, b]], { closed: true, sharp: true, cut: true, j: 1.6 });
      const N = 7, M = 5, fy = (f) => t + (b - t) * Math.pow(f, 1.25);
      for (let i = 1; i < N; i++) {
        const f = i / N;
        draw([[tx0 + (tx1 - tx0) * f, t], [bx0 + (bx1 - bx0) * f, b]], { sharp: true, w: 3.6, j: 1 });
      }
      for (let i = 1; i < M; i++) {
        const y = fy(i / M), g = (y - t) / (b - t);
        draw([[tx0 + (bx0 - tx0) * g, y], [tx1 + (bx1 - tx1) * g, y]], { sharp: true, w: 3.6, j: 1 });
      }
      for (const [y, x0, x1, d] of [[t, tx0, tx1, -1], [b, bx0, bx1, 1]]) {
        const n = Math.round((x1 - x0) / 28);
        for (let i = 0; i <= n; i++) {
          const x = x0 + ((x1 - x0) * i) / n;
          draw([[x, y + d * 4], [x + j(2), y + d * (14 + r() * 4)]], { sharp: true, w: 3, j: 0.4 });
        }
      }
    }
    function basket(x, y, k) {
      // the handle is a band, open in the middle so the mat shows through
      const H = [], Hi = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + (i / 10) * Math.PI;
        H.push([x + Math.cos(a) * 84 * k, y - 40 * k + Math.sin(a) * 100 * k]);
        Hi.push([x + Math.cos(a) * 70 * k, y - 40 * k + Math.sin(a) * 86 * k]);
      }
      draw([...H, ...Hi.reverse()], { closed: true, cut: true, j: 0.8 });
      const body = [[x - 104 * k, y - 40 * k], [x + 104 * k, y - 40 * k], [x + 92 * k, y + 34 * k], [x + 78 * k, y + 52 * k], [x - 78 * k, y + 52 * k], [x - 92 * k, y + 34 * k]];
      draw(body, { closed: true, sharp: true, cut: true, j: 1 });
      draw([[x - 102 * k, y - 22 * k], [x + 102 * k, y - 22 * k]], { sharp: true, w: 4 });
      for (const [yy, ww] of [[0, 97], [24, 89]]) draw([[x - ww * k, y + yy * k], [x + ww * k, y + yy * k]], { sharp: true, w: 3.4, j: 0.8 });
      for (let row = 0; row < 3; row++) {
        const y0 = [-22, 0, 24][row], y1 = [0, 24, 50][row], ww = [97, 89, 78][row];
        for (let i = -3; i <= 3; i++) { const xx = x + (i + (row % 2 ? 0.5 : 0)) * ww * k * 0.27; if (Math.abs(xx - x) < ww * k * 0.9) draw([[xx, y + y0 * k + 4], [xx + 3, y + y1 * k - 4]], { sharp: true, w: 3, j: 0.6 }); }
      }
      // a napkin poking out of the top
      draw([[x - 70 * k, y - 40 * k], [x - 52 * k, y - 76 * k], [x - 30 * k, y - 58 * k], [x - 6 * k, y - 84 * k], [x + 16 * k, y - 40 * k]], { closed: true, cut: true, j: 0.8 });
    }
    function plate(x, y, k) {
      draw(ell(x, y, 100 * k, 36 * k, 0, 22, 0.015), { closed: true, cut: true, j: 0.6 });
      draw(ell(x, y + 2 * k, 74 * k, 25 * k, 0, 20, 0.02), { closed: true, j: 0.5, w: 3.4 });
      // two sandwiches, cut corner to corner, standing up
      for (const [dx, a] of [[-26, -0.12], [30, 0.14]]) {
        const cx = x + dx * k, cy = y + 4 * k;
        const t = rotate([[cx - 34 * k, cy + 6 * k], [cx + 6 * k, cy - 62 * k], [cx + 30 * k, cy + 8 * k]], cx, cy, a);
        draw(t, { closed: true, sharp: true, cut: true, j: 0.8 });
        const f = rotate([[cx - 25 * k, cy - 6 * k], [cx + 2 * k, cy - 50 * k]], cx, cy, a);
        draw(f, { sharp: true, w: 3.4, j: 0.6 });
      }
    }
    function melon(x, y, k) {
      // a slice of watermelon lying on its side
      const O = [], I = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI;
        O.push([x + Math.cos(a) * 70 * k, y + Math.sin(a) * 52 * k]);
        I.push([x + Math.cos(a) * 56 * k, y + Math.sin(a) * 40 * k]);
      }
      draw(O, { closed: true, cut: true, j: 0.6 });
      draw(I, { j: 0.6, w: 3.6 });
      for (const [dx, dy] of [[-30, 10], [-8, 22], [16, 12], [34, 6], [4, 4]]) {
        draw(ell(x + dx * k, y + dy * k, 3.4 * k, 5.4 * k, 0.4, 8, 0.02), { closed: true, fill: true, w: 2, j: 0.2 });
      }
    }
    function mug(x, y, k) {
      draw(ell(x + 34 * k, y + 2 * k, 20 * k, 22 * k, 0, 12, 0.03), { closed: true, j: 0.4 });
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.ellipse(x + 34 * k, y + 2 * k, 10 * k, 12 * k, 0, 0, TAU); ctx.fill(); ctx.restore();
      draw(ell(x + 34 * k, y + 2 * k, 10 * k, 12 * k, 0, 10, 0.03), { closed: true, j: 0.3, w: 3.4 });
      const body = [[x - 34 * k, y - 38 * k], [x + 34 * k, y - 38 * k], [x + 32 * k, y + 34 * k], [x + 24 * k, y + 42 * k], [x - 24 * k, y + 42 * k], [x - 32 * k, y + 34 * k]];
      draw(body, { closed: true, cut: true, j: 0.8 });
      draw(ell(x, y - 38 * k, 34 * k, 9 * k, 0, 16, 0.02), { closed: true, j: 0.4, w: 3.6 });
      for (const dx of [-10, 12]) draw([[x + dx * k, y - 54 * k], [x + (dx - 8) * k, y - 70 * k], [x + (dx + 6) * k, y - 86 * k], [x + (dx - 4) * k, y - 104 * k]], { j: 0.4, w: 3.4 });
    }
    function postcard(x, y, k, a) {
      // the postcard from the start, with its stamp and a few lines of writing
      const card = rotate([[x - 70 * k, y - 46 * k], [x + 70 * k, y - 46 * k], [x + 70 * k, y + 46 * k], [x - 70 * k, y + 46 * k]], x, y, a);
      draw(card, { closed: true, sharp: true, cut: true, j: 0.8 });
      const st = [], sx = x + 42 * k, sy = y - 22 * k, w = 20 * k, h = 15 * k, b = 3.6 * k;
      const edge = (x0, y0, x1, y1, n, nx, ny) => { for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; st.push([x0 + (x1 - x0) * (i / n), y0 + (y1 - y0) * (i / n)], [x0 + (x1 - x0) * f + nx * b, y0 + (y1 - y0) * f + ny * b]); } };
      edge(sx - w, sy - h, sx + w, sy - h, 5, 0, -1); edge(sx + w, sy - h, sx + w, sy + h, 4, 1, 0);
      edge(sx + w, sy + h, sx - w, sy + h, 5, 0, 1); edge(sx - w, sy + h, sx - w, sy - h, 4, -1, 0);
      draw(rotate(st, x, y, a), { closed: true, j: 0.2, w: 3 });
      for (const [l, yy] of [[60, 4], [70, 18], [50, 32]]) draw(rotate([[x - 56 * k, y + yy * k], [x + (l - 56) * k, y + yy * k]], x, y, a), { w: 3, j: 0.6 });
      draw(rotate([[x - 56 * k, y - 26 * k], [x - 10 * k, y - 32 * k], [x - 30 * k, y - 18 * k]], x, y, a), { w: 3, j: 0.6 });
    }
    function daisy(x, y, k, stem) {
      draw([[x, y], [x + 4 * k, y + stem * 0.5], [x - 2 * k, y + stem]], { j: 0.6 });
      const lx = x + 2 * k, ly = y + stem * 0.62;
      draw([[lx, ly], [lx + 18 * k, ly - 16 * k], [lx + 38 * k, ly - 14 * k], [lx + 22 * k, ly + 2 * k]], { closed: true, cut: true, j: 0.5, w: 4 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.2;
        draw(ell(x + Math.cos(a) * 26 * k, y + Math.sin(a) * 26 * k, 17 * k, 8.5 * k, a, 12, 0.03), { closed: true, cut: true, j: 0.3, w: 4 });
      }
      draw(ell(x, y, 13 * k, 13 * k, 0, 12, 0.03), { closed: true, cut: true, j: 0.3, w: 4 });
    }
    function tulip(x, y, k, stem) {
      draw([[x, y + 4 * k], [x - 3 * k, y + stem * 0.5], [x + 2 * k, y + stem]], { j: 0.6 });
      for (const d of [-1, 1]) draw([[x, y + stem], [x + d * 30 * k, y + stem * 0.55], [x + d * 22 * k, y + stem * 0.3], [x + d * 8 * k, y + stem * 0.7]], { closed: true, cut: true, j: 0.5, w: 4 });
      draw([[x - 22 * k, y - 8 * k], [x - 26 * k, y - 44 * k], [x - 10 * k, y - 30 * k], [x, y - 50 * k], [x + 10 * k, y - 30 * k], [x + 26 * k, y - 44 * k], [x + 22 * k, y - 8 * k], [x + 8 * k, y + 8 * k], [x - 8 * k, y + 8 * k]], { closed: true, cut: true, j: 0.5 });
    }
    function tuft(x, y, k) {
      draw([[x - 14 * k, y], [x - 9 * k, y - 16 * k], [x - 4 * k, y - 2 * k], [x, y - 24 * k], [x + 5 * k, y - 2 * k], [x + 10 * k, y - 17 * k], [x + 15 * k, y]], { sharp: true, j: 0.8, w: 3.8 });
    }
    function butterfly(x, y, k) {
      for (const d of [-1, 1]) {
        draw(ell(x + d * 30 * k, y - 18 * k, 30 * k, 22 * k, d * -0.5, 14, 0.04), { closed: true, cut: true, j: 0.4, w: 4 });
        draw(ell(x + d * 22 * k, y + 20 * k, 19 * k, 15 * k, d * 0.6, 12, 0.04), { closed: true, cut: true, j: 0.4, w: 4 });
        draw(ell(x + d * 32 * k, y - 20 * k, 7 * k, 7 * k, 0, 10, 0.04), { closed: true, j: 0.3, w: 3 });
        draw([[x + d * 2 * k, y - 26 * k], [x + d * 10 * k, y - 48 * k], [x + d * 20 * k, y - 54 * k]], { j: 0.3, w: 3 });
      }
      draw(ell(x, y, 6 * k, 30 * k, 0, 12, 0.02), { closed: true, cut: true, j: 0.3, w: 4 });
    }

    if (!portrait) {
      // wide: tree on the left, sun and clouds over the hill, the picnic in front, flowers at both ends
      horizon(40, 1410, 556, 12);
      sun(1250, 168, 56); cloud(560, 176, 250); cloud(890, 268, 190);
      bird(720, 106, 1); bird(778, 136, 0.8); bird(680, 150, 0.7);
      bush(1030, 1410, 562, 5);
      tree(232, 612, 290, 168);
      butterfly(1010, 410, 1.15);
      for (const [x, y, k] of [[96, 650, 1], [400, 612, 0.9], [1140, 622, 0.9], [1340, 640, 1], [60, 960, 1], [330, 966, 0.9], [1220, 968, 1], [1408, 930, 0.8], [700, 970, 0.8]]) tuft(x, y, k);
      mat(630, 480, 1080, 908, 360, 1200);
      basket(590, 712, 1);
      melon(950, 686, 1);
      plate(812, 806, 1);
      postcard(560, 858, 0.95, -0.12);
      mug(1066, 830, 0.95);
      daisy(120, 780, 1.2, 150); daisy(254, 866, 0.95, 104); daisy(1296, 760, 1.15, 160); tulip(1392, 840, 1.05, 120);
    } else {
      // a phone: the same picnic, stacked tighter
      horizon(30, 810, 518, 9);
      sun(690, 150, 46); cloud(400, 124, 190); bird(540, 236, 0.8); bird(586, 262, 0.65);
      bush(560, 810, 524, 3);
      tree(160, 572, 274, 118);
      butterfly(480, 384, 0.8);
      for (const [x, y, k] of [[46, 600, 0.9], [330, 572, 0.8], [520, 580, 0.8], [800, 600, 0.8], [40, 966, 0.9], [420, 970, 0.8], [790, 960, 0.8]]) tuft(x, y, k);
      mat(616, 170, 690, 904, 64, 784);
      basket(300, 694, 0.82);
      melon(574, 690, 0.84);
      plate(442, 812, 0.86);
      postcard(206, 846, 0.8, -0.12);
      mug(684, 832, 0.78);
      daisy(70, 730, 0.8, 130); tulip(790, 690, 0.78, 120);
    }
    return c;
  }

  // The page and its paint. `u, v` are -0.5..0.5 across the page. Painting goes on its own layer, soaked into
  // the paper under the lines; the eraser lifts it back off. A fresh start fades the paint away.
  function painter(W, H, K, portrait, old) {
    const cw = Math.round(W * K), ch = Math.round(H * K);
    const out = canvas(cw, ch), paper = canvas(cw, ch), paint = canvas(cw, ch), lines = lineArt(W, H, K, portrait);
    Print.paper(paper.getContext('2d'), W, H, '#fbf7ec', 41, 15);
    const o = out.getContext('2d'), p = paint.getContext('2d');
    p.lineCap = p.lineJoin = 'round';
    // what was painted before a resize carries over, stretched to the new page
    if (old && old.portrait === portrait) p.drawImage(old.paint, 0, 0, cw, ch);
    const st = { colour: old ? old.colour : '#3f9a4f', eraser: old ? old.eraser : false, size: old ? old.brush : 1, last: null, fade: 0, dirty: true };
    const brush = () => H * K * (portrait ? 0.042 : 0.036) * st.size * (st.eraser ? 1.5 : 1);
    const at = (u, v) => [(u + 0.5) * cw, (v + 0.5) * ch];
    function dab(a, b) {
      p.globalCompositeOperation = st.eraser ? 'destination-out' : 'source-over';
      p.strokeStyle = p.fillStyle = st.colour;
      p.lineWidth = brush();
      p.beginPath();
      if (!a) { p.arc(b[0], b[1], brush() / 2, 0, TAU); p.fill(); } else { p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.stroke(); }
      st.dirty = true;
    }
    function compose(k = 1) {
      o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
      o.drawImage(paper, 0, 0);
      o.globalCompositeOperation = 'multiply'; o.globalAlpha = 0.9 * k;
      o.drawImage(paint, 0, 0);
      o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
      o.drawImage(lines, 0, 0);
    }
    compose();
    return {
      canvas: out, paint, portrait,
      get colour() { return st.colour; },
      get eraser() { return st.eraser; },
      // how big the brush is, against the usual: 0.45 fine, 1 middling, 2.1 broad
      get brush() { return st.size; },
      setSize(k) { st.size = k; },
      // the brush's width on the page, in world px
      get size() { return brush() / K; },
      set(colour) { st.colour = colour; st.eraser = false; },
      erase(on) { st.eraser = on; },
      down(u, v) { if (st.fade) return; const b = at(u, v); dab(null, b); st.last = b; },
      move(u, v) { if (!st.last) return; const b = at(u, v); dab(st.last, b); st.last = b; },
      up() { st.last = null; },
      clear(now) { if (!st.fade) st.fade = now; st.last = null; },
      // once a frame: true when the page has changed and needs drawing again
      tick(now) {
        if (st.fade) {
          const k = Math.min(1, (now - st.fade) / 450);
          compose(1 - k * k);
          if (k >= 1) { p.clearRect(0, 0, cw, ch); st.fade = 0; compose(); }
          return true;
        }
        if (!st.dirty) return false;
        st.dirty = false;
        compose();
        return true;
      },
      save(name) {
        compose();
        out.toBlob((b) => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b); a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }, 'image/png');
      },
    };
  }

  return { painter, lineArt };
})();
