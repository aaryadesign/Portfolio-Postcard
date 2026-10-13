// One WebGL scene: the mat, leaf shadows worked out in 3D, a bendable postcard, and paper objects lying on the mat.
// World units are CSS px; x right, y down, z up off the mat. The camera looks straight down from D px.
window.Scene = (() => {
  const D = 1800;
  const LV = (() => { const v = [-0.36, -0.46, 0.81], n = Math.hypot(...v); return v.map((x) => x / n); })();

  const COMMON = `
  float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float hash1(float n){ return fract(sin(n * 91.345) * 47453.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p){
    float s = 0., a = .5;
    for (int i = 0; i < 5; i++) { s += a*noise(p); p = mat2(1.6, 1.2, -1.2, 1.6)*p + 7.3; a *= .5; }
    return s;
  }
  const vec3 L = normalize(vec3(-.36, -.46, .81));
  const vec3 AMB = vec3(.56, .56, .62);
  const vec3 SUN = vec3(1., .99, .965);
  const float D = 1800.;`;

  const FS_VS = `#version 300 es
  in vec2 a; void main(){ gl_Position = vec4(a*2., 0., 1.); }`;

  // Low-frequency cloth: fold lighting, weave slack and wear, baked once per resize
  const FIELD = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform vec2 fres;
  uniform vec4 rect;
  const float ANG = -.04;
  ${COMMON}
  float crease(float d, float s){ return s*(1.4*exp(-d*d/50.) + 1.1*exp(-d*d/2600.)); }
  float height(vec2 m){
    float wx = (noise(vec2(m.y/170., 3.)) - .5)*26.;
    float wy = (noise(vec2(m.x/210., 9.)) - .5)*22.;
    float sx = mod(floor((m.x + wx)/660.), 2.)*2. - 1.;
    float sy = mod(floor((m.y + wy)/560.), 2.)*2. - 1.;
    float dx = mod(m.x + wx, 660.) - 330.;
    float dy = mod(m.y + wy, 560.) - 280.;
    float h = crease(dx, sx)*1.3 + crease(dy, sy)*1.0;
    h += (fbm(m/380.) - .5)*16.;
    float wr = fbm(m/240. + 4.);
    h += sin(dot(m, vec2(.55, .83))/21. + wr*7.)*smoothstep(.5, .72, fbm(m/520. + 11.))*1.5;
    return h;
  }
  void main(){
    vec2 w = mix(rect.xy, rect.zw, gl_FragCoord.xy/fres);
    float c = cos(ANG), s = sin(ANG);
    vec2 m = mat2(c, -s, s, c)*w;
    float e = 2.;
    float hx = (height(m + vec2(e, 0)) - height(m - vec2(e, 0)))/(2.*e);
    float hy = (height(m + vec2(0, e)) - height(m - vec2(0, e)))/(2.*e);
    vec3 n = normalize(vec3(-hx, -hy, 1.));
    float shade = 1. + (dot(n, L) - L.z)*1.7;
    shade *= 1. + clamp(height(m)*.01, -.07, .04);
    vec2 slack = vec2(fbm(m/300. + 1.), fbm(m/300. + 5.)) - .5;
    o = vec4(clamp(shade*.5, 0., 1.), slack*.9 + .5, fbm(m/90. + 20.));
  }`;

  // Sunlight through the canopy on the ground plane. r: as it falls on the mat, g: crisper, as it falls on something lifted
  const LEAF = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform vec2 fres;
  uniform vec4 rect;
  uniform float time, gust, soft;
  uniform vec4 B[12];
  uniform vec4 C[12];
  uniform int nB;
  uniform vec4 K[4];
  uniform int nK;
  ${COMMON}
  vec2 edge(float bl, float d){ return vec2(smoothstep(-bl, bl, d), smoothstep(-bl*.45, bl*.45, d)); }
  float leafSd(vec2 p, vec2 c, float a, float len, float W){
    p -= c;
    float ca = cos(a), sa = sin(a);
    p = vec2(ca*p.x + sa*p.y, -sa*p.x + ca*p.y);
    p.x -= len*.5;
    float t = clamp(p.x/(len*.5), -1., 1.);
    float w = W*sqrt(max(0., 1. - t*t))*(1.1 - .3*t);
    return max(abs(p.x) - len*.5, abs(p.y) - w);
  }
  vec2 branch(vec2 p, vec4 b, vec4 c, float t){
    vec2 base = b.xy;
    float ang = b.z, len = b.w, blur = c.x*soft, seed = c.y, bend = c.z;
    vec2 d0 = vec2(cos(ang), sin(ang));
    if (length(p - (base + d0*len*.5)) > len*.62 + 150. + blur*3.) return vec2(1.);
    float g = gust;
    float sway = (sin(t*.7 + seed)*.035 + sin(t*1.63 + seed*2.)*.016)*g;
    float a = ang + sway;
    vec2 dir = vec2(cos(a), sin(a)), nrm = vec2(-dir.y, dir.x);
    vec2 pa = p - base;
    vec2 s = vec2(1.);
    float al = clamp(dot(pa, dir), 0., len);
    s = min(s, edge(blur, length(pa - dir*al - nrm*bend*al*al/len) - mix(5., 1.4, al/len)));
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float u = .18 + fi*.095;
      float side = mod(fi, 2.) < 1. ? 1. : -1.;
      vec2 tb = dir*(u*len) + nrm*bend*u*u*len;
      float tl = len*(.32 - fi*.022);
      float ta = a + side*(.75 + .25*sin(fi*2.7 + seed)) + sway*1.8 + sin(t*1.3 + fi*1.9 + seed)*.05*g;
      vec2 td = vec2(cos(ta), sin(ta)), tn = vec2(-td.y, td.x);
      vec2 pt = pa - tb;
      float tAlong = dot(pt, td);
      float bl = blur*(.55 + 1.*hash1(fi + seed*7.));
      if (abs(dot(pt, tn)) > 80. + bl*2. || tAlong < -70. || tAlong > tl + 80.) continue;
      s = min(s, edge(bl, length(pt - td*clamp(tAlong, 0., tl)) - 1.3));
      for (int j = 0; j < 8; j++) {
        float fj = float(j);
        bool tip = j == 7;
        float v = tip ? 1. : .1 + fj*.13;
        float ls = tip ? 0. : (mod(fj, 2.) < 1. ? 1. : -1.);
        float fl = sin(t*(2.4 + hash1(fi*7. + fj)*2.2) + fi*3. + fj*1.7 + seed)*.22*g;
        float la = ta + ls*(.85 + .2*hash1(fi + fj*3. + seed)) + fl;
        float ll = 40. + 26.*hash1(fi*3.1 + fj + seed);
        float W = ll*(.26 + .08*hash1(fj*5. + fi + seed));
        W *= .6 + .4*abs(cos(fl*2.2));
        // each leaf hangs at its own height, so its edge is its own softness
        float lb = bl*(.75 + .5*hash1(fi*13. + fj*7. + seed));
        s = min(s, edge(lb, leafSd(pt, td*(v*tl), la, ll, W)));
      }
    }
    return s;
  }
  // the far crown: soft masses, with round sun flecks where light gets through
  vec2 canopy(vec2 p, vec4 k, float t){
    float d = length(p - k.xy)/k.z;
    if (d > 1.25) return vec2(1.);
    vec2 drift = vec2(sin(t*.5), cos(t*.37))*6.*gust;
    float n = fbm((p + drift)/80.)*.62 + fbm((p - drift*1.6)/34. + 7.)*.38;
    float dens = n + (1. - d)*.32;
    float fall = smoothstep(1.2, .55, d);
    float m1 = smoothstep(.38, .6, dens), m2 = smoothstep(.43, .53, dens);
    vec2 cell = floor((p + drift*.6)/52.);
    float fleck = 0., fleck2 = 0.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 c = cell + vec2(x, y);
      float h = hash(c*1.7);
      if (h < .55) continue;
      vec2 q = (c + vec2(hash(c + 3.1), hash(c + 7.7)))*52.;
      float r = 4. + 7.*hash(c + 9.3);
      float dd = length((p + drift*.6) - q);
      fleck = max(fleck, smoothstep(r + 6.*soft, r - 3., dd));
      fleck2 = max(fleck2, smoothstep(r + 2., r - 1., dd));
    }
    return vec2(1.) - vec2(m1*(1. - fleck*.8), m2*(1. - fleck2*.85))*fall;
  }
  void main(){
    vec2 p = mix(rect.xy, rect.zw, gl_FragCoord.xy/fres);
    vec2 s = vec2(1.);
    for (int i = 0; i < 12; i++) { if (i >= nB) break; s = min(s, branch(p, B[i], C[i], time)); }
    for (int i = 0; i < 4; i++) { if (i >= nK) break; s = min(s, canopy(p, K[i], time)); }
    o = vec4(s, 0., 1.);
  }`;

  // Objects: a grid that can bend along its width (the postcard, a peeling stamp), lying flat otherwise
  const OBJ_VS = (occ) => `#version 300 es
  precision highp float;
  ${occ ? '#define OCC' : ''}
  in vec2 a;
  uniform vec3 pos;
  uniform vec2 size;
  uniform vec3 rot;
  uniform vec2 bend;
  uniform vec3 curlA;
  uniform vec2 curlB;
  uniform vec4 crumple;
  uniform vec3 quad;
  uniform float shape;
  uniform vec2 cam;
  uniform float zoom, spin;
  uniform vec2 view;
  uniform vec4 wrect;
  out vec3 vP; out vec3 vN; out vec2 vUV; out vec3 vQ; out vec3 vT; out vec3 vO; out float vC;
  ${COMMON}
  float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
  const float FSZ = 2.1;
  vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p)*43758.5453); }
  // the facets of a crumpled ball: each patch of paper is a flat plane, tipped a little and set a little in or
  // out; where a lower plane meets a higher one there is a lip, and a shadow tucked under it. p is where this
  // bit of paper sits on the finished ball (a unit sphere), scaled to the facet size.
  // returns (height off the sphere, as a share of its radius; how deep in shadow; distance to the edge), and the plane's tilt
  vec3 warp(vec3 p){ return p + (vec3(sin(p.y*1.7 + 1.3), sin(p.z*1.9 + 4.1), sin(p.x*1.5 + 2.7)) + .5*vec3(sin(p.z*3.1), sin(p.x*2.9 + 1.), sin(p.y*3.3 + 2.)))*.32; }
  vec3 facets(vec3 p, float TL, float OF, float W, out vec3 tilt){
    vec3 P = normalize(p), i = floor(p);
    float d1 = 9., d2 = 9.; vec3 a1, a2;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = i + vec3(x, y, z), fp = g + h3(g);
      // weighted, so some facets grow big and others stay small, and every edge stays straight
      vec3 df = fp - p; float d = dot(df, df) - h3(g + 2.9).y*.55;
      if (d < d1) { d2 = d1; a2 = a1; d1 = d; a1 = g; } else if (d < d2) { d2 = d; a2 = g; }
    }
    vec3 c1 = normalize(a1 + h3(a1)), c2 = normalize(a2 + h3(a2));
    vec3 n1 = normalize(c1 + (h3(a1 + 31.7) - .5)*TL), n2 = normalize(c2 + (h3(a2 + 31.7) - .5)*TL);
    float o1 = (h3(a1 + 7.3).x - .5)*OF, o2 = (h3(a2 + 7.3).x - .5)*OF;
    float k1 = dot(c1*(1. + o1), n1)/max(dot(P, n1), .3) - 1., k2 = dot(c2*(1. + o2), n2)/max(dot(P, n2), .3) - 1.;
    // the step between two planes is eased over a short width, so it reads as a lip, not a stair
    float e = d2 - d1, w = smoothstep(0., W, e);
    tilt = n1 - P*dot(n1, P);
    return vec3(mix((k1 + k2)*.5, k1, w), smoothstep(.02, .07, k2 - k1)*exp(-e*16.), e);
  }
  // the same planes, blended smoothly, for the shape itself: the mesh can't hold a sharp step, the shading can
  float lumps(vec3 p, float TL, float OF){
    vec3 P = normalize(p), i = floor(p);
    float sw = 0., sh = 0.;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = i + vec3(x, y, z), fp = g + h3(g), c1 = normalize(fp);
      vec3 df = fp - p; float w = exp(-(dot(df, df) - h3(g + 2.9).y*.55)*10.);
      vec3 n1 = normalize(c1 + (h3(g + 31.7) - .5)*TL);
      float o1 = (h3(g + 7.3).x - .5)*OF;
      sh += w*(dot(c1*(1. + o1), n1)/max(dot(P, n1), .3) - 1.); sw += w;
    }
    return sh/max(sw, 1e-5);
  }
  void main(){
    float s = a.x*size.x, t = a.y*size.y;
    vec3 lp, ln;
    vQ = vec3(0., 0., 1.); vT = vec3(1., 0., 0.); vO = vec3(1., 0., 0.); vC = 0.;
    if (shape > .5) {
      // a leaf or a flower: curled along its length, cupped across it, and twisted
      lp = vec3(s, t, quad.x*s*s + quad.y*t*t + quad.z*s*t);
      ln = normalize(vec3(-(2.*quad.x*s + quad.z*t), -(2.*quad.y*t + quad.z*s), 1.));
    } else if (crumple.y > 0.) {
      // a sheet crumpled into a ball (crumple: how crumpled, ball radius, roll, half its diagonal). The sheet is
      // drawn round a sphere from its middle, square mapped to a disc so every edge closes at the same point,
      // drawing side in. On it, flat facets between straight creases, lumps where they sit in or out
      float c = crumple.x, R = crumple.y;
      vec2 q = a*2., dk = vec2(q.x*sqrt(1. - q.y*q.y*.5), q.y*sqrt(1. - q.x*q.x*.5));
      float rd = min(length(dk), 1.), th1 = 2.*asin(rd*.999), pd = atan(dk.y*size.y, dk.x*size.x);
      // it doesn't open evenly: some flaps let go before others, the outside before the middle
      float wv = .5 + .22*sin(2.*pd + 1.3) + .18*sin(3.*pd + 4.1) + .1*sin(5.*pd + 2.2);
      float o = clamp(((1. - c) - .25*wv*(1. - .5*rd))/.75, 0., 1.), cl = 1. - smoothstep(0., 1., o);
      float m = smoothstep(0., 1., cl), D = crumple.w;
      float L = length(vec2(s, t)), ph = atan(mix(t, dk.y*size.y, m), mix(s, dk.x*size.x, m));
      float r = R/max(pow(cl, 1.6), 1e-4), th = mix(L, th1*R, m)/r;
      lp = vec3(sin(th)*cos(ph), sin(th)*sin(ph), 1. - cos(th))*r;
      ln = vec3(-sin(th)*cos(ph), -sin(th)*sin(ph), cos(th));
      // where this bit of paper sits on the finished ball: the facets belong to it, so they keep their place as it opens
      vec3 P = vec3(sin(th1)*cos(pd), sin(th1)*sin(pd), -cos(th1));
      float h = clamp(lumps(P*FSZ, .55, .1), -.3, .3) + lumps(P*FSZ*2.4 + 11.3, .5, .05)*.25;
      // half open it is still rumpled: the creases stand big against the sheet
      lp -= ln*h*(R*cl + D*.3*cl*(1. - cl));
      lp.z *= mix(1., .86, m);
      vQ = P; vC = cl;
      // the frame the facets tilt in: on the ball, and here, as it opens (along the sheet from its middle; outward)
      vT = vec3(cos(th)*cos(ph), cos(th)*sin(ph), sin(th));
      vO = vec3(cos(th1)*cos(pd), cos(th1)*sin(pd), sin(th1));
      // rolling, about the ball's own centre
      float ca = cos(crumple.z), sa = sin(crumple.z);
      lp.z -= R; lp = vec3(lp.x*ca + lp.z*sa, lp.y, -lp.x*sa + lp.z*ca); lp.z += R;
      ln = vec3(ln.x*ca + ln.z*sa, ln.y, -ln.x*sa + ln.z*ca);
      vT = vec3(vT.x*ca + vT.z*sa, vT.y, -vT.x*sa + vT.z*ca);
    } else if (curlB.x > 0.) {
      // peeling up: past the fold line (across direction u, at d) the paper rolls round a cylinder of
      // radius R and lies back over itself, face down; the whole of it slid along u to stay in place
      vec2 u = curlA.xy, v = vec2(-u.y, u.x);
      float al = dot(vec2(s, t), u), x = al - curlA.z, R = curlB.x, an = al, z = 0.;
      vec2 nn = vec2(0., 1.);
      if (x > 0.) {
        float ag = min(x/R, 3.14159265);
        an = curlA.z + R*sin(ag) - max(x - 3.14159265*R, 0.);
        z = R*(1. - cos(ag));
        nn = vec2(-sin(ag), cos(ag));
      }
      lp = vec3(u*(an + curlB.y) + v*dot(vec2(s, t), v), z);
      ln = vec3(u*nn.x, nn.y);
    } else {
      float th0 = bend.x, k = bend.y, th = th0 + k*s;
      lp = abs(k) < 1e-6 ? vec3(s*cos(th0), t, s*sin(th0)) : vec3((sin(th) - sin(th0))/k, t, (cos(th0) - cos(th))/k);
      ln = vec3(-sin(th), 0., cos(th));
    }
    float c = cos(rot.y), sn = sin(rot.y);
    lp = vec3(lp.x, lp.y*c - lp.z*sn, lp.y*sn + lp.z*c);
    ln = vec3(ln.x, ln.y*c - ln.z*sn, ln.y*sn + ln.z*c);
    vT = vec3(vT.x, vT.y*c - vT.z*sn, vT.y*sn + vT.z*c);
    c = cos(rot.z); sn = sin(rot.z);
    lp = vec3(lp.x*c + lp.z*sn, lp.y, -lp.x*sn + lp.z*c);
    ln = vec3(ln.x*c + ln.z*sn, ln.y, -ln.x*sn + ln.z*c);
    vT = vec3(vT.x*c + vT.z*sn, vT.y, -vT.x*sn + vT.z*c);
    c = cos(rot.x); sn = sin(rot.x);
    lp = vec3(lp.x*c - lp.y*sn, lp.x*sn + lp.y*c, lp.z);
    ln = vec3(ln.x*c - ln.y*sn, ln.x*sn + ln.y*c, ln.z);
    vT = vec3(vT.x*c - vT.y*sn, vT.x*sn + vT.y*c, vT.z);
    vP = pos + lp; vN = ln; vUV = a + .5;
  #ifdef OCC
    vec2 g = vP.xy - L.xy/L.z*vP.z;
    gl_Position = vec4((g - (wrect.xy + wrect.zw)*.5)/((wrect.zw - wrect.xy)*.5), 0., 1.);
  #else
    // the camera can be higher than usual (zoom < 1) and turned a little, for the welcome
    vec2 q = vP.xy - cam;
    float cr = cos(spin), sr = sin(spin);
    q = vec2(cr*q.x - sr*q.y, sr*q.x + cr*q.y);
    float w = (D/zoom - vP.z)/D;
    gl_Position = vec4(q.x/(view.x*.5), -q.y/(view.y*.5), -vP.z/5000.*w, w);
  #endif
  }`;

  // Shadow casters seen from the sun: coverage, and the caster's height
  const OCC_FS = `#version 300 es
  precision highp float;
  in vec3 vP; in vec3 vN; in vec2 vUV;
  out vec4 o;
  uniform sampler2D texA;
  uniform int mode;
  uniform float alphaMul;
  void main(){
    if (mode == 3) discard;
    float a = mode == 1 ? 1. : texture(texA, vUV).a*alphaMul;
    if (a < .5) discard;
    // a leaf high in the air throws a fainter, broader shadow than one about to land
    float f = mode == 2 ? 1. - .6*smoothstep(40., 450., vP.z) : 1.;
    o = vec4(f, f*clamp(vP.z/600., 0., 1.), 0., 1.);
  }`;

  // Solid things on the mat (a camera, a glass, a radio...): real meshes, lit like everything else
  const MESH_VS = (occ) => `#version 300 es
  precision highp float;
  ${occ ? '#define OCC' : ''}
  layout(location = 0) in vec3 aP;
  layout(location = 1) in vec3 aN;
  layout(location = 2) in vec2 aT;
  uniform mat3 M, MN;
  uniform vec3 pos;
  uniform vec2 cam;
  uniform float zoom, spin;
  uniform vec2 view;
  uniform vec4 wrect;
  out vec3 vP; out vec3 vN; out vec2 vUV;
  ${COMMON}
  void main(){
    vP = pos + M*aP; vN = normalize(MN*aN); vUV = aT;
  #ifdef OCC
    vec2 g = vP.xy - L.xy/L.z*vP.z;
    gl_Position = vec4((g - (wrect.xy + wrect.zw)*.5)/((wrect.zw - wrect.xy)*.5), 0., 1.);
  #else
    vec2 q = vP.xy - cam;
    float cr = cos(spin), sr = sin(spin);
    q = vec2(cr*q.x - sr*q.y, sr*q.x + cr*q.y);
    float w = (D/zoom - vP.z)/D;
    gl_Position = vec4(q.x/(view.x*.5), -q.y/(view.y*.5), -vP.z/5000.*w, w);
  #endif
  }`;

  const MESH_OCC_FS = `#version 300 es
  precision highp float;
  in vec3 vP; in vec3 vN; in vec2 vUV;
  out vec4 o;
  uniform float shadow;
  void main(){ o = vec4(shadow, shadow*clamp(vP.z/600., 0., 1.), 0., 1.); }`;

  const MESH_FS = `#version 300 es
  precision highp float;
  in vec3 vP; in vec3 vN; in vec2 vUV;
  out vec4 o;
  uniform sampler2D tex, leafTex, occT, occW;
  uniform vec4 color;
  uniform float useTex, gloss, specPow, sheen, opacity, refl, metal, zoom;
  uniform vec2 cam;
  uniform vec4 wrect;
  ${COMMON}
  vec3 sky(vec3 R){
    // what a shiny surface on a lawn reflects: bright sky above, the tree and grass toward the horizon
    vec3 up = mix(vec3(.74, .82, .9), vec3(.98, .99, 1.), smoothstep(.3, .95, R.z));
    vec3 low = mix(vec3(.2, .24, .14), vec3(.42, .46, .34), smoothstep(-.6, .15, R.z));
    return mix(low, up, smoothstep(.05, .35, R.z));
  }
  void main(){
    vec3 V = normalize(vec3(cam, D/zoom) - vP);
    vec3 N = normalize(vN);
    if (dot(N, V) < 0.) N = -N;
    vec4 t = useTex > .5 ? texture(tex, vUV) : vec4(1.);
    vec3 alb = (t.a > .001 ? t.rgb/t.a : vec3(0.))*color.rgb;
    float a = t.a*color.a*opacity;
    if (a < .004) discard;
    vec2 q = vP.xy - L.xy/L.z*vP.z;
    vec2 lu = (q - wrect.xy)/(wrect.zw - wrect.xy);
    vec2 lr = texture(leafTex, lu).rg;
    float S = mix(lr.r, lr.g, clamp(vP.z/300., 0., 1.));
    vec4 tT = texture(occT, lu), tW = texture(occW, lu);
    float hgt = tW.r > .002 ? tW.g/tW.r*600. : 0.;
    float occ = mix(tT.r, tW.r, clamp((hgt - vP.z)/150., 0., 1.))*smoothstep(vP.z + 3., vP.z + 28., hgt);
    float nl = dot(N, L);
    float sunVis = S*(1. - occ*.96);
    vec3 light = AMB*(.82 + .18*N.z) + (SUN - AMB)*sunVis*max(nl, 0.)/L.z;
    vec3 H = normalize(L + V);
    float nh = max(dot(N, H), 0.), lit = sunVis*step(0., nl);
    float spec = (pow(nh, specPow)*gloss + pow(nh, 26.)*sheen)*lit;
    vec3 R = reflect(-V, N);
    float fres = pow(1. - max(dot(N, V), 0.), 5.);
    vec3 env = sky(R)*(.55 + .45*S);
    vec3 col = alb*light;
    // metal: mostly what it reflects, coloured by the metal
    col = mix(col, env*alb*1.15, metal);
    // a clear coat or glass reflects the sky, most at grazing angles
    vec3 shine = env*refl*(.04 + .96*fres) + vec3(spec)*SUN;
    float ao = a + (1. - a)*min(1., refl*fres*.9 + spec);
    o = vec4(col*a + shine, ao);
  }`;

  const BLUR = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform sampler2D src;
  uniform vec2 res, dir;
  void main(){
    vec2 uv = gl_FragCoord.xy/res;
    vec4 acc = vec4(0.); float ws = 0.;
    for (int i = -6; i <= 6; i++) { float f = float(i), w = exp(-f*f/18.); acc += texture(src, uv + dir*f)*w; ws += w; }
    o = acc/ws;
  }`;

  const MAT = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform sampler2D field, leafTex, occT, occW;
  uniform vec2 res, view;
  uniform vec2 cam;
  uniform float dpr, zoom, spin;
  uniform vec4 rect, wrect;
  uniform vec3 base, dye;
  uniform vec4 drags[12];
  uniform float dragR[12];
  uniform int ss;
  const float ANG = -.04, T = 2.3, N = 20.;
  ${COMMON}
  vec3 weave(vec2 q){
    vec2 id = floor(q/T), f = fract(q/T);
    vec3 cw = mix(base, dye, mod(floor(id.x/N), 2.));
    vec3 cf = mix(base, dye, mod(floor(id.y/N), 2.));
    cw *= .93 + .12*noise(vec2(id.x*1.7, q.y/26.));
    cf *= .93 + .12*noise(vec2(q.x/26., id.y*1.7));
    float pw = sin(3.1416*f.x), pf = sin(3.1416*f.y);
    return mod(id.x + id.y, 2.) < 1.
      ? cw*(.7 + .32*sqrt(pw))*(.92 + .08*pf)
      : cf*(.7 + .32*sqrt(pf))*(.92 + .08*pw);
  }
  void main(){
    vec2 css0 = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y)/dpr;
    vec2 sc = (css0 - view*.5)/zoom;
    float cr = cos(spin), sr = sin(spin);
    vec2 w0 = vec2(cr*sc.x + sr*sc.y, -sr*sc.x + cr*sc.y) + cam;
    // a passing hand carries the cloth along: it bunches up ahead of the hand and stretches behind it,
    // then springs back. disp is how far the weave moved, g the slope of the little rucks it makes.
    vec2 disp = vec2(0.), g = vec2(0.);
    for (int i = 0; i < 12; i++) {
      vec4 k = drags[i];
      if (k.z == 0. && k.w == 0.) continue;
      float r2 = dragR[i]*dragR[i];
      vec2 d = w0 - k.xy;
      float G = exp(-dot(d, d)/r2);
      if (G < .004) continue;
      float ad = dot(k.zw, d);
      disp += k.zw*G;
      // height = -div(disp) = 2 (A.d)/r2 G, and its gradient
      g += 2.*G/r2*(k.zw - 2.*ad*d/r2);
    }
    g *= 26.;
    vec4 F = texture(field, (w0 - rect.xy)/(rect.zw - rect.xy));
    vec2 slack = (F.gb - .5)*16.;
    float c = cos(ANG), s = sin(ANG);
    mat2 R = mat2(c, -s, s, c);
    vec3 col = vec3(0);
    if (ss == 4) {
      for (int i = 0; i < 4; i++) {
        vec2 off = vec2(float(i & 1), float(i >> 1)) - .5;
        col += weave(R*(w0 - disp + off*.5/dpr) + slack);
      }
      col *= .25;
    } else {
      col = (weave(R*(w0 - disp - .25/dpr) + slack) + weave(R*(w0 - disp + .25/dpr) + slack))*.5;
    }
    // only the light catching the rucks changes; nothing presses a dark hollow into the mat
    vec3 n = normalize(vec3(-g, 1.));
    float shade = F.r*2.*(1. + (dot(n, L) - L.z)/L.z*.9);
    col *= 1. - (F.a - .5)*.08;
    col *= .975 + .05*hash(gl_FragCoord.xy);
    vec2 lu = (w0 - wrect.xy)/(wrect.zw - wrect.xy);
    float S = texture(leafTex, lu).r;
    vec4 tT = texture(occT, lu), tW = texture(occW, lu);
    float hgt = tW.r > .002 ? tW.g/tW.r*600. : 0.;
    float occ = mix(tT.r, tW.r, clamp(hgt/150., 0., 1.));
    // a card overhead also blocks some of the open sky, most of all when it is close
    float ao = tW.r*(.22 + .3*exp(-hgt/90.));
    vec3 light = AMB*(1. - ao) + (SUN - AMB)*S*(1. - occ*.96);
    o = vec4(col*shade*light, 1.);
  }`;

  const OBJ_FS = `#version 300 es
  precision highp float;
  in vec3 vP; in vec3 vN; in vec2 vUV; in vec3 vQ; in vec3 vT; in vec3 vO; in float vC;
  out vec4 o;
  uniform sampler2D texA, texB, texS, leafTex, occT, occW;
  uniform int mode;
  uniform float mixB, alphaMul, sigReveal, gloss, glossBack, zoom, sheen, dapple;
  uniform vec2 cam;
  uniform vec4 wrect;
  ${COMMON}
  uniform vec4 crumple;
  float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
  const float FSZ = 2.1;
  vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p)*43758.5453); }
  // the facets of a crumpled ball: each patch of paper is a flat plane, tipped a little and set a little in or
  // out; where a lower plane meets a higher one there is a lip, and a shadow tucked under it. p is where this
  // bit of paper sits on the finished ball (a unit sphere), scaled to the facet size.
  // returns (height off the sphere, as a share of its radius; how deep in shadow; distance to the edge), and the plane's tilt
  vec3 warp(vec3 p){ return p + (vec3(sin(p.y*1.7 + 1.3), sin(p.z*1.9 + 4.1), sin(p.x*1.5 + 2.7)) + .5*vec3(sin(p.z*3.1), sin(p.x*2.9 + 1.), sin(p.y*3.3 + 2.)))*.32; }
  vec3 facets(vec3 p, float TL, float OF, float W, out vec3 tilt){
    vec3 P = normalize(p), i = floor(p);
    float d1 = 9., d2 = 9.; vec3 a1, a2;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = i + vec3(x, y, z), fp = g + h3(g);
      // weighted, so some facets grow big and others stay small, and every edge stays straight
      vec3 df = fp - p; float d = dot(df, df) - h3(g + 2.9).y*.55;
      if (d < d1) { d2 = d1; a2 = a1; d1 = d; a1 = g; } else if (d < d2) { d2 = d; a2 = g; }
    }
    vec3 c1 = normalize(a1 + h3(a1)), c2 = normalize(a2 + h3(a2));
    vec3 n1 = normalize(c1 + (h3(a1 + 31.7) - .5)*TL), n2 = normalize(c2 + (h3(a2 + 31.7) - .5)*TL);
    float o1 = (h3(a1 + 7.3).x - .5)*OF, o2 = (h3(a2 + 7.3).x - .5)*OF;
    float k1 = dot(c1*(1. + o1), n1)/max(dot(P, n1), .3) - 1., k2 = dot(c2*(1. + o2), n2)/max(dot(P, n2), .3) - 1.;
    // the step between two planes is eased over a short width, so it reads as a lip, not a stair
    float e = d2 - d1, w = smoothstep(0., W, e);
    tilt = n1 - P*dot(n1, P);
    return vec3(mix((k1 + k2)*.5, k1, w), smoothstep(.02, .07, k2 - k1)*exp(-e*16.), e);
  }
  // the same planes, blended smoothly, for the shape itself: the mesh can't hold a sharp step, the shading can
  float lumps(vec3 p, float TL, float OF){
    vec3 P = normalize(p), i = floor(p);
    float sw = 0., sh = 0.;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = i + vec3(x, y, z), fp = g + h3(g), c1 = normalize(fp);
      vec3 df = fp - p; float w = exp(-(dot(df, df) - h3(g + 2.9).y*.55)*10.);
      vec3 n1 = normalize(c1 + (h3(g + 31.7) - .5)*TL);
      float o1 = (h3(g + 7.3).x - .5)*OF;
      sh += w*(dot(c1*(1. + o1), n1)/max(dot(P, n1), .3) - 1.); sw += w;
    }
    return sh/max(sw, 1e-5);
  }
  void main(){
    vec3 V = normalize(vec3(cam, D/zoom) - vP);
    bool front = dot(vN, V) >= 0.;
    vec3 N = front ? vN : -vN;
    // a crumpled sheet: each facet's tilt is worked out here for every pixel so its creases are straight and
    // sharp, carried from the ball's frame into the sheet's as it opens
    float fold = 0.;
    if (crumple.y > 0.) {
      vec3 Q = normalize(vQ), t1, t2, t3;
      vec3 f = facets(Q*FSZ, .55, .1, .02, t1), g = facets(Q*FSZ*2.4 + 11.3, .5, .05, .02, t2), k = facets(Q*FSZ*6. + 5.1, .5, .02, .02, t3);
      vec3 dn = t1 + t2*.6 + t3*.35, E1 = normalize(vO - Q*dot(vO, Q)), E2 = cross(Q, E1);
      vec3 no = -normalize(vN), T = normalize(vT - no*dot(vT, no)), B = cross(no, T);
      vec3 Nout = normalize(no + (T*dot(dn, E1) + B*dot(dn, E2))*pow(vC, .35)*2.6);
      N = front ? -Nout : Nout;
      fold = .75*smoothstep(0., .5, (f.y + g.y*.7 + k.y*.4)*vC*vC);
    }
    vec4 c;
    if (mode == 1) {
      if (front) {
        c = texture(texA, vUV);
        vec4 sg = texture(texS, vUV);
        float m = smoothstep(sigReveal, sigReveal - .05, vUV.x - vUV.y*.18);
        c = c*(1. - sg.a*m) + sg*m;
      } else {
        c = texture(texB, vec2(1. - vUV.x, vUV.y));
      }
    } else if (mode == 2) {
      c = front ? texture(texA, vUV) : texture(texB, vUV);
    } else {
      c = mix(texture(texA, vUV), texture(texB, vUV), mixB);
    }
    c *= alphaMul;
    if (c.a < .01 && mode != 3) discard;
    // sunlight reaching this point: leaves are crisper and shifted on anything lifted toward them
    vec2 q = vP.xy - L.xy/L.z*vP.z;
    vec2 lu = (q - wrect.xy)/(wrect.zw - wrect.xy);
    vec2 lr = texture(leafTex, lu).rg;
    float S = mix(lr.r, lr.g, clamp(vP.z/300., 0., 1.));
    // something held up to read: its leaf shadow is kept faint so the words stay clear
    S = mix(S, 1., dapple);
    // a caustic: sunlight gathered by a glass, added on top of whatever is under it
    if (mode == 3) { o = vec4(c.rgb*S, 0.); return; }
    vec4 tT = texture(occT, lu), tW = texture(occW, lu);
    float hgt = tW.r > .002 ? tW.g/tW.r*600. : 0.;
    // only what stands clearly above this point shades it, fading in rather than switching on
    float occ = mix(tT.r, tW.r, clamp((hgt - vP.z)/150., 0., 1.))*smoothstep(vP.z + 3., vP.z + 28., hgt);
    float nl = dot(N, L);
    float d = max(nl, 0.)/L.z;
    vec3 light = (AMB + (SUN - AMB)*S*d*(1. - occ*.96))*(1. - fold);
    // leaves and petals are thin: sun on the far side still glows through, warmer and greener
    if (mode == 2) light += vec3(.5, .56, .3)*S*max(-nl, 0.)/L.z*(1. - occ)*.75;
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.), 220.)*(front ? gloss : glossBack)*S*(1. - occ)*step(0., dot(N, L));
    // paper's broad sheen: it slides across a stamp as it tilts
    spec += pow(max(dot(N, H), 0.), 26.)*sheen*S*(1. - occ)*step(0., dot(N, L));
    o = vec4(c.rgb*light + spec*c.a, c.a);
  }`;

  function create(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: true, depth: true, powerPreference: 'high-performance' });
    if (!gl) return null;
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

    function program(vs, fs) {
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 200));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'a');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const cache = {};
      return { p, u: (n) => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n))) };
    }
    const P = {
      field: program(FS_VS, FIELD), leaf: program(FS_VS, LEAF), blur: program(FS_VS, BLUR), mat: program(FS_VS, MAT),
      occ: program(OBJ_VS(true), OCC_FS), obj: program(OBJ_VS(false), OBJ_FS),
      mocc: program(MESH_VS(true), MESH_OCC_FS), mesh: program(MESH_VS(false), MESH_FS),
    };

    // a solid made in JS: positions, normals, texture coordinates and triangles
    function mesh(g) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = (data, loc, n) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
      };
      buf(g.p, 0, 3); buf(g.n, 1, 3); buf(g.t, 2, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, count: g.i.length };
    }
    function setMesh(prog, m, cam, wrect) {
      gl.uniformMatrix3fv(prog.u('M'), false, m.M);
      gl.uniformMatrix3fv(prog.u('MN'), false, m.MN);
      gl.uniform3f(prog.u('pos'), m.pos[0], m.pos[1], m.pos[2]);
      gl.uniform2f(prog.u('cam'), cam[0], cam[1]);
      gl.uniform1f(prog.u('zoom'), view.zoom);
      gl.uniform1f(prog.u('spin'), view.spin);
      gl.uniform2f(prog.u('view'), vw, vh);
      gl.uniform4f(prog.u('wrect'), ...wrect);
    }
    function drawMesh(m) { gl.bindVertexArray(m.mesh.vao); gl.drawElements(gl.TRIANGLES, m.mesh.count, gl.UNSIGNED_INT, 0); }
    function drawMeshes(list, po, cam, wrect) {
      gl.useProgram(po.p);
      bindTex(po, 'leafTex', 3, leaf.tex);
      bindTex(po, 'occT', 4, occT.tex);
      bindTex(po, 'occW', 5, occW.tex);
      for (const m of list) {
        const t = m.mat;
        setMesh(po, m, cam, wrect);
        bindTex(po, 'tex', 0, t.tex);
        gl.uniform1f(po.u('useTex'), t.tex ? 1 : 0);
        gl.uniform4fv(po.u('color'), t.color || [1, 1, 1, 1]);
        gl.uniform1f(po.u('gloss'), t.gloss || 0);
        gl.uniform1f(po.u('specPow'), t.specPow || 80);
        gl.uniform1f(po.u('sheen'), t.sheen || 0);
        gl.uniform1f(po.u('opacity'), (t.opacity == null ? 1 : t.opacity) * (m.alpha == null ? 1 : m.alpha));
        gl.uniform1f(po.u('refl'), t.refl || 0);
        gl.uniform1f(po.u('metal'), t.metal || 0);
        drawMesh(m);
      }
    }

    // geometry: a fullscreen triangle, and a 48 x 8 grid for objects
    const fsVao = gl.createVertexArray();
    gl.bindVertexArray(fsVao);
    const fsb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fsb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 1.5, -0.5, -0.5, 1.5]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function grid(GX, GY) {
      const verts = [], idx = [];
      for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) verts.push(i / GX - 0.5, j / GY - 0.5);
      for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
        const k = j * (GX + 1) + i;
        idx.push(k, k + 1, k + GX + 1, k + 1, k + GX + 2, k + GX + 1);
      }
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, count: idx.length };
    }
    const cardGrid = grid(48, 8), squareGrid = grid(14, 14), paperGrid = grid(160, 160);
    const draw = (o) => {
      const g = o.crumple ? paperGrid : o.quad ? squareGrid : cardGrid;
      gl.bindVertexArray(g.vao);
      gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_SHORT, 0);
    };

    function target(w, h) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb, w, h };
    }
    function drop(t) { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } }

    function texture(src) {
      const tex = gl.createTexture();
      upload(tex, src);
      return tex;
    }
    function upload(tex, src) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    const blank = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; return texture(c); })();

    let vw = 1, vh = 1, dpr = 1, M = 240;
    let field = null, fieldRect = [0, 0, 1, 1], leaf = null, occ = null, tmp = null, occT = null, occW = null;
    const LEAF_SCALE = 0.42, OCC_SCALE = 0.5;
    let B = new Float32Array(48), C = new Float32Array(48), K = new Float32Array(16), nB = 0, nK = 0;

    function resize(w, h, d, worldRight, worldBottom = 0) {
      vw = w; vh = h; dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      M = Math.round(Math.max(200, Math.min(w, h) * 0.3));
      // bake the cloth field once over the whole stretch of mat the camera will see
      drop(field);
      // wide enough for the welcome, when the camera starts high above the mat
      // and far enough down for the column of testimonials below the last stamp
      fieldRect = [-w * 2 - 300, -h * 1.9 - 300, worldRight + w / 2 + 300, Math.max(h * 1.9, worldBottom + h) + 300];
      const step = Math.max(4, (fieldRect[2] - fieldRect[0]) / 4096, (fieldRect[3] - fieldRect[1]) / 4096);
      field = target(Math.ceil((fieldRect[2] - fieldRect[0]) / step), Math.ceil((fieldRect[3] - fieldRect[1]) / step));
      gl.bindFramebuffer(gl.FRAMEBUFFER, field.fb);
      gl.viewport(0, 0, field.w, field.h);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.useProgram(P.field.p);
      gl.uniform2f(P.field.u('fres'), field.w, field.h);
      gl.uniform4f(P.field.u('rect'), ...fieldRect);
      gl.bindVertexArray(fsVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const ww = w + 2 * M, wh = h + 2 * M;
      for (const t of [leaf, occ, tmp, occT, occW]) drop(t);
      leaf = target(Math.ceil(ww * LEAF_SCALE), Math.ceil(wh * LEAF_SCALE));
      const ow = Math.ceil(ww * OCC_SCALE), oh = Math.ceil(wh * OCC_SCALE);
      occ = target(ow, oh); tmp = target(ow, oh); occT = target(ow, oh); occW = target(ow, oh);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    function branches(list, canopies) {
      B.fill(0); C.fill(0); K.fill(0);
      nB = Math.min(12, list.length);
      for (let i = 0; i < nB; i++) { B.set(list[i].slice(0, 4), i * 4); C.set(list[i].slice(4, 8), i * 4); }
      nK = Math.min(4, canopies.length);
      for (let i = 0; i < nK; i++) K.set(canopies[i], i * 4);
    }

    const view = { zoom: 1, spin: 0 };
    function setObj(prog, o, cam, wrect) {
      gl.uniform3f(prog.u('pos'), o.pos[0], o.pos[1], o.pos[2]);
      gl.uniform2f(prog.u('size'), o.size[0], o.size[1]);
      gl.uniform3f(prog.u('rot'), o.rot ? o.rot[0] : 0, o.rot ? o.rot[1] : 0, o.rot ? o.rot[2] : 0);
      gl.uniform2f(prog.u('bend'), o.bend ? o.bend[0] : 0, o.bend ? o.bend[1] : 0);
      const cu = o.curl || [1, 0, 0, 0, 0];
      gl.uniform3f(prog.u('curlA'), cu[0], cu[1], cu[2]);
      gl.uniform2f(prog.u('curlB'), cu[3], cu[4]);
      const cm = o.crumple || [0, 0, 0, 0];
      gl.uniform4f(prog.u('crumple'), cm[0], cm[1], cm[2], cm[3]);
      gl.uniform1f(prog.u('shape'), o.quad ? 1 : 0);
      gl.uniform3f(prog.u('quad'), ...(o.quad || [0, 0, 0]));
      gl.uniform2f(prog.u('cam'), cam[0], cam[1]);
      gl.uniform1f(prog.u('zoom'), view.zoom);
      gl.uniform1f(prog.u('spin'), view.spin);
      gl.uniform2f(prog.u('view'), vw, vh);
      gl.uniform4f(prog.u('wrect'), ...wrect);
      gl.uniform1i(prog.u('mode'), o.mode || 0);
      gl.uniform1f(prog.u('alphaMul'), o.alpha == null ? 1 : o.alpha);
    }
    function bindTex(prog, name, unit, tex) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex || blank);
      gl.uniform1i(prog.u(name), unit);
    }
    function blurPass(src, dst, dx, dy) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.useProgram(P.blur.p);
      bindTex(P.blur, 'src', 0, src.tex);
      gl.uniform2f(P.blur.u('res'), dst.w, dst.h);
      gl.uniform2f(P.blur.u('dir'), dx / dst.w, dy / dst.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function render({ cam: camX, camY = 0, time, gust, soft, drags, dragR, colors, objects, meshes = [], zoom = 1, spin = 0 }) {
      const cam = [camX, camY];
      const ca = Math.abs(Math.cos(spin)), sa = Math.abs(Math.sin(spin));
      const ex = (vw / 2 * ca + vh / 2 * sa) / zoom + M, ey = (vh / 2 * ca + vw / 2 * sa) / zoom + M;
      const wrect = [camX - ex, camY - ey, camX + ex, camY + ey];
      view.zoom = zoom; view.spin = spin;
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.bindVertexArray(fsVao);

      // 1. sunlight through the leaves
      gl.bindFramebuffer(gl.FRAMEBUFFER, leaf.fb);
      gl.viewport(0, 0, leaf.w, leaf.h);
      gl.useProgram(P.leaf.p);
      gl.uniform2f(P.leaf.u('fres'), leaf.w, leaf.h);
      gl.uniform4f(P.leaf.u('rect'), ...wrect);
      gl.uniform1f(P.leaf.u('time'), time);
      gl.uniform1f(P.leaf.u('gust'), gust);
      gl.uniform1f(P.leaf.u('soft'), soft);
      gl.uniform4fv(P.leaf.u('B'), B);
      gl.uniform4fv(P.leaf.u('C'), C);
      gl.uniform1i(P.leaf.u('nB'), nB);
      gl.uniform4fv(P.leaf.u('K'), K);
      gl.uniform1i(P.leaf.u('nK'), nK);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. what the objects block, seen from the sun, then softened twice (contact and lifted)
      gl.bindFramebuffer(gl.FRAMEBUFFER, occ.fb);
      gl.viewport(0, 0, occ.w, occ.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(P.occ.p);
      // overlapping casters keep the strongest cover and the highest point
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX);
      for (const o of objects) {
        if (o.alpha === 0) continue;
        setObj(P.occ, o, cam, wrect);
        bindTex(P.occ, 'texA', 0, o.texA);
        draw(o);
      }
      gl.useProgram(P.mocc.p);
      for (const m of meshes) {
        const sh = m.mat.shadow == null ? 1 : m.mat.shadow;
        if (!sh || m.alpha === 0) continue;
        setMesh(P.mocc, m, cam, wrect);
        gl.uniform1f(P.mocc.u('shadow'), sh * (m.alpha == null ? 1 : m.alpha));
        drawMesh(m);
      }
      gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.BLEND);
      gl.bindVertexArray(fsVao);
      const tight = 4 * OCC_SCALE, wide = 26 * OCC_SCALE;
      blurPass(occ, tmp, tight / 6, 0); blurPass(tmp, occT, 0, tight / 6);
      blurPass(occ, tmp, wide / 6, 0); blurPass(tmp, occW, 0, wide / 6);

      // 3. the mat
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      const pm = P.mat;
      gl.useProgram(pm.p);
      bindTex(pm, 'field', 0, field.tex);
      bindTex(pm, 'leafTex', 1, leaf.tex);
      bindTex(pm, 'occT', 2, occT.tex);
      bindTex(pm, 'occW', 3, occW.tex);
      gl.uniform2f(pm.u('res'), canvas.width, canvas.height);
      gl.uniform2f(pm.u('view'), vw, vh);
      gl.uniform2f(pm.u('cam'), cam[0], cam[1]);
      gl.uniform1f(pm.u('dpr'), dpr);
      gl.uniform1f(pm.u('zoom'), zoom);
      gl.uniform1f(pm.u('spin'), spin);
      gl.uniform4f(pm.u('rect'), ...fieldRect);
      gl.uniform4f(pm.u('wrect'), ...wrect);
      gl.uniform3fv(pm.u('base'), colors.base);
      gl.uniform3fv(pm.u('dye'), colors.dye);
      gl.uniform4fv(pm.u('drags'), drags);
      gl.uniform1fv(pm.u('dragR'), dragR);
      gl.uniform1i(pm.u('ss'), dpr >= 1.5 ? 2 : 4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 4. the objects, lit
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // solid things first, then the paper things (sorted, blended), then glass last without writing depth
      const solid = meshes.filter((m) => !m.mat.clear), clear = meshes.filter((m) => m.mat.clear);
      drawMeshes(solid, P.mesh, cam, wrect);
      const po = P.obj;
      gl.useProgram(po.p);
      bindTex(po, 'leafTex', 3, leaf.tex);
      bindTex(po, 'occT', 4, occT.tex);
      bindTex(po, 'occW', 5, occW.tex);
      for (const o of objects) {
        if (o.alpha === 0) continue;
        setObj(po, o, cam, wrect);
        bindTex(po, 'texA', 0, o.texA);
        bindTex(po, 'texB', 1, o.texB || o.texA);
        bindTex(po, 'texS', 2, o.texS);
        gl.uniform1f(po.u('mixB'), o.mixB || 0);
        gl.uniform1f(po.u('sigReveal'), o.sig == null ? 2 : o.sig);
        gl.uniform1f(po.u('gloss'), o.gloss == null ? 0.05 : o.gloss);
        gl.uniform1f(po.u('glossBack'), o.glossBack == null ? 0.05 : o.glossBack);
        gl.uniform1f(po.u('sheen'), o.sheen || 0);
        gl.uniform1f(po.u('dapple'), o.dapple || 0);
        draw(o);
      }
      gl.depthMask(false);
      drawMeshes(clear, P.mesh, cam, wrect);
      gl.depthMask(true);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    }

    // the same bend and turn the vertex shader applies, for placing things on the card from JS
    function point(o, s, t) {
      const [th0, k] = o.bend || [0, 0];
      const th = th0 + k * s;
      let p = Math.abs(k) < 1e-6 ? [s * Math.cos(th0), t, s * Math.sin(th0)] : [(Math.sin(th) - Math.sin(th0)) / k, t, (Math.cos(th0) - Math.cos(th)) / k];
      if (o.curl && o.curl[3] > 0) {
        const [ux, uy, d, R, sh] = o.curl, al = s * ux + t * uy, pe = -s * uy + t * ux, x = al - d;
        let an = al, z = 0;
        if (x > 0) { const ag = Math.min(x / R, Math.PI); an = d + R * Math.sin(ag) - Math.max(x - Math.PI * R, 0); z = R * (1 - Math.cos(ag)); }
        an += sh;
        p = [ux * an - uy * pe, uy * an + ux * pe, z];
      }
      const [rz, rx, ry] = o.rot || [0, 0, 0];
      let c = Math.cos(rx), sn = Math.sin(rx);
      p = [p[0], p[1] * c - p[2] * sn, p[1] * sn + p[2] * c];
      c = Math.cos(ry); sn = Math.sin(ry);
      p = [p[0] * c + p[2] * sn, p[1], -p[0] * sn + p[2] * c];
      c = Math.cos(rz); sn = Math.sin(rz);
      p = [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c, p[2]];
      return [o.pos[0] + p[0], o.pos[1] + p[1], o.pos[2] + p[2]];
    }
    function toScreen(p, cam, camY = 0) {
      const k = D / (D - p[2]);
      return [(p[0] - cam) * k + vw / 2, (p[1] - camY) * k + vh / 2];
    }

    return { resize, branches, texture, upload, render, point, toScreen, mesh, gl };
  }

  return { create, D, L: LV };
})();
