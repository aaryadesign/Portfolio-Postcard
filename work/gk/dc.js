// Plays one of Goalkeeper's canvas boards (a .dc.html file) exactly as it was designed: its own markup, styles and
// logic, rendered here by a small player. board.html?b=HomeLast plays boards/HomeLast.dc.html.
(() => {
  const name = (new URLSearchParams(location.search).get('b') || '').replace(/[^\w-]/g, '');
  const SVG = 'http://www.w3.org/2000/svg';
  // the app logos are PNGs; the animated emoji are WebP
  const PNG = new Set('536527ecec9b933db2d89e473cd8f4af 273ee58cb619fe3396fac17990de33d1 efe4118104cba6f076b772e38c7498a1 d29b1af891ec6706d31e0f6af6ce53d6 1bd1c207424eb25d8ebe97e24a48c0b3 a99adf15beab814547b9dfaa0cd7e7e6 962cf8cc0a0e030dd969392e2aad3cfc c83e563c70b1f527bc730e97b00db172 ff54b1e9ca36da6b6f52881eb69d9bba adfc422740ec8c5162df290249e74ea2 68559f35eeecbc671dedba3b601a56c2 3d27c6ee0755976fd196152872adfb29 c9969de6e3ef2df1fe753aeffdc4eeab 309014748ceef49054bfaeb2c9f97bb2 803ef26a65efb80750acb4998b63d613 861810427cbbf1e2cf5a1c87a8125d98 35b9819ff2677596544976f33747fd60 56a97072e91829d51ec5c718caf0f24d eb3ef331bf309f9cc67d6215d1753c21 e644bd9d25e60804065fe40d78b78ecf 56f20fd6bff5024e83542103180232d6 c6cc1094d8c3a05c2c38fc596aa23598 0b0c79b39cb497faa7ad656b6bca767c 786bac5dc8f59c6291499d4dfa9904a5 217aa1dde170a8443a7c9d849fea05fd ffb63f0255059f253a0978a0b63b493d 995fdbed1c032d51f659c091518a77fb dffbf2e1a3494cfb2f8eb5b57930068c c18e40f7efd39efacf9ad800def39d14 2aafdd84758c6ea94df13597b50d608a 658b6685d184453da05caf7e4ae422bc'.split(' '));
  const asset = (v) => String(v).replace(/\/_blob\/([0-9a-f]{32})/g, (_, id) => 'blob/' + id + (PNG.has(id) ? '.png' : '.webp'));

  // the letter pauses a board while it's off screen: its clocks stop, so nothing runs in the background
  let running = true;
  addEventListener('message', (e) => { if (e.data && typeof e.data.run === 'boolean') running = e.data.run; });
  const si = setInterval;
  window.setInterval = (fn, ms, ...a) => si(() => { if (running) fn(...a); }, ms);

  // ---------- holes ----------
  const HOLE = /\{\{\s*([\w$.]+)\s*\}\}/g, WHOLE = /^\{\{\s*([\w$.]+)\s*\}\}$/;
  function look(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  const fill = (s, scope) => s.replace(/\{\{\{\{/g, '{{').replace(/\}\}\}\}/g, '}}').replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : v; });

  // ---------- the template, turned into a function of the values ----------
  function compile(node) {
    if (node.nodeType === 3) {
      const t = node.nodeValue;
      if (!t.includes('{{')) return () => t;
      return (sc) => fill(t, sc);
    }
    if (node.nodeType !== 1) return () => null;
    const tag = node.localName;
    const kids = Array.from(node.childNodes).map(compile);
    const many = (sc) => kids.flatMap((k) => { const v = k(sc); return v == null ? [] : Array.isArray(v) ? v : [v]; });
    if (tag === 'sc-for') {
      const list = node.getAttribute('list').match(/[\w$.]+/)[0], as = node.getAttribute('as') || 'item';
      return (sc) => (look(list, sc) || []).flatMap((it, i) => many({ ...sc, [as]: it, $index: i }));
    }
    if (tag === 'sc-if') {
      const v = node.getAttribute('value').match(/[\w$.]+/)[0];
      return (sc) => (look(v, sc) ? many(sc) : null);
    }
    const ns = node.namespaceURI === SVG ? SVG : null;
    const attrs = Array.from(node.attributes).map((a) => {
      const w = a.value.match(WHOLE);
      return { n: a.name, v: a.value, w: w && w[1], h: a.value.includes('{{') };
    });
    return (sc) => {
      const props = {};
      attrs.forEach((a) => { props[a.n] = a.w ? look(a.w, sc) : a.h ? fill(a.v, sc) : a.v; });
      return { tag, ns, props, kids: many(sc) };
    };
  }

  // ---------- drawing it, and keeping the same elements from one frame to the next so transitions run ----------
  function make(v) {
    if (typeof v !== 'object') return document.createTextNode(String(v));
    const el = v.ns ? document.createElementNS(v.ns, v.tag) : document.createElement(v.tag);
    el.__p = {};
    return el;
  }
  function same(dom, v) {
    if (typeof v !== 'object') return dom.nodeType === 3;
    return dom.nodeType === 1 && dom.localName === v.tag && (dom.namespaceURI === SVG) === (v.ns === SVG);
  }
  function setProps(el, props) {
    const old = el.__p;
    for (const k in old) if (!(k in props)) el.removeAttribute(k);
    for (const k in props) {
      let v = props[k];
      if (k === 'onclick') { el.__click = v; if (!el.__on) { el.__on = true; el.addEventListener('click', (e) => el.__click && el.__click(e)); } continue; }
      if (k === 'ref') { if (typeof v === 'function') v(el); continue; }
      if (k.startsWith('hint-')) continue;
      if (k === 'src' && v) v = asset(v);
      if (k === 'style' && v) v = asset(v);
      if (old[k] === v) continue;
      if (v == null || v === false) el.removeAttribute(k); else el.setAttribute(k, v === true ? '' : String(v));
    }
    el.__p = props;
  }
  function patch(parent, list) {
    const doms = parent.childNodes;
    list.forEach((v, i) => {
      let dom = doms[i];
      if (!dom || !same(dom, v)) { const n = make(v); dom ? parent.replaceChild(n, dom) : parent.appendChild(n); dom = n; }
      if (typeof v !== 'object') { const s = String(v); if (dom.nodeValue !== s) dom.nodeValue = s; return; }
      setProps(dom, v.props);
      patch(dom, v.kids);
    });
    while (doms.length > list.length) parent.removeChild(parent.lastChild);
  }

  // ---------- the component ----------
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(u, cb) {
      const p = typeof u === 'function' ? u(this.state, this.props) : u;
      if (p) this.state = { ...this.state, ...p };
      this.__dirty();
      if (cb) queueMicrotask(cb);
    }
    forceUpdate() { this.__dirty(); }
  }

  async function play() {
    const src = await (await fetch('boards/' + name + '.dc.html')).text();
    const doc = new DOMParser().parseFromString(src, 'text/html');
    const xdc = doc.querySelector('x-dc');
    const helmet = xdc.querySelector('helmet');
    if (helmet) { Array.from(helmet.children).forEach((n) => document.head.appendChild(document.importNode(n, true))); helmet.remove(); }
    // scroll-linked motion needs scroll timelines; where they don't exist, show everything as it rests
    if (!(window.CSS && CSS.supports('animation-timeline: view()'))) {
      const s = document.createElement('style'); s.textContent = '.away,.read,.rv{animation:none!important}'; document.head.appendChild(s);
    }
    const tpl = Array.from(xdc.childNodes).map(compile);
    const script = doc.querySelector('script[data-dc-script]');
    let defaults = {};
    try { defaults = JSON.parse(script.getAttribute('data-props') || '{}'); } catch (e) {}
    const props = {};
    Object.keys(defaults).forEach((k) => { if (k[0] !== '$' && defaults[k] && 'default' in defaults[k]) props[k] = defaults[k].default; });
    const Component = new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic);
    const root = document.getElementById('root');
    const c = new Component(props);
    let queued = false;
    const draw = () => {
      queued = false;
      const vals = c.renderVals();
      patch(root, tpl.flatMap((t) => { const v = t(vals); return v == null ? [] : Array.isArray(v) ? v : [v]; }));
    };
    c.__dirty = () => { if (!queued) { queued = true; queueMicrotask(draw); } };
    draw();
    if (c.componentDidMount) c.componentDidMount();
    // links to other screens stay put: this is one screen on its own
    root.addEventListener('click', (e) => { const a = e.target.closest('a[href]'); if (a && /\.dc\.html/.test(a.getAttribute('href'))) e.preventDefault(); });
  }
  play();
})();
