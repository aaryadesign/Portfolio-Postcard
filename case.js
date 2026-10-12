// Opening a case study. The stamp is picked up off the mat (turning back to its face if it was showing its
// back), a letter slides up over the picnic, and the stamp is carried onto the letter's corner, where it is
// postmarked. The letter is its own page (work/<id>.html) in a frame over the scene, so the mat and
// everything on it stay just where they were. Closing runs it all backwards.
window.Case = (() => {
  const PAGES = { goalkeeper: 'work/goalkeeper.html', phonepe: 'work/phonepe.html', 'ride-through-the-valley': 'work/ride-through-the-valley.html' };
  let frame = null, openId = null, busy = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // a stamp at the centre (x, y), w x h on screen, turned r, lifted l (0..1: raised toward you, a bigger
  // shadow), scaled s from the size the copy was made at. Turning it over is done inside, on .card, since a
  // shadow (a filter) would flatten the two sides into one
  const pose = (W, H) => ({ x, y, r, s = 1, l = 0 }) => ({
    transform: `translate(${x - W / 2}px, ${y - H / 2}px) rotate(${r}rad) scale(${s * (1 + 0.06 * l)})`,
    filter: `drop-shadow(0 ${2 + 22 * l}px ${3 + 26 * l}px rgba(40, 10, 15, ${0.28 - 0.06 * l}))`,
  });

  function copyOf(rect, art) {
    const el = document.createElement('div');
    el.id = 'fly';
    el.style.width = rect.w + 'px'; el.style.height = rect.h + 'px';
    const card = document.createElement('div');
    card.className = 'card';
    el.appendChild(card);
    for (const [cv, cls] of [[art.front, 'f'], [art.back, 'b']]) {
      if (!cv) continue;
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = cv.height; c.className = cls;
      c.getContext('2d').drawImage(cv, 0, 0);
      card.appendChild(c);
    }
    document.body.appendChild(el);
    return el;
  }
  // only carried from the mat when it is there to be seen
  const onScreen = (r) => (r && r.x > -r.w && r.x < innerWidth + r.w && r.y > -r.h && r.y < innerHeight + r.h ? r : null);
  const play = (el, frames, o) => el.animate(frames, { fill: 'forwards', ...o }).finished;
  // a slot on the letter, in the same terms as a stamp on the mat
  const asStamp = (slot, W) => ({ x: slot.x, y: slot.y, r: slot.r, s: slot.w / W });

  async function open(id, flyIn = true) {
    if (busy || openId || !PAGES[id]) return;
    busy = true; openId = id;
    if (location.hash !== '#' + id) history.pushState({ case: id }, '', '#' + id);
    const art = window.Picnic ? Picnic.art(id) : {};
    const rect = flyIn && art.front ? onScreen(Picnic.rect(id)) : null;

    document.body.classList.add('case');
    frame = document.createElement('iframe');
    frame.id = 'case'; frame.title = 'Case study'; frame.src = PAGES[id] + '?embed';
    frame.style.transform = 'translateY(105vh)';
    document.body.appendChild(frame);
    const loaded = new Promise((r) => frame.addEventListener('load', r, { once: true }));

    // picked up off the mat, turning over to its face on the way
    let fly = null, P = null, lifted = null;
    if (rect) {
      fly = copyOf(rect, art); P = pose(rect.w, rect.h);
      const f0 = Picnic.flip(id);
      Picnic.hide(id, true);
      lifted = { x: rect.x, y: rect.y - 26, r: rect.r * 0.5, l: 1 };
      fly.animate([P(rect), P(lifted)], { duration: 420, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' });
      if (f0 > 0) fly.firstChild.animate([{ transform: `perspective(1400px) rotateY(${f0 * 180}deg)` }, { transform: 'perspective(1400px) rotateY(0deg)' }],
        { duration: 520, easing: 'cubic-bezier(.3,1.1,.5,1)', fill: 'forwards' });
    }
    await loaded;
    const L = frame.contentWindow.Letter;
    if (rect) L.hideStamp();

    // the letter slides up from under the edge of the screen and settles
    const slide = play(frame, [{ transform: 'translateY(105vh) rotate(2.5deg)' }, { transform: 'translateY(0) rotate(0deg)' }],
      { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' });

    if (rect) {
      await wait(360);
      // carried over in an arc, coming down onto the corner of the letter, then pressed flat
      const to = asStamp(L.slot(), rect.w);
      const mid = { x: (lifted.x + to.x) / 2, y: Math.min(lifted.y, to.y) - 70, r: (lifted.r + to.r) / 2, s: (1 + to.s) / 2 + 0.06, l: 1 };
      await play(fly, [P(lifted), P(mid), P({ ...to, l: 0.5 })], { duration: 760, easing: 'cubic-bezier(.45,0,.25,1)' });
      await play(fly, [P({ ...to, l: 0.5 }), P({ ...to, s: to.s * 0.97, l: 0 }), P(to)], { duration: 180, easing: 'ease-out' });
      L.land();
      fly.remove();
    } else {
      await slide;
      L.land();
    }
    await slide;
    frame.focus();
    busy = false;
  }

  // the letter's back button and Escape come here; the browser's back button arrives as popstate
  function close() {
    if (!openId || busy) return;
    if (history.state && history.state.case === openId) history.back();
    else { history.replaceState(null, '', location.pathname + location.search); shut(); }
  }
  async function shut() {
    if (!openId || busy) return;
    busy = true;
    const L = frame.contentWindow.Letter, id = openId;
    await L.toTop();
    const art = window.Picnic ? Picnic.art(id) : {};
    const rect = art.front ? onScreen(Picnic.rect(id)) : null;
    let fly = null;
    if (rect) {
      fly = copyOf(rect, art);
      const P = pose(rect.w, rect.h), from = asStamp(L.slot(), rect.w);
      fly.animate([P(from)], { fill: 'forwards' });
      L.hideStamp();
      // peeled off the letter and lifted, while the letter starts to slide away under it
      const lifted = { x: rect.x, y: rect.y - 26, r: rect.r * 0.5, l: 1 };
      const mid = { x: (from.x + lifted.x) / 2, y: Math.min(from.y, lifted.y) - 70, r: (from.r + lifted.r) / 2, s: (from.s + 1) / 2 + 0.06, l: 1 };
      const slide = play(frame, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(105vh) rotate(2.5deg)' }],
        { duration: 820, delay: 200, easing: 'cubic-bezier(.7,0,.84,0)' });
      await play(fly, [P({ ...from, l: 0 }), P({ ...from, s: from.s * 1.04, l: 0.8 }), P(mid), P(lifted)],
        { duration: 900, easing: 'cubic-bezier(.45,0,.25,1)' });
      // set back down where it was
      await play(fly, [P(lifted), P({ ...rect, l: 0.15 }), P(rect)], { duration: 300, easing: 'cubic-bezier(.3,1.2,.5,1)' });
      Picnic.hide(id, false);
      requestAnimationFrame(() => fly.remove());
      await slide;
    } else {
      if (window.Picnic) Picnic.hide(id, false);
      await play(frame, [{ transform: 'translateY(0)' }, { transform: 'translateY(105vh) rotate(2.5deg)' }], { duration: 700, easing: 'cubic-bezier(.7,0,.84,0)' });
    }
    frame.remove(); frame = null; openId = null; busy = false;
    document.body.classList.remove('case');
  }

  // from one letter to the next: the paper stays, the page on it changes
  function go(id) {
    if (!openId || busy || !PAGES[id] || id === openId) return;
    if (window.Picnic) Picnic.hide(openId, false);
    openId = id;
    history.replaceState({ case: id }, '', '#' + id);
    frame.addEventListener('load', () => { frame.contentWindow.scrollTo(0, 0); frame.contentWindow.Letter.land(); frame.focus(); }, { once: true });
    // replace, so the browser's back button still closes the letter rather than turning back a page
    frame.contentWindow.location.replace(new URL(PAGES[id] + '?embed', location.href).href);
  }

  addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (openId && id !== openId) shut();
    else if (!openId && PAGES[id]) open(id);
  });
  // arriving with a case study in the address: the letter slides up once the picnic is showing
  if (PAGES[location.hash.slice(1)]) {
    const id = location.hash.slice(1);
    const go = () => (document.body.classList.contains('on') ? setTimeout(() => open(id, false), 600) : setTimeout(go, 200));
    addEventListener('load', go);
  }

  return { open, close, go, has: (id) => !!PAGES[id] };
})();
