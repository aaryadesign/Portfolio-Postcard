// Scroll story: the postcard is picked up and turned over, its stamp peels off and leads into the work.
(() => {
  // ?tick swaps rAF for timers, only so a hidden preview tab keeps animating
  const raf = /[?&]tick/.test(location.search) ? (f) => setTimeout(() => f(performance.now()), 16) : (f) => requestAnimationFrame(f);
  const $ = (s) => document.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const backOut = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const smooth = (t) => t * t * (3 - 2 * t);

  const INTRO = 'A product designer. For three years I designed the heavy stuff: fuel logistics, ERPs, a 200-store retail chain, and 27 client projects across 7 countries at Whatmatters. Now AI lets designers build, so I ship what I design: three websites and two apps lately. The latest, Goalkeeper, is a voice assistant in testing, with 35 people waiting. Next, I want a team where I own the work and its numbers.';
  const ADDRESS = ['Aarya Shah', 'AI Product Designer', '3+ years of experience'];

  // The projects, in order. The first is the stamp on the back of the postcard, which peels off and leads
  // the row; the rest lie along the mat after it. The art is Aarya's own; each gets postmarked as you reach
  // it, in a corner clear of the picture. Hovering one turns it over to what it was, written on the back.
  const COVER = { id: 'goalkeeper', name: 'Goalkeeper',
    summary: 'A voice assistant for everyday errands. Say what you need and it drafts it, compares prices and opens the right app to finish. The website is live, the app is in testing and 35+ people are on the waitlist.' };
  const PROJECTS = [
    { id: 'phonepe', ink: '#2a3a7a', pm: { x: 352, y: 224, R: 40 }, name: 'PhonePe Car Insurance',
      summary: 'A case study redesigning the car insurance flow in PhonePe, to make the whole journey clearer and easier to finish.' },
    { id: 'ride-through-the-valley', ink: '#7a1f2a', pm: { x: 90, y: 220, R: 40 }, name: 'Ride Through the Valley',
      summary: 'A game I built: a horse rider travels through a valley as the weather changes around them.' },
    { id: 'dayro', ink: '#7a1f2a', pm: { x: 90, y: 224, R: 40 }, name: 'Dayro',
      summary: 'A consumer IoT app for running a smart home from your phone.' },
    { id: 'lamad', ink: '#2a3a7a', pm: { x: 352, y: 220, R: 40 }, name: 'Lamad',
      summary: 'An ERP for a company that had never used enterprise software before.' },
    { id: 'transporter', ink: '#2a3a7a', pm: { x: 352, y: 222, R: 40 }, name: 'Transporter',
      summary: 'Fuel logistics across five connected platforms, from the depot to the road.' },
    { id: 'quickmart', ink: '#7a1f2a', pm: { x: 90, y: 220, R: 40 }, name: 'QuickMart',
      summary: 'The backend behind a retail chain of 200 stores.' },
  ];
  const ROT = [-0.035, 0.04, -0.025, 0.05, -0.04, 0.035, -0.03];
  // What people said, each written on the back of a stamp. The first is the last project's stamp, turned over.
  const TESTIMONIALS = [
    { name: 'Heet Jivani', role: 'Founder @ Stairs Media', client: 'stairs',
      quote: 'I had a great experience working with Aarya on designing my firm\u2019s website. He is highly professional, creative, and very responsive throughout the process. He understood our requirements clearly and delivered a modern, clean, and high-quality website. I am fully satisfied with his work and would definitely recommend him to anyone looking for a reliable and skilled web designer.' },
    { name: 'Dhrumil Patel', role: 'CEO @ Logicbric', client: 'logicbric',
      quote: 'He is a rare talent in the UI/UX space who truly understands the balance between aesthetic elegance and functional usability. His designs didn\u2019t just make our product look better; they significantly improved our user engagement and streamlined the overall flow. If you\u2019re looking for a designer who prioritizes the user journey as much as the visual identity, I couldn\u2019t recommend him more highly.' },
    { name: 'Yashvi Mehta', role: 'Marketing Consultant', client: null,
      quote: 'I enjoyed the timely delivery. His ability to work and grasp on feedback made it very easy going for one to work with him as a designer. Aarya comes with a sharp sense of research in his designs.' },
    { name: 'Bhavik Patel', role: 'CEO @ Rysysth Technologies', client: 'rysysth',
      quote: 'The UI/UX project with Aarya was a great learning experience. The guidance was clear and practical, helping me understand user-centred design, wire-framing, and usability principles. The feedback was constructive and improved my design thinking and confidence.' },
  ];
  const TROT = [-0.04, 0.035, -0.03, 0.045, -0.02, 0.03];
  // client stickers: the ones whose people wrote are stuck on their card, the rest lie on the mat between
  const CLIENTS = ['byd', 'cwsr', 'daixta', 'lamad', 'logicbric', 'rcmo', 'rysysth', 'stairs', 'tidymy', 'zanride'];
  const LOOSE = CLIENTS.filter((id) => !TESTIMONIALS.some((t) => t.client === id));
  const LOOSE_ROT = [-0.12, 0.18, -0.06, 0.1, -0.2, 0.07, 0.14, -0.1];
  // the section title, one sticker per letter, each in its own typeface; mostly black and white, a few in colour
  const TITLE = [
    ['S', { family: 'Shrikhand', shape: 'cut', ink: '#2448b8' }, 1.04, -0.08, 0.02],
    ['e', { family: 'Fraunces', weight: 900, style: 'italic', shape: 'tile', ink: '#141414', bg: '#ffffff' }, 0.9, 0.06, -0.04],
    ['l', { family: 'Bebas Neue', shape: 'tile', ink: '#ffffff', bg: '#141414' }, 1.02, -0.04, 0.03],
    ['e', { family: 'Cherry Bomb One', shape: 'circle', ink: '#141414', bg: '#f6c22d' }, 0.84, 0.1, 0.06],
    ['c', { family: 'Abril Fatface', shape: 'cut', ink: '#141414' }, 1.06, -0.05, -0.02],
    ['t', { family: 'Rubik Mono One', shape: 'tile', ink: '#ffffff', bg: '#e8452c' }, 0.82, 0.07, -0.02],
    ['e', { family: 'DM Serif Display', style: 'italic', shape: 'tile', ink: '#141414', bg: '#ffffff' }, 0.96, -0.06, 0.04],
    ['d', { family: 'Bowlby One', shape: 'cut', ink: '#141414' }, 1, 0.04, -0.03],
    [' '],
    ['w', { family: 'Bungee', shape: 'tile', ink: '#ffffff', bg: '#2f8f4e' }, 0.86, 0.09, 0.02],
    ['o', { family: 'Instrument Serif', style: 'italic', shape: 'circle', ink: '#141414', bg: '#ffffff' }, 1.02, -0.05, -0.04],
    ['r', { family: 'Archivo Black', shape: 'cut', ink: '#e8452c' }, 1, 0.08, 0.03],
    ['k', { family: 'Abril Fatface', shape: 'tile', ink: '#ffffff', bg: '#141414' }, 1.05, -0.07, -0.02],
  ];
  // How to reach Aarya: each is a sticker still on the sheet at the end. The email is copied when tapped,
  // the rest open; one without a link still peels, it just goes nowhere.
  const CONTACT = [
    { id: 'email', name: 'Email', value: 'aaryashah.design@gmail.com' },
    { id: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/aaryahshah/' },
    { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/aaryashahh' },
    { id: 'x', name: 'X', url: 'https://x.com/aaryashahh' },
    { id: 'resume', name: 'R\u00e9sum\u00e9', url: 'https://cdn.jsdelivr.net/gh/aaryadesign/Portfolio@aabe6dceda9a1a5609f563029961c5be95a03131/Aarya_Shah_Resume_linked.pdf' },
  ];
  const RESUME = CONTACT.findIndex((c) => c.id === 'resume');
  const QUEUE = 0.7; // stamps waiting in the row are this much smaller than the one you are looking at
  const COLORS = { base: [0.98, 0.83, 0.835], dye: [0.8, 0.1, 0.18] };

  // Timeline, in viewport heights of scroll
  const T = { flip0: 0.12, flip1: 1.3, peel0: 1.85, peel1: 2.25, trav1: 3.35 };
  T.proj1 = T.trav1 + PROJECTS.length;
  // then the last stamp turns over into the first testimonial, and the mat scrolls down like a page
  T.tf0 = T.proj1 + 0.35;
  T.tf1 = T.tf0 + 1.1;
  T.end = T.tf1;
  // the paints for the colouring page, from the mat, the sheet and the garden
  const SIZES = [['Fine brush', 0.45], ['Medium brush', 1], ['Broad brush', 2.1]];
  const PAINTS = [['Red', '#d8322a'], ['Pink', '#f08aa8'], ['Yellow', '#ffbe12'], ['Green', '#3f9a4f'], ['Blue', '#4f86d9'], ['Brown', '#9b6234']];

  const cvs = $('#scene'), track = $('#track');
  // the same ways to get in touch, as real links for screen readers and search
  {
    const ul = document.createElement('ul'), h = document.createElement('h2');
    h.textContent = 'Get in touch';
    CONTACT.forEach((c) => {
      const href = c.id === 'email' ? c.value && `mailto:${c.value}` : c.url;
      if (!href) return;
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = href; a.textContent = c.id === 'email' ? c.value : c.name;
      li.appendChild(a); ul.appendChild(li);
    });
    if (ul.children.length) $('.copy').append(h, ul);
  }
  let scene = null;
  try { scene = Scene.create(cvs); } catch (e) { console.error(e); }
  if (!scene) { document.body.classList.add('nogl'); return; }

  const today = new Date();
  const DATE = [`${today.toLocaleString('en', { month: 'short' }).toUpperCase()} ${today.getDate()}`, String(today.getFullYear())];

  let vw = 0, vh = 0, dpr = 1, portrait = false, cw, ch, SWd, SHd, spacing, Xc, yRow, maxCam;
  let tex = null, cardKey = '', titles = null, fontsReady = false, startAt = 0;
  const stampTex = [];
  let coverBack = null;
  let sec = null, testTex = [], testKey = '', titleTex = null, assetsReady = false;
  // "Your logo here": tap it to leave an email, kept in Supabase. The key is the publishable one, and the
  // table only lets this page add a row, never read any back.
  const SUPABASE = { url: 'https://nirngzcuzobmafojwdvw.supabase.co', key: 'sb_publishable_7-c08gZol6ltOg_52BOtXA_Cb6buNeU', table: 'sticker_sheet_leads' };
  const logo = { open: false, at: 0, anchor: null, savedAt: 0 };
  try { if (localStorage.getItem('picnic-logo') === '1') logo.savedAt = 1; } catch (e) {}
  let sheetTex = null, sheetKey = '', contactTex = [], contactKey = '', copiedTex = null, blankTex = null, savedTex = null;
  let foot = null, painter = null, footTex = null, footKey = '', flashTex = null;
  const clientTex = {}, assets = { clients: {}, title: null, stamps: {} };

  function layout() {
    vw = innerWidth; vh = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    portrait = vw < vh * 0.85;
    if (portrait) {
      cw = Math.min(vw * 0.86, 460); ch = cw * 1.42;
      if (ch > vh * 0.74) { ch = vh * 0.74; cw = ch / 1.42; }
    } else {
      cw = clamp(Math.min(vw * 0.5, vh * 0.62 * 1.5), 300, 720); ch = cw / 1.5;
    }
    SWd = portrait ? Math.min(vw * 0.84, 400) : clamp(Math.min(vw * 0.32, (vh * 0.5 * Print.SW) / Print.SH), 300, 520);
    SHd = (SWd * Print.SH) / Print.SW;
    spacing = SWd * (0.5 + QUEUE / 2) + (portrait ? vw * 0.35 : clamp(vw * 0.06, 56, 120));
    Xc = vw * 0.5 + cw * 0.3 + SWd * 0.3;
    yRow = portrait ? vh * 0.05 : vh * 0.08;
    maxCam = Xc + spacing * PROJECTS.length;
    sec = sectionLayout();
    // The page goes round the mat: right along the stamps, down the testimonials to the sticker sheet under
    // them (the footer), where the portfolio ends. After that, just for fun, the Résumé sticker peels off
    // the sheet and flies left along the bottom, turning over into the colouring page, straight under the
    // postcard; then up the side, where the page turns over again into the postcard, and it all starts again
    T.down = T.tf0 + Math.max(T.tf1 - T.tf0, sec.bottom / vh - 0.5);
    T.sheet = T.tf0 + Math.max(0, (sec.sheet.y - sec.sheet.H / 2) / vh - 0.3);
    T.end = T.down;
    T.s0 = T.down + 0.45; T.s1 = T.s0 + 2;
    T.u0 = T.s1 + 0.35; T.u1 = T.u0 + 1.6;
    const yb = (T.down - T.tf0) * vh;
    foot = footLayout(yb);
    track.style.height = (T.u1 + 1) * vh + 'px';

    // branches overhead: [x, y, angle, length, blur, seed, bend, -], in world px
    const B = [], K = [], Lm = Math.max(vw, vh);
    const add = (x, y, a, len, blur, seed, bend) => B.push([x, y, a, len, blur, seed, bend, 0]);
    if (portrait) {
      // a phone sees a small patch of mat, so the tree keeps to the edges
      add(vw / 2 + 60, -vh / 2 - 60, 2.2, vh * 0.42, 10, 1.3, 0.05);
      add(-vw / 2 - 50, vh / 2 + 40, -0.9, vh * 0.34, 14, 4.1, 0.06);
      K.push([vw / 2 + 50, -vh / 2 - 20, 170, 0]);
    } else {
      add(vw / 2 + 70, -vh / 2 - 90, 2.3, Math.max(620, Lm * 0.52), 10, 1.3, 0.05);
      add(vw / 2 + 90, vh * 0.1, 3.1, Math.max(420, Lm * 0.34), 17, 2.7, -0.07);
      add(-vw / 2 - 70, vh / 2 + 70, -0.8, Math.max(460, Lm * 0.36), 14, 4.1, 0.06);
      K.push([vw / 2 + 30, -vh / 2 - 10, Math.max(300, Lm * 0.26), 0]);
    }
    for (let k = 0; k <= PROJECTS.length; k++) {
      const x = Xc + (k + 0.5) * spacing;
      if (k % 2 === 0) add(x + 120, -vh / 2 - 80, 2.0 + 0.2 * Math.sin(k), Math.max(480, vh * 0.6), 10 + (k % 3) * 4, 5 + k * 1.7, 0.05);
      else add(x - 100, vh / 2 + 80, -1.15 + 0.2 * Math.cos(k), Math.max(440, vh * 0.52), 12 + (k % 2) * 5, 6 + k * 2.1, -0.05);
    }
    K.push([Xc + 2.5 * spacing, vh / 2 + 30, 300, 0], [maxCam + vw * 0.3, -vh / 2, 340, 0]);
    // and over the column of testimonials below the last stamp
    const c0 = sec.cards[0], cl = sec.cards[sec.cards.length - 1];
    add(maxCam + vw / 2 + 60, c0.y + c0.h * 0.6, 2.7, Math.max(460, Lm * 0.4), 12, 8.3, 0.05);
    add(maxCam - vw / 2 - 60, (c0.y + cl.y) / 2 + c0.h * 0.5, -0.45, Math.max(440, Lm * 0.36), 15, 9.7, -0.06);
    add(maxCam + vw / 2 + 40, cl.y + cl.h * 0.4, 3.4, Math.max(400, Lm * 0.34), 11, 11.2, 0.04);
    K.push([maxCam - vw * 0.42, (c0.y + cl.y) / 2, portrait ? 220 : 320, 0]);
    // and one reaching over the sticker sheet
    add(sec.sheet.x - sec.sheet.W / 2 - 90, sec.sheet.y - sec.sheet.H * 0.1, -0.25, Math.max(420, Lm * 0.36), 13, 12.6, 0.05);
    scene.resize(vw, vh, dpr, maxCam + vw, Math.max(sec.bottom, foot.y + foot.h / 2) + vh * 0.3);
    scene.branches(B, K);
    if (fontsReady) build();
  }

  // The testimonials: a column going down the mat under the last stamp. On a wide screen the cards step
  // left and right with client stickers in the space beside each; on a phone they stack, stickers between.
  const TITLE_ART = { wide: [1086, 110], tall: [700, 206] };
  function titleDims() {
    const [w, h] = portrait ? TITLE_ART.tall : TITLE_ART.wide, pad = 11;
    return [w + pad * 2, h + pad * 2];
  }
  function sectionLayout() {
    const Xs = maxCam, tH = portrait ? 470 : 330;
    const tw = portrait ? Math.min(vw - 36, 440) : clamp(vw * 0.34, 380, 540), th = (tw * tH) / Print.SW;
    const [aw, ah] = titleDims(), tiW = portrait ? vw - 20 : Math.min(vw * 0.62, 860), tiH = (tiW * ah) / aw;
    // the first card lands centred in view just as the turn finishes
    const y0 = (T.tf1 - T.tf0) * vh, dx = portrait ? vw * 0.02 : Math.min(vw * 0.17, 270), gap = portrait ? 150 : 0;
    const cards = TESTIMONIALS.map((t, k) => ({
      x: Xs + (k % 2 ? 1 : -1) * dx, y: portrait ? y0 + k * (th + gap) : y0 + k * th * 0.8, w: tw, h: th, r: TROT[k % TROT.length], tH,
    }));
    const title = { x: Xs, y: y0 - th / 2 - 34 - tiH / 2, w: tiW, h: tiH };
    // places for the loose stickers: beside each card on the other side, or in the gaps on a phone
    const slots = [];
    cards.forEach((c, k) => {
      if (portrait) {
        const y = c.y + th / 2 + gap / 2;
        slots.push([Xs - vw * 0.22, y - 8], [Xs + vw * 0.22, y + 10]);
      } else {
        const side = k % 2 ? -1 : 1, cx = Xs + side * dx;
        slots.push([cx - tw * 0.22, c.y - th * 0.08], [cx + tw * 0.24, c.y + th * 0.12]);
      }
    });
    const sh = portrait ? 54 : 78, maxW = portrait ? vw * 0.36 : tw * 0.42;
    const stickers = LOOSE.map((id, i) => ({ id, x: slots[i][0], y: slots[i][1], r: LOOSE_ROT[i % LOOSE_ROT.length], h: sh, maxW }));
    const last = cards[cards.length - 1];
    // and the sheet they came off, under the last card. The column ends with it centred in view; if it is
    // taller than the screen (on a phone), with its foot, where the ways to get in touch are, clear of the
    // Sound pill
    const sheet = sheetLayout(Xs, Math.max(last.y + th / 2, ...stickers.map((q) => q.y + sh)) + (portrait ? 70 : 120), sh, maxW);
    const end = sheet.H < vh - 40 ? vh / 2 : sheet.H / 2 + (portrait ? 76 : 24);
    return { cards, title, stickers, sh, maxW, sheet, bottom: sheet.y + end, cardSticker: portrait ? 44 : 58 };
  }
  // The colouring page: a sheet of watercolour paper straight down the mat from the postcard, level with
  // where the column ended, with room under it for the paints
  function footLayout(yb) {
    const P = portrait, bar = P ? 152 : 52, gap = P ? 14 : 18;
    let w, h;
    if (P) {
      w = vw - 24; h = w / 0.84;
      const maxH = vh - bar - gap - 80;
      if (h > maxH) { h = maxH; w = h * 0.84; }
    } else {
      h = Math.min(vh - bar - gap - 110, 700); w = h * 1.45;
      if (w > vw * 0.86) { w = vw * 0.86; h = w / 1.45; }
    }
    return { x: 0, y: yb - (bar + gap) / 2, w, h, r: P ? 0.006 : -0.01, gap, camY: yb };
  }
  // the size a client's sticker comes out at: h tall unless that makes it wider than maxW
  function clientSize(id, h, maxW) {
    const c = assets.clients[id], a = c ? c.width / c.height : 1.9;
    return h * a > maxW ? [maxW, maxW / a] : [h * a, h];
  }
  // The sheet the client stickers came off, lying under the last testimonial. Its cut-outs are in centred
  // rows, with one blank at the end; on the far side of a tear line, the stickers for getting in touch.
  // Everything is in sheet units (world px) from its top left.
  function sheetLayout(Xs, top, sh, maxW) {
    const P = portrait, W = P ? vw - 24 : clamp(vw * 0.68, 780, 1040), pad = P ? 20 : 40;
    // a header band of its own across the top, the title on one line in it; the stickers sit below it
    const titleSize = P ? 50 : 78, band = P ? 96 : 122, head = band + (P ? 26 : 34);
    const split = W * 0.6, x0 = pad, x1 = P ? W - pad : split - 28, gx = P ? 14 : 24, gy = P ? 18 : 26;
    const items = CLIENTS.map((id) => ({ id, size: clientSize(id, sh, maxW) }));
    items.push({ id: 'you', size: [Math.min(sh * 2.3, maxW), sh] });
    const rows = [];
    let row = [], rw = 0;
    for (const it of items) {
      if (row.length && rw + gx + it.size[0] > x1 - x0) { rows.push([row, rw]); row = []; rw = 0; }
      rw += (row.length ? gx : 0) + it.size[0]; row.push(it);
    }
    rows.push([row, rw]);
    const slots = {};
    let y = head;
    rows.forEach(([r, w]) => {
      let x = x0 + (x1 - x0 - w) / 2;
      r.forEach((it) => { slots[it.id] = { x: x + it.size[0] / 2, y: y + sh / 2, w: it.size[0], h: it.size[1] }; x += it.size[0] + gx; });
      y += sh + gy;
    });
    const cTop = y - gy;
    // the contact stickers under a hello: the email across the top, room under it for the stamp, the
    // others two by two
    const S = P ? 92 : 136, D = Print.CONTACT_DIMS, eh = S * D.email[1] + 18, stampRoom = P ? 40 : 46, rowH = S * 0.88 + (P ? 20 : 26);
    const hiSize = P ? 30 : 40, hiH = hiSize + (P ? 18 : 24);
    const rest = CONTACT.length - 1, blockH = hiH + eh + stampRoom + Math.ceil(rest / 2) * rowH;
    let gTop, cx0, cx1, perf;
    if (P) {
      const py = y + 4;
      perf = [pad, py, W - pad, py];
      gTop = py + 28; cx0 = pad; cx1 = W - pad;
    } else {
      // the contact side runs the rest of the sheet's height, under the header
      gTop = head - 6 + Math.max(0, (cTop - head - blockH) / 2); cx0 = split + 28; cx1 = W - pad;
      perf = [split, band + 24, split, null];
    }
    const cw = (cx1 - cx0) / 2, mid = (cx0 + cx1) / 2;
    const top0 = gTop + hiH, contact = CONTACT.map((c, i) => i === 0
      ? { x: mid, y: top0 + eh / 2 }
      : { x: cx0 + cw * (((i - 1) % 2) + 0.5), y: top0 + eh + stampRoom + Math.floor((i - 1) / 2) * rowH + rowH / 2 - (P ? 10 : 13) });
    const H = Math.max(cTop, gTop + blockH - (P ? 10 : 13)) + pad;
    if (!P) perf[3] = H - pad;
    return { x: Xs, y: top + H / 2, W, H, r: P ? -0.008 : -0.012, pad, band, titleSize, titleRoom: W - pad * 2, slots, S, contact, perf,
      hi: { text: 'Say hi to me', x: mid, y: gTop + hiSize * 0.82, size: hiSize }, stamp: { x: mid + S * 0.08, y: top0 + eh + stampRoom * 0.45 } };
  }
  // the title, as the die-cut sticker: one line, or two on a phone
  function titleArt() {
    const [w, h] = portrait ? TITLE_ART.tall : TITLE_ART.wide, K = 2, img = assets.title;
    const c = document.createElement('canvas'); c.width = w * K; c.height = h * K;
    const ctx = c.getContext('2d');
    if (portrait) {
      // "Straight from the People" over "I've worked with", the second line set to the right
      ctx.drawImage(img, 0, 0, 646, 110, 0, 0, 646 * K, 110 * K);
      ctx.drawImage(img, 646, 0, 440, 110, (w - 440) * K, 96 * K, 440 * K, 110 * K);
    } else ctx.drawImage(img, 0, 0, 1086, 110, 0, 0, w * K, h * K);
    return Print.dieCut(c, w, h, 7, K);
  }

  // Draw every printed thing once (the card again only if its shape changes)
  function build() {
    const gl = scene.gl;
    const TW = Math.round(clamp(cw * dpr * 1.35, 1024, 2048));
    const key = `${portrait}|${TW}|${Math.round((ch / cw) * 100)}`;
    if (key !== cardKey) {
      cardKey = key;
      if (tex) for (const k of ['front', 'sig', 'back', 'backPeeled', 'cover']) gl.deleteTexture(tex[k]);
      const mark = Print.openMark(portrait, DATE);
      const cover = Print.coverStamp(portrait, mark, assets.stamps[COVER.id]);
      const common = { cw, ch, TW, portrait, cover, mark, intro: INTRO, lines: ADDRESS };
      tex = {
        front: scene.texture(Print.front(cw, ch, TW)),
        sig: scene.texture(Print.signature(cw, ch, TW, portrait)),
        back: scene.texture(Print.back({ ...common, peeled: false })),
        backPeeled: scene.texture(Print.back({ ...common, peeled: true })),
        cover: scene.texture(cover.inked),
      };
    }
    if (!stampTex.length) {
      coverBack = scene.texture(Print.stampBack(COVER, assets.stamps[COVER.id], 0));
      PROJECTS.forEach((p, i) => {
        const s = Print.stamp(assets.stamps[p.id], { ...p.pm, top: 'SELECTED WORK', bottom: 'AARYA SHAH', l1: DATE[0], l2: DATE[1], color: p.ink, seed: 20 + i });
        stampTex.push({
          plain: scene.texture(s.plain), inked: scene.texture(s.inked), back: scene.texture(Print.stampBack(p, assets.stamps[p.id], i + 1)),
          stickers: (p.stickers || []).map(([kind, text, bg, fg, w, h, x, y, r]) => {
            const st = Print.sticker(kind, text, bg, fg, w, h);
            return { tex: scene.texture(st.canvas), w: st.w, h: st.h, cx: x + w / 2 - Print.SW / 2, cy: y + h / 2 - Print.SH / 2, r };
          }),
        });
      });
    }
    // as large as fits: at most 16px from either edge on a phone
    let size = portrait ? vw * 0.11 : clamp(vw * 0.05, 48, 84);
    const room = (portrait ? vw - 32 : vw * 0.8) / (titleWidth(size) || 1);
    if (room < 1) size *= room;
    if (!titles || titles.size !== size) {
      if (titles) titles.letters.forEach((l) => gl.deleteTexture(l.tex));
      const letters = [];
      let x = 0, hMax = 0;
      TITLE.forEach(([ch, spec, sc, dy, r], i) => {
        if (ch === ' ') { x += size * 0.32; return; }
        const L = Print.letter(ch, spec, size * sc);
        letters.push({ tex: scene.texture(L.canvas), w: L.w, h: L.h, ox: x + L.w / 2, oy: dy * size, r, k: 60 + ((i * 37) % 30), z: 0.5 + (i % 3) * 0.08 });
        x += L.w * 0.86;
        hMax = Math.max(hMax, L.h);
      });
      const width = x + letters[letters.length - 1].w * 0.14;
      letters.forEach((l) => { l.ox -= width / 2; l.x = null; l.v = 0; });
      titles = { size, letters, width, height: hMax };
    }
    // the testimonials (the backs of stamps), the client stickers and the section title
    const tk = `${portrait}`;
    if (tk !== testKey) {
      testKey = tk;
      testTex.forEach((t) => gl.deleteTexture(t));
      testTex = TESTIMONIALS.map((t, k) => scene.texture(Print.testimonial(t, k, sec.cards[0].tH)));
      if (titleTex) { gl.deleteTexture(titleTex.tex); titleTex = null; }
    }
    if (assetsReady) {
      for (const id of CLIENTS) {
        const c = assets.clients[id];
        if (c && !clientTex[id]) clientTex[id] = { tex: scene.texture(c), w: c.width, h: c.height };
      }
      if (assets.title && !titleTex) { const t = titleArt(); titleTex = { tex: scene.texture(t.canvas), w: t.w, h: t.h }; }
      // the sticker sheet, with a hole wherever a sticker came off it
      const sh = sec.sheet, ck = `${sh.S}`;
      if (ck !== contactKey) {
        contactKey = ck;
        contactTex.forEach((c) => gl.deleteTexture(c.tex));
        contactTex = CONTACT.map((c) => { const t = Print.contactSticker(c.id, sh.S); return { ...t, tex: scene.texture(t.canvas) }; });
      }
      const sk = `${portrait}|${Math.round(sh.W)}|${Math.round(sh.H)}|${sh.slots.byd ? Math.round(sh.slots.byd.w) : 0}`;
      if (sk !== sheetKey) {
        sheetKey = sk;
        if (sheetTex) gl.deleteTexture(sheetTex);
        const holes = CLIENTS.filter((id) => assets.clients[id]).map((id) => ({ img: assets.clients[id], ...sh.slots[id] }));
        if (blankTex) gl.deleteTexture(blankTex.tex);
        const bl = Print.blankSticker(sh.slots.you.w, sh.slots.you.h);
        blankTex = { ...bl, tex: scene.texture(bl.canvas) };
        holes.push({ img: bl.canvas, ...sh.slots.you });
        sh.contact.forEach((c, i) => holes.push({ img: contactTex[i].canvas, x: c.x, y: c.y, w: contactTex[i].w, h: contactTex[i].h }));
        sheetTex = scene.texture(Print.stickerSheet({
          W: sh.W, H: sh.H, K: Math.min(3, Math.max(2, dpr * 1.25)), pad: sh.pad, band: sh.band, titleSize: sh.titleSize,
          title: 'Be the next sticker.', titleRoom: sh.titleRoom, hi: sh.hi, perf: sh.perf, holes,
        }));
      }
      if (!copiedTex) { const t = Print.inkStamp('COPIED', '#d8322a'); copiedTex = { ...t, tex: scene.texture(t.canvas) }; }
      if (!savedTex) { const t = Print.inkStamp('SAVED', '#d8322a'); savedTex = { ...t, tex: scene.texture(t.canvas) }; }
    }
    // the colouring page, drawn again only if its shape changes; the paint on it carries over
    const fk = `${portrait}|${Math.round(foot.w)}|${Math.round(foot.h)}`;
    if (fk !== footKey) {
      footKey = fk;
      painter = Colour.painter(foot.w, foot.h, Math.min(2, Math.max(1.25, dpr * 1.1), 2400 / foot.w), portrait, painter);
      if (footTex) gl.deleteTexture(footTex);
      footTex = scene.texture(painter.canvas);
      setPaint(painter.colour, painter.eraser);
    }
    if (!flashTex) { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); flashTex = scene.texture(c); }
    if (!props) props = Props.create(scene, {
      radio: () => { const v = !Garden.on; setSound(v); store(v); },
    });
    props.layout({ vw, vh, cw, ch, Xc, spacing, yRow, SHd, maxCam, portrait });
    if (!startAt) startAt = performance.now();
  }

  // how wide the letter stickers come out at a given size, measured without making textures
  function titleWidth(size) {
    let x = 0, last = 0;
    for (const [ch, spec, sc] of TITLE) {
      if (ch === ' ') { x += size * 0.32; continue; }
      const L = Print.letter(ch, spec, size * sc);
      x += L.w * 0.86; last = L.w;
    }
    return x + last * 0.14;
  }

  // the stamps are drawn from their art, so nothing is printed until it is here
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const stampsLoaded = Promise.all([COVER, ...PROJECTS].map((p) => p.id).map((id) => loadImg(`stamps/${id}.webp`).then((im) => { assets.stamps[id] = im; }).catch(() => {})));
  Promise.all([
    document.fonts.load("400 40px 'Geist'"), document.fonts.load("500 40px 'Geist'"), document.fonts.load("600 40px 'Geist'"),
    document.fonts.load("700 40px 'Geist'"), document.fonts.load("800 40px 'Geist'"), document.fonts.load("500 40px 'Geist Mono'"),
    document.fonts.load("400 40px 'Yellowtail'"), document.fonts.load("700 40px 'Source Serif 4'", 'NORISKTY'),
    document.fonts.load("400 40px 'Kalam'"), document.fonts.load("400 40px 'Cherry Bomb One'", 'e'), document.fonts.load("italic 400 40px 'DM Serif Display'", '\u201c'),
    ...TITLE.filter((t) => t[1]).map(([ch, sp]) => document.fonts.load(`${sp.style || ''} ${sp.weight || 400} 40px '${sp.family}'`, ch)),
  ]).catch(() => {}).then(() => stampsLoaded).then(() => { fontsReady = true; if (vw) build(); });

  // the client stickers as supplied (their painted shadows taken out) and the title artwork
  Promise.all([
    ...CLIENTS.map((id) => loadImg(`clients/${id}.png`).then((im) => { assets.clients[id] = Print.cleanSticker(im); }).catch(() => {})),
    loadImg('clients/title.svg').then((im) => { assets.title = im; }).catch(() => {}),
  ]).then(() => { assetsReady = true; if (vw) layout(); });

  let lastW = 0, lastH = 0, rt = 0;
  function maybeLayout() {
    if (!innerWidth || !innerHeight) return;
    // ignore the small height changes of a mobile URL bar
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;
    // nor the keyboard coming up while someone types their email
    if (innerWidth === lastW && logo.open) return;
    lastW = innerWidth; lastH = innerHeight;
    layout();
  }
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(maybeLayout, 120); });
  maybeLayout();

  // the cursor drags the cloth along with it: each sample remembers where the hand was and which way it moved
  const ptr = { x: -1, y: -1, speed: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0 };
  const trail = [];
  let camNow = 0, camNowY = 0;
  addEventListener('pointermove', (e) => {
    const now = performance.now(), dt = Math.max(8, now - ptr.lt);
    if (ptr.lt && now - ptr.lt < 200) {
      const vx = ((e.clientX - ptr.lx) / dt) * 1000, vy = ((e.clientY - ptr.ly) / dt) * 1000;
      ptr.vx += (vx - ptr.vx) * 0.5; ptr.vy += (vy - ptr.vy) * 0.5;
      ptr.speed = Math.max(ptr.speed, Math.hypot(vx, vy));
    } else { ptr.vx = ptr.vy = 0; }
    ptr.lx = ptr.x = e.clientX; ptr.ly = ptr.y = e.clientY; ptr.lt = now; ptr.touch = e.pointerType === 'touch';
    const wx = e.clientX - vw / 2 + camNow, wy = e.clientY - vh / 2 + camNowY;
    const lastP = trail[trail.length - 1];
    if (!lastP || Math.hypot(wx - lastP.x, wy - lastP.y) > 14 || now - lastP.t > 60) {
      trail.push({ x: wx, y: wy, vx: ptr.vx, vy: ptr.vy, t: now });
      if (trail.length > 12) trail.shift();
    }
  });
  document.addEventListener('pointerleave', () => { ptr.x = -1; });
  const drags = new Float32Array(48), dragR = new Float32Array(12);

  // things that make the garden feel lived in
  const fall = Nature.create(scene);
  const flies = Butterflies.create(scene);
  const title = { on: false, at: -1e9, x: null, v: 0 };

  let sp = scrollY / Math.max(1, innerHeight), last = performance.now(), gust = 1;
  const cardHover = { z: 0, rx: 0, ry: 0 };
  let props = null, propHover = null;
  let kappa = 0, kappaV = 0, lastTh = 0;
  const stampHover = PROJECTS.map(() => ({ z: 0, rx: 0, ry: 0, p: 0 })), coverHover = { z: 0, rx: 0, ry: 0, p: 0 };
  const inkAt = PROJECTS.map(() => 0);
  const testHover = TESTIMONIALS.map(() => ({ z: 0, rx: 0, ry: 0 }));
  // a testimonial picked up to read: lifted off the mat toward you until it fills most of the screen
  const held = { k: -1, p: 0, open: false, at: 0 };
  let testOn = false;
  // the loose client stickers going back onto the sheet (0 on the mat, 1 on the sheet), and the contact stickers
  const gather = { on: false, at: 0 }, flyP = {};
  // (one more after the contact stickers: the blank, for leaving an email)
  const contactState = [...CONTACT, 0].map(() => ({ a: 0, at: -1e9 })), contactHit = [];
  const sheetHover = { z: 0, rx: 0, ry: 0 };
  let copiedAt = 0, contactHover = -1;
  // the colouring page: whether it can be painted on now, the finger or button painting, and the run back round
  // (and while the camera is up high, travelling, nothing on the mat responds to the cursor)
  let paintOn = false, stroke = null, footZ = 1, savedPageAt = 0, paintClick = false, rewinding = false;
  // when each piece of the testimonials first came into view, so stickers stick down as you arrive
  const seenAt = {};
  const seen = (key, now) => seenAt[key] || (seenAt[key] = now);

  // hovering presses on the stamp where the cursor is: that side dips toward the mat, the far side lifts,
  // and the paper bows a little, so the light and its shadow shift as you move around it
  function hoverState(h, on, lx, ly, dt) {
    const k = 1 - Math.exp(-dt * 8);
    h.z += ((on ? 14 : 0) - h.z) * k;
    h.rx += ((on ? -ly * 0.3 : 0) - h.rx) * k;
    h.ry += ((on ? lx * 0.34 : 0) - h.ry) * k;
    h.bow = (h.bow || 0) + ((on ? 1 : 0) - (h.bow || 0)) * k;
    // and turns over to its back while the cursor stays, back again when it leaves
    h.p = clamp((h.p || 0) + ((on ? 1 : -1) * dt) / 0.6);
  }
  // a stamp turning over on hover: it rises a little as it goes edge-on and bows with the turn
  function flipOver(o, h, back) {
    const f = ease(h.p), arc = Math.sin(Math.PI * f);
    o.mode = 1; o.texB = back; o.mixB = 0; o.glossBack = 0.1;
    o.bend = [Math.PI * f, o.bend[1] + (0.9 * arc) / o.size[0]];
    return 60 * arc;
  }
  // lift a flat object just enough that no part of it dips into the mat
  function rest(o, z) {
    let zmin = Infinity;
    const [w, h] = o.size;
    o.pos[2] = 0;
    for (const s of [-0.5, -0.25, 0, 0.25, 0.5]) for (const t of [-0.5, 0.5]) zmin = Math.min(zmin, scene.point(o, s * w, t * h)[2]);
    o.pos[2] = Math.max(z, -zmin + 1);
    return o;
  }
  // the surface of an object at a point in its own frame, and its normal
  function surfaceAt(o, s, t) {
    const p = scene.point(o, s, t), a = scene.point(o, s + 2, t), b = scene.point(o, s, t + 2);
    const u = [a[0] - p[0], a[1] - p[1], a[2] - p[2]], v = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n);
    return { p, n: n.map((x) => x / l) };
  }
  // the two tilts that lay something with this heading flat on a surface with normal n
  function orient(n, yaw) {
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return [Math.asin(clamp(-(n[0] * s + n[1] * c), -1, 1)), Math.atan2(n[0] * c - n[1] * s, n[2])];
  }
  // pointer position in an object's own frame, -0.5..0.5 when inside
  function localPointer(x, y, z, w, h, r, px = ptr.x, py = ptr.y) {
    if (px < 0 || rewinding) return null;
    const k = Scene.D / (Scene.D - z);
    const sx = (x - camNow) * k + vw / 2, sy = (y - camNowY) * k + vh / 2;
    const dx = (px - sx) / k, dy = (py - sy) / k;
    const c = Math.cos(-r), s = Math.sin(-r);
    const u = (dx * c - dy * s) / w, v = (dx * s + dy * c) / h;
    return Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5 ? [u, v] : null;
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!vh) { maybeLayout(); raf(frame); return; }
    if (!tex || !titles) { raf(frame); return; }
    document.body.classList.add('on');

    const target = scrollY / vh;
    sp += (target - sp) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - sp) < 1e-4) sp = target;
    // back at the top of the mat, the postcard looks just as it did at the start: begin again from there
    if (target >= T.u1 - 0.002 && sp >= T.u1 - 0.004) {
      sp = 0; scrollTo(0, 0);
      // so the stamps ink and the stickers stick down again on the way round
      inkAt.fill(0);
      for (const key in seenAt) delete seenAt[key];
    }
    const P = sp;
    // the story stops at the bottom of the sheet; after that only the camera moves. On the way up the side,
    // the postcard is back as it began (everything else that changes back is far out of sight by then).
    const Ps = P >= T.u0 ? 0 : Math.min(P, T.down);
    const k1 = seg(P, T.s0, T.s1), ku = seg(P, T.u0, T.u1);
    // on the way up the side, the colouring page is on its way to becoming the postcard
    const climbing = P > T.u0;
    // the Résumé sticker peeling up off the sheet, before it sets off (and gone from it all the way round)
    const pk = climbing ? 1 : ease(seg(P, T.down + 0.04, T.s0));
    // the long trips along the bottom and up the side are taken from a little higher up
    const up = (k, a) => a * Math.pow(Math.sin(Math.PI * k), 1.4);
    const lz = 1 - up(k1, 0.42) - up(ku, 0.42), ls = 0;
    rewinding = lz < 0.97;
    // the welcome: the camera comes down from high above, turning straight, while the postcard floats
    // down onto the mat and settles
    const wt = (now - startAt) / 1000;
    const wz = ease(clamp(wt / 2.8));
    const zoom = lerp(0.34, 1, wz) * lz, spin = -0.16 * (1 - wz) + ls, zv = 1 / zoom;
    const it = clamp(wt / 2.6);
    const intro = 1 - easeOut(it);
    const kf = ease(seg(Ps, T.flip0, T.flip1));
    const kp = ease(seg(Ps, T.peel0, T.peel1));
    const kt = ease(seg(Ps, T.peel1, T.trav1));
    const n = PROJECTS.length;
    const pj = seg(Ps, T.trav1, T.proj1) * n;
    const pje = pj >= n ? n : Math.floor(pj) + smooth(clamp((pj - Math.floor(pj) - 0.3) / 0.5));
    // and, once the sheet is at the bottom of the screen, along the mat to the colouring page
    let cam = Xc * kt + spacing * pje;
    // the turn into the testimonials, and the plain downward scroll that follows it
    const kf2 = ease(seg(Ps, T.tf0, T.tf1));
    let camY = Math.min(Math.max(0, Ps - T.tf0), T.down - T.tf0) * vh;
    // then left along the bottom of the mat to the colouring page, and up the side to the postcard
    if (P > T.s0) { cam = lerp(maxCam, foot.x, ease(k1)); camY = lerp(foot.camY, 0, ease(ku)); }
    camNow = cam; camNowY = camY;
    testOn = kf2 >= 1;
    if (logo.open && document.activeElement !== logoInput && Math.abs(target - logo.at) > 0.08) closeLogo();
    if (held.k >= 0) {
      // scrolling away puts it back down
      if (held.open && Math.abs(target - held.at) > 0.06) held.open = false;
      held.p = clamp(held.p + (held.open ? dt : -dt) / 0.85);
      if (!held.open && held.p <= 0) held.k = -1;
    }
    const objects = [];
    // the stamp you are looking at is full size; the rest wait their turn, smaller
    const focus = Math.max(0, (cam - Xc) / spacing);
    const grow = (i) => QUEUE + (1 - QUEUE) * smooth(clamp(1 - Math.abs(focus - i)));

    // ---- the postcard ----
    const arc = Math.sin(Math.PI * kf);
    const cardY = -20 * arc;
    // the postcard takes the same press as the stamps, on either side: the side under the cursor dips,
    // the far side lifts, the plastic bows, and the light and shadow move with it
    const flat = kf < 0.02 || (kf > 0.98 && kp === 0);
    const onCard = flat && it >= 1 ? localPointer(0, cardY, kf > 0.5 ? 56 : 2, cw, ch, lerp(-0.08, 0.02, kf)) : null;
    hoverState(cardHover, !!onCard, onCard ? onCard[0] * (kf > 0.5 ? -1 : 1) : 0, onCard ? onCard[1] : 0, dt);
    const th = Math.PI * kf;
    // a thin plastic card: it bows while it turns, more when turned quickly, and wobbles as it settles
    const omega = dt > 0 ? (th - lastTh) / dt : 0;
    lastTh = th;
    const kTarget = (1.3 * arc + clamp(omega * 0.14, -0.7, 0.7) + cardHover.bow * 0.3 * (kf > 0.5 ? -1 : 1) + intro * (0.6 + 0.4 * Math.sin(wt * 3.1))) / cw;
    kappaV += ((kTarget - kappa) * 130 - kappaV * 13) * dt;
    kappa += kappaV * dt;
    const sigNow = clamp((now - startAt - 2500) / 1900) * 1.25 - 0.08;
    const card = {
      mode: 1, pos: [intro * 70 * Math.sin(wt * 1.9), cardY - intro * 40, 0], size: [cw, ch],
      rot: [lerp(-0.08, 0.02, kf) - intro * 0.55, 0.12 * arc + cardHover.rx * 0.6 + intro * 0.25 * Math.sin(wt * 2.3), cardHover.ry * 0.6 + intro * 0.2 * Math.cos(wt * 1.7)], bend: [th, kappa],
      texA: tex.front, texB: kp > 0 ? tex.backPeeled : tex.back, texS: tex.sig,
      sig: sigNow, gloss: 0.55, glossBack: 0.18, sheen: 0.14,
    };
    // keep the lowest part of the card resting on (never through) the mat
    let zmin = Infinity;
    for (let i = 0; i <= 12; i++) for (const t of [-0.5, 0.5]) zmin = Math.min(zmin, scene.point(card, (i / 12 - 0.5) * cw, t * ch)[2]);
    const lift = arc * 230 + 55 * kf * (1 - kp) + intro * 900 + cardHover.z * 0.6;
    card.pos[2] = Math.max(lift, -zmin + 1.5);
    // (while the colouring page comes up the side to take its place, it isn't there)
    if (!climbing) objects.push(card);
    // things a falling leaf can come to rest on, and whether each is holding still
    const supports = [{ id: 'card', obj: card, stable: !climbing && it >= 1 && (kf < 0.004 || (kf > 0.996 && kp === 0)) }];

    // ---- the stamp: peels off the card and carries you into the work ----
    const Lo = Print.backLayout(portrait, (ch / cw) * 1000), sl = Lo.slot, slH = (sl.w * Print.SH) / Print.SW;
    const slotS = (0.5 - (sl.x + sl.w / 2) / 1000) * cw, slotT = ((sl.y + slH / 2) / Lo.H - 0.5) * ch;
    if (kp > 0 || kt > 0) {
      const p0 = scene.point(card, slotS, slotT);
      const w0 = (sl.w / 1000) * cw;
      const peel = kp * (1 - kt);
      const onCover = kt >= 1 ? localPointer(Xc, yRow, 1, SWd * grow(0), SHd * grow(0), ROT[0]) : null;
      hoverState(coverHover, !!onCover, onCover ? onCover[0] : 0, onCover ? onCover[1] : 0, dt);
      const w = w0 * Math.pow((SWd * grow(0)) / w0, kt);
      const bow = (0.35 * coverHover.bow) / w;
      const cover = {
        pos: [lerp(p0[0], Xc, kt), lerp(p0[1], yRow, kt), 0],
        size: [w, (w * Print.SH) / Print.SW],
        rot: [lerp(card.rot[0] + Print.SLOT_ROT, ROT[0], kt) + 0.14 * Math.sin(Math.PI * kt), 0.16 * peel + coverHover.rx, coverHover.ry],
        bend: [-0.45 * peel, (2.4 * peel) / w + bow], texA: tex.cover, gloss: 0.06, sheen: 0.2,
      };
      const zc = lerp(p0[2] + 0.6, 0.8, kt) + peel * 90 + Math.sin(Math.PI * kt) * 230;
      if (kt < 1) coverHover.p = 0;
      const up = coverHover.p > 0 ? flipOver(cover, coverHover, coverBack) : 0;
      if (kt >= 1) rest(cover, zc + coverHover.z + up); else cover.pos[2] = zc;
      objects.push(cover);
      supports.push({ id: 'cover', obj: cover, stable: kt >= 1 && coverHover.p === 0 });
    }

    // ---- the row of project stamps lying further along the mat ----
    PROJECTS.forEach((p, i) => {
      const X = Xc + (i + 1) * spacing, Y = yRow + (i % 2 ? 8 : -6), r = ROT[i + 1];
      // out of view (and kept hidden while the welcome shows the wider mat)
      if (Math.abs(X - cam) > vw * zv + SWd || it < 1) return;
      if (!inkAt[i] && cam > X - spacing * 0.3) inkAt[i] = now;
      const ik = inkAt[i] ? (now - inkAt[i]) / 1000 : -1;
      const bump = ik >= 0 && ik < 0.35 ? Math.sin((Math.PI * ik) / 0.35) : 0;
      // the last stamp turns over as the page moves down: it lifts, flips, and grows into the first
      // testimonial, written on its back. Once it has landed, the testimonials below draw it.
      const turning = i === n - 1 && kf2 > 0;
      if (turning && kf2 >= 1) return;
      const g = grow(i + 1);
      const h = stampHover[i], on = turning ? null : localPointer(X, Y, 1, SWd * g, SHd * g, r);
      hoverState(h, !!on, on ? on[0] : 0, on ? on[1] : 0, dt);
      const sc = g * (1 - bump * 0.02), sw = SWd * sc, bow = (0.35 * h.bow) / sw;
      let stamp;
      if (turning) {
        const c0 = sec.cards[0], f = kf2, arc = Math.sin(Math.PI * f);
        // it changes shape while it is edge-on, where the change can't be seen
        const w = lerp(sw, c0.w, f), hh = lerp(SHd * sc, c0.h, smooth(clamp((f - 0.3) / 0.4)));
        stamp = rest({
          mode: 1, pos: [lerp(X, c0.x, f), lerp(Y, c0.y, f), 0], size: [w, hh], rot: [lerp(r, c0.r, f), 0.12 * arc, 0], bend: [Math.PI * f, (1.1 * arc) / w],
          texA: stampTex[i].inked, texB: testTex[0], gloss: 0.06, glossBack: 0.1, sheen: 0.2,
        }, 0.8 + arc * 240);
      } else {
        const mixB = ik < 0 ? 0 : smooth(clamp((ik - 0.06) / 0.14));
        stamp = {
          pos: [X, Y, 0], size: [sw, SHd * sc], rot: [r, h.rx, h.ry], bend: [0, bow],
          texA: stampTex[i].plain, texB: stampTex[i].inked, mixB, gloss: 0.06, sheen: 0.2,
        };
        let up = 0;
        if (h.p > 0) { stamp.texA = mixB > 0.5 ? stampTex[i].inked : stampTex[i].plain; up = flipOver(stamp, h, stampTex[i].back); }
        rest(stamp, 0.8 + h.z - bump * 0.6 + up);
      }
      if (turning) h.p = 0;
      objects.push(stamp);
      supports.push({ id: 'p' + i, obj: stamp, stable: !turning && h.p === 0 });
      // stickers are stuck to the stamp: they ride its tilt and bow, always on its surface
      const k = stamp.size[0] / Print.SW, ky = stamp.size[1] / Print.SH;
      stampTex[i].stickers.forEach((s, j) => {
        const st = ik < 0 ? 0 : clamp((ik - 0.3 - j * 0.16) / 0.45);
        if (st <= 0) return;
        const e = backOut(st);
        const S = surfaceAt(stamp, s.cx * k, s.cy * ky);
        // once the stamp is face down they are underneath it, out of sight
        if (turning && S.n[2] < 0.05) return;
        const yaw = r + s.r + (1 - e) * 0.5, [ax, ay] = orient(S.n, yaw), up = 1.4 + (1 - easeOut(st)) * 60;
        const sticker = {
          pos: S.p.map((v, m) => v + S.n[m] * up),
          size: [s.w * k * (1.4 - 0.4 * e), s.h * k * (1.4 - 0.4 * e)], rot: [yaw, ax, ay],
          texA: s.tex, alpha: Math.min(1, st * 5), gloss: 0.25, sheen: 0.1,
        };
        objects.push(sticker);
        supports.push({ id: `p${i}s${j}`, obj: sticker, stable: st >= 1 && !turning, fit: 0.8 });
      });
    });

    // ---- the section title: letter stickers that stick down as the work arrives, then ride along over the
    // middle of the row until the last stamp, each lagging a little behind on its own spring ----
    const want = kt > 0.6;
    if (want !== title.on) { title.on = want; title.at = now; }
    const tel = (now - title.at) / 1000, nl = titles.letters.length;
    const gx = clamp(cam, Xc, Xc + n * spacing);
    const ty = yRow - SHd / 2 - 30 - titles.height / 2;
    titles.letters.forEach((l, j) => {
      if (l.x === null) l.x = gx;
      const acc = (gx - l.x) * l.k - l.v * 2 * Math.sqrt(l.k) * 0.62;
      l.v += acc * dt; l.x += l.v * dt;
      const st = title.on ? clamp((tel - j * 0.055) / 0.45) : 1 - clamp((tel - (nl - 1 - j) * 0.025) / 0.22);
      if (st <= 0) return;
      const e = title.on ? backOut(st) : st, lift = Math.min(16, Math.abs(l.v) * 0.012);
      const o = {
        pos: [l.x + l.ox, ty + l.oy, l.z + lift + (1 - easeOut(st)) * 60], size: [l.w * (1.4 - 0.4 * e), l.h * (1.4 - 0.4 * e)],
        rot: [l.r + (1 - e) * 0.5 + clamp(-l.v * 0.00015, -0.1, 0.1), 0, clamp(l.v * 0.0001, -0.08, 0.08)],
        texA: l.tex, alpha: Math.min(1, st * 5), gloss: 0.3,
      };
      objects.push(o);
      supports.push({ id: 't' + j, obj: o, stable: title.on && st >= 1, fit: 0.85 });
    });

    // ---- what people said: the column of stamp-backs going down the mat, client stickers around them ----
    if (sec && testTex.length) {
      const vis = (y, m) => Math.abs(y - camY) < (vh / 2) * zv + m;
      // a sticker pressed down where it belongs: it arrives a little large and lifted, then sticks
      const stick = (o, st, up) => {
        const e = backOut(st);
        o.size = o.size.map((v) => v * (1.4 - 0.4 * e));
        o.rot[0] += (1 - e) * 0.5;
        o.alpha = Math.min(1, st * 5);
        return up * (1 - easeOut(st));
      };
      const sizeFor = (c, h, maxW) => { let w = (h * c.w) / c.h; if (w > maxW) { h *= maxW / w; w = maxW; } return [w, h]; };
      if (titleTex && kf2 > 0 && vis(sec.title.y, sec.title.h)) {
        const t = sec.title, st = clamp(((now - seen('title', now)) / 1000 - 0.1) / 0.5);
        const o = { pos: [t.x, t.y, 0], size: [t.w, (t.w * titleTex.h) / titleTex.w], rot: [-0.015, 0, 0], texA: titleTex.tex, gloss: 0.3, sheen: 0.1 };
        o.pos[2] = 0.6 + stick(o, st, 60);
        if (st > 0) { objects.push(o); supports.push({ id: 'tt', obj: o, stable: st >= 1, fit: 0.85 }); }
      }
      if (kf2 > 0) TESTIMONIALS.forEach((tm, k) => {
        const s = sec.cards[k], flip = k === 0, hk = held.k === k;
        if ((flip && kf2 < 1) || (!hk && !vis(s.y, s.h))) return;
        const hv = testHover[k], on = held.k >= 0 ? null : localPointer(s.x, s.y, 1, s.w, s.h, s.r);
        hoverState(hv, !!on, on ? on[0] * (flip ? -1 : 1) : 0, on ? on[1] : 0, dt);
        let pos = [s.x, s.y, 0], rot = [s.r, hv.rx, hv.ry], kap = (0.35 * hv.bow) / s.w, z = 0.8 + hv.z;
        if (hk) {
          // picked up: it lifts first, then comes to the middle and straightens, bowing through the
          // middle on the way like the postcard does, and still curved a touch once it is held
          const p = held.p, arc = Math.sin(Math.PI * p), up = smooth(clamp(p / 0.7)), go = ease(clamp((p - 0.15) / 0.85));
          const fit = Math.max(1.05, Math.min((0.8 * vh) / s.h, (0.92 * vw) / s.w));
          pos = [lerp(s.x, cam, go), lerp(s.y, camY, go), 0];
          rot = [lerp(s.r, 0, go), lerp(hv.rx, 0, up) + 0.1 * arc + 0.012 * go * Math.sin(now / 900), lerp(hv.ry, 0, up) + 0.01 * go * Math.sin(now / 1300 + 1)];
          kap = (1.3 * arc + 0.18 * go) / s.w;
          z = lerp(z, Scene.D * (1 - 1 / fit), up);
        }
        // the first is the turned-over stamp itself; the others lie back up, the same paper
        const card = rest({
          mode: flip ? 1 : 0, pos, size: [s.w, s.h], rot, bend: [flip ? Math.PI : 0, kap * (flip ? -1 : 1)],
          texA: flip ? stampTex[n - 1].inked : testTex[k], texB: testTex[k], gloss: 0.1, glossBack: 0.1, sheen: 0.2, dapple: hk ? 0.6 * held.p : 0,
        }, z);
        objects.push(card);
        supports.push({ id: 'q' + k, obj: card, stable: !hk });
        // the client's sticker, stuck over the top corner
        const cl = tm.client && clientTex[tm.client];
        if (!cl || (!hk && !vis(s.y, -40))) return;
        const st = clamp(((now - seen('q' + k, now)) / 1000 - (flip ? 0.15 : 0.3)) / 0.45);
        if (st <= 0) return;
        const u = s.w * (portrait ? 0.28 : 0.36), v = -s.h * (portrait ? 0.44 : 0.42);
        const S = surfaceAt(card, flip ? -u : u, v);
        if (S.n[2] < 0) S.n = S.n.map((x) => -x);
        const [w, h] = sizeFor(cl, sec.cardSticker, s.w * 0.38);
        const o = { pos: [0, 0, 0], size: [w, h], rot: [s.r + (k % 2 ? -0.16 : 0.14), 0, 0], texA: cl.tex, gloss: 0.3, sheen: 0.1, dapple: card.dapple };
        const up = 1.4 + stick(o, st, 60);
        const [ax, ay] = orient(S.n, o.rot[0]);
        o.rot[1] = ax; o.rot[2] = ay;
        o.pos = S.p.map((q, m) => q + S.n[m] * up);
        objects.push(o);
        supports.push({ id: 'qs' + k, obj: o, stable: st >= 1, fit: 0.8 });
      });
      // ---- the footer: the sticker sheet they came off, under the last card. As it comes into view, the
      // loose ones peel up off the mat, fly down and press back into their own cut-outs; scroll back up and
      // they return to where they were ----
      const sh = sec.sheet;
      // it takes the same press as the stamps, gentler for its size, and being glossy vinyl it throws the
      // light back harder than anything else on the mat
      const sheetIn = sheetTex && vis(sh.y, sh.H / 2) && Math.abs(sh.x - cam) < (vw / 2) * zv + sh.W / 2;
      const onSheet = sheetIn && held.k < 0 && !logo.open ? localPointer(sh.x, sh.y, 1, sh.W, sh.H, sh.r) : null;
      hoverState(sheetHover, !!onSheet, onSheet ? onSheet[0] : 0, onSheet ? onSheet[1] : 0, dt);
      // (everything stuck to it takes the same curve, so the sheet's bow never rises through them)
      const sheetK = (0.35 * sheetHover.bow) / sh.W;
      const sheet = rest({
        pos: [sh.x, sh.y, 0], size: [sh.W, sh.H], rot: [sh.r, sheetHover.rx * 0.3, sheetHover.ry * 0.3], bend: [0, sheetK],
        texA: sheetTex, gloss: 0.5, sheen: 0.34,
      }, 0.5 + sheetHover.z * 0.5);
      if (sheetIn) { objects.push(sheet); supports.push({ id: 'sheet', obj: sheet, stable: true }); }
      const at = (x, y) => surfaceAt(sheet, x - sh.W / 2, y - sh.H / 2);
      const sTop = sh.y - sh.H / 2;
      if (!gather.on && camY > sTop - vh * 0.05) { gather.on = true; gather.at = now; }
      else if (gather.on && camY < sTop - vh * 0.35) { gather.on = false; gather.at = now; }
      sec.stickers.forEach((q, i) => {
        const cl = clientTex[q.id];
        if (!cl) return;
        // (the further it has to come, the longer it takes)
        const slot0 = sh.slots[q.id], far = Math.hypot(sh.x - sh.W / 2 + slot0.x - q.x, sh.y - sh.H / 2 + slot0.y - q.y);
        const was = flyP[q.id] || 0, delay = gather.on ? i * 0.14 : (LOOSE.length - 1 - i) * 0.07;
        const p = (now - gather.at) / 1000 > delay ? clamp(was + (gather.on ? dt : -dt) / (1.15 + far / 2600)) : was;
        flyP[q.id] = p;
        const [w, h] = sizeFor(cl, q.h, q.maxW);
        if (p <= 0) {
          if (kf2 <= 0 || !vis(q.y, -50)) return;
          const st = clamp(((now - seen('l' + i, now)) / 1000 - 0.1 - (i % 2) * 0.12) / 0.45);
          if (st <= 0) return;
          const o = { pos: [q.x, q.y, 0], size: [w, h], rot: [q.r, 0, 0], texA: cl.tex, gloss: 0.3, sheen: 0.1 };
          o.pos[2] = 0.6 + stick(o, st, 60);
          objects.push(o);
          supports.push({ id: 'l' + i, obj: o, stable: st >= 1, fit: 0.85 });
          return;
        }
        const slot = sh.slots[q.id], B = at(slot.x, slot.y);
        // a corner lifts first, then it flies curled a little, spinning, and flattens as it lands
        const peel = smooth(clamp(p / 0.18)), f = ease(clamp((p - 0.1) / 0.75)), arc = Math.sin(Math.PI * f);
        const press = Math.sin(Math.PI * clamp((p - 0.84) / 0.16)), c = peel * (1 - f) + 0.22 * arc;
        const hFly = Math.min(520, 140 + Math.hypot(B.p[0] - q.x, B.p[1] - q.y) * 0.22);
        const [ax, ay] = orient(B.n, sh.r);
        const o = {
          pos: [lerp(q.x, B.p[0], f), lerp(q.y, B.p[1], f), lerp(0.6, B.p[2] + 2, f) + arc * hFly + peel * (1 - f) * 16],
          size: [w * (1 + 0.04 * press), h * (1 + 0.04 * press)],
          rot: [lerp(q.r, sh.r, f) + arc * 0.5 * (i % 2 ? 1 : -1), lerp(0, ax, f) + arc * 0.22 * Math.sin(now / 170 + i), lerp(0, ay, f) + arc * 0.18 * Math.cos(now / 210 + i)],
          bend: [-0.45 * c, (2.4 * c) / w + sheetK * f], texA: cl.tex, gloss: 0.3, sheen: 0.1,
        };
        objects.push(o);
        supports.push({ id: 'l' + i, obj: o, stable: p >= 1, fit: 0.85 });
      });
      // the ways to get in touch, still on the sheet, and the blank: a corner lifts when you point at one,
      // and a tap peels it right up before it settles back. The blank stays half up while you write.
      contactHover = -1;
      const peg = (j, x, y, t, hold) => {
        const cs = contactState[j], S = at(x, y);
        contactHit[j] = [S.p[0], S.p[1], S.p[2] + 1.2, t.w, t.h, sh.r];
        const on = held.k < 0 && !logo.open && localPointer(...contactHit[j]);
        if (on) contactHover = j;
        const want = now - cs.at < 420 ? 1 : hold ? 0.5 : on ? 0.4 : 0;
        cs.a += (want - cs.a) * (1 - Math.exp(-dt * (want > cs.a ? 14 : 7)));
        const [ax, ay] = orient(S.n, sh.r), up = 2 + cs.a * 40;
        const o = {
          pos: S.p.map((v, m) => v + S.n[m] * up), size: [t.w, t.h], rot: [sh.r + cs.a * 0.1, ax, ay],
          bend: [-0.55 * cs.a, (3 * cs.a) / t.w + sheetK], texA: t.tex, gloss: 0.3, sheen: 0.12,
        };
        objects.push(o);
        supports.push({ id: 'c' + j, obj: o, stable: cs.a < 0.01, fit: 0.85 });
        return o;
      };
      if (sheetIn && contactTex.length) sh.contact.forEach((c, j) => {
        // (the Résumé, once it has started to peel away on its trip, is drawn below)
        if (j === RESUME && pk > 0) { contactHit[j] = null; return; }
        peg(j, c.x, c.y, contactTex[j]);
      });
      if (sheetIn && blankTex) {
        const y = sh.slots.you, o = peg(CONTACT.length, y.x, y.y, blankTex, logo.open);
        logo.anchor = [o.pos[0], o.pos[1], o.pos[2], y.h];
        // once someone has left their email, it is stamped so across the blank
        if (logo.savedAt && savedTex) {
          const k = clamp((now - logo.savedAt) / 140), sc = 1.12 - 0.12 * k;
          objects.push({ pos: o.pos.map((v, m) => v + [0, 0, 0.5][m]), size: [savedTex.w * sc, savedTex.h * sc], rot: [sh.r - 0.14, o.rot[1], o.rot[2]], bend: o.bend, texA: savedTex.tex, alpha: k * 0.9, gloss: 0.05 });
        }
      }
      // the email, once copied, gets stamped so on the sheet, just under it
      if (sheetIn && copiedAt && copiedTex) {
        const l = sh.stamp, k = clamp((now - copiedAt) / 140), S = at(l.x, l.y), sc = 1.12 - 0.12 * k;
        const [ax, ay] = orient(S.n, sh.r - 0.1);
        objects.push({ pos: S.p.map((v, m) => v + S.n[m] * 1), size: [copiedTex.w * sc, copiedTex.h * sc], rot: [sh.r - 0.1, ax, ay], bend: [0, sheetK], texA: copiedTex.tex, alpha: k * 0.9, gloss: 0.05 });
      }
    }

    // ---- the Résumé sticker's trip. Past the footer it peels off the sheet and flies left along the mat,
    // growing and turning over: its back is the colouring page. On the way up the side, the page turns over
    // again and comes down as the postcard, just where the postcard lay at the start. Each changes shape only
    // while edge-on, where the change can't be seen ----
    if (painter && footTex && painter.tick(now)) scene.upload(footTex, painter.canvas);
    if (sec && foot && footTex && contactTex[RESUME] && pk > 0 && (k1 < 1 || climbing)) {
      const F = foot, t = contactTex[RESUME];
      let trip;
      if (!climbing) {
        const sh = sec.sheet, c = sh.contact[RESUME], dx = c.x - sh.W / 2, dy = c.y - sh.H / 2, cr = Math.cos(sh.r), sr = Math.sin(sh.r);
        const x0 = sh.x + dx * cr - dy * sr, y0 = sh.y + dx * sr + dy * cr;
        const e = ease(k1), arc = Math.sin(Math.PI * k1);
        const fk = smooth(clamp((k1 - 0.2) / 0.6)), sw = smooth(clamp((fk - 0.35) / 0.3));
        const w = lerp(t.w, F.w, e), h = w / lerp(t.w / t.h, F.w / F.h, sw);
        trip = rest({
          mode: 1, pos: [lerp(x0, F.x, e), lerp(y0, F.y, e), 0], size: [w, h],
          rot: [lerp(sh.r + 0.1 * pk, F.r, e) + 0.3 * arc, 0.12 * arc, 0],
          bend: [Math.PI * fk - 0.55 * pk * (1 - fk), (3 * pk * (1 - fk) + 1.1 * Math.sin(Math.PI * fk)) / w],
          texA: t.tex, texB: footTex, gloss: 0.3, glossBack: 0.08, sheen: 0.12,
        }, lerp(2 + 70 * pk, 0.6, e) + 320 * arc);
      } else {
        const e = ease(ku), arc = Math.sin(Math.PI * ku);
        const fk = smooth(clamp((ku - 0.2) / 0.6)), sw = smooth(clamp((fk - 0.35) / 0.3));
        const w = lerp(F.w, cw, e), h = w / lerp(F.w / F.h, cw / ch, sw);
        trip = rest({
          mode: 1, pos: [lerp(F.x, 0, e), lerp(F.y, 0, e), 0], size: [w, h],
          rot: [lerp(F.r, -0.08, e) - 0.25 * arc, 0.12 * arc, 0],
          bend: [Math.PI * (1 - fk), (1.1 * Math.sin(Math.PI * fk)) / w],
          texA: tex.front, texS: tex.sig, sig: sigNow, texB: footTex, gloss: 0.55, glossBack: 0.08, sheen: lerp(0.12, 0.14, e),
        }, lerp(0.6, 1.5, e) + 320 * arc);
      }
      objects.push(trip);
      // (anything resting on it slides off as it goes)
      supports.push({ id: k1 > 0 || climbing ? 'foot' : 'c' + RESUME, obj: trip, stable: false });
    }

    // ---- the colouring page, lying where the sticker landed, until it heads up the side ----
    paintOn = false;
    let overPage = false;
    if (foot && footTex && k1 >= 1 && !climbing && Math.abs(foot.x - cam) < (vw / 2) * zv + foot.w && Math.abs(foot.y - camY) < (vh / 2) * zv + foot.h) {
      const F = foot, page = rest({ pos: [F.x, F.y, 0], size: [F.w, F.h], rot: [F.r, 0, 0], texA: footTex, gloss: 0.08, sheen: 0.12 }, 0.6);
      footZ = page.pos[2];
      objects.push(page);
      supports.push({ id: 'foot', obj: page, stable: true });
      // light glancing off it as it is saved
      const fl = savedPageAt ? 1 - (now - savedPageAt) / 420 : 0;
      if (fl > 0) objects.push({ ...page, pos: [F.x, F.y, footZ + 0.3], texA: flashTex, alpha: 0.75 * fl * fl, gloss: 0, sheen: 0 });
      paintOn = true;
      const uv = paintOn && ptr.x >= 0 && !ptr.touch ? paperUV(ptr.x, ptr.y) : null;
      overPage = stroke !== null || (!!uv && Math.abs(uv[0]) <= 0.5 && Math.abs(uv[1]) <= 0.5);
    }
    placePaints(cam, camY, overPage);
    markNav(sp);

    // ---- things on the mat ----
    const meshes = [];
    if (it >= 1 && ptr.x >= 0 && held.k < 0) propHover = props.pick(ptr.x, ptr.y, cam, vw, vh, camY); else propHover = null;
    props.frame({ now, cam, vw: vw * zv, vh, objects, meshes, supports, hover: propHover, dt });

    // ---- leaves and flowers coming down, and lying wherever they land ----
    const tt = now / 1000;
    const moving = ptr.x >= 0 && now - ptr.lt < 80;
    const hand = moving ? { x: ptr.x - vw / 2 + cam, y: ptr.y - vh / 2 + camY, vx: ptr.vx, vy: ptr.vy, speed: Math.hypot(ptr.vx, ptr.vy) } : null;
    // butterflies, landing on whatever is lying still
    flies.step({ t: tt, dt, cam, camY, vw, vh, zv, supports, surfaceAt, on: it >= 1, toScreen: (q) => scene.toScreen(q, cam, camY),
      ptr: ptr.x >= 0 ? { x: ptr.x, y: ptr.y, moving: now - ptr.lt < 150 } : null }, objects);
    fall.step(tt, dt, { cam, camY, vw, vh, supports, ptr: it >= 1 ? hand : null }, objects);

    objects.sort((a, b) => a.pos[2] - b.pos[2]);
    cvs.style.cursor = overPage ? 'none' : held.k >= 0 ? 'zoom-out' : contactHover >= 0 || stampHover.some((h) => h.z > 6) || testHover.some((h) => h.z > 6) || coverHover.z > 6 || propHover ? 'pointer' : '';

    // ---- the mat under the cursor: carried along the way the hand moves, then springing back ----
    while (trail.length && now - trail[0].t > 1600) trail.shift();
    drags.fill(0); dragR.fill(1);
    trail.forEach((q, i) => {
      const age = (now - q.t) / 1000;
      const k = Math.min(1, age / 0.05) * Math.exp(-age / 0.42) * Math.cos(age * 5.5);
      let ax = q.vx * 0.012, ay = q.vy * 0.012;
      const m = Math.hypot(ax, ay);
      if (m > 14) { ax *= 14 / m; ay *= 14 / m; }
      drags.set([q.x, q.y, ax * k, ay * k], i * 4);
      dragR[i] = 55 + age * 50;
    });

    ptr.speed *= Math.exp(-dt * 2.5);
    const gg = 0.85 + 0.3 * Math.sin(tt * 0.21) * Math.sin(tt * 0.13 + 2) + Math.min(ptr.speed / 1800, 1.1);
    gust += (gg - gust) * (1 - Math.exp(-dt * 1.5));
    if (logo.open && logo.anchor) placeLogo(cam, camY);
    scene.render({ cam, camY, time: tt, gust, soft: 1.25, drags, dragR, colors: COLORS, objects, meshes, zoom, spin });
    raf(frame);
  }
  raf(frame);

  // clicking the camera or the radio
  addEventListener('click', (e) => {
    if (!props || e.target === btn || (e.target instanceof Node && (logoForm.contains(e.target) || paintsEl.contains(e.target) || navEl.contains(e.target)))) return;
    if (navBtn.getAttribute('aria-expanded') === 'true') { setNav(false); return; }
    // the end of a brush stroke, not a tap
    if (paintClick) { paintClick = false; return; }
    if (logo.open) { closeLogo(); return; }
    // a testimonial: tap to pick it up and read it, tap anywhere to put it back
    if (held.k >= 0) { held.open = false; return; }
    const j = contactAt(e.clientX, e.clientY);
    if (j >= 0) return useContact(j);
    const k = cardAt(e.clientX, e.clientY);
    if (k >= 0) { Object.assign(held, { k, p: 0, open: true, at: scrollY / vh }); return; }
    const id = props.pick(e.clientX, e.clientY, camNow, vw, vh, camNowY);
    if (id) props.click(id, performance.now());
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (navBtn.getAttribute('aria-expanded') === 'true') { setNav(false); navBtn.focus(); return; }
    if (held.k >= 0) held.open = false;
    if (logo.open) closeLogo();
  });
  function contactAt(x, y) {
    if (!sec || !testOn) return -1;
    return contactHit.findIndex((h) => h && localPointer(...h, x, y));
  }
  // peel the sticker up, then do what it says
  function useContact(j) {
    contactState[j].at = performance.now();
    if (j === CONTACT.length) return openLogo();
    const c = CONTACT[j];
    if (c.id === 'email') {
      if (c.value) copyText(c.value).then(() => { copiedAt = copiedAt || performance.now(); }).catch(() => {});
    } else if (c.url) {
      // a real link, followed: browsers let these through where they might stop a window.open
      const a = document.createElement('a');
      a.href = c.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
    }
  }
  // ---- leaving an email on the blank: a little form that sits just above it ----
  const logoForm = document.createElement('form');
  logoForm.id = 'logo'; logoForm.noValidate = true;
  logoForm.innerHTML = '<label class="sr" for="logo-email">Your email</label>'
    + '<input id="logo-email" type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="Type your email" required>'
    + '<button type="submit">Send</button><p class="err" role="status" aria-live="polite"></p>';
  document.body.appendChild(logoForm);
  const logoInput = logoForm.querySelector('input'), logoBtn = logoForm.querySelector('button'), logoErr = logoForm.querySelector('.err');
  function openLogo() {
    logo.open = true; logo.at = scrollY / vh;
    logoErr.textContent = '';
    logoForm.classList.add('on');
    logoInput.focus({ preventScroll: true });
  }
  function closeLogo() {
    logo.open = false;
    logoForm.classList.remove('on');
    logoInput.blur();
  }
  // above the blank as it lies on the sheet, or below it if there is no room, always on screen
  function placeLogo(cam, camY) {
    const [x, y, z, h] = logo.anchor, k = Scene.D / (Scene.D - z);
    const sx = (x - cam) * k + vw / 2, sy = (y - camY) * k + vh / 2, fw = logoForm.offsetWidth, fh = logoForm.offsetHeight;
    let top = sy - (h * k) / 2 - fh - 14;
    if (top < 16) top = sy + (h * k) / 2 + 14;
    logoForm.style.translate = `${Math.round(clamp(sx - fw / 2, 16, vw - fw - 16))}px ${Math.round(clamp(top, 16, vh - fh - 16))}px`;
  }
  logoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = logoInput.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { logoErr.textContent = 'That doesn\u2019t look like an email.'; logoInput.focus(); return; }
    logoBtn.disabled = true; logoBtn.textContent = 'Sending\u2026'; logoErr.textContent = '';
    fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}`, {
      method: 'POST',
      headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email }),
    }).then((r) => {
      // 409: already on the list, which is fine
      if (!r.ok && r.status !== 409) throw new Error(r.status);
      logo.savedAt = performance.now();
      try { localStorage.setItem('picnic-logo', '1'); } catch (err) {}
      logoInput.value = '';
      closeLogo();
    }).catch(() => { logoErr.textContent = 'That didn\u2019t go through. Try again?'; })
      .finally(() => { logoBtn.disabled = false; logoBtn.textContent = 'Send'; });
  });

  // ---- the colouring page: the paints under it, and the brush ----
  const paintsEl = document.createElement('div');
  paintsEl.id = 'paints'; paintsEl.setAttribute('role', 'toolbar'); paintsEl.setAttribute('aria-label', 'Paints'); paintsEl.inert = true;
  paintsEl.innerHTML = '<div class="sw">' + PAINTS.map(([n, c]) => `<button type="button" aria-label="${n}" aria-pressed="false" data-c="${c}" style="--c:${c}"></button>`).join('') + '</div>'
    + '<div class="sz">' + SIZES.map(([n, k], i) => `<button type="button" aria-label="${n}" aria-pressed="false" data-s="${k}"><i style="--d:${[6, 12, 20][i]}px"></i></button>`).join('')
    + '<button type="button" class="tool" data-a="erase" aria-pressed="false">Eraser</button></div>'
    + '<div class="act"><button type="button" class="tool" data-a="clear">Start over</button><button type="button" class="tool save" data-a="save">Save</button></div>';
  document.body.appendChild(paintsEl);
  const brushEl = document.createElement('div');
  brushEl.id = 'brush'; brushEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(brushEl);
  function setPaint(colour, eraser) {
    paintsEl.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', String(!eraser && b.dataset.c === colour)));
    paintsEl.querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.s === painter.brush)));
    paintsEl.querySelectorAll('[data-s] i').forEach((i) => i.style.background = eraser ? '#fff' : colour);
    paintsEl.querySelector('[data-a="erase"]').setAttribute('aria-pressed', String(eraser));
    brushEl.style.setProperty('--c', eraser ? 'rgba(255, 255, 255, 0.6)' : colour);
    brushEl.classList.toggle('erase', eraser);
  }
  paintsEl.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('button');
    if (!b || !painter) return;
    if (b.dataset.c) { painter.set(b.dataset.c); }
    else if (b.dataset.s) { painter.setSize(+b.dataset.s); }
    else if (b.dataset.a === 'erase') { painter.erase(!painter.eraser); }
    else if (b.dataset.a === 'clear') { painter.clear(performance.now()); }
    else if (b.dataset.a === 'save') { painter.save('picnic.png'); savedPageAt = performance.now(); }
    setPaint(painter.colour, painter.eraser);
  });
  // under the page, centred on it, and the brush ring following the cursor over it
  let paintsShown = false;
  function placePaints(cam, camY, overPage) {
    if (paintOn !== paintsShown) { paintsShown = paintOn; paintsEl.classList.toggle('on', paintOn); paintsEl.inert = !paintOn; }
    if (paintOn) {
      const F = foot, sx = F.x - cam + vw / 2, sy = F.y + F.h / 2 - camY + vh / 2 + F.gap;
      paintsEl.style.translate = `${Math.round(sx - paintsEl.offsetWidth / 2)}px ${Math.round(sy)}px`;
    }
    brushEl.classList.toggle('on', overPage && !ptr.touch);
    if (overPage && painter) {
      const d = painter.size * (Scene.D / (Scene.D - footZ));
      brushEl.style.width = brushEl.style.height = `${d}px`;
      brushEl.style.translate = `${ptr.x - d / 2}px ${ptr.y - d / 2}px`;
    }
  }
  // where a point on the screen falls on the page, -0.5..0.5 across it (and beyond, off its edges)
  function paperUV(px, py) {
    const F = foot, k = Scene.D / (Scene.D - footZ);
    const dx = (px - ((F.x - camNow) * k + vw / 2)) / k, dy = (py - ((F.y - camNowY) * k + vh / 2)) / k;
    const c = Math.cos(-F.r), s = Math.sin(-F.r);
    return [(dx * c - dy * s) / F.w, (dx * s + dy * c) / F.h];
  }
  function onPage(x, y) {
    if (!paintOn || !painter) return null;
    const uv = paperUV(x, y);
    return Math.abs(uv[0]) <= 0.5 && Math.abs(uv[1]) <= 0.5 ? uv : null;
  }
  cvs.addEventListener('pointerdown', (e) => {
    paintClick = false;
    if (e.button > 0 || stroke !== null) return;
    const uv = onPage(e.clientX, e.clientY);
    if (!uv) return;
    stroke = e.pointerId; paintClick = true;
    try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
    painter.down(uv[0], uv[1]);
  });
  cvs.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stroke) return;
    const all = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const q of all.length ? all : [e]) { const uv = paperUV(q.clientX, q.clientY); painter.move(uv[0], uv[1]); }
  });
  function endStroke() { if (stroke !== null) { stroke = null; painter.up(); } }
  cvs.addEventListener('pointerup', (e) => { if (e.pointerId === stroke) endStroke(); });
  cvs.addEventListener('pointercancel', (e) => { if (e.pointerId === stroke) endStroke(); });
  // a finger on the page paints rather than scrolls
  cvs.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (e.touches.length === 1 && onPage(t.clientX, t.clientY)) e.preventDefault(); }, { passive: false });
  cvs.addEventListener('touchmove', (e) => { if (stroke !== null) e.preventDefault(); }, { passive: false });

  // ---- the nav: a stamp in the corner that opens into a sheet of stamps, one for each part of the page ----
  const NAV = [
    ['hello', 'Hello', '#f6c945', '#141210', () => 0],
    ['work', 'Work', '#2442c6', '#fff8e4', () => T.trav1],
    ['words', 'Kind words', '#f08aa8', '#141210', () => T.tf1],
    ['hi', 'Say hi', '#d8322a', '#fff8e4', () => T.down],
    ['colour', 'Colour in', '#3f9a4f', '#fff8e4', () => T.s1],
  ];
  const ROTS = [-3, 2, -1.5, 3, -2.5];
  const PM = '<svg class="pm" viewBox="0 0 70 40" aria-hidden="true"><g fill="none" stroke="#c2303a" stroke-width="2.2" stroke-linecap="round">'
    + '<circle cx="17" cy="20" r="13"/><path d="M34 11q4-4 8 0t8 0t8 0t8 0M34 20q4-4 8 0t8 0t8 0t8 0M34 29q4-4 8 0t8 0t8 0t8 0"/></g></svg>';
  const navEl = document.createElement('nav');
  navEl.id = 'nav'; navEl.setAttribute('aria-label', 'Sections');
  navEl.innerHTML = '<button type="button" class="open" aria-expanded="false" aria-controls="nav-sheet" aria-label="Menu"><img alt=""></button>'
    + '<div id="nav-sheet" class="sheet">' + NAV.map(([k, l], i) => `<button type="button" class="st" data-k="${k}" aria-label="${l}" style="--r:${ROTS[i]}deg;--d:${60 + i * 60}ms"><img alt="">${PM}</button>`).join('') + '</div>';
  document.body.appendChild(navEl);
  const navBtn = navEl.querySelector('.open'), navSheet = navEl.querySelector('.sheet');
  navSheet.inert = true;
  // the stamps are drawn once the type has loaded (and the logo, for the one in the corner)
  Promise.all([document.fonts.load("600 12px 'Geist Mono'"), loadImg('clients/logo.svg').catch(() => null)]).then(([, logoImg]) => {
    navBtn.querySelector('img').src = Print.navStamp('logo', '', '#fbf6ea', '#141210', logoImg).toDataURL();
    NAV.forEach(([k, l, bg, ink], i) => { navSheet.children[i].querySelector('img').src = Print.navStamp(k, l, bg, ink).toDataURL(); });
  });
  function setNav(open) {
    navBtn.setAttribute('aria-expanded', String(open));
    navSheet.classList.toggle('on', open);
    navSheet.inert = !open;
  }
  navBtn.addEventListener('click', () => { const open = navBtn.getAttribute('aria-expanded') !== 'true'; setNav(open); });
  navSheet.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('.st');
    if (!b) return;
    const to = NAV.find((n) => n[0] === b.dataset.k)[4]();
    setNav(false);
    if (held.k >= 0) held.open = false;
    if (logo.open) closeLogo();
    scrollTo({ top: to * vh, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  // which part of the page you are in, postmarked on its stamp
  let navAt = -1;
  function markNav(p) {
    const k = p < T.peel1 || p >= T.u0 ? 0 : p < T.tf0 ? 1 : p < T.sheet ? 2 : p < T.s0 + 0.3 ? 3 : 4;
    if (k === navAt) return;
    navAt = k;
    [...navSheet.children].forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
  }

  // the clipboard, or the old way where that isn't allowed
  // (the old way first, right there in the tap, since it works everywhere at once; the clipboard API can sit
  // waiting on a permission that never comes, so it gets a moment and no more)
  function copyText(v) {
    let ok = false;
    try {
      const t = document.createElement('textarea');
      t.value = v; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, v.length);
      ok = document.execCommand('copy');
      t.remove();
    } catch (e) {}
    if (ok) return Promise.resolve();
    if (!navigator.clipboard) return Promise.reject();
    return Promise.race([navigator.clipboard.writeText(v), new Promise((res, rej) => setTimeout(rej, 1500))]);
  }
  function cardAt(x, y) {
    if (!sec || !testOn) return -1;
    for (let k = sec.cards.length - 1; k >= 0; k--) {
      const s = sec.cards[k];
      if (localPointer(s.x, s.y, 1, s.w, s.h, s.r, x, y)) return k;
    }
    return -1;
  }

  // sound is off until asked for; once asked, it comes back on the next visit at the first touch
  const btn = $('#sound');
  const store = (v) => { try { localStorage.setItem('picnic-sound', v ? '1' : '0'); } catch (e) {} };
  const setSound = (v) => {
    Garden.set(v);
    if (props) props.setRadio(v);
    btn.setAttribute('aria-pressed', String(v));
    btn.querySelector('.label').textContent = v ? 'Sound on' : 'Sound off';
  };
  btn.addEventListener('click', () => { const v = !Garden.on; setSound(v); store(v); });
  let wanted = false;
  try { wanted = localStorage.getItem('picnic-sound') === '1'; } catch (e) {}
  if (wanted) {
    const wake = (e) => {
      if (e.target instanceof Node && btn.contains(e.target)) return;
      removeEventListener('pointerdown', wake); removeEventListener('keydown', wake);
      if (!Garden.on) setSound(true);
    };
    addEventListener('pointerdown', wake); addEventListener('keydown', wake);
  }

  // test hook: jump straight to a point on the timeline
  window.picnic = { jump(p) { scrollTo(0, p * vh); sp = p; }, T, foot: () => foot, painter: () => painter, flies, drop: () => fall.drop(), held, cardAt, contactAt, contactState, CONTACT, copied: () => { copiedAt = performance.now(); } };
})();
