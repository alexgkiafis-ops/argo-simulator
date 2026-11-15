/* Sound for the live draft (Alex, Nov 7; in scope, docs/05): the monitor's pulse tone, the alarms, the Earth
   link and Argo's chirps, plus an optional cabin hum.
   Every sound is synthesized here with the Web Audio API. There are no audio files and nothing is copied from
   films, games or real devices, so it works offline and raises no licensing questions. If a file is ever
   needed, CC0 only, credited in the README.
   Chrome plays sound only after a key press or click: the first one unlocks it, and a small "sound off" mark
   shows until then. M turns all sound off and on. The demo runs and looks the same with sound off, and every
   call here fails quietly rather than stop the demo.
   Argo's voice (decision 24, voice/en/voice-en.js): every effect ducks while Argo speaks, and while Argo
   listens only the quiet pulse tone plays, so the actor is heard. The voice joins the mix next to Argo's
   chirps, after the duck. In scene 2 (the self-playing Day 143, decision 26) the patient's recorded voice
   (voice/en/nikos-en.js) takes the same path: levelled to the same loudness, muted by M with everything else,
   and heard while Argo listens, so the effects behave exactly as they do while Alex speaks live. */

/* The one sound config. Volumes are 0 to 1. */
const SOUND = {
  master: 0.9,
  volume: { monitor: 0.35, alarm: 0.8, earth: 0.6, argo: 0.45, cabin: 0.5, voice: 1 },   // voice: Argo's lines, each levelled first (VOICE_RMS)
  duck: 0.3,           // share of the effects' volume left while Argo speaks
  /* Pulse tone: one beep per heartbeat, its pitch falling as SpO2 falls, one step per whole point, like a pulse
     oximeter. Makers choose their own step (one published design halves the pitch every 24 points, about half
     a semitone a point); a full semitone a point here, so the room hears the oxygen fall. */
  pulse: { at100: 880, semitonesPerPoint: 1 },
  /* Alex's picks by ear, Nov 7: A and A. The other candidates stay for comparison (keys A and E with ?try). */
  alarm: 'monitor',    // A 'monitor': IEC burst on one pitch · B 'melody': IEC melodies, cardiac (alert) and oxygen (warning)
  earth: 'apollo',     // A 'apollo': Quindar tones, radio static, data packet · B 'clean': Quindar tones, digital pings
  cabin: false         // very low ventilation hum (H)
};

const Sfx = (() => {
  const CAND = {
    alarm: [['monitor', 'A', 'IEC burst on one pitch, like a classic bedside monitor'], ['melody', 'B', 'IEC melodies: cardiac for the alert, oxygen for the warning']],
    earth: [['apollo', 'A', 'Quindar tones, radio static, data packet'], ['clean', 'B', 'Quindar tones, clean digital pings']]
  };
  /* IEC 60601-1-8 alarm bursts. Medium priority: 3 pulses. High priority: 10 pulses, the gaps between them
     x, x, 2x+td, x, pause, x, x, 2x+td, x (x 80 ms, pulse td 120 ms, pause 400 ms). High priority plays about
     4 dB louder than medium. Each pulse has a fundamental between 150 and 1000 Hz and strong harmonics. */
  const BURST = {
    medium: { td: 0.17, gaps: [0.17, 0.17], amp: 0.6 },
    high: { td: 0.12, gaps: [0.08, 0.08, 0.28, 0.08, 0.4, 0.08, 0.08, 0.28, 0.08], amp: 1 }
  };
  const HZ = { C4: 261.63, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, A5: 880 };
  const NOTES = {
    monitor: { medium: ['A4', 'A4', 'A4'], high: Array(10).fill('A5') },
    /* the standard's melodies (Annex F, 2006 to 2020): cardiac c e g; oxygen c b a, g f, a falling line */
    melody: { medium: ['C4', 'E4', 'G4'], high: ['C5', 'B4', 'A4', 'G4', 'F4', 'C5', 'B4', 'A4', 'G4', 'F4'] }
  };

  /* ---------- Per-context kit: waveforms and buffers ---------- */
  const rand = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function noise(c, sec) {
    const n = Math.floor(sec * c.sampleRate), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), r = rand(7);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return b;
  }
  /* A Bell 202 data packet (1200 baud, tones of 1200 and 2200 Hz), the sound of packet radio such as APRS:
     a run of flag bytes, then data. NRZI coding: the tone changes on every 0 bit. */
  function afsk(c, sec) {
    const sr = c.sampleRate, n = Math.floor(sec * sr), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), r = rand(202);
    const spb = sr / 1200, bits = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) bits.push((0x7E >> j) & 1);
    while (bits.length * spb < n) bits.push(r() < 0.5 ? 0 : 1);
    let f = 1200, ph = 0, i = 0;
    bits.forEach((bit, j) => {
      if (!bit) f = f === 1200 ? 2200 : 1200;
      for (const end = Math.min(n, Math.round((j + 1) * spb)); i < end; i++) { ph += 2 * Math.PI * f / sr; d[i] = Math.sin(ph); }
    });
    return b;
  }
  const kits = new WeakMap();
  function kit(c) {
    let k = kits.get(c);
    if (k) return k;
    const wave = h => c.createPeriodicWave(new Float32Array(h.length), Float32Array.from(h));
    k = {
      c,
      beep: wave([0, 1, 0.2, 0.07, 0.03]),                    // nearly pure, with a little edge
      alarm: wave([0, 1, 0.75, 0.6, 0.48, 0.38, 0.3, 0.22]),  // rich in harmonics, as the standard asks
      glass: wave([0, 1, 0, 0.12, 0, 0.04]),                  // Argo: soft and glassy
      noise: noise(c, 3),
      packets: {}
    };
    kits.set(c, k);
    return k;
  }

  /* ---------- Instruments: (kit, output, start time, ...) ---------- */
  function osc(k, out, t, f, wave) {
    const o = k.c.createOscillator(), g = k.c.createGain();
    if (wave) o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f, t);
    o.connect(g).connect(out);
    o.start(t);
    return { o, g };
  }
  const I = {
    /* Pulse tone: a short beep on each heartbeat */
    beep(k, out, t, f) {
      const { o, g } = osc(k, out, t, f, k.beep);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + 0.004);
      g.gain.setValueAtTime(0.6, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.08);
      o.stop(t + 0.1);
    },
    /* One alarm pulse: rise over 15% of the pulse, fall over the last 25% */
    pulse(k, out, t, f, td, amp) {
      const { o, g } = osc(k, out, t, f, k.alarm);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + td * 0.15);
      g.gain.setValueAtTime(amp, t + td * 0.75); g.gain.linearRampToValueAtTime(0, t + td);
      o.stop(t + td + 0.02);
    },
    /* One alarm burst; returns its length */
    alarm(k, out, t, pri, cand) {
      const b = BURST[pri];
      let s = t;
      NOTES[cand][pri].forEach((n, i) => { I.pulse(k, out, s, HZ[n], b.td, b.amp); s += b.td + (b.gaps[i] || 0); });
      return s - t;
    },
    /* Quindar tone (Apollo): a pure 250 ms sine, 2525 Hz as the link opens, 2475 Hz as it closes */
    quindar(k, out, t, f, amp = 0.32, a = 0.004) {
      const { o, g } = osc(k, out, t, f);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + a);
      g.gain.setValueAtTime(amp, t + 0.25 - a); g.gain.linearRampToValueAtTime(0, t + 0.25);
      o.stop(t + 0.27);
    },
    /* Radio channel noise while the link is open, with a short squelch tail as it closes */
    radio(k, out, t, dur, amp = 0.05, tail = true) {
      const c = k.c, s = c.createBufferSource(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = k.noise; s.loop = true;
      hp.type = 'highpass'; hp.frequency.value = 300; lp.type = 'lowpass'; lp.frequency.value = 3000;
      s.connect(hp).connect(lp).connect(g).connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.04); g.gain.setValueAtTime(amp, t + dur);
      let end = t + dur + 0.25;
      if (tail) {
        g.gain.linearRampToValueAtTime(amp * 2.6, t + dur + 0.012); g.gain.setValueAtTime(amp * 2.6, t + dur + 0.09);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.11); end = t + dur + 0.12;
      } else g.gain.linearRampToValueAtTime(0, end);
      s.start(t); s.stop(end + 0.02);
    },
    /* Data packet (see afsk) */
    packet(k, out, t, dur, amp = 0.12) {
      const c = k.c, key = dur.toFixed(2), s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = k.packets[key] || (k.packets[key] = afsk(c, dur));
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      s.connect(lp).connect(g).connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.006);
      g.gain.setValueAtTime(amp, t + dur - 0.01); g.gain.linearRampToValueAtTime(0, t + dur);
      s.start(t); s.stop(t + dur + 0.02);
    },
    /* Clean digital pings: a short rising train of blips with a soft echo */
    pings(k, out, t, n, step = 0.06, amp = 0.2) {
      const c = k.c, dry = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
      dl.delayTime.value = 0.11; fb.gain.value = 0.3; wet.gain.value = 0.35;
      dry.connect(out); dry.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
      for (let i = 0; i < n; i++) {
        const s = t + i * step, { o, g } = osc(k, dry, s, 1250 * Math.pow(2, 1.15 * i / Math.max(1, n - 1)), k.glass);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(amp, s + 0.003); g.gain.setTargetAtTime(0, s + 0.006, 0.012);
        o.stop(s + 0.1);
      }
    },
    /* Soft confirmation: two glassy notes a fifth apart */
    chime(k, out, t, amp = 0.22) {
      [[880, 0], [1318.5, 0.13]].forEach(([f, d]) => {
        const s = t + d, { o, g } = osc(k, out, s, f, k.glass);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(amp, s + 0.012); g.gain.setTargetAtTime(0, s + 0.012, 0.15);
        o.stop(s + 1.1);
      });
    },
    /* Argo starts speaking: two quick notes up a fifth */
    speak(k, out, t) {
      [[1046.5, 0], [1568, 0.075]].forEach(([f, d]) => {
        const s = t + d, { o, g } = osc(k, out, s, f, k.glass);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.2, s + 0.006); g.gain.setTargetAtTime(0, s + 0.02, 0.035);
        o.stop(s + 0.3);
      });
    },
    /* Argo starts listening: a soft upward glide */
    listen(k, out, t) {
      const { o, g } = osc(k, out, t, 784, k.glass);
      o.frequency.exponentialRampToValueAtTime(1175, t + 0.12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.setTargetAtTime(0, t + 0.08, 0.04);
      o.stop(t + 0.4);
    },
    /* Ventilation: low rumble, a little air, a faint fan tone, slowly breathing. Returns a stop function. */
    cabin(k, out, t) {
      const c = k.c, s = c.createBufferSource(), lp = c.createBiquadFilter(), bp = c.createBiquadFilter(), rum = c.createGain(), air = c.createGain(), g = c.createGain();
      s.buffer = k.noise; s.loop = true;
      lp.type = 'lowpass'; lp.frequency.value = 160; rum.gain.value = 0.8;
      bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5; air.gain.value = 0.22;
      s.connect(lp).connect(rum).connect(g); s.connect(bp).connect(air).connect(g);
      const fan = c.createOscillator(), fg = c.createGain(); fan.frequency.value = 118; fg.gain.value = 0.02; fan.connect(fg).connect(g);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.06; lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 2.5);
      g.connect(out); s.start(t); fan.start(t); lfo.start(t);
      return at => {
        g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(g.gain.value, at); g.gain.linearRampToValueAtTime(0, at + 0.8);
        [s, fan, lfo].forEach(x => x.stop(at + 0.85));
      };
    }
  };
  /* The Earth link, two candidates. contact: CONTACTING EARTH. report: REPORT TO EARTH starts sending.
     sent: the report has gone (the closing Quindar tone and a soft confirmation). */
  const EARTH = {
    apollo: {
      contact(k, o, t) { I.quindar(k, o, t, 2525); I.radio(k, o, t + 0.02, 1.17); I.packet(k, o, t + 0.32, 0.55); I.quindar(k, o, t + 0.92, 2475); },
      report(k, o, t) { I.quindar(k, o, t, 2525); I.radio(k, o, t + 0.02, 1.45, 0.05, false); I.packet(k, o, t + 0.32, 1.0); },
      sent(k, o, t) { I.quindar(k, o, t, 2475); I.chime(k, o, t + 0.34); }
    },
    clean: {
      contact(k, o, t) { I.quindar(k, o, t, 2525, 0.3, 0.012); I.pings(k, o, t + 0.34, 7); I.quindar(k, o, t + 0.86, 2475, 0.3, 0.012); },
      report(k, o, t) { I.quindar(k, o, t, 2525, 0.3, 0.012); I.pings(k, o, t + 0.34, 12, 0.07); },
      sent(k, o, t) { I.quindar(k, o, t, 2475, 0.3, 0.012); I.chime(k, o, t + 0.32); }
    }
  };

  /* ---------- Live mix ----------
     monitor ──────────────┐
     alarm, earth, cabin ──┴ gate (closed while Argo listens) ── duck (down while Argo speaks) ── scene ──┐
     argo chirps, Argo's voice, the patient's voice (scene 2) ────────────────────────────────────────────┴ master ── limiter
     scene fades the effects out on their own in the calm-down after a situation (fade), so nothing competes
     with whoever speaks next; a reset or a new situation brings them back. */
  const FADE_TAU = 2;   // seconds; the effects are about 95% gone after 6 s
  let ctx = null, master = null, duck = null, gate = null, scene = null, hum = null, muted = false, faded = false, mode = 'idle', clockFn = null;
  let events = [], polite = [], lastBeat = -1;
  const cat = {}, listeners = [], log = [];
  const live = () => !!ctx && ctx.state === 'running';
  const status = () => (!ctx || ctx.state !== 'running') ? 'locked' : muted ? 'muted' : 'on';
  function note(k, d, played = true) {
    log.push({ ms: Math.round(performance.now()), ship: clockFn ? Math.round(clockFn() * 100) / 100 : null, k, d, played });
    if (log.length > 600) log.shift();
  }
  function changed() { listeners.forEach(f => { try { f(status()); } catch (e) { /* the page keeps running */ } }); }
  function ramp(p, v, tau) { const t = ctx.currentTime; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.setTargetAtTime(v, t, tau); }
  /* Audio time at which a moment on the performance clock (seconds) reaches the speakers */
  function when(p) {
    const o = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (o && o.contextTime > 0 && o.performanceTime > 0) return o.contextTime + (p - o.performanceTime / 1000);
    return ctx.currentTime + (p - performance.now() / 1000);
  }
  function build() {
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.15;
    master = ctx.createGain(); master.gain.value = muted ? 0 : SOUND.master;
    master.connect(lim).connect(ctx.destination);
    scene = ctx.createGain(); scene.gain.value = faded ? 0 : 1; scene.connect(master);
    duck = ctx.createGain(); duck.connect(scene);
    gate = ctx.createGain(); gate.connect(duck);
    Object.keys(SOUND.volume).forEach(k => { cat[k] = ctx.createGain(); cat[k].gain.value = SOUND.volume[k]; });
    cat.monitor.connect(duck); cat.alarm.connect(gate); cat.earth.connect(gate); cat.cabin.connect(gate); cat.argo.connect(master); cat.voice.connect(master);
    duck.gain.value = mode === 'speak' ? SOUND.duck : 1;
    gate.gain.value = mode === 'listen' ? 0 : 1;
    if (SOUND.cabin) hum = I.cabin(kit(ctx), cat.cabin, ctx.currentTime + 0.05);
  }
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC({ latencyHint: 'interactive' });
      build();
      ctx.onstatechange = changed;
      prime();
    }
    if (ctx.state === 'suspended') ctx.resume().then(changed, () => {});
    changed();
  }
  function toggle() {
    muted = !muted;
    if (master) ramp(master.gain, muted ? 0 : SOUND.master, 0.02);
    note('mute', muted ? 'muted' : 'on');
    changed();
    return status();
  }
  /* Play one sound event through its own gain, so a state change can cut it */
  function play(name, fn, preview) {
    if (!live()) return false;
    const t = ctx.currentTime + 0.01, g = ctx.createGain();
    events = events.filter(e => e.end > t || (e.g.disconnect(), false));
    if (preview) { const v = ctx.createGain(); v.gain.value = SOUND.volume[name]; g.connect(v).connect(master); } else g.connect(cat[name]);
    fn(kit(ctx), g, t);
    events.push({ g, end: t + 8, preview: !!preview });
    return true;
  }
  function cut(previewOnly) {
    if (!previewOnly) { polite = []; hush(); }
    if (!ctx) return;
    const t = ctx.currentTime;
    events = events.filter(e => {
      if (previewOnly && !e.preview) return true;
      e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(e.g.gain.value, t); e.g.gain.linearRampToValueAtTime(0, t + 0.04);
      setTimeout(() => e.g.disconnect(), 150);
      return false;
    });
  }
  /* ---------- Argo's voice, and the patient's in scene 2 ----------
     The lines come ready-made in voice/en/voice-en.js (window.ARGO_VOICE) and, for the patient's answers in scene 2,
     voice/en/nikos-en.js (window.NIKOS_VOICE), both made by tools/voice/make-voice.js: MP3s inside scripts,
     because a page opened from a file cannot fetch audio. Each is decoded the first time it is needed and
     levelled to the same loudness. The page times every line from the file's data, so the word sweep and the
     line's length are the same with sound off; the voice only follows. */
  const VOICE_RMS = -20;   // dBFS over the speech, before the voice volume and master
  const voiceBufs = new Map();
  let voiceNow = null;
  function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  /* Gain that brings the speech to VOICE_RMS, with peaks under -1 dBFS and at most 9 dB of boost. skip: the
     times of the patient's sounds ([coughs]), left out so that a cough's peak does not make his answer quieter; the
     limiter after master takes that one peak. */
  function levelOf(b, skip = []) {
    const d = b.getChannelData(0), n = Math.max(1, Math.round(b.sampleRate * 0.02)), fr = [];
    let peak = 0;
    for (let i = 0; i + n <= d.length; i += n) {
      const t = i / b.sampleRate;
      if (skip.some(([a, z]) => t + 0.02 > a && t < z)) continue;
      let e = 0;
      for (let j = i; j < i + n; j++) { e += d[j] * d[j]; if (Math.abs(d[j]) > peak) peak = Math.abs(d[j]); }
      fr.push(e / n);
    }
    const top = Math.max(...fr), on = fr.filter(e => e > top * 0.001);   // frames within 30 dB of the loudest
    const rms = 10 * Math.log10(on.reduce((a, e) => a + e, 0) / Math.max(1, on.length) || 1e-9);
    return Math.pow(10, Math.min(VOICE_RMS - rms, -1 - 20 * Math.log10(peak || 1), 9) / 20);
  }
  const line = key => (window.ARGO_VOICE && window.ARGO_VOICE.lines[key]) || (window.NIKOS_VOICE && window.NIKOS_VOICE.lines[key])
    || (window.ARGO_VOICE_GIANNIS && window.ARGO_VOICE_GIANNIS.lines[key]) || other(key);   // Giannis's takes (decision 34), loaded on request
  /* The other scenarios' voices (voice/en/<id>-en.js: Argo's lines and the patient's answers), loaded when picked */
  function other(key) {
    const B = window.SCENARIO_VOICES || {};
    for (const id in B) { const L = (B[id].argo && B[id].argo.lines[key]) || (B[id].patient && B[id].patient.lines[key]); if (L) return L; }
    return null;
  }
  function voiceBuf(key) {
    const L = line(key);
    if (!L || !ctx) return null;
    if (!voiceBufs.has(key)) {
      const p = new Promise((res, rej) => ctx.decodeAudioData(b64(L.mp3), res, rej)).then(b => ({ b, gain: levelOf(b, L.sounds) }));
      p.catch(() => voiceBufs.delete(key));
      voiceBufs.set(key, p);
    }
    return voiceBufs.get(key);
  }
  /* Decode the lines without variants ahead, and the patient's answers, a few at a time, so each starts on time */
  function prime() {
    const keys = Object.keys((window.ARGO_VOICE || {}).lines || {}).filter(k => !k.includes('-') || k.endsWith('-12-25'))
      .concat(Object.keys((window.NIKOS_VOICE || {}).lines || {}));
    keys.forEach((k, i) => setTimeout(() => voiceBuf(k), 150 + i * 120));
  }
  /* Say one line. at: the moment on the performance clock (seconds) the voice should start. A line still
     decoding at that moment joins where the page's sweep already is. */
  function say(key, at) {
    hush();
    const p = voiceBuf(key);
    if (!p) { note('voice', key, false); return false; }
    const mine = {};
    voiceNow = mine;
    p.then(({ b, gain }) => {
      if (voiceNow !== mine || !live()) return;
      const late = Math.max(0, performance.now() / 1000 - at);
      if (late >= b.duration) return;
      const s = ctx.createBufferSource(), v = ctx.createGain();
      s.buffer = b; v.gain.value = gain;
      s.connect(v).connect(cat.voice);
      s.start(late > 0 ? ctx.currentTime : Math.max(ctx.currentTime, when(at)), late);
      mine.s = s; mine.v = v;
      s.onended = () => { v.disconnect(); if (voiceNow === mine) voiceNow = null; };
      note('voice', key + (late > 0.05 ? ` · joined ${late.toFixed(2)} s late` : ''));
    }, () => note('voice', key, false));
    return true;
  }
  /* Stop the voice (an undo, a reset), with a short fade so it does not click */
  function hush() {
    const m = voiceNow;
    voiceNow = null;
    if (!m || !m.s || !ctx) return;
    const t = ctx.currentTime;
    m.v.gain.cancelScheduledValues(t); m.v.gain.setValueAtTime(m.v.gain.value, t); m.v.gain.linearRampToValueAtTime(0, t + 0.04);
    try { m.s.stop(t + 0.05); } catch (e) { /* already stopped */ }
  }

  /* Sounds that wait until Argo has finished speaking or listening (the report confirmation) */
  function politely(fn) { if (mode === 'idle') fn(); else polite.push({ fn, by: performance.now() + 8000 }); }
  function flush() { const q = polite; polite = []; q.forEach(p => { if (performance.now() <= p.by) p.fn(); }); }

  /* Pulse tone: called every frame with the beat list from vitals.js; schedules a beep for each R wave
     about to be drawn, at the pitch of the SpO2 on screen */
  function beats(list, t, spo2) {
    for (const b of list) {
      if (b.t <= lastBeat || b.t > t + 0.12) continue;
      lastBeat = b.t;
      if (!live() || b.t < t - 0.03) continue;
      const f = SOUND.pulse.at100 * Math.pow(2, -(100 - spo2) * SOUND.pulse.semitonesPerPoint / 12);
      I.beep(kit(ctx), cat.monitor, Math.max(when(b.t), ctx.currentTime + 0.005), f);
      note('beat', `${Math.round(f)} Hz · SpO2 ${spo2}`);
    }
  }
  /* Argo's state: 'speak', 'listen' or 'idle' */
  function argo(m) {
    const prev = mode;
    mode = m;
    if (!ctx) return;
    if (m !== prev && (m === 'speak' || m === 'listen')) note('chirp', m, play('argo', (k, o, t) => I[m](k, o, t)));
    ramp(duck.gain, m === 'speak' ? SOUND.duck : 1, m === 'speak' ? 0.03 : 0.12);
    ramp(gate.gain, m === 'listen' ? 0 : 1, m === 'listen' ? 0.06 : 0.2);
    if (m !== prev) note('mix', m);
    if (m === 'idle') flush();
  }
  /* Switch to the next candidate and play a sample of it; returns a label for the screen */
  function next(which) {
    const list = CAND[which], n = list[(list.findIndex(c => c[0] === SOUND[which]) + 1) % list.length];
    SOUND[which] = n[0];
    cut(true);
    const ok = which === 'alarm'
      ? play('alarm', (k, o, t) => { I.alarm(k, o, t, 'medium', n[0]); I.alarm(k, o, t + 1.6, 'high', n[0]); }, true)
      : play('earth', (k, o, t) => { EARTH[n[0]].contact(k, o, t); EARTH[n[0]].sent(k, o, t + 2); }, true);
    note('sample', `${which} ${n[0]}`, ok);
    return `${which === 'alarm' ? 'Alarm' : 'Earth link'} sound ${n[1]} · ${n[2]}${status() === 'on' ? '' : ' · sound is off, press M'}`;
  }
  /* The calm-down: fade every effect out (true), or bring them back at once (false) */
  function fade(on) {
    if (faded === on) return;
    faded = on;
    if (scene) ramp(scene.gain, on ? 0 : 1, on ? FADE_TAU : 0.02);
    note('fade', on ? 'out' : 'in');
  }
  function cabin() {
    SOUND.cabin = !SOUND.cabin;
    if (ctx && SOUND.cabin && !hum) hum = I.cabin(kit(ctx), cat.cabin, ctx.currentTime + 0.05);
    if (ctx && !SOUND.cabin && hum) { hum(ctx.currentTime); hum = null; }
    note('cabin', SOUND.cabin ? 'on' : 'off');
    return `Cabin hum ${SOUND.cabin ? 'on' : 'off'}${SOUND.cabin && status() !== 'on' ? ' · sound is off, press M' : ''}`;
  }

  const safe = f => (...a) => { try { return f(...a); } catch (e) { console.warn('Sound:', e); } };
  return {
    status: safe(status),
    onChange: safe(f => { listeners.push(f); }),
    unlock: safe(unlock),
    toggle: safe(toggle),
    /* Alarms ('medium' or 'high') and the Earth link ('contact', 'report' or 'sent') */
    alarm: safe(pri => note('alarm', `${pri} · ${SOUND.alarm}`, play('alarm', (k, o, t) => I.alarm(k, o, t, pri, SOUND.alarm)))),
    earth: safe(what => {
      const fire = () => note('earth', `${what} · ${SOUND.earth}`, play('earth', (k, o, t) => EARTH[SOUND.earth][what](k, o, t)));
      if (what === 'sent') politely(fire); else fire();
    }),
    beats: safe(beats),
    argo: safe(argo),
    /* The voices: say(key, at) plays one of Argo's lines (a1 ...) or, in scene 2, one of the patient's answers (n1 to n7);
       hush() stops it */
    say: safe(say),
    hush: safe(hush),
    /* decode the voices ahead (done on the first key press or click; app.js calls it again if the voices arrive later) */
    prime: safe(() => { if (ctx) prime(); }),
    /* decode these lines ahead too (app.js: Giannis's takes, once the operator has asked for him, decision 34) */
    warm: safe(keys => { if (ctx) keys.forEach((k, i) => setTimeout(() => voiceBuf(k), 150 + i * 120)); }),
    cut: safe(() => { cut(false); note('cut', ''); }),
    fade: safe(fade),
    next: safe(next),
    cabin: safe(cabin),
    set clock(f) { clockFn = f; },
    log,
    /* for tests: render any sound into an OfflineAudioContext */
    test: { I, EARTH, kit, BURST, NOTES, HZ }
  };
})();
