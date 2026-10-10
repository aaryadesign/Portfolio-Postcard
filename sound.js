// The park, heard: just a real recording, sound/garden.mp3. Children playing and people going by near a
// playground in Central Park ("FieldRecording-NearParkwChildren" by janislylove on Freesound, CC0), cut
// from 0:43 to 2:19, clear of a thud at 0:42 and a bump near the end, and looped. Nothing else is made up.
// It fades in slowly the first time, and Sound on and off glide rather than cut.
window.Garden = (() => {
  let ac = null, master, on = false;
  const LEVEL = 0.45;

  // takes a level from where it is now to v over dur seconds, slow at both ends, so nothing starts or stops
  // suddenly
  function glide(param, v, dur) {
    const t = ac.currentTime + 0.005, from = param.value, c = new Float32Array(48);
    for (let i = 0; i < c.length; i++) { const x = i / (c.length - 1); c[i] = from + (v - from) * x * x * (3 - 2 * x); }
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else param.cancelScheduledValues(t);
    param.setValueCurveAtTime(c, t, dur);
  }

  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    fetch('sound/garden.mp3').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((a) => ac.decodeAudioData(a)).then((buf) => {
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = buf; s.loop = true; g.gain.value = 0;
      s.connect(g).connect(master); s.start();
      glide(g.gain, 1, 5);
    }).catch(() => {});
  }

  function set(v) {
    on = v;
    if (on && !ac) init();
    if (!ac) return;
    if (on) ac.resume();
    glide(master.gain, on ? LEVEL : 0, on ? 2.5 : 1.2);
  }

  return { set, get on() { return on; } };
})();
