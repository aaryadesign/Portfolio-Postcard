// The end of a letter: the case studies you haven't opened yet go by in a row, the way the Work row does, each
// one coming up full size as it passes the middle, its name underneath. The one you're on, and the ones you've
// already read this visit, are left out. (Once you've read them all, the row holds all the others again.)
(() => {
  const LIST = [
    ['goalkeeper', 'Goalkeeper'],
    ['phonepe', 'PhonePe Car Insurance'],
    ['ride-through-the-valley', 'Ride through the Valley'],
    ['dayro', 'Dayro Smart Home'],
    ['lamad', 'LAMAD ERP'],
    ['transporter', 'Transporter'],
    ['quickmart', 'QuickMart'],
  ];
  const here = location.pathname.split('/').pop().replace('.html', '');
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem('picnic-seen') || '[]'); } catch (e) {}
  if (!seen.includes(here)) seen.push(here);
  try { sessionStorage.setItem('picnic-seen', JSON.stringify(seen)); } catch (e) {}

  // in the order they lie on the mat, starting from the one after this
  const at = LIST.findIndex(([id]) => id === here);
  const after = LIST.slice(at + 1).concat(LIST.slice(0, Math.max(0, at))).filter(([id]) => id !== here);
  let left = after.filter(([id]) => !seen.includes(id));
  if (!left.length) left = after;

  const box = document.querySelector('.nextp');
  if (!box) return;
  const css = document.createElement('style');
  css.textContent = `
    .nextp .more{position:relative; height:280px; margin:0 -24px; overflow:hidden;
      -webkit-mask:linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent); mask:linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)}
    .nextp .more a{position:absolute; left:50%; top:50%; width:220px; will-change:transform}
    .nextp .more img{width:100%; transform:none; filter:drop-shadow(0 2px 2px rgba(60,40,0,.25)) drop-shadow(0 12px 16px rgba(60,40,0,.18)); transition:none}
    .nextp .more.still{display:flex; justify-content:center; align-items:center; gap:56px; -webkit-mask:none; mask:none}
    .nextp .more.still a{position:static; transition:transform .4s var(--ease)}
    .nextp .more.still a:nth-child(odd){transform:rotate(3deg)} .nextp .more.still a:nth-child(even){transform:rotate(-3deg)}
    .nextp .more.still a:hover{transform:rotate(-1deg) scale(1.04)}
    .nextp .name{display:inline-block; margin-top:8px; color:inherit; text-decoration:none; font-weight:700; font-size:32px; letter-spacing:-.03em;
      transition:opacity .3s var(--ease), filter .3s var(--ease)}
    .nextp .name.out{opacity:0; filter:blur(6px)}
    @media (max-width:600px){ .nextp .more{height:220px} .nextp .more a{width:170px} .nextp .more.still{gap:24px} .nextp .name{font-size:26px} }
  `;
  document.head.appendChild(css);

  const row = document.createElement('div');
  row.className = 'more';
  const name = document.createElement('a');
  name.className = 'name';
  const stamp = ([id, n]) => {
    const a = document.createElement('a');
    a.href = id + '.html'; a.dataset.go = id; a.setAttribute('aria-label', n);
    const im = new Image(); im.src = '../stamps/' + id + '.webp'; im.alt = n + ' stamp'; im.loading = 'lazy'; im.decoding = 'async';
    a.appendChild(im); return a;
  };
  const point = (id, n) => { name.href = id + '.html'; name.dataset.go = id; name.innerHTML = n + ' &rarr;'; };
  box.replaceChildren(row, name);

  // one or two: they just sit there, side by side
  if (left.length <= 2) {
    row.classList.add('still');
    left.forEach((p) => row.appendChild(stamp(p)));
    if (left.length === 1) point(...left[0]); else name.remove();
    return;
  }

  // three or more: they go by. Repeated if need be, so the row never runs short
  let items = left.slice();
  while (items.length < 7) items = items.concat(left);
  const els = items.map((p) => { const a = stamp(p); row.appendChild(a); return a; });
  const n = els.length, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // (named straight away, so the page's own link handling picks the name up as a link to a letter)
  let s = 0, last = performance.now(), hold = false, shown = items[0][0], speed = 0;
  point(...items[0]);
  row.addEventListener('pointerenter', () => { hold = true; });
  row.addEventListener('pointerleave', () => { hold = false; });
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    // it eases to a stop under the pointer, and gets going again after
    speed += ((hold || still ? 0 : 0.8) - speed) * (1 - Math.exp(-dt * 6));
    s += speed * dt;
    const gap = row.offsetWidth < 600 ? 190 : 250;
    let mid = 0, best = 9;
    els.forEach((el, i) => {
      let p = ((i - s) % n + n) % n; if (p > n / 2) p -= n;
      // each one hurries between places and lingers in the middle
      const step = Math.round(p), f = p - step, e = step + Math.sign(f) * Math.pow(Math.abs(f) * 2, 3) / 2;
      const near = Math.max(0, 1 - Math.abs(e));
      el.style.transform = `translate(calc(-50% + ${e * gap}px), -50%) rotate(${((i * 2.3) % 6) - 3}deg) scale(${0.62 + 0.38 * near})`;
      el.style.zIndex = Math.round(near * 10);
      el.tabIndex = near > 0.5 ? 0 : -1;
      if (Math.abs(e) < best) { best = Math.abs(e); mid = i; }
    });
    // the name underneath changes as each one takes the middle, a soft blur across
    const id = items[mid][0];
    if (shown !== id) {
      shown = id;
      name.classList.add('out'); setTimeout(() => { point(...items[mid]); name.classList.remove('out'); }, 300);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
