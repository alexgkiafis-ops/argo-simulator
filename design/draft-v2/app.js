/* Argo screen draft v2, live and run from the keyboard (Nov 7).
   The screen stays calm (normal mode, running in real time) until the operator starts a situation. A situation
   is a script (day143.js): an automatic opening, then Argo's lines in order, each answered live by the actor.
   Argo listens until the operator presses a key, then answers after a short natural pause. Its lines are
   pre-written; the key only decides when it answers. After the last line the situation calms down on its own
   and stays that way until reset. Everything on screen comes from the run as it happens: the ship clock, the
   vitals model tied to the steps (vitals.js), and the moments the operator's presses set.

   The simulator (docs/05, decision 30): the page opens on the calm screen with a strip under it (scenarios.js)
   where visitors pick a scenario and run it, or go full screen. Visitors only get self-playing scenarios
   (scene 2, decision 26: the patient answers in his recorded voice and nobody presses anything). The strip
   becomes a slim bar during the run and offers Run again once the scenario is over.

   Keys (operator cue list in design/v2-brief.md):
     L I V E typed in a row     the presentation mode, for the team on stage (Alex, Nov 8): the strip goes away
                                completely, the calm screen starts again from 03:30:40, and the keys below work
                                as on the old stage page. Typed again (not during scene 1), the strip comes back.
     G I A N N I S typed in a row   Giannis plays the patient instead of Alex (Alex, Nov 8; decision 34): his name and
                                portrait wherever Alex's show, and Argo calls him Giannis; Alex sleeps in Hab B in his
                                place. A L E X switches back. Only on the calm screen (the landing or the presentation
                                mode); the choice stays through 0 twice and L I V E, and a fresh page starts with Alex.
     1                          in the presentation mode only: scene 1, Day 143 answered live by Alex, who plays
                                the patient on stage, with Argo's voice and no recorded patient (from the calm
                                screen only)
     Space, Right, Page Down    the actor has finished: his voice entry closes, Argo answers. Ignored unless
                                Argo is listening in scene 1, so a double press never skips a line. A
                                presentation clicker sends Page Down (forward) and Page Up (back).
     Left, Page Up              undo a press made too early: Argo stops and listens again
     0 twice within 2 s         back to the calm screen (from 03:30:40): with the strip, or in the presentation
                                mode without it
     M                          sound off and on (browsers need one key press or click first; any key does)
     A, E                       try the two alarm and Earth link sounds (calm screen only, and only with ?try:
                                Alex picked alarm A and Earth A on Nov 7, so a stray press cannot play a sample)
     H                          cabin hum
   In a self-playing scenario no key changes anything but M, H and 0 twice (and the operator's word).
   #play: a hands-free scene 1 for reviewing: starts after 6 s, the script's gap lengths stand in for the
   presses, and it ends in the calm-down. No strip.
   ?still#normal|alert|peak|report: frozen moments of the nominal run (the reference screenshots); add
   &ann=medical|earth|warning|report to show one announcement frozen. No strip.
   ?online (the old front door) is accepted and changes nothing.
   On a phone the same screen is laid out for the phone (decision 32; "The phone layout" below and in style.css);
   ?phone forces that layout at any size, also with ?still (tests and stills).
   Layout from spec/habitat.json, lines and numbers from spec/day143-timeline.json. All data simulated. */
const $ = s => document.querySelector(s);
const hms = n => { n = ((Math.floor(n) % 86400) + 86400) % 86400; return [n / 3600 | 0, (n % 3600) / 60 | 0, n % 60].map(v => String(v).padStart(2, '0')).join(':'); };
const hm = n => hms(n).slice(0, 5);
const ms = n => { n = Math.max(0, Math.floor(n)); return (n / 60 | 0) + ':' + String(n % 60).padStart(2, '0'); };
const cd = n => ms(Math.ceil(n));   // countdowns: 12:40 holds for the first second
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
const Q = new URLSearchParams(location.search);
const still = Q.has('still');
const TRY = Q.has('try');   // ?try: A and E switch between the candidate sounds again
const HASH = location.hash.replace('#', '');
const PLAY = HASH === 'play' && !still;   // #play: hands-free scene 1, no strip
const PICKER = !still && !PLAY;           // the simulator strip, what every visitor gets (decision 30)
/* The calm screen starts here. About two minutes of talk before the sketch puts the alarm near 03:32:40,
   as in the script, but every time on screen and every time Argo says comes from the running clock. */
const CALM_START = sec('03:30:40');
/* Still mode: the nominal run of the v2 draft (docs/02 script), and the moment each reference screenshot shows */
const SIM = {
  raised: sec('03:32:44'),
  lines: ['03:32:50', '03:33:04', '03:33:11', '03:33:24', '03:33:39', '03:33:55', '03:34:02', '03:34:13'].map(sec),
  voice: ['03:32:59', '03:33:07', '03:33:20', '03:33:36', '03:33:49', '03:33:58', '03:34:09'].map(sec)
};
const SNAP = { normal: sec('03:31:02'), alert: sec('03:33:00'), peak: sec('03:33:43'), report: sec('03:34:16') };
const frag = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const blink = el => el && el.animate([{ transform: 'scale(1.9)', filter: 'brightness(2)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 420, easing: 'ease-out' });
const pulse = (el, color) => el && !quiet && el.animate([{ boxShadow: `0 0 0 3px ${color}, 0 0 60px ${color}`, filter: 'brightness(1.5)' }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)', filter: 'brightness(1)' }], { duration: 1100, easing: 'ease-out' });
const wait = s => new Promise(r => setTimeout(r, s * 1000));
const CANCEL = Symbol('cancel');
const VIOLET = 'rgba(197, 144, 255, .9)', AMBER = 'rgba(255, 171, 46, .9)', RED = 'rgba(255, 74, 74, .95)', CYAN = 'rgba(62, 200, 242, .8)';
/* Grow an element in from zero height (new log rows and transcript entries) */
function grow(el, dur = 460, dx = 0) {
  const cs = getComputedStyle(el), h = el.offsetHeight;
  el.style.overflow = 'hidden';
  el.animate([
    { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0, transform: `translate(${dx}px, ${dx ? 0 : 14}px)` },
    { height: h + 'px', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1, transform: 'none' }
  ], { duration: dur, easing: 'cubic-bezier(.2, .8, .2, 1)' }).finished.then(() => { el.style.overflow = ''; }).catch(() => {});
}

/* ---------- The scenario on screen (Nov 8; docs/05, decision 38) ----------
   This file draws Day 143: its night, the crew's places, the panels, the map, the vitals and the calm-down. Another
   scenario brings its own world (world-day171.js: its night, panels, map, vitals, cues and calm-down) and the strip
   swaps it in when a visitor picks that scenario (setWorld). W is the world on screen; null is Day 143, so with Day 143
   on screen every line below runs as it always did. The presentation mode always shows Day 143. */
let W = null;
const calmStart = () => W ? W.calmStart : CALM_START;
const DELAY = () => W ? W.delay : 760;   // the Earth link's one-way delay, seconds (Day 143: 12:40)

/* ---------- Run state ----------
   Everything the screen shows during a run is derived from this object, so undo can put back the state from
   before a press, and still mode can build any moment of the nominal run.
   t: moments (ship time) as they happen: raised (alarm), earth (alert sent, the delay clocks count from here),
      check, proc, warn, wake (Maria), walk / hurry / hurryP / nikosIn (Alex to Locker N3), sarahArr, epi
      (dose), report, sent, after (calm-down), o2ok / rrok (oxygen, breathing back inside limits), clear (the
      step-down to advisory), hrok (heart rate back inside his own limit), reassess, quiet (calm-down sound
      faded), earthIn / reportIn (arrived at Earth), view (current view began)
   f: flags: banner, clocks, check, proc, warn, guide, paused (alarm audio), report, sent */
const fresh = () => ({
  phase: 'calm',     // calm | run | after (the calm-down)
  mode: 'idle',      // idle | auto | pause | lead | speak | listen | end
  idx: 0, ind: 'idle', spoke: false, lit: null,
  t: {}, f: {}, log: [], xs: [], marks: [], sigHr: 35, rep: null,
  sleep: W && W.sleep ? Object.assign({}, W.sleep) : { sarah: 1, mike: 3, leo: 0 }, amb: { i: 0, next: calmStart() + 6 }, hour: null
});
let st = fresh();
let SC = DAY143;       // the situation running
let run = 0;           // bumps on every press, undo and reset; cancels whatever was pending
let snap = null;       // the state before the last press, for undo
let listenAt = 0;      // performance time Argo last started listening
let quiet = false;     // still mode: build the state without animation or sound
let autoplay = false;  // #play
let simState = 'off';  // the simulator strip: pick (choose and run) | run (a scenario is playing) | off (hidden)
let stageMode = false; // the presentation mode (the operator's word): no strip, 1 starts scene 1
let stageW = 1920;     // the stage's width in stage pixels (1920, or wider in a wide window; fit)
const view = () => st.phase === 'calm' ? 'normal' : st.t.epi != null ? 'report' : st.f.proc ? 'peak' : 'alert';
const level = () => view() === 'normal' ? 'none' : st.t.clear != null ? 'adv' : st.f.warn && st.t.epi == null ? 'red' : 'amber';
const guideView = () => !!st.f.guide && !(st.t.epi != null && st.t.sarahArr != null);
/* Hand the run's moments to the vitals model */
function syncModel() { EV.raised = st.t.raised ?? null; DZ.marks = st.marks; setEpi(st.t.epi ?? null); }
function addMark(t, allow) { st.marks.push({ t, allow }); DZ.marks = st.marks; }

/* ---------- Crew ----------
   The crew on screen carries the team's own names and portraits (Alex, Nov 7, night; docs/05 decision 14):
   Alex, the flight engineer who has the reaction (he plays the patient live, so the jury sees the same face on
   stage and on screen), Maria, the crew medical officer Argo wakes, Stelios, the pilot, and Giannis, the mission
   specialist. The portraits are made from the team's photos, cropped to the tile with no NASA logo in frame.
   The ids are the first cast's names (nikos is Alex, sarah is Maria, mike is Stelios, leo is Giannis), kept so the
   script's cues, the voice files and the test harness stay as they were; every name anyone sees or hears changed.
   Giannis can take the patient's place (decision 34; "Who plays the patient" below). */
const portrait = c => `<img src="portraits/${castFace(c.face)}.jpg" alt="">`;
const CREW = [
  { id: 'nikos', name: 'ALEX', face: 'alex', role: 'Flight engineer', sensors: 'Biomonitor shirt · finger SpO2', sync: 1 },
  { id: 'sarah', name: 'MARIA', face: 'maria', role: 'Crew medical officer', sensors: 'Biomonitor shirt', sync: 2 },
  { id: 'mike', name: 'STELIOS', face: 'stelios', role: 'Pilot', sensors: 'Biomonitor shirt', sync: 1 },
  { id: 'leo', name: 'GIANNIS', face: 'giannis', role: 'Mission specialist', sensors: 'Biomonitor shirt', sync: 3 }
];
const NAME = { nikos: 'Alex', sarah: 'Maria', mike: 'Stelios', leo: 'Giannis' };

/* ---------- Who plays the patient (Alex, Nov 8; docs/05 decision 34) ----------
   The team has not decided whether Alex or Giannis plays the patient at the presentation, so the app has both.
   Everything is written for Alex as the patient, and stays so in the run's state. When the operator types G I A N N I S
   on the calm screen, Giannis takes Alex's place and Alex takes Giannis's, asleep in Hab B: castText swaps the two
   names wherever text reaches the screen (the crew tiles, the banner and announcements, the patient monitor and
   assessment, the voice log, the procedure, the plan and wayfinding, the report, the event log, the strip's scene
   text), castFace their portraits, the map's letters follow, and Argo calls him Giannis in its own voice (line 1 has
   a take for him, a1-giannis, see voiceKey). Roles, numbers and timing stay where they are. A L E X switches back.
   The choice stays through 0 twice and L I V E; a fresh page always starts with Alex, and for anyone who never types
   the word nothing changes (castText and castFace change nothing while Alex plays the patient). */
let cast = 'alex';
const CAST_SWAP = { Alex: 'Giannis', Giannis: 'Alex', ALEX: 'GIANNIS', GIANNIS: 'ALEX' };
const swapNames = s => s.replace(/\b(Alex|Giannis|ALEX|GIANNIS)\b/g, m => CAST_SWAP[m]);
const castText = s => cast === 'alex' ? s : swapNames(s);
const castFace = f => cast === 'alex' ? f : ({ alex: 'giannis', giannis: 'alex' })[f] || f;
/* The names written in the page itself (argo-screen-v2.html: the patient monitor and assessment titles, the report
   title, "Listening · Alex", the wayfinding), kept as written so castText can redo them. The banner's title is left
   out: a run rewrites it and leaves it hidden until the next one, so setCast swaps whatever it holds. */
const PAGE_NAMES = [...document.querySelectorAll('#stage *')].flatMap(el => [...el.childNodes])
  .filter(n => n.nodeType === 3 && /\b(Alex|Giannis|ALEX|GIANNIS)\b/.test(n.nodeValue) && !n.parentElement.closest('#bTitle')).map(n => [n, n.nodeValue]);
function setCast(c) {
  if (c === cast) return;
  cast = c;
  PAGE_NAMES.forEach(([n, t]) => { n.nodeValue = castText(t); });
  ['#bTitle', '#ann .ann-code'].forEach(s => { const el = $(s); el.textContent = swapNames(el.textContent); });   // hidden since the last run
  CREW.forEach(m => {
    const tile = document.getElementById('t-' + m.id);
    tile.querySelector('.nm').textContent = castText(m.name);
    tile.querySelector('.portrait img').setAttribute('src', `portraits/${castFace(m.face)}.jpg`);
    document.querySelector(`#mk-${m.id} text`).textContent = castText(m.name)[0];   // the map's letter
  });
  simBriefs();
  logRender(); xsRender(); render();
  if (cast !== 'alex') loadCastVoice();
}
/* Sparkline ranges per crew member: [lo, hi] for HR, SpO2, temperature */
const SPARK = {
  nikos: { hr: [54, 74], o2: [94, 100], tp: [36, 37.2] },
  sarah: { hr: [44, 64], o2: [94, 100], tp: [35.8, 36.8] },
  mike: { hr: [48, 68], o2: [94, 100], tp: [35.8, 36.8] },
  leo: { hr: [46, 66], o2: [94, 100], tp: [35.8, 36.8] }
};
const SPARK_COLOR = { hr: '#3fdc8a', o2: '#3ec8f2', tp: '#b9c4d1' };
const SPAN = 60;   // sparkline window, seconds
const HOME = {
  nikos: { loc: 'Lab', v: [64, 98, '36.6'], bl: ['baseline 63', 'baseline 96 to 99', 'baseline 36.6'] },
  sarah: { loc: 'Crew Qtrs', v: [52, 97, '36.3'], bl: ['baseline 54', 'baseline 96 to 99', 'baseline 36.4'] },
  mike: { loc: 'Hab B', v: [57, 96, '36.4'], bl: ['baseline 58', 'baseline 95 to 98', 'baseline 36.5'] },
  leo: { loc: 'Hab B', v: [55, 98, '36.2'], bl: ['baseline 56', 'baseline 96 to 99', 'baseline 36.3'] }
};
/* Another scenario's world may place and read the crew its own way (W.home, W.calm, W.sensors, W.calmStatus) */
const homeOf = id => (W && W.home && W.home[id]) || HOME[id];
const calmOf = id => (W && W.calm && W.calm[id]) || CALM[id];
/* Sleep stages move on during a long calm screen (the event log records each change) */
const SLEEP_CYCLE = ['light', 'deep', 'light', 'REM'];
const SARAH_ASLEEP = sec('22:41:05');
const stage = id => SLEEP_CYCLE[st.sleep[id] % SLEEP_CYCLE.length];
function calmStatus(id, now) {
  if (W && W.calmStatus) { const s = W.calmStatus(id, now); if (s != null) return s; }
  if (id === 'nikos') return 'Awake since 03:12 · resting';
  if (id === 'sarah') { const m = Math.round((((now - SARAH_ASLEEP) % 86400) + 86400) % 86400 / 60); return `Asleep · ${stage(id)} sleep · ${m / 60 | 0} h ${m % 60} min`; }
  return `Asleep · ${stage(id)} sleep`;
}
const SPK = {};          // sparkline buffers: SPK[id][k] = values
const lastSync = {};     // performance time of each crew member's last sync
function buildCrew() {
  $('#crewList').innerHTML = CREW.map(c => {
    const n = homeOf(c.id), sensors = (W && W.sensors && W.sensors[c.id]) || c.sensors;
    const mv = (k, label, i, unit) => `<div class="mv ${k}"><div class="l">${label}</div><div class="n"><span id="v-${c.id}-${k}">${n.v[i]}</span><small>${unit}</small></div><div class="bl">${n.bl[i]}</div>
      <div class="spk"><svg viewBox="0 0 ${SPARK_W} ${SPARK_H}" preserveAspectRatio="none"><path id="sp-${c.id}-${k}" fill="none" stroke="${SPARK_COLOR[k]}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg><i class="sp-head" id="sh-${c.id}-${k}" style="--c:${SPARK_COLOR[k]}"></i></div></div>`;
    return `<div class="tile" id="t-${c.id}">
      <div class="portrait">${portrait(c)}</div>
      <div class="t-body">
        <div class="t-id">
          <div class="nm">${castText(c.name)}</div><div class="rl">${c.role}</div>
          <div class="loc" id="loc-${c.id}">${n.loc}</div>
          <div class="st" id="st-${c.id}">${calmStatus(c.id, calmStart())}</div>
          <div class="sn"><i class="led ok" id="led-${c.id}"></i>${sensors} · <span id="sy-${c.id}">synced 1 s ago</span></div>
          <div class="resp" id="resp-${c.id}"></div>
        </div>
        <div class="t-vit">${mv('hr', 'HR', 0, 'bpm')}${mv('o2', 'SpO2', 1, '%')}${mv('tp', 'Temp', 2, '°C')}</div>
      </div>
    </div>`;
  }).join('');
}
/* Fill each crew member's sparklines with the last minute, sampled at their sync interval */
function seedSparks(now) {
  CREW.forEach(c => {
    SPK[c.id] = {};
    ['hr', 'o2', 'tp'].forEach(k => {
      const n = Math.round(SPAN / c.sync) + 1, a = [];
      for (let i = n - 1; i >= 0; i--) a.push(calmOf(c.id)[k](now - i * c.sync));
      SPK[c.id][k] = a;
      drawSpark(c.id, k);
    });
    homeOf(c.id).v.forEach((v, i) => { document.getElementById(`v-${c.id}-${['hr', 'o2', 'tp'][i]}`).textContent = v; });
  });
}
function drawSpark(id, k) {
  const [lo, hi] = SPARK[id][k], a = SPK[id][k];
  document.getElementById(`sp-${id}-${k}`).setAttribute('d', sparkPath(a, lo, hi));
  document.getElementById(`sh-${id}-${k}`).style.top = sparkEnd(a, lo, hi)[1] + 'px';
}
function crewSync(c, i) {
  blink(document.getElementById('led-' + c.id));
  lastSync[c.id] = performance.now();
  if (still || view() !== 'normal') return;
  const now = shipNow(), M = calmOf(c.id);
  const val = { hr: Math.round(M.hr(now) + jit(now, 7 + i, 0.6)), o2: Math.round(M.o2(now) + jit(now, 9 + i, 0.2)), tp: M.tp(now) };
  ['hr', 'o2', 'tp'].forEach(k => {
    const a = SPK[c.id][k]; a.push(val[k]); a.shift();
    drawSpark(c.id, k);
    const head = document.getElementById(`sh-${c.id}-${k}`);
    head.classList.remove('ping'); void head.offsetWidth; head.classList.add('ping');
  });
  document.getElementById(`v-${c.id}-hr`).textContent = val.hr;
  document.getElementById(`v-${c.id}-o2`).textContent = val.o2;
  document.getElementById(`v-${c.id}-tp`).textContent = val.tp.toFixed(1);
}
function syncTexts() {
  const t = performance.now();
  CREW.forEach(c => { const n = Math.max(1, Math.round((t - (lastSync[c.id] || t)) / 1000)); document.getElementById('sy-' + c.id).textContent = `synced ${n} s ago`; });
}

/* ---------- Habitat systems strip ---------- */
const SYS = [
  { id: 'O2', fn: s => 21.2 + nz(s, 11, 0.07), f: 1, every: 3 },
  { id: 'CO2', fn: s => 0.31 + nz(s, 12, 0.012) + jit(s, 4, 0.004), f: 2, every: 2 },
  { id: 'P', fn: s => 101.3 + nz(s, 13, 0.06), f: 1, every: 4 },
  { id: 'T', fn: s => 22.4 + nz(s, 14, 0.08), f: 1, every: 5 },
  { id: 'H', fn: s => 46 + nz(s, 15, 0.7), f: 0, every: 6 },
  { id: 'W', fn: s => 18.4 + nz(s, 16, 0.2) + jit(s, 6, 0.08), f: 1, every: 2 },
  { id: 'L', fn: () => 1236, f: 0, every: 10 }
];
function sysUpdate(x) {
  const el = document.getElementById('sys-' + x.id);
  if (!still) { const v = x.fn(shipNow()); el.textContent = x.f ? v.toFixed(x.f) : Math.round(v).toLocaleString('en-US'); }
  blink(el.parentElement.parentElement.querySelector('.led'));
}

/* ---------- Voice log (transcript) ----------
   Argo's current line shows whole and large (readable from the back of the room), with a sweep over the words
   as they are spoken. The actor's answers show as voice entries: "receiving" while he talks, then "received"
   with its real length. In scene 1 never as text, since Alex's live words may differ from the script. In
   scene 2 the patient's answers are fixed recordings, so his words appear under the entry as he says them, like
   subtitles (Alex, Nov 7): the voice log then reads as a conversation with the sound low or off. */
const EVENING = [
  ['21:58:10', 'ARGO', 'ALL', 'Sleep period starts in two minutes. Cabin lights dimming.'],
  ['22:03:41', 'GIANNIS', null, '0:03'],
  ['22:03:44', 'ARGO', 'GIANNIS', 'Wake-up alarm set for 06:00.']
];
const wavebars = (seed, live) => {
  let s = '';
  for (let i = 0; i < 30; i++) {
    const h = 3 + Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.6 + seed * 2)) * 17;
    s += `<rect x="${i * 4}" y="${11 - h / 2}" width="2.4" height="${h}" rx="1" fill="${live ? '#3fdc8a' : '#7f8c9c'}"${live ? ` style="animation-delay:-${((i * 0.137) % 0.42).toFixed(2)}s"` : ''}/>`;
  }
  return `<svg viewBox="0 0 120 22"${live ? ' class="live"' : ''}>${s}</svg>`;
};
const cites = t => t.replace(/<c>(\d)<\/c>/g, '<span class="cite">$1</span>');
const wordsHtml = (t, said) => t.split(' ').map(w => `<span class="w${said ? ' said' : ''}">${cites(w)}</span>`).join(' ');
/* What an Earth clock shows at a moment, in whole minutes (nearest), as Argo says it. Both clocks count from
   the moment the alert was sent: 12:40 until Earth sees it, 25:20 until the earliest reply. */
const clockMin = (total, now) => Math.max(0, Math.round((total - (now - (st.t.earth ?? now))) / 60));
const fillText = (t, now) => t.replace('{dose}', st.t.epi != null ? hm(st.t.epi) : '--:--')
  .replace('{earthIn}', () => { const m = clockMin(DELAY(), now); return m === 1 ? '1 minute' : m + ' minutes'; })
  .replace('{replyIn}', () => String(clockMin(2 * DELAY(), now)));
function xArgoHtml(t, to, text, cls, said, cut) {
  to = castText(to); text = castText(text);   // the patient's name as he is played (decision 34)
  return `<div class="xe ${cls}${cut ? ' cut' : ''}"><div class="h"><span>${t}</span><b>ARGO</b><span>to ${to}</span>${cut ? '<span class="xcut">interrupted</span>' : ''}</div><div class="tx">${cls === 'cur' ? wordsHtml(text, said) : cites(text)}</div></div>`;
}
function xVoiceHtml(t, who, len, seed, live, words) {
  const vw = !words ? '' : `<div class="vw">${words.split(' ').map(w => `<span class="w${live ? '' : ' said'}${/^\[.*\]$/.test(w) ? ' snd' : ''}">${w}</span>`).join(' ')}</div>`;
  return `<div class="xe old"${live ? ' id="xsLive"' : ''}><div class="h"><span>${t}</span><b class="crew">${castText(who)}</b></div><div class="vr">${live ? wavebars(seed, true) + 'Voice response <i>receiving</i>' : wavebars(seed + 2, false) + `Voice response received <i>${len}</i>`}</div>${vw}</div>`;
}
const evening = () => ((W && W.evening) || EVENING).map(e => e[1] === 'ARGO' ? xArgoHtml(e[0], e[2], e[3], 'old') : xVoiceHtml(e[0], e[1], e[3], 1)).join('');
function xsRender() {
  const last = st.xs.map(e => e.k).lastIndexOf('argo');
  const curI = last >= 0 && !st.xs[last].cut && !st.xs[last].old ? last : -1, from = Math.max(0, st.xs.length - 12);
  $('#xs').innerHTML = evening() + st.xs.slice(from).map((e, i) => e.k === 'argo'
    ? xArgoHtml(hms(e.t), e.to, e.text, from + i === curI ? 'cur' : 'old', true, e.cut)
    : xVoiceHtml(hms(e.t), e.who, ms(e.len || 0), e.seed, e.live, e.words)).join('');
  trimXs();
}
function trimXs() { const xs = $('#xs'); while (xs.children.length > 14) xs.firstElementChild.remove(); }
function xsAppend(e, html) {
  st.xs.push(e);
  if (st.xs.length > 30) st.xs.shift();
  if (quiet) return null;
  const el = frag(html);
  $('#xs').appendChild(el); grow(el, e.k === 'argo' ? 520 : 460); trimXs();
  return el;
}
function setInd(k) {
  st.ind = k;
  ['indIdle', 'indListen', 'indSpeak'].forEach(id => document.getElementById(id).classList.remove('on'));
  document.getElementById(k === 'listen' ? 'indListen' : k === 'speak' ? 'indSpeak' : 'indIdle').classList.add('on');
  Sfx.argo(k);   // Argo's chirps; effects duck while it speaks, and only the pulse tone plays while it listens
}
/* Argo speaks in its voice (decision 24): the line's file from voice/en/voice-en.js plays just after the
   chirp, each word lights up as the voice says it, and the line lasts as long as the voice. Lines whose
   numbers follow the clocks have one file per value (line 4: the two Earth clocks' minutes; line 7: the dose
   time). The timing comes from the file's data, so the screen runs the same with sound off or muted. Without
   a matching file (a line changed since the files were made, a clock value outside the range made), the line
   runs at about 15 characters a second, silent. A line that names the patient has a take for Giannis too,
   <key>-giannis (decision 34), in its own script, voice/en/voice-en-giannis.js, loaded only once the operator asks
   for Giannis (loadCastVoice), so a visitor's page loads exactly what it did before. */
const VOICE_LEAD = 0.22;   // seconds between the chirp and the voice
function voiceKey(L, now) {
  let k = L.id;
  if (/\{earthIn\}|\{replyIn\}/.test(L.text)) k = `${L.id}-${clockMin(DELAY(), now)}-${clockMin(2 * DELAY(), now)}`;
  else if (L.text.includes('{dose}')) k = st.t.epi != null ? `${L.id}-${hm(st.t.epi).replace(':', '')}` : null;
  return k && castText(L.text) !== L.text ? `${k}-${cast}` : k;   // "Giannis, your heart rate..." is a1-giannis
}
const argoLine = k => (window.ARGO_VOICE && window.ARGO_VOICE.lines[k]) || (window.ARGO_VOICE_GIANNIS && window.ARGO_VOICE_GIANNIS.lines[k]) || bankLine('argo', k);
/* The voices of the other scenarios (voice/en/day171-en.js ...): one script each, Argo's lines and the patient's answers,
   loaded when a visitor picks that scenario (loadScVoices). Their keys never repeat Day 143's. */
const bankLine = (who, k) => { const B = window.SCENARIO_VOICES || {}; for (const id in B) { const L = B[id][who] && B[id][who].lines[k]; if (L) return L; } return null; };
let speech = null;
function speak(L, now) {
  const text = fillText(L.cited || L.text, now), plain = castText(fillText(L.text, now));   // plain: as said and shown
  if (!quiet) $('#xs').querySelectorAll('.xe.cur').forEach(x => { x.classList.remove('cur'); x.classList.add('old'); });
  const to = SC.who[0] + SC.who.slice(1).toLowerCase();   // the patient, as the script names him (Alex)
  const el = xsAppend({ k: 'argo', t: now, to, text, id: L.id }, xArgoHtml(hms(now), to, text, 'cur', false));
  if (!quiet) setInd('speak');
  lightSources(L);
  if (quiet) return Promise.resolve();
  const words = [...el.querySelectorAll('.w')];
  const key = voiceKey(L, now), V = key && argoLine(key);
  let at, dur;
  if (V && V.text === plain && V.at.length === words.length) {
    at = V.at.map(t => t + VOICE_LEAD); dur = V.dur + VOICE_LEAD;
    Sfx.say(key, performance.now() / 1000 + VOICE_LEAD);
  } else {
    const wt = words.map(w => { const t = w.textContent; return t.length + 1 + (/[.?!]$/.test(t) ? 7 : /[,:;]$/.test(t) ? 3 : 0); });
    const total = wt.reduce((a, b) => a + b, 0);
    dur = Math.max(2.5, plain.length / 15);
    let acc = 0; at = wt.map(w => { const s = acc / total * dur; acc += w; return s; });
  }
  return new Promise(res => { speech = { words, raw: text.split(' '), at, dur, res, i: 0, start: performance.now() / 1000, key: V ? key : null }; });
}
function speechFrame() {
  const sp = speech, e = performance.now() / 1000 - sp.start;
  while (sp.i < sp.words.length && sp.at[sp.i] <= e) sp.words[sp.i++].classList.add('said');
  if (e >= sp.dur) { speech = null; sp.res(); }
}
function stopSpeech() { Sfx.hush(); if (speech) { const r = speech.res; speech = null; r(); } }
/* What Argo had said when it was stopped */
const speechCut = () => !speech || !speech.i ? '…' : speech.raw.slice(0, speech.i).join(' ') + ' …';
let voiceN = 0;
const liveVoice = () => st.xs.find(e => e.live);
/* words: scene 2 only, the patient's answer as the screen shows it, revealed as he says it */
function voiceIn(t, words) {
  const e = { k: 'voice', t, who: SC.who, live: true, seed: 1 + (voiceN++ % 5) * 0.7, words: words || null };
  xsAppend(e, xVoiceHtml(hms(t), e.who, '', e.seed, true, e.words));
}
/* The answer is over (operator's press, or in scene 2 the patient has finished): the entry closes with its real length */
function closeVoice(now) {
  const e = liveVoice();
  if (!e) return;
  e.live = false; e.len = Math.max(1, Math.round(now - e.t));
  const el = document.getElementById('xsLive');
  if (el && !quiet) {
    el.removeAttribute('id'); el.querySelector('.vr').innerHTML = wavebars(e.seed + 2, false) + `Voice response received <i>${ms(e.len)}</i>`;
    el.querySelectorAll('.vw .w').forEach(w => w.classList.add('said'));
  }
  hearing = null;
  logAdd(now, 'VOICE', `${e.who[0] + e.who.slice(1).toLowerCase()} responded (${ms(e.len)})`);
}
/* Scene 2: the patient's recorded answer to line L (voice/en/nikos-en.js), if it matches the script as it is now */
function replyVoice(L) {
  const i = SC.lines.indexOf(L), key = (SC.replyKey || 'n') + (i + 1);   // another scenario's answers: its own keys and script (SC.voices)
  const V = SC.voices ? bankLine('patient', key) : window.NIKOS_VOICE && window.NIKOS_VOICE.lines[key];
  return V && V.answer === L.answer && V.tone === ((L.reply && L.reply.tone) || null) ? { key, V } : null;
}
/* His words lighting up as he says them (times from the file's data, so the same with sound off) */
let hearing = null;
function hearFrame() {
  const h = hearing, e = performance.now() / 1000 - h.start;
  while (h.i < h.words.length && h.at[h.i] <= e) h.words[h.i++].classList.add('said');
  if (h.i >= h.words.length) hearing = null;
}

/* ---------- Event log (newest first) ---------- */
const LOG_BASE = [
  ['03:26:14', 'CREW', 'Alex entered Lab via hatch L-N2'],
  ['03:20:37', 'GALLEY', 'Food pack opened (Alex)', 'plant'],
  ['03:18:02', 'CREW', 'Alex entered Galley'],
  ['03:12:30', 'CREW', 'Alex awake · Crew Qtrs'],
  ['03:00:00', 'HEALTH', 'Crew check: 4 of 4 within personal baseline', 'ok'],
  ['03:00:00', 'INV', 'Medical inventory scan · 1 restock pending'],
  ['02:30:12', 'WATER', 'Recovery cycle complete · 1,236 L'],
  ['01:45:08', 'ATMO', 'CO2 scrubber bed swap A to B'],
  ['00:12:44', 'COMM', 'Earth link handover Canberra to Madrid'],
  ['22:41:05', 'CREW', 'Maria asleep']
].map(r => ({ tm: r[0], cat: r[1], tx: r[2], cls: r[3] || '' }));
let logK = 0;
function logAdd(t, cat, tx, cls = '') {
  const r = { k: ++logK, t, cat, tx, cls };
  st.log.push(r);
  if (st.log.length > 60) st.log.shift();
  if (!quiet) logInsert(r);
}
/* In an emergency, everything before the alarm dims and the current view's rows stand out */
function rowExtra(t) {
  if (view() === 'normal') return '';
  return t == null || t < st.t.raised ? 'old' : t >= st.t.view ? 'new' : '';
}
const logRow = (r, extra) => `<div class="lr ${r.cls} ${extra}" data-t="${r.t ?? ''}" data-cls="${r.cls}"><span class="tm">${r.tm || hms(r.t)}</span><span class="cat">${r.cat}</span><span class="tx">${castText(r.tx)}</span></div>`;
function logRender() {
  const rows = st.log.slice().sort((a, b) => b.t - a.t || b.k - a.k);
  $('#logRows').innerHTML = rows.map(r => logRow(r, rowExtra(r.t))).join('') + (W ? W.logBase() : LOG_BASE).map(r => logRow(r, rowExtra(null))).join('');
}
function logInsert(r) {
  const rows = $('#logRows'), pin = $('#logPin'), el = frag(logRow(r, rowExtra(r.t) + ' fresh'));
  rows.insertBefore(el, pin ? pin.nextSibling : rows.firstChild);
  grow(el, 480, -26);
  while (rows.children.length > 40) rows.lastElementChild.remove();
}
function logReclass() {
  document.querySelectorAll('#logRows .lr[data-cls]').forEach(el => { el.className = `lr ${el.dataset.cls} ${rowExtra(el.dataset.t === '' ? null : +el.dataset.t)}`; });
}
/* Routine entries while all is quiet, every 16 to 24 s */
function sleepStep(id) {
  const from = stage(id);
  st.sleep[id]++;
  const el = document.getElementById('st-' + id);
  if (el) el.textContent = calmStatus(id, shipNow());
  return ['CREW', `${NAME[id]}: sleep stage ${from} to ${stage(id)}`];
}
const nik = k => $('#v-nikos-' + k).textContent;
const AMBIENT = [
  () => sleepStep('mike'),
  now => ['ATMO', `CO2 scrubber bed B regeneration ${Math.min(99, 64 + Math.floor((now - calmStart() - 14) / 30))}%`],
  () => ['HEALTH', `Alex: HR ${nik('hr')}, SpO2 ${nik('o2')} · within personal baseline`, 'ok'],
  () => ['COMM', `Routine telemetry to Earth · ${W ? W.dsn : 'DSN Madrid'}`],
  () => sleepStep('leo'),
  () => ['ATMO', `Cabin O2 ${$('#sys-O2').textContent} kPa · CO2 ${$('#sys-CO2').textContent} kPa · nominal`],
  () => sleepStep('sarah'),
  () => ['POWER', `Solar array tracking update · ${$('#sys-W').textContent} kW`]
];
function ambient(now) {
  const a = st.amb;
  if (now < a.next) return;
  const r = AMBIENT[a.i % AMBIENT.length](now);
  a.i++; a.next = now + 16 + (a.i * 5) % 9;
  logAdd(now, r[0], r[1], r[2] || '');
}
/* The hourly crew health check (only seen if the calm screen or the calm-down runs past the hour) */
function hourly(now) {
  const h = Math.floor(now / 3600);
  if (st.hour === null) { st.hour = h; return; }
  if (h === st.hour) return;
  st.hour = h;
  const calm = st.phase === 'calm';
  logAdd(h * 3600, 'HEALTH', calm ? 'Crew check: 4 of 4 within personal baseline' : 'Crew check: 3 of 4 within personal baseline · Alex under observation', calm ? 'ok' : 'med');
}

/* ---------- Procedure and assessment ---------- */
const STEPS = [
  ['EPINEPHRINE AUTO-INJ', 'OUTER THIGH'],
  ['CREWMATE', 'CALL'],
  ['NO IMPROVEMENT 5 MIN', '2ND INJECTOR'],
  ['BREATHING, SpO2', 'MONITOR'],
  ['REPORT TO GROUND', 'SEND']
];
const stt = s => `<div class="sub"><span class="stt">${s}</span></div>`;
function stepsHtml() {
  const t = st.t;
  let cls; const extra = {};
  if (t.epi != null) {
    const re = t.reassess != null;
    cls = ['done', 'done', re ? 'done' : 'now', re ? 'now' : 'later', 'later'];
    extra[0] = stt(`Given ${hms(t.epi)}`);
    extra[1] = stt(t.sarahArr != null ? `Maria with Alex ${hms(t.sarahArr)}` : `Maria woken ${hms(t.wake)}`);
    extra[2] = re ? stt(`Reassessed ${hm(t.reassess)} · improving`) : `<div class="sub"><span class="hint">Reassess at ${hm(t.epi + 300)}.</span><span class="stt">Now</span></div>`;
  } else {
    cls = ['now', t.wake != null ? 'done' : 'later', 'later', 'later', 'later'];
    extra[0] = '<div class="sub"><span class="hint">Through clothing is fine.</span><span class="stt">Now</span></div>';
    if (t.wake != null) extra[1] = stt(`Maria woken ${hms(t.wake)}`);
  }
  return { n: cls.indexOf('now') + 1, html: STEPS.map((s, i) => `<li class="${cls[i]}"><span class="k">${i + 1}</span><div class="ln"><span>${s[0]}</span><span class="dots"></span><span>${s[1]}</span></div>${extra[i] || ''}</li>`).join('') };
}
function assessHtml() {
  if (!st.f.check) return ['<div class="a-row wait"><span class="a-v"><span class="pulse ps"></span>Awaiting Alex\'s answer</span><span class="a-s">voice</span></div>',
    'Not matched yet. Argo asks the crew before it matches a procedure.'];
  return [`<div class="a-row"><span class="a-v">Throat <b>tight, itchy</b></span><span class="a-s">voice · ${hms(st.t.check)}</span></div>`
    + '<div class="a-row wait"><span class="a-v"><span class="pulse ps"></span>Awaiting answer: lips or face</span><span class="a-s">voice</span></div>',
    'Checking <b>MED-07 severe allergic reaction</b>: throat, lips or face, breathing'];
}
/* Write html only when it changed; returns true if it did (sources on it then need lighting again) */
function setHtml(el, html) { if (el._html === html) return false; el._html = html; el.innerHTML = html; return true; }

/* ---------- Linked sources for the current Argo line ---------- */
function clearSources() {
  document.querySelectorAll('.src').forEach(el => el.classList.remove('src'));
  document.querySelectorAll('.cite.pin').forEach(el => el.remove());
  document.querySelectorAll('.srcp').forEach(el => el.classList.remove('srcp'));
  const pin = $('#logPin'); if (pin) pin.remove();
  $('#mapCites').innerHTML = '';
}
function source(el, n, css) { if (!el) return; el.classList.add('src'); const c = document.createElement('span'); c.className = 'cite pin'; c.textContent = n; if (css) c.style.cssText = css; el.appendChild(c); }
function inlineCite(el, n, host) { if (!el) return; el.classList.add('src'); (host || el).insertAdjacentHTML('beforeend', `<span class="cite pin" style="position:static;margin-left:8px;box-shadow:none">${n}</span>`); }
function mapCite(x, y, n) { $('#mapCites').insertAdjacentHTML('beforeend', `<g><circle class="cite-c" cx="${x}" cy="${y}" r="12"/><text class="cite-t" x="${x}" y="${y}">${n}</text></g>`); }
function mapBox(x, y, w, h) { $('#mapCites').insertAdjacentHTML('afterbegin', `<rect class="srcbox" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`); }
const stepEl = i => $('#pSteps').children[i];
/* Source targets named in the script */
const SOURCES = {
  hr: n => source($('#numHR'), n, 'left:132px;right:auto'),
  o2: n => source($('#numO2'), n, 'left:132px;right:auto'),
  activity: n => inlineCite($('#aAct'), n, $('#aAct .a-v')),
  mapLab: n => { mapBox(176, 231, 40, 40); mapCite(224, 228, n); },
  check: n => inlineCite($('#aCheck'), n),
  sig0: n => inlineCite($('#sig0'), n), sig1: n => inlineCite($('#sig1'), n), sig2: n => inlineCite($('#sig2'), n), sig3: n => inlineCite($('#sig3'), n),
  procTitle: n => inlineCite($('#pTitle'), n),
  ckEarth: n => source($('#ckEarth'), n), ckReply: n => source($('#ckReply'), n), ckO2: n => source($('#ckO2'), n),
  dont: n => inlineCite($('#pDont'), n),
  mapKitLab: n => { mapBox(78, 233, 36, 36); mapCite(120, 226, n); },
  mapHatch: n => mapCite(258, 226, n),
  mapN3: n => { mapBox(412, 233, 36, 36); mapCite(456, 226, n); },
  sarah: n => { mapCite(456, 120, n); source($('#t-sarah'), n); },
  step0: n => { const li = stepEl(0); if (li) inlineCite(li, n, li.querySelector('.hint') || li.querySelector('.stt')); },
  step2: n => { const li = stepEl(2); if (li) inlineCite(li, n, li.querySelector('.hint') || li.querySelector('.stt')); },
  report: n => { const r = $('#report'); r.classList.add('srcp'); const c = document.createElement('span'); c.className = 'cite pin'; c.style.cssText = 'position:static;margin-left:6px'; c.textContent = n; r.querySelector('.ph .t').appendChild(c); },
  trigger: n => source($('#rTrigger'), n),
  foodPack: n => { const rows = $('#logRows'); rows.insertBefore(frag(`<div class="lr plant src" id="logPin" style="margin:8px 10px;border:0"><span class="tm">03:20:37</span><span class="cat" style="color:var(--argo)">GALLEY</span><span class="tx">${castText('Food pack opened (Alex)')} · new item, first opened</span><span class="cite pin" style="top:50%;transform:translateY(-50%)">${n}</span></div>`), rows.firstChild); },
  transmit: n => source($('#rTx'), n)
};
function lightSources(L) {
  clearSources();
  st.lit = L ? L.id : null;
  if (L) (L.sources || []).forEach(([k, n]) => { const f = (W && W.sources[k]) || SOURCES[k]; if (f) f(n); });
  if (phone) { pages(); showSourcesSoon(); }   // on a phone the page follows Argo to what this line cites
}
const relight = () => lightSources(SC.lines.find(l => l.id === st.lit));

/* ---------- Map walkers: Maria from Crew Qtrs to Node 2, Alex from the Lab to Locker N3 ----------
   Both finish cleanly however long the actor takes: Maria's walk runs on its own clock (25 s, her ETA), and
   Alex's runs 6 s from the moment Argo listens, or finishes within 0.6 s if the actor is quicker. */
const SARAH_PATH = [[452, 116], [430, 140], [430, 174], [430, 224]], NIKOS_PATH = [[196, 251], [258, 251], [404, 251]];
const SARAH_WALK = 25, NIKOS_WALK = 6;
function nikosP(now) {
  const t = st.t;
  if (t.walk == null) return 0;
  if (t.hurry != null) return t.hurryP + (1 - t.hurryP) * clamp((now - t.hurry) / 0.6);
  return clamp((now - t.walk) / NIKOS_WALK);
}
const sarahP = now => st.t.wake == null ? 0 : clamp((now - st.t.wake) / SARAH_WALK);
function along(path, p) {
  const seg = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1]));
  let d = p * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const f = seg[i] ? Math.min(1, d / seg[i]) : 0; return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]; }
    d -= seg[i];
  }
  return path[path.length - 1];
}
function place(id, path, p) {
  const el = document.getElementById(id), [x, y] = along(path, p);
  el.style.transition = 'none';
  el.style.transform = `translate(${(x - path[0][0]).toFixed(1)}px, ${(y - path[0][1]).toFixed(1)}px)`;
}
function walkers(now) { place('mk-nikos', NIKOS_PATH, nikosP(now)); place('mk-sarah', SARAH_PATH, sarahP(now)); }
function wayfinding(now) {
  const np = nikosP(now), sp = sarahP(now);
  $('#wfN').textContent = st.t.walk == null ? '9.8 m · 15 s' : np < 1 ? `${(9.8 * (1 - np)).toFixed(1)} m · walking` : 'At Locker N3';
  $('#wfS').textContent = sp < 1 ? `${(4.8 * (1 - sp)).toFixed(1)} m · ETA ${cd(SARAH_WALK * (1 - sp))}` : 'Arrived · Node 2';
}

/* ---------- Render the screen from the run state ---------- */
const bound = { hr: 85, o2: 95, sEta: '0:25' };
const nikosLoc = () => st.t.nikosIn != null ? 'NODE 2' : 'LAB';
const BANNER = {
  amber: () => ({ cls: 'amber', level: 'CAUTION', title: `MEDICAL ALERT · ALEX · ${nikosLoc()}`,
    why: st.t.epi != null ? `<small>Status</small>Epinephrine ${hms(st.t.epi)} · monitoring` : '<small>Trigger</small>Off personal baseline: heart rate, oxygen' }),
  red: () => ({ cls: 'red', level: 'WARNING', title: `MEDICAL ALERT · ALEX · ${nikosLoc()}`, why: '<small>Procedure</small>MED-07 severe allergic reaction' }),
  adv: () => ({ cls: 'adv', level: 'ADVISORY', title: `MEDICAL EVENT · ALEX · ${nikosLoc()}`,
    why: `<small>Status</small>${st.t.reassess != null ? `Reassessed ${hm(st.t.reassess)} · improving` : 'Responding to epinephrine'} · under observation` })
};
/* Crew tiles in emergency mode */
function tileSpec(id) {
  const t = st.t, f = st.f, v = view();
  if (id === 'nikos') {
    const loc = t.nikosIn != null ? 'Node 2' : 'Lab';
    if (t.epi != null) {
      // after the step-down the event is an advisory: under observation, not an alarm
      const adv = t.clear != null;
      return { loc, cls: adv ? 'adv' : 'alarm', resp: `<b style="color:var(--${adv ? 'cyan' : 'amber'})">EPINEPHRINE ${hms(t.epi)}</b> · ${!adv ? 'recovering' : t.hrok != null ? 'within limits' : 'responding'}<br>`
        + (t.reassess != null ? `Reassessed ${hm(t.reassess)} · improving` : `Reassess at ${hm(t.epi + 300)} · 2nd injector in Locker N3`) };
    }
    const red = f.warn, col = red ? 'red' : 'amber';
    if (v === 'peak' && f.guide) return { loc, cls: 'alarm red', resp: `<b style="color:var(--${col})">ALERT</b> · HR <b data-v="hr">${bound.hr}</b> · SpO2 <b data-v="o2">${bound.o2}</b> · guided to Locker N3` };
    return { loc, cls: red ? 'alarm red' : 'alarm', resp: `<b style="color:var(--${col})">ALERT ${hms(t.raised)}</b> · HR <b data-v="hr">${bound.hr}</b> · SpO2 <b data-v="o2">${bound.o2}</b> falling` };
  }
  if (id === 'sarah') {
    if (t.sarahArr != null) return { loc: 'Node 2', cls: '', resp: `<b style="color:var(--green)">WITH ALEX</b> since ${hms(t.sarahArr)} · Node 2` };
    if (t.wake != null) return { loc: 'Crew Qtrs', cls: 'ok-hl', resp: `<b style="color:var(--argo)">WOKEN ${hms(t.wake)}</b> by Argo · wake alarm<br>To Node 2 via hatch CQ-N2 · <b>ETA <span data-v="sEta">${bound.sEta}</span></b>` };
    return { loc: 'Crew Qtrs', dim: 1, resp: `Asleep · ${stage('sarah')} sleep` };
  }
  return { loc: 'Hab B', dim: t.clear == null, resp: t.wake != null ? 'Not woken · 2 hatches from Node 2' : `Asleep · ${stage(id)} sleep` };
}
function render() {
  const v = view(), emg = v !== 'normal', f = st.f, t = st.t, lv = level(), guide = guideView();
  $('#stage').className = 'stage s-' + v + (emg ? ' emg' : '');

  // status bar and alarm line
  $('#alarmCount').textContent = emg && lv !== 'adv' ? '1' : '0';
  $('#sbAlarm').className = 'sb sb-alarm' + (!emg || lv === 'adv' ? '' : lv === 'red' ? ' on' : ' on amber');
  $('#sbCrew').textContent = W ? W.crewCount() : t.wake != null ? '4 aboard · 2 asleep' : '4 aboard · 3 asleep';
  $('#memo').classList.toggle('hide', emg);
  const ban = $('#banner'), B = (W ? W.banner : BANNER)[lv === 'none' ? 'amber' : lv]();
  ban.className = 'banner ' + B.cls + (emg && f.banner ? '' : ' hide');
  if (emg) { $('#bTitle').textContent = castText(B.title); $('#bWhy').innerHTML = B.why; $('#bLevel').textContent = B.level; $('#bRaised').textContent = hms(t.raised); $('#aStart').textContent = hms(t.raised); }
  $('#bSnd').classList.toggle('off', !(f.paused && lv !== 'adv'));
  const clocks = !emg || !f.clocks ? [] : ['ckEarth', 'ckReply'].concat(f.warn && t.epi == null ? ['ckO2'] : []);
  ['ckEarth', 'ckReply', 'ckO2'].forEach(id => document.getElementById(id).classList.toggle('off', !clocks.includes(id)));
  ban.style.right = clocks.length ? (clocks.length * 246 + 4) + 'px' : '0px';

  // panels shown, dimmed, active
  const show = (id, on) => document.getElementById(id).classList.toggle('hide', !on);
  const rep = !!f.report;
  show('monitor', emg); show('assess', v === 'alert'); show('inv', !emg);
  show('proc', v === 'peak' || (v === 'report' && !rep)); show('report', rep);
  $('#sys').classList.toggle('dimmed', emg && lv !== 'adv');
  ['monitor', 'plan', 'proc', 'report', 'xscript', 'crew'].forEach(id => document.getElementById(id).classList.remove('active'));
  if (emg) ['monitor', 'xscript'].forEach(id => document.getElementById(id).classList.add('active'));
  if (guide) ['plan', 'proc', 'crew'].forEach(id => document.getElementById(id).classList.add('active'));
  if (v === 'peak' && !guide) document.getElementById('proc').classList.add('active');
  if (v === 'report') document.getElementById(rep ? 'report' : 'proc').classList.add('active');

  // crew tiles
  CREW.forEach(c => {
    const d = emg ? (W ? W.tileSpec(c.id) : tileSpec(c.id)) : { loc: homeOf(c.id).loc };
    const tile = document.getElementById('t-' + c.id), src = tile.classList.contains('src');
    tile.className = 'tile ' + (emg ? (d.cls || '') : '') + (d.dim ? ' dimmed' : '') + (src ? ' src' : '');
    document.getElementById('loc-' + c.id).textContent = d.loc;
    const stEl = document.getElementById('st-' + c.id);
    if (!emg) stEl.textContent = calmStatus(c.id, shipNow());
    stEl.style.display = emg ? 'none' : '';
    setHtml(document.getElementById('resp-' + c.id), castText(d.resp || ''));
  });

  // another scenario draws its own assessment, procedure, report and plan (it says whether their content moved)
  let moved = false;
  if (W) moved = W.render(v, emg, lv, guide);
  else {
    // assessment and procedure (sources on them are lit again if their content changed)
    const [aCrew, aCheck] = assessHtml(), S = stepsHtml();
    moved = setHtml($('#aCrew'), castText(aCrew));
    moved = setHtml($('#aCheck'), castText(aCheck)) || moved;
    moved = setHtml($('#pSteps'), castText(S.html)) || moved;
    $('#pHead').innerHTML = `<b>Step ${S.n} of 5</b> · illustrative, not medical advice`;
    $('#sigHr').textContent = `+${st.sigHr}%`;

    // habitat plan
    $('#m-lab').setAttribute('class', 'mod' + (v === 'alert' ? ' hot' : v === 'peak' ? (f.warn ? ' crit' : ' hot') : ''));
    $('#m-node2').setAttribute('class', 'mod' + (guide ? ' dest' : ''));
    $('#routes').classList.toggle('hide', !guide);
    $('#h-ln2').setAttribute('class', 'hid' + (guide ? ' on' : ''));
    $('#h-cqn2').setAttribute('class', 'hid' + (guide ? ' on' : ''));
    $('#planMode').innerHTML = guide ? castText('<b style="color:var(--argo)">Guidance</b> · Alex to Locker N3') : 'Overview · deck 1';
    $('#kitLab').setAttribute('class', 'kit' + (f.guide ? ' empty' : ''));
    $('#kitLabS').classList.toggle('hide', !f.guide);
    $('#kitN3').setAttribute('class', 'kit' + (guide && t.epi == null ? ' lit' : ''));
    const n3 = $('#kitN3S');
    n3.textContent = t.epi != null ? 'EPI 1' : 'EPI 2';
    n3.setAttribute('class', 'ks ' + (guide && t.epi == null ? 'argo' : t.epi != null ? 'amber' : 'dim'));
    const nk = $('#mk-nikos'), sr = $('#mk-sarah');
    nk.setAttribute('class', 'cm ' + (!emg || lv === 'adv' ? 'awake' : t.epi == null && f.warn ? 'alarm red' : 'alarm'));
    sr.setAttribute('class', 'cm ' + (t.sarahArr != null ? 'awake' : t.wake != null ? 'go' : 'sleep'));
    if (emg) walkers(shipNow());
    else { [nk, sr].forEach(m => { m.style.transition = 'none'; m.style.transform = 'none'; }); }
  }
  $('#wf').classList.toggle('hide', !guide);
  $('#legend').classList.toggle('hide', guide);
  $('#plan').style.setProperty('--wf', guide ? '66px' : '36px');
  if (guide) (W ? W.wayfinding : wayfinding)(shipNow());
  if (f.report) (W ? W.fillReport : fillReport)();
  if (moved && st.lit) relight();
  updateBound();
  pages();   // the phone's page keys and page (nothing on a big screen)
}
function updateBound() { document.querySelectorAll('[data-v]').forEach(el => { const v = bound[el.dataset.v]; if (v !== undefined) el.textContent = v; }); }

/* ---------- Patient monitor ----------
   Values update like a monitor: heart rate every second, SpO2 every 2, breathing every 4, temperature every 10.
   What the monitor shows is a function of ship time, so the log, the report and the checks below read the
   same number the screen shows. Still mode shows the smooth model, rounded. */
const PERIOD = { hr: 1, o2: 2, rr: 4, tp: 10 };
/* Breathing is a slow average: after the dose it settles without jitter, so once it reads 20 it never reads 21 again */
const JIT = { hr: [1, hrJit], o2: [2, () => 0.12], rr: [3, s => EV.epi !== null && s >= EV.epi ? 0 : 0.5], tp: [4, () => 0.03] };
function shown(k, s) {
  const ts = still ? s : Math.floor(s / PERIOD[k]) * PERIOD[k];
  const v = VIT[k](ts) + (still ? 0 : jit(ts, JIT[k][0], JIT[k][1](ts)));
  return k === 'tp' ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v);
}
const HR_HI = 80, O2_LO = 96, RR_HI = 20;   // Alex's alarm limits, as on the monitor
/* After epinephrine, once oxygen and breathing are back inside their limits, procedure MED-07 counts a heart
   rate up to 120 as the drug's expected effect, not as an alarm (a common adult monitor limit). Until then a
   fast heart could still be the reaction, so it stays an alarm. */
const HR_EPI = 120;
function monitorLive(now) {
  const t = st.t, epi = t.epi != null, u = epi ? now - t.epi : 0;
  const hr = shown('hr', now), o2 = shown('o2', now), pct = Math.round((hr - 63) / 63 * 100);
  bound.hr = hr; bound.o2 = o2;
  $('#hrVal').textContent = hr; $('#o2Val').textContent = o2;
  $('#rrVal').textContent = shown('rr', now); $('#tpVal').textContent = shown('tp', now);
  const hrOk = t.hrok != null, hrExp = t.clear != null && !hrOk, o2Ok = t.o2ok != null, rrOk = t.rrok != null, warnOn = !!st.f.warn && !epi;
  const H = $('#numHR'), O = $('#numO2'), R = $('#numRR');
  H.classList.toggle('al', !hrOk && !hrExp); H.classList.toggle('exp', hrExp); H.classList.toggle('ok', hrOk);
  O.classList.toggle('al', !o2Ok); O.classList.toggle('crit', warnOn); O.classList.toggle('ok', o2Ok);
  R.classList.toggle('al', !rrOk); R.classList.toggle('ok', rrOk);
  setHtml($('#hrLim'), hrExp ? `<b>${HR_EPI}</b><br>48` : `${HR_HI}<br>48`);
  const lim = hrExp ? `alarm limits: personal · HR ${HR_EPI} after epinephrine` : 'alarm limits: personal';
  if ($('#monLim').textContent !== lim) $('#monLim').textContent = lim;
  $('#rrTag').textContent = rrOk ? 'WITHIN LIMITS' : 'ABOVE LIMIT';
  $('#hrTag').textContent = hrOk ? 'WITHIN LIMITS' : hrExp ? 'EXPECTED AFTER EPI' : epi ? `+${pct}% · EPI ${hm(t.epi)}` : `+${pct}% VS BASELINE 63`;
  const hn = $('#hrNote');
  hn.textContent = !epi ? `+${pct}% vs baseline 63` : u < 75 ? 'Held up by epinephrine' : hrOk ? 'Easing slowly, within limits' : 'Easing slowly after epinephrine';
  hn.className = hrOk ? 'ok' : hrExp ? 'exp' : '';
  $('#o2Tag').textContent = warnOn ? `90% IN ${cd(o2Eta(now))}` : !epi ? 'BELOW BASELINE · FALLING' : o2Ok ? 'WITHIN LIMITS' : 'RECOVERING';
  const n = $('#o2Note');
  n.textContent = warnOn ? 'About 1 point a minute' : !epi ? 'Falling' : o2Ok ? 'Back within limits' : 'Recovering';
  n.className = warnOn ? 'crit' : epi ? 'ok' : '';
}

/* Trends: anchored at the alarm with the line growing to the right. They never scroll the event away: once
   the line reaches the right edge the chart zooms out, so the trends keep what happened. When the oxygen
   projection shows, the SpO2 chart widens to fit where it crosses 90%. The edges only ever move outward. */
let DOM = null;
function drawTrends(now) {
  const R = st.t.raised, warnOn = !!st.f.warn && st.t.epi == null;
  if (!DOM) DOM = { hr: [R - 270, R + 60], o2: [R - 270, R + 60], proj: false };
  if (warnOn && !DOM.proj) { DOM.proj = true; DOM.o2[0] = R - 150; }
  DOM.hr[1] = Math.max(DOM.hr[1], now + 2);
  DOM.o2[1] = Math.max(DOM.o2[1], now + 2, warnOn ? now + o2Eta(now) + 14 : 0);
  const evs = [{ s: R, label: 'ALERT' }];
  if (st.t.epi != null && now >= st.t.epi) evs.push({ s: st.t.epi, label: 'EPI ' + hm(st.t.epi) });
  trend($('#hrChart'), { fn: TR.hr, kind: 'hr', lo: 40, hi: 108, bandLo: 56, bandHi: 70, x0: DOM.hr[0], x1: DOM.hr[1], now, leftLabel: hm(DOM.hr[0]), events: evs, ping: !still });
  const o2 = { fn: TR.o2, kind: 'o2', lo: 86, hi: 100, bandLo: 96, bandHi: 99, x0: DOM.o2[0], x1: DOM.o2[1], now, leftLabel: hm(DOM.o2[0]), events: evs, ping: !still };
  if (warnOn) o2.proj = { s: now + o2Eta(now), v: 90, label: '90% in ' + cd(o2Eta(now)) };
  trend($('#o2Chart'), o2);
}

/* ---------- Report to Earth ---------- */
function fillReport() {
  const t = st.t, r = st.rep;
  if (!r) return;
  $('#rWritten').textContent = hms(t.report);
  $('#rVitals').textContent = `HR 63 → ${r.hrDose} → ${r.hr} · SpO2 98 → ${r.o2Dose} → ${r.o2}`;
  $('#rTimeline').textContent = `03:20 to ${hm(t.report)} · event log attached`;
  $('#rDose').textContent = `Epinephrine injector · ${hms(t.epi)}`;
}
/* The bar fills over about 7 seconds; when it is sent, a soft confirmation plays once Argo has finished */
function txFrame(now) {
  const rep = st.t.report, p = still ? 0.64 : clamp((now - rep) / 7);
  $('#rBar').style.width = (p * 100).toFixed(1) + '%';
  const dsn = W ? W.dsn : 'DSN Madrid';   // the Earth station of the scenario's night
  $('#rTxK').textContent = p < 1 ? 'Transmitting · ' + dsn : `Sent ${hms(rep + 7)} · ${dsn}`;
  if (p >= 1 && !still && !st.f.sent) { st.f.sent = true; st.t.sent = rep + 7; Sfx.earth('sent'); }
}

/* ---------- The clock tick (once per ship second) ---------- */
let base = CALM_START, t0 = performance.now(), lastSec = -1;
const shipNow = () => still ? base : base + (performance.now() - t0) / 1000;
function clock(vid, kid, rem, k1, k2, at) {
  const k = rem > 0 ? k1 : k2, v = rem > 0 ? cd(rem) : hms(at);
  if ($('#' + kid).textContent !== k) $('#' + kid).textContent = k;
  $('#' + vid).textContent = v;
}
function tick() {
  const now = shipNow(), t = st.t, v = view();
  $('#shipTime').textContent = hms(now);
  const D = DELAY();
  if (st.f.clocks) {
    const e = t.earth ?? now;   // until Argo's first line sends the alert, the clocks show the full delay
    clock('c1', 'c1k', D - (now - e), 'Earth sees this in', 'Earth received alert', e + D);
    clock('c2', 'c2k', 2 * D - (now - e), 'Earliest reply in', 'Reply possible from', e + 2 * D);
  }
  if (st.f.warn && t.epi == null) $('#c3').textContent = cd(W ? W.eta(now) : o2Eta(now));
  if (t.report != null) {
    const r = D - (now - t.report);
    $('#rEtaK').textContent = r > 0 ? 'Arrives at Earth in' : 'Arrived at Earth';
    $('#rEta').textContent = r > 0 ? cd(r) : hms(t.report + D);
  }
  if (t.wake != null) bound.sEta = cd(SARAH_WALK * (1 - sarahP(now)));
  if (v !== 'normal') { if (W) { W.monitor(now); W.trends(now); } else { monitorLive(now); drawTrends(now); } }
  else {
    CREW.forEach(c => { const el = document.getElementById('st-' + c.id), s = calmStatus(c.id, now); if (el.textContent !== s) el.textContent = s; });
    $('#memoCheck').textContent = String((Math.floor(now / 3600) + 1) % 24).padStart(2, '0') + ':00';
  }
  if (guideView()) (W ? W.wayfinding : wayfinding)(now);
  updateBound();
  syncTexts();
  if (simState === 'run') simTick();
  if (!still) watch(now);
}

/* ---------- What happens on its own, checked every ship second ----------
   Alex reaching Node 2, Maria arriving, and after the dose the calm-down, a step-down the room can see while
   the presenter talks (Alex, Nov 7): oxygen comes back inside its limit (about 45 s after the dose), then
   breathing (about 65 s), each logged. Once both have held for 10 s (like a monitor's alarm delay), and never
   sooner than 8 s after Argo's last line, the alarm steps down to an advisory: heart rate, still up, now counts
   as the expected effect of epinephrine (HR_EPI). Heart rate itself keeps easing slowly and comes back inside
   his own limit after about 5 minutes, when the 5-minute reassessment is also due. The alert and the report
   arrive at Earth 12:40 after they left. */
const HOLD = 10;
function watch(now) {
  const t = st.t, f = st.f;
  hourly(now);
  if (st.phase === 'calm') { ambient(now); return; }
  if (W) W.watch(now); else watch143(now);   // another scenario's own moments and calm-down (world-day171.js)
  const D = DELAY();
  if (t.earth != null && t.earthIn == null && now >= t.earth + D) { t.earthIn = t.earth + D; logAdd(t.earthIn, 'COMM', `Medical alert received at Earth (sent ${hms(t.earth)})`, 'argo'); }
  if (t.report != null && t.reportIn == null && now >= t.report + D) { t.reportIn = t.report + D; logAdd(t.reportIn, 'COMM', `Event report received at Earth (sent ${hms(t.report)})`, 'argo'); }
  // the calm-down: once the report has gone, the sound fades out and Argo's last line steps back
  if (st.phase === 'after' && f.sent && t.quiet == null && now >= Math.max(t.after, t.sent) + 3) {
    t.quiet = now;
    Sfx.fade(true);
    st.xs.forEach(e => { if (e.k === 'argo') e.old = true; });
    $('#xs').querySelectorAll('.xe.cur').forEach(x => { x.classList.remove('cur'); x.classList.add('old'); });
    lightSources(null);
  }
}
/* Day 143's own moments: Alex reaching Node 2, Maria arriving, and after the dose the calm-down and its step-down */
function watch143(now) {
  const t = st.t;
  if (t.walk != null && t.nikosIn == null && nikosP(now) > 0.42) { t.nikosIn = now; logAdd(now, 'CREW', 'Alex entered Node 2 via hatch L-N2'); render(); }
  if (t.wake != null && t.sarahArr == null && now >= t.wake + SARAH_WALK) { t.sarahArr = t.wake + SARAH_WALK; logAdd(t.sarahArr, 'CREW', 'Maria with Alex · Node 2', 'ok'); render(); }
  if (t.epi != null) {
    let changed = false;
    if (t.o2ok == null && VIT.o2(now) >= O2_LO && shown('o2', now) >= O2_LO) { t.o2ok = now; changed = true; logAdd(now, 'MED', `Alex: SpO2 ${shown('o2', now)}, back within limits`, 'ok'); }
    if (t.rrok == null && now > t.epi && shown('rr', now) <= RR_HI) { t.rrok = now; changed = true; logAdd(now, 'MED', `Alex: breathing ${shown('rr', now)} a minute, back within limits`, 'ok'); }
    if (t.clear == null && st.phase === 'after' && t.o2ok != null && t.rrok != null && now >= Math.max(t.o2ok, t.rrok) + HOLD && now >= t.after + 8 && VIT.hr(now) < HR_EPI) {
      t.clear = now; changed = true;
      if (t.hrok == null) logAdd(now, 'PROC', `MED-07: HR ${shown('hr', now)} expected after epinephrine · limit ${HR_EPI}`, 'argo');
      logAdd(now, 'MED', 'Alarm stepped down to advisory · monitoring continues', 'ok');
      pulse($('#banner'), CYAN);
    }
    if (t.hrok == null && VIT.hr(now) < HR_HI - 1.4) { t.hrok = now; changed = true; logAdd(now, 'MED', `Alex: heart rate ${shown('hr', now)}, back within his own limits`, 'ok'); }
    if (t.reassess == null && now >= t.epi + 300) { t.reassess = now; changed = true; logAdd(now, 'PROC', `MED-07 step 3: 5 min after the dose · SpO2 ${shown('o2', now)}, HR ${shown('hr', now)} · improving, no 2nd dose`, 'argo'); }
    if (changed) { render(); monitorLive(now); }   // the monitor's tags change in the same second as the banner
    if (t.clear != null && simState === 'run' && SC.self) simOver();   // the scenario has played: the strip offers Run again
  }
}

/* ---------- Announcements for the key moments ----------
   Each sounds as it appears (sound.js): MEDICAL ALERT a medium-priority alarm, WARNING a high-priority one,
   CONTACTING EARTH and REPORT TO EARTH the Earth link. An alarm sounds one burst, then its audio pauses on its
   own as the band lands in the banner, shown there as AUDIO PAUSED like a real monitor, so the alarm never
   covers Argo or the actor. A new, higher alarm (the WARNING) sounds again. land(t) changes the run state. */
const ANNS = {
  medical: () => ({ kind: 'caution', level: 'CAUTION', code: castText('MEDICAL · ALEX · LAB'), time: hms(shipNow()), title: 'MEDICAL ALERT',
    sub: 'Heart rate <b>+35%</b> on his baseline · oxygen falling · not exercising', flash: 2, hold: 1900,
    target: () => phone ? phoneTarget('alarm') : ({ l: 16, t: 66, w: stageW - 32, h: 62 }),   // the alarm line, as wide as the stage
    sound: () => Sfx.alarm('medium'),
    land: () => { st.f.banner = true; st.f.paused = true; render(); pulse($('#banner'), AMBER); } }),
  earth: () => ({ kind: 'argo', level: 'ARGO', code: 'MEDICAL ALERT · DSN MADRID', time: hms(shipNow()), title: 'CONTACTING EARTH',
    sub: 'Earth sees this in <b>12:40</b> · earliest reply in <b>25:20</b>', link: ['MARS TRANSIT · DAY 143', 'EARTH · 12:40 AWAY'], hold: 1700,
    target: () => phone ? phoneTarget('clocks') : ({ l: stageW - 498, t: 66, w: 482, h: 62 }),   // the two Earth clocks at its right end
    sound: () => Sfx.earth('contact'),
    land: () => { st.f.clocks = true; render(); tick(); ['ckEarth', 'ckReply'].forEach(id => pulse(document.getElementById(id), VIOLET)); } }),
  warning: () => ({ kind: 'warning', level: 'WARNING', code: castText(`MEDICAL · ALEX · ${nikosLoc()}`), time: hms(shipNow()), title: 'WARNING',
    sub: `Oxygen below 90% in <b>${cd(o2Eta(shipNow()))}</b> · MED-07: do not wait for Earth`, flash: 3, hold: 2100,
    target: () => phone ? phoneTarget('alarm') : ({ l: 16, t: 66, w: stageW - 32, h: 62 }),
    sound: () => { st.f.paused = false; render(); Sfx.alarm('high'); },
    land: t => { st.f.warn = true; st.f.paused = true; st.t.warn = t; render(); if (!quiet) tick(); pulse($('#banner'), RED); pulse($('#ckO2'), RED); } }),
  report: () => ({ kind: 'argo', level: 'ARGO', code: 'MED-07 STEP 5 · DSN MADRID', time: hms(shipNow()), title: 'REPORT TO EARTH',
    sub: 'Vitals, timeline, dose and possible trigger · arrives in <b>12:40</b>', link: ['MARS TRANSIT · DAY 143', 'EARTH · DSN MADRID'], hold: 1700,
    target: () => phone ? phoneTarget('report') : ({ l: 452 + (stageW - 1920) * .15, t: 608, w: 464 + (stageW - 1920) * .275, h: 400 }),   // #report (style.css)
    sound: () => Sfx.earth('report'),
    land: t => {
      st.f.report = true; st.t.report = t;
      st.rep = { hrDose: Math.round(EV.v0.hr), o2Dose: Math.round(EV.v0.o2), hr: shown('hr', t), o2: shown('o2', t) };
      logAdd(t, 'REPORT', 'Event report sent to Earth · arrives in 12:40', 'argo');
      render(); if (!quiet) tick(); pulse($('#report'), VIOLET);
    } })
};
/* Play an announcement; resolves when it lands. Still mode lands it at once, without the band. */
function show(spec, t) {
  if (quiet) { spec.land(t); return Promise.resolve(); }
  return new Promise(res => { const land = spec.land; spec.land = () => { land(shipNow()); res(); }; Ann.show(spec); });
}

/* ---------- Cues: what each name in the script does to the screen. t is the ship time it happens. ---------- */
const CUE = {
  medicalAlert: t => {
    const hr = Math.round(VIT.hr(t));
    logAdd(t, 'MED', `Alert: Alex HR ${hr} (+${Math.round((hr - 63) / 63 * 100)}% vs baseline), SpO2 ${Math.round(VIT.o2(t))} falling`, 'med');
    show(ANNS.medical(), t);
  },
  contactEarth: t => { show(ANNS.earth(), t); },
  earthClocks: t => { st.t.earth = t; logAdd(t, 'COMM', `Medical alert sent to Earth · DSN Madrid · arrives ${hms(t + 760)}`, 'argo'); if (!quiet) tick(); },
  checkIn: t => logAdd(t, 'ARGO', 'Check-in call to Alex (voice, Lab)', 'argo'),
  symptomCheck: t => { st.f.check = true; st.t.check = t; logAdd(t, 'ARGO', 'Symptom check (MED-07)', 'argo'); render(); },
  procedure: t => {
    st.f.proc = true; st.t.proc = t; st.t.view = t;
    st.sigHr = Math.round((shown('hr', t) - 63) / 63 * 100);
    logAdd(t, 'PROC', 'MED-07 severe allergic reaction: 4 signals matched', 'argo');
    render(); logReclass();
  },
  guide: t => {
    st.f.guide = true; st.t.wake = t;
    logAdd(t, 'INV', 'Lab kit epinephrine 0 (used day 112) · nearest: Locker N3 (2)', 'med');
    logAdd(t, 'CREW', 'Maria woken: wake alarm, Crew Qtrs', 'argo');
    render(); pulse(document.getElementById('t-sarah'), VIOLET);
  },
  nikosWalk: t => { st.t.walk = t; },
  nikosArrive: t => { if (st.t.walk != null && st.t.hurry == null && nikosP(t) < 1) { st.t.hurryP = nikosP(t); st.t.hurry = t; } },
  injectionGuidance: t => logAdd(t, 'ARGO', 'Injection guidance (MED-07 step 1)', 'argo'),
  dose: t => {
    st.t.epi = t; st.t.view = t; syncModel();
    logAdd(t, 'MED', 'Epinephrine given (Alex) · Locker N3: 2 to 1', 'med');
    render(); logReclass(); if (!quiet) tick();
  },
  calmDown: t => { st.phase = 'after'; st.t.after = t; }
};
/* Leads: an announcement before Argo's line; the line starts as it lands */
const LEADS = {
  warning: t => { logAdd(t, 'MED', `WARNING: SpO2 projected below 90% in ${cd(o2Eta(t))}`, 'med crit'); return show(ANNS.warning(), t); },
  report: t => show(ANNS.report(), t)
};
/* A scenario with its own world names its own cues and leads (world-day171.js); Day 143's are the ones above */
const cue = c => (W && W.cues[c]) || CUE[c];
const leadOf = k => (W && W.leads[k]) || LEADS[k];

/* ---------- The run ---------- */
const untilShip = (s, my) => new Promise(res => { const f = () => (my !== run || shipNow() >= s) ? res() : setTimeout(f, 40); f(); });
const guard = my => async p => { const r = await p; if (my !== run) throw CANCEL; return r; };
/* Start a situation from the calm screen. During a run or the calm-down the start key does nothing. */
function start(sc) {
  if (st.phase !== 'calm' || still) return;
  SC = sc;
  const my = ++run, step = guard(my), R = shipNow();
  st.phase = 'run'; st.mode = 'auto'; st.idx = 0; st.t.raised = R; st.t.view = R;
  syncModel(); DOM = null; heart.next = null;
  render(); logReclass(); tick();
  (async () => {
    for (const o of sc.opening) { await step(untilShip(R + o.at, my)); cue(o.cue)(shipNow()); }
    await step(untilShip(R + sc.lineAt, my));
    await sayLine(sc.lines[0], my, false);
  })().catch(e => { if (e !== CANCEL) console.error(e); });
}
/* One of Argo's lines: after a press, a short natural pause (or the lead announcement), then the line, then
   listening for the answer, or the calm-down after the last line */
async function sayLine(L, my, pressed) {
  const step = guard(my);
  try {
    if (pressed) {
      st.mode = 'pause';
      await step(wait(L.lead ? 0.35 : 0.75));
      if (L.lead) { st.mode = 'lead'; setInd('idle'); await step(leadOf(L.lead)(shipNow())); }
    }
    st.mode = 'speak'; st.spoke = true;
    const now = shipNow();
    (L.cues || []).forEach(c => cue(c)(now, L));
    await step(speak(L, now));
    st.idx = SC.lines.indexOf(L) + 1;
    if (st.idx < SC.lines.length) listen(L, my);
    else { st.mode = 'end'; snap = null; setInd('idle'); cue(SC.end)(shipNow()); }
  } catch (e) { if (e !== CANCEL) console.error(e); }
}
function listen(L, my) {
  st.mode = 'listen'; listenAt = performance.now();
  setInd('listen');
  const now = shipNow();
  if (L.hold) addMark(now, L.gap + 2);
  (L.listen || []).forEach(c => cue(c)(now, L));
  const R = SC.self ? replyVoice(L) : null;
  setTimeout(() => { if (my === run && st.mode === 'listen' && !liveVoice()) voiceIn(shipNow(), R && R.V.text); }, 450);
  if (autoplay) setTimeout(() => { if (my === run) press(); }, L.gap * 1000);
  if (SC.self) reply(L, my);
}
/* Scene 2: the patient answers by himself (decision 26). After a short natural pause (at the locker, once his walk
   there has finished), his recorded answer plays (voice/en/nikos-en.js) and his words appear as he says them;
   when he has finished, Argo carries on as if the operator had pressed. Every wait comes from the script and
   the file's data, so the run is the same with sound off. Without a matching file (the script changed since
   the files were made) he waits the script's gap in silence, as in #play. */
const REPLY_PAUSE = 0.6;   // seconds from Argo starting to listen until the patient answers (his breath, then words)
const REPLY_LEAD = 0.05;   // the file is scheduled this far ahead, so it starts on time
const REPLY_END = 0.15;    // from his last word to the "press": the breath after it
async function reply(L, my) {
  const step = guard(my), P = L.reply || {}, R = replyVoice(L), WALK = (W && W.walkSecs) || NIKOS_WALK;
  // thenWalk (another scenario): he answers first, then moves; Argo carries on once he is there
  const walked = () => step(untilShip(st.t.walk + WALK + 0.3, my));
  try {
    if (P.afterWalk && st.t.walk != null) await step(untilShip(st.t.walk + WALK, my));
    await step(wait(P.pause ?? REPLY_PAUSE));
    if (!R) { await step(wait(L.gap)); if (P.thenWalk && st.t.walk != null) await walked(); press(true); return; }
    if (!liveVoice()) voiceIn(shipNow(), R.V.text);
    const at = performance.now() / 1000 + REPLY_LEAD, el = document.getElementById('xsLive');
    Sfx.say(R.key, at);
    hearing = el ? { words: [...el.querySelectorAll('.vw .w')], at: R.V.at, start: at, i: 0 } : null;
    await step(wait(REPLY_LEAD + R.V.end + REPLY_END + (P.after || 0)));
    if (P.thenWalk && st.t.walk != null) await walked();
    press(true);
  } catch (e) { if (e !== CANCEL) console.error(e); }
}
/* The actor has finished. Ignored unless Argo is listening (and has been for at least 0.8 s), so a double
   press, or a press while Argo speaks, never skips a line. In scene 2 only the patient finishing counts (auto). */
function press(auto) {
  if (SC.self && !auto) return;
  if (st.mode !== 'listen' || performance.now() - listenAt < 800) return;
  const L = SC.lines[st.idx];
  if (!L) return;
  const now = shipNow();
  snap = structuredClone(st);
  const my = ++run;
  if (!liveVoice()) voiceIn(now - 1);
  closeVoice(now);
  const m = st.marks[st.marks.length - 1];
  if (m && m.allow !== Infinity) addMark(now, Infinity);
  Sfx.argo('idle');   // sound only: the alarm and Earth sounds may play again; the screen still shows Listening
  st.spoke = false;
  (L.press || []).forEach(c => cue(c)(now, L));
  sayLine(L, my, true);
}
/* Undo a press made too early, while Argo is pausing or speaking its answer: Argo stops and listens again.
   The screen goes back to how it was before the press. If Argo had started speaking, its line stays in the
   transcript, cut off and marked "interrupted", like a voice assistant that stops when someone talks over
   it, and a new voice entry opens; if not, the actor's voice entry simply reopens. Not in scene 2. */
function undo() {
  if (SC.self || !snap || !['pause', 'lead', 'speak'].includes(st.mode)) return;
  const spoke = st.spoke, cut = speechCut(), xsNow = st.xs;
  const my = ++run;
  Ann.clear(); stopSpeech(); Sfx.cut();
  st = snap; snap = null;
  syncModel();
  if (spoke) {
    st.xs = xsNow;
    const e = st.xs[st.xs.length - 1];
    if (e && e.k === 'argo') { e.text = cut; e.cut = true; }
  }
  st.mode = 'listen'; listenAt = performance.now();
  logRender(); xsRender(); render(); relight(); tick();
  setInd('listen');
  if (spoke) setTimeout(() => { if (my === run && st.mode === 'listen' && !liveVoice()) voiceIn(shipNow()); }, 300);
  if (autoplay) setTimeout(() => { if (my === run) press(); }, (SC.lines[st.idx - 1] || {}).gap * 1000 || 3000);
}
/* Back to the calm screen, for the next rehearsal (at: the ship time it starts from, 03:30:40 unless given) */
function reset(at) {
  ++run; Ann.clear(); stopSpeech(); Sfx.cut(); Sfx.fade(false);
  snap = null; zeroAt = 0; hearing = null;
  st = fresh(); syncModel(); DOM = null; heart.next = null;
  base = at ?? calmStart(); t0 = performance.now();
  seedSparks(base);
  clearSources(); xsRender(); logRender(); render(); setInd('idle');
  lastSec = Math.floor(shipNow()); tick();
}
/* Still mode: build the run state at a moment of the nominal run, without animation or sound */
function simulate(snapT) {
  quiet = true;
  base = snapT;
  seedSparks(Math.min(snapT, SIM.raised));
  if (snapT >= SIM.raised) {
    const R = SIM.raised, evs = [];
    evs.push([R, () => { st.phase = 'run'; st.t.raised = R; st.t.view = R; syncModel(); CUE.medicalAlert(R); }]);
    evs.push([R + 3, () => CUE.contactEarth(R + 3)]);
    SC.lines.forEach((L, i) => {
      const lt = SIM.lines[i], vt = SIM.voice[i];
      if (i > 0) evs.push([lt, () => { closeVoice(lt); (L.press || []).forEach(c => CUE[c](lt, L)); if (L.lead) LEADS[L.lead](lt); }]);
      evs.push([lt, () => { st.mode = 'speak'; (L.cues || []).forEach(c => CUE[c](lt, L)); speak(L, lt); st.idx = i + 1; if (i === SC.lines.length - 1) { st.mode = 'end'; CUE[SC.end](lt); } }]);
      if (vt != null) evs.push([vt, () => { st.mode = 'listen'; (L.listen || []).forEach(c => CUE[c](vt, L)); voiceIn(vt); }]);
    });
    let s = R;
    for (const [t, fn] of evs) {
      if (t > snapT) break;
      while (s + 1 <= t) { s += 1; watch(s); }
      fn();
    }
    while (s + 1 <= snapT) { s += 1; watch(s); }
  }
  quiet = false;
  clearSources(); xsRender(); logRender(); render(); relight();
  if (st.mode === 'speak' || st.mode === 'end') setInd('speak'); else setInd(st.mode === 'listen' ? 'listen' : 'idle');
  const a = Q.get('ann');
  if (a && ANNS[a]) Ann.freeze(ANNS[a]());
}

/* ---------- Frame loop: waves, heart and pulse indicators, walkers, speech sweep, transmission ---------- */
const strips = [
  new Strip($('#ecg'), ecgAt, { speed: 190, base: 0.7, scale: 0.58, lw: 2.6, color: '#3fdc8a', hot: '#c2ffdf', glow: 'rgba(63, 220, 138, .10)' }),
  new Strip($('#pleth'), plethAt, { speed: 190, base: 0.88, scale: 0.6, lw: 2.6, color: '#3ec8f2', hot: '#c8f2ff', glow: 'rgba(62, 200, 242, .10)' })
];
const heartEl = $('#heart'), pbar = $('#pbar');
function frame() {
  const now = shipNow(), t = performance.now() / 1000;
  if (Math.floor(now) !== lastSec) { lastSec = Math.floor(now); tick(); }
  if (view() !== 'normal') {
    const V = W ? W.vit : VIT;   // the patient's model: Day 143's (vitals.js), or the scenario's own
    heart.hr = V.hr(now); heart.rr = V.rr(now);
    beatsUntil(t);
    if (!still) Sfx.beats(heart.beats, t, bound.o2);   // pulse tone on each R wave, its pitch from the SpO2 on screen
    strips.forEach(s => { s.write(t); s.draw(); });
    const lb = lastBeat(t);
    heartEl.classList.toggle('on', !!lb && t - lb.t < 0.13);
    pbar.style.height = Math.max(6, Math.min(100, plethAt(t) / 1.2 * 100)).toFixed(1) + '%';
    if (W) W.walkers(now); else walkers(now);
    if (st.f.report) txFrame(now);
  }
  if (speech) speechFrame();
  if (hearing) hearFrame();
  requestAnimationFrame(frame);
}

/* ---------- Background pulses: crew syncs, systems, link and monitor lights ---------- */
const PULSES = [];
const every = (sec, fn, phase) => PULSES.push({ p: sec * 1000, next: performance.now() + phase * 1000, fn });
CREW.forEach((c, i) => every(c.sync, () => crewSync(c, i), 0.15 + i * 0.37));
SYS.forEach((x, i) => every(x.every, () => sysUpdate(x), 0.4 + i * 0.53));
every(2, () => blink($('#linkLed')), 0.8);
every(1, () => { if (view() !== 'normal') blink($('#monLed')); }, 0.05);
setInterval(() => {
  const t = performance.now();
  PULSES.forEach(x => { if (t >= x.next) { x.next = Math.max(x.next + x.p, t + x.p * 0.5); x.fn(); } });
}, 100);

/* ---------- Fit the screen into the window ----------
   The stage is 1080 px high and scaled to fit. It is fixed to the window, so its unscaled box never widens the page
   (on phones that made the browser lay the page out wider than the screen, and the monitor showed zoomed in and cut
   off), and the scale comes from the real viewport. It is 1920 px wide, or wider in a window wider than 16:9 (up to
   2600 px), so the monitor fills the window without black bars at the sides (Alex, Nov 8): the panel columns share
   the extra width (style.css), and the wave strips are redrawn for their new width once the panels have moved. The simulator strip takes its height at the bottom. On a
   phone the screen gets the phone layout instead (decision 32, "The phone layout" below). On a larger screen held
   upright (a tablet) the monitor runs across the top and the strip fills the space under it. During a
   run in full screen, or on a short screen (a phone held sideways), the bar floats over the bottom of the monitor
   and hides until the pointer moves or the screen is tapped. */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function fit() {
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;
  // a visitor on a phone gets the phone layout (decision 32; below); never the presentation mode, #play or ?still
  const ph = !stageMode && (PICKER || PHONE_FORCE) && (PHONE_FORCE || phoneSize(W, H));
  if (ph !== phone) setPhone(ph);
  if (phone) { phoneFit(W, H); return; }
  const stg = $('#stage'), bar = $('#sim'), on = simState !== 'off';
  const tall = on && W < 1100 && H > W * 1.1;
  const float = on && !tall && simState === 'run' && (!!fsEl() || H < 560);
  document.body.classList.toggle('sim-tall', tall);
  bar.classList.toggle('float', float);
  let s, cy;
  if (tall) {
    s = W / 1920; cy = 1080 * s / 2 + 12;
    bar.style.top = Math.round(1080 * s + 24) + 'px';
  } else {
    bar.style.top = '';
    const bz = on && !float ? bar.offsetHeight : 0;
    s = Math.min(W / 1920, (H - bz) / 1080); cy = (H - bz) / 2;
  }
  const sw = Math.round(Math.min(STAGE_MAX, Math.max(1920, W / s)));
  if (sw !== stageW) {
    stageW = sw;
    stg.style.setProperty('--W', sw + 'px'); stg.style.setProperty('--X', (sw - 1920) + 'px');
    clearTimeout(fitT); fitT = setTimeout(() => strips.forEach(x => x.resize()), 800);   // after the panels' .7 s move
  }
  stg.style.setProperty('--s', s);
  stg.style.top = cy + 'px';
}
const STAGE_MAX = 2600;
let fitT = null;

/* ---------- The phone layout (Alex, Nov 8; docs/05 decision 32) ----------
   On a phone the 16:9 monitor would be a fifth of its size upright and a third sideways, so there the same screen is
   laid out for the phone instead (style.css, "The phone layout"): the status bar with the honesty line, the banner and
   the Earth clocks, his vitals, then one large page at a time with page keys (the assessment or the checklist, the
   map, the report, the crew, the event log) and Argo's voice log at the bottom; sideways in two columns. The page
   follows Argo: as each line starts, the monitor brings up the page that holds what the line cites and scrolls it into
   view, the way a cockpit display calls up the right page, so every number Argo says is on the screen. A visitor can
   tap another page key; at Argo's next line the page follows it again. These are the same elements as on the big
   screen, only placed and sized for the phone, so they show the same numbers. Only for visitors on a phone-sized
   screen (the short side up to 500 px and the long side up to 1000, either way up): laptops, projectors, tablets, the
   presentation mode, #play and ?still keep the 16:9 monitor (?phone forces the phone layout, for tests and stills). */
const PHONE_FORCE = Q.has('phone');
const phoneSize = (W, H) => Math.min(W, H) <= 500 && Math.max(W, H) <= 1000;
let phone = false, side = false;
const MAP_FULL = '30 56 700 392', MAP_ROUTE = '36 70 446 244';   // the whole plan, and the part with the route (Lab, Node 2, Crew Qtrs)
const PAGE_KEYS = { chk: 'Checklist', plan: 'Map', report: 'Report', crew: 'Crew', log: 'Log', inv: 'Medical' };
let pageView = null, pageMan = null, pageManLit = null, pageKeysHtml = '';
function setPhone(on) {
  phone = on;
  const stg = $('#stage');
  document.body.classList.toggle('phone', on);
  if (on) { stg.style.top = ''; stg.style.removeProperty('--s'); }
  else {
    document.body.classList.remove('up', 'side', 'short', 'tiny');
    stg.style.height = ''; stg.style.removeProperty('--sh'); delete stg.dataset.page;
    $('#map').setAttribute('viewBox', MAP_FULL); $('#map').style.removeProperty('--ms');
  }
  pageView = null; pageMan = null; pageKeysHtml = '';
  // the waves sweep at a phone's pace across the narrower strips (the big screen's own pace back on a big screen)
  strips.forEach(s => { s.o0 = s.o0 || { speed: s.o.speed, lw: s.o.lw }; s.o.speed = on ? 100 : s.o0.speed; s.o.lw = on ? 2.2 : s.o0.lw; });
  requestAnimationFrame(() => { strips.forEach(s => s.resize()); if (view() !== 'normal') drawTrends(shipNow()); });
  // on a phone the strips' boxes change with the layout (the monitor appears at the alarm; sideways their height follows
  // the banner), and a strip drawn at another size shows stretched: redraw each one at its new size
  if (on && window.ResizeObserver) {
    waveRO = waveRO || new ResizeObserver(() => strips.forEach(s => { if (Math.round(s.c.clientWidth) !== s.w || Math.round(s.c.clientHeight) !== s.h) s.resize(); }));
    strips.forEach(s => waveRO.observe(s.c));
  } else if (waveRO) waveRO.disconnect();
}
let waveRO = null;
/* The monitor fills the phone above the strip. Upright the strip is a panel before a run and a slim bar during one;
   sideways it is one row before a run and hides during one until the screen is tapped (peek), as before. */
function phoneFit(W, H) {
  const stg = $('#stage'), bar = $('#sim'), on = simState !== 'off';
  side = W > H;
  document.body.classList.toggle('side', side);
  document.body.classList.toggle('up', !side);
  document.body.classList.toggle('short', !side && H < 800);   // an iPhone in Safari (660 to 740 high): a little more room for the plan
  document.body.classList.toggle('tiny', !side && H < 600);    // an iPhone SE: a little more room for the page
  // upright: the panel before a run; after one, Run again in a slim row like the running bar, so the monitor keeps its room
  document.body.classList.toggle('sim-tall', on && !side && simState === 'pick' && !bar.classList.contains('done'));
  const float = on && side && simState === 'run';
  bar.classList.toggle('float', float);
  bar.style.top = '';
  const sh = H - (on && !float ? bar.offsetHeight : 0);
  stg.style.height = sh + 'px';
  stg.style.setProperty('--sh', sh + 'px');
  pages();
  requestAnimationFrame(mapScale);
}
/* The page Argo is on: the one holding what its current line cites (the checklist for the procedure, its steps and
   the "do not delay" note; the map for the route), else the report once it is written, else the checklist (the
   assessment until the procedure opens). On the calm screen the crew, or sideways (the crew already on the left) the map. */
const chkPage = () => st.f.proc ? 'proc' : 'assess';
const keyOfPage = p => p === 'proc' || p === 'assess' ? 'chk' : p;
function autoPage() {
  if (view() === 'normal') return side ? 'plan' : 'crew';
  if (st.f.report) return 'report';
  const L = SC.lines.find(l => l.id === st.lit), s = L ? (L.sources || []).map(x => x[0]) : [];
  const wp = W && W.autoPage && W.autoPage(s);   // another scenario may send a line to its own page
  if (wp) return wp;
  if (s.some(k => /^(step|dont|sig|procTitle)/.test(k))) return 'proc';
  if (st.f.guide && s.some(k => /^map|^sarah$/.test(k))) return 'plan';
  return chkPage();
}
function pages() {
  if (!phone) return;
  const v = view(), emg = v !== 'normal', stg = $('#stage');
  if (v !== pageView) {
    if (pageView === null || (pageView !== 'normal') !== emg) { pageMan = null; requestAnimationFrame(() => strips.forEach(s => s.resize())); }   // the vitals just appeared or went
    pageView = v;
  }
  if (pageMan && st.lit && pageManLit !== st.lit) pageMan = null;   // at Argo's next line the page follows it again
  const auto = autoPage(), page = pageMan || auto;
  if (stg.dataset.page !== page) { stg.dataset.page = page; showSourcesSoon(); }
  const keys = emg ? ['chk', 'plan', 'report', 'crew', 'log'] : side ? ['plan', 'inv', 'log'] : ['crew', 'plan', 'inv', 'log'];
  const html = keys.map(k => `<button type="button" class="pk${keyOfPage(page) === k ? ' on' : ''}${keyOfPage(auto) === k ? ' auto' : ''}" data-k="${k}" aria-pressed="${keyOfPage(page) === k}"${k === 'report' && !st.f.report ? ' disabled' : ''}>${(W && W.pageKeys && W.pageKeys[k]) || PAGE_KEYS[k]}</button>`).join('');
  if (html !== pageKeysHtml) { $('#pkeys').innerHTML = html; pageKeysHtml = html; }
  const vb = W ? W.mapView() : guideView() ? MAP_ROUTE : MAP_FULL;   // another scenario frames its own part of the plan
  if ($('#map').getAttribute('viewBox') !== vb) { $('#map').setAttribute('viewBox', vb); mapScale(); }
}
/* The scale the plan is drawn at on the phone, so its labels can keep a readable size (style.css, --ms) */
function mapScale() {
  const m = $('#map'), vb = m.viewBox.baseVal, w = m.clientWidth, h = m.clientHeight;
  if (phone && vb && vb.width && w && h) m.style.setProperty('--ms', Math.min(w / vb.width, h / vb.height).toFixed(3));
}
$('#pkeys').addEventListener('click', e => {
  const b = e.target.closest('.pk');
  if (!b || b.disabled) return;
  pageMan = b.dataset.k === 'chk' ? chkPage() : b.dataset.k; pageManLit = st.lit;
  pages(); showSourcesSoon(); blurFocus();
});
/* A page that holds more than fits scrolls inside, so what Argo cites on it is in view (the crew list too) */
let srcT = null;
const showSourcesSoon = () => { clearTimeout(srcT); srcT = setTimeout(showSources, 60); };
function showSources() {
  const pg = phone && document.getElementById($('#stage').dataset.page), body = pg && pg.querySelector('.body, #crewList');
  if (!body) return;
  const srcs = [...body.querySelectorAll('.src')];
  if (!srcs.length) return;
  const top = Math.min(...srcs.map(e => e.offsetTop)), bot = Math.max(...srcs.map(e => e.offsetTop + e.offsetHeight)), h = body.clientHeight;
  let y = body.scrollTop;
  if (bot - top + 16 <= h) { if (bot + 8 > y + h) y = bot + 8 - h; if (top - 8 < y) y = top - 8; }
  else if (bot - top <= h) y = top - (h - (bot - top)) / 2;   // only just fits: all of it, centred
  else y = top - 4;                                          // more than fits: from the first thing the line cites
  y = Math.max(0, Math.round(y));
  if (y !== body.scrollTop) body.scrollTo({ top: y, behavior: still ? 'auto' : 'smooth' });
}
/* Where an announcement band settles on a phone: the alarm line (MEDICAL ALERT, WARNING), just under it where the
   Earth clocks appear (CONTACTING EARTH), and the page (REPORT TO EARTH). The phone's stage is not scaled. */
function phoneTarget(k) {
  const a = $('.aline').getBoundingClientRect();
  if (k === 'report') { const r = $('#report').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }
  if (k === 'clocks') return { l: a.left, t: a.bottom + 6, w: a.width, h: 44 };
  return { l: a.left, t: a.top, w: a.width, h: a.height };
}
/* Sound marks: in the status bar only while sound is off (before the first key press or click, or after M), and the
   strip's sound key */
function soundMark() {
  const s = Sfx.status();
  $('#sbSnd').classList.toggle('off', still || s === 'on');
  $('#simSnd').classList.toggle('muted', s !== 'on');
  $('#simSnd').setAttribute('aria-pressed', String(s === 'on'));
  $('#simSndL').textContent = s === 'on' ? 'Sound on' : 'Sound off';
}
let toastT = null;
function toast(text) {
  if (!text) return;
  const el = $('#toast');
  el.textContent = text; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800);
}
const blurFocus = () => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); };

/* ---------- The voices ----------
   About 8 MB, so they load after the monitor is up: a visitor sees the live screen at once, and Run says "Loading
   the voices…" until they are in. They come as scripts (voice/en/*.js) because a page opened from a file cannot
   fetch audio files. If one fails to load, its lines run at text timing, silent. The button says "Loading voices…"
   meanwhile, inside itself, so the strip keeps its layout (Alex, Nov 8). */
let voicesReady = false;
const voiceWait = [];
/* sc: the script about to run; another scenario also waits for its own voices (loadScVoices) */
const voicesOk = sc => voicesReady && (cast === 'alex' || castVoice === 'in') && (!sc || !sc.voices || scVoice[sc.voices] === 'in');
const withVoices = (f, sc) => { if (voicesOk(sc)) f(); else voiceWait.push([f, sc]); };
const voicesFlush = () => { for (let i = 0; i < voiceWait.length;) { const [f, sc] = voiceWait[i]; if (voicesOk(sc)) { voiceWait.splice(i, 1); f(); } else i++; } };
/* The other scenarios' voices (one script each, voice/en/<id>-en.js, about 2 MB): loaded the first time a visitor picks
   that scenario, so a visit that stays with Day 143 loads what it always did. Run says "Loading voices…" meanwhile. */
const scVoice = {};   // id: loading | in (loaded, or failed: its lines then run at text timing, silent)
function loadScVoices(c) {
  const id = c && c.script.voices;
  if (!id || scVoice[id]) return;
  scVoice[id] = 'loading';
  const s = document.createElement('script');
  s.src = `voice/en/${id}-en.js`;
  s.onload = s.onerror = () => {
    scVoice[id] = 'in';
    const B = (window.SCENARIO_VOICES || {})[id];
    if (B) Sfx.warm(Object.keys(B.argo.lines).filter(k => !k.includes('-')).concat(Object.keys(B.patient.lines)));
    simLabels(); voicesFlush();
  };
  document.body.appendChild(s);
}
function loadVoices() {
  const files = ['voice/en/voice-en.js', 'voice/en/nikos-en.js'];
  let left = files.length;
  files.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = s.onerror = () => { if (--left === 0) voicesIn(); };
    document.body.appendChild(s);
  });
}
function voicesIn() {
  voicesReady = true;
  Sfx.prime();   // decodes them ahead if sound is already on
  simLabels();   // Run is ready (another scenario's Run once its own voices are in too)
  voicesFlush();
}
/* Giannis's takes (decision 34; voiceKey): about 0.2 MB, loaded the first time the operator types G I A N N I S. A run
   started before they are in waits for them (a moment); if they fail to load, Argo's line 1 runs at text timing,
   silent, like any line without a file. */
let castVoice = 'none';   // none | loading | in (loaded, or failed)
function loadCastVoice() {
  if (castVoice === 'none') {
    castVoice = 'loading';
    const s = document.createElement('script');
    s.src = 'voice/en/voice-en-giannis.js';
    s.onload = s.onerror = () => { castVoice = 'in'; Sfx.warm(Object.keys((window.ARGO_VOICE_GIANNIS || {}).lines || {})); voicesFlush(); };
    document.body.appendChild(s);
  } else if (castVoice === 'in') Sfx.warm(Object.keys((window.ARGO_VOICE_GIANNIS || {}).lines || {}));
}

/* ---------- The simulator strip (docs/05, decision 30) ----------
   Under the monitor, outside the screen: the scenarios visitors can pick (scenarios.js), Run, Full screen and the
   honesty line. Run turns sound on (browsers need a click first) and starts the scenario on its own clock after a
   few seconds of calm night; the strip becomes a slim bar with the time, Stop, sound and Full screen. Once the
   scenario is over (Day 143: the alarm has stepped down to the advisory) the strip comes back with Run again, and
   the monitor stays where the scenario left it. */
let simI = 0, simDone = -1, runT0 = 0;
/* The scenario field (Alex, Nov 8; docs/05, decision 39): the strip shows the scenario on the monitor in one field, as
   before. With more than one scenario, a click on it opens the monitor's scenario list above it, in the screen's own
   look (like a monitor's menu, not a web page's); picking one loads that scenario onto the monitor, which starts again
   on that scenario's calm night (its ship time, crew and log). The field and the list are only there before a run
   (the slim bar replaces them during one); Stop and Run again work as before. */
const scField = (c, i) => `<span class="id">${c.code}</span><span class="tx"><b>${c.event}</b><small>${c.where} · ${c.length}</small><em>${castText(c.brief)}</em></span>`;
function buildSim() {
  const many = SCENARIOS.length > 1;
  $('#simList').innerHTML = `<button type="button" class="sim-sc${many ? ' pick' : ''}" id="simField" data-i="${simI}" aria-pressed="true"${many ? ' aria-haspopup="listbox" aria-expanded="false" aria-controls="simMenu"' : ''}></button>`;
  if (many) {
    const menu = document.createElement('div');
    menu.className = 'sim-menu'; menu.id = 'simMenu'; menu.hidden = true;
    menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'Scenarios');
    menu.innerHTML = `<div class="smh"><span>Scenarios</span><b>${SCENARIOS.length} · each plays by itself</b></div>`
      + SCENARIOS.map((c, i) => `<button type="button" class="sim-opt" role="option" data-i="${i}" aria-selected="false"><span class="n">${String(i + 1).padStart(2, '0')}</span>${scField(c, i)}<span class="on">On screen</span></button>`).join('');
    $('#sim').appendChild(menu);
    menu.querySelectorAll('.sim-opt').forEach(b => b.addEventListener('click', () => pickScenario(+b.dataset.i)));
    menu.addEventListener('keydown', e => {
      const o = [...menu.querySelectorAll('.sim-opt')], i = o.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); simMenu(false, true); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); o[(i + (e.key === 'ArrowDown' ? 1 : o.length - 1)) % o.length].focus(); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); o[e.key === 'Home' ? 0 : o.length - 1].focus(); }
    });
    addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('#simMenu, #simField')) simMenu(false); }, true);
    addEventListener('resize', () => { if (!menu.hidden) placeMenu(); });
  }
  $('#simField').addEventListener('click', () => { if (many) simMenu($('#simMenu').hidden); });
  simLabels();
}
/* Open or close the list; it sits just above the field, as wide as it needs (on a phone, the width of the screen) */
function simMenu(open, refocus) {
  const menu = $('#simMenu'), field = $('#simField');
  if (!menu || (open && simState !== 'pick')) return;
  menu.hidden = !open;
  field.setAttribute('aria-expanded', String(open));
  if (open) { placeMenu(); (menu.querySelector('.sim-opt[aria-selected="true"]') || menu.querySelector('.sim-opt')).focus(); }
  else if (refocus) field.focus();
}
function placeMenu() {
  const menu = $('#simMenu'), r = $('#simField').getBoundingClientRect(), W0 = document.documentElement.clientWidth, H0 = document.documentElement.clientHeight;
  const w = Math.min(640, W0 - 16);
  menu.style.width = w + 'px';
  menu.style.left = Math.round(Math.max(8, Math.min(r.left, W0 - w - 8))) + 'px';
  menu.style.bottom = Math.round(H0 - r.top + 8) + 'px';
  menu.style.maxHeight = Math.round(Math.max(120, r.top - 16)) + 'px';
}
/* Load a scenario onto the monitor: its world, its calm night, its voices (the first time) */
function pickScenario(i) {
  simMenu(false, true);
  if (i === simI || st.phase !== 'calm' && simState === 'run') return;
  simI = i; simDone = -1;
  loadScVoices(SCENARIOS[i]);
  autoplay = false;
  setWorld(SCENARIOS[i].world || null);
  reset();
  simLabels(); setSim('pick');
  const c = SCENARIOS[i];
  toast(`Scenario loaded · ${c.code} · ${c.event}`);
  $('#stage').animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
}
/* The scene text names the patient ("Alex is awake in the Lab"): Giannis when he plays him (decision 34) */
function simBriefs() {
  document.querySelectorAll('#simField, #simMenu .sim-opt').forEach(b => { const t = castText(SCENARIOS[+b.dataset.i].brief); b.title = t; b.querySelector('em').textContent = t; });
}
const runReady = () => voicesReady && (!SCENARIOS[simI].script.voices || scVoice[SCENARIOS[simI].script.voices] === 'in');
function simLabels() {
  const f = $('#simField'), c = SCENARIOS[simI];
  if (+f.dataset.i !== simI || !f.innerHTML) { f.dataset.i = simI; f.innerHTML = scField(c, simI) + (SCENARIOS.length > 1 ? '<span class="sw" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 9.5l5-5 5 5M7 14.5l5 5 5-5"/></svg></span>' : ''); f.title = castText(c.brief); }
  document.querySelectorAll('#simMenu .sim-opt').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === simI)));
  const ready = runReady();
  $('#simRun').disabled = !ready;
  $('#sim').classList.toggle('loading', !ready);
  $('#simRunL').textContent = !ready ? 'Loading voices…' : simDone === simI ? 'Run again' : 'Run simulation';
  $('#simName').textContent = c.code;
  $('#sim').classList.toggle('done', simDone === simI);   // on a phone held upright, the shorter panel with Run again
}
function setSim(state) {
  simState = state;
  const bar = $('#sim');
  bar.dataset.state = state;
  bar.hidden = state === 'off';
  bar.classList.remove('peek');
  fit();
}
function runSim() {
  if ($('#simRun').disabled) return;
  const c = SCENARIOS[simI];
  simMenu(false);
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older browsers */ }   // iPhone: play even with the ringer on silent
  Sfx.unlock();
  if (Sfx.status() === 'muted') Sfx.toggle();   // Run plays with sound (Alex, Nov 8: the button just says Run simulation)
  blurFocus();
  autoplay = false;
  reset(sec(c.startAt));
  simDone = -1; runT0 = performance.now();
  simLabels(); simTick();
  setSim('run');
  peek();
  const my = run;
  setTimeout(() => { if (my === run) withVoices(() => { if (my === run) start(c.script); }, c.script); }, c.calm * 1000);   // (Giannis's take, if still loading)
}
function simTick() {
  const c = SCENARIOS[simI], e = (performance.now() - runT0) / 1000;
  $('#simTime').textContent = ms(e);
  $('#simProg').style.width = Math.min(98, e / c.seconds * 100).toFixed(1) + '%';
}
function simOver() { simDone = simI; simLabels(); setSim('pick'); }
/* Back to the start: the calm screen from 03:30:40 and the strip (Stop, or 0 twice); with another scenario picked, its
   own calm night */
function home() { autoplay = false; setWorld((PICKER && SCENARIOS[simI].world) || null); reset(); simDone = -1; simLabels(); setSim(PICKER ? 'pick' : 'off'); }
/* Swap a scenario's world in (null: Day 143). It changes the monitor's own pieces (world-day171.js, load and unload);
   the crew tiles are built again for its places and sensors. The caller then resets the screen to its calm night. */
function setWorld(w) {
  w = w || null;
  if (w === W) return;
  simMenu(false);
  if (W) W.unload();
  W = w;
  if (W) W.load();
  buildCrew();
  DOM = null;
}

/* ---------- The presentation mode and scene 1, the live Day 143 (decisions 15 and 30; Alex, Nov 8) ----------
   For the team on stage, not for visitors: typing the operator's word (scenarios.js, LIVE: L I V E) removes the strip
   completely and starts the calm screen again from 03:30:40, as the old stage page did; then 1 starts scene 1 (Alex
   answers live, Argo speaks in its voice, no recorded patient), and the stage keys and undo work as on the cue list.
   Typed again, the strip comes back (not while scene 1 runs). 0 twice also brings the strip back, at any time, even
   in the middle of scene 1 (Alex, Nov 8, decision 37: back to what visitors see, the scenarios and the recorded voice;
   until then it restarted the calm screen and stayed in the presentation mode).
   The operator's other words pick who plays the patient (decision 34; "Who plays the patient" above): G I A N N I S
   and A L E X, only on the calm screen (the landing or the presentation mode); during a run, or while it calms down,
   they do nothing, like 1 and 2. The letters are read by key position, so any keyboard layout works, Greek included;
   a word counts when its letters come in a row with no other key between them, all within 3 s (G I A N N I S, seven
   letters, within 5 s). */
const KEYS = w => [...w].map(ch => 'Key' + ch);
const WORDS = [
  { keys: LIVE.word, within: 3000, fn: () => { if (PICKER && !(st.phase === 'run' && !SC.self)) setStage(!stageMode); } },   // never in the middle of scene 1
  { keys: KEYS('GIANNIS'), within: 5000, fn: () => castWord('giannis') },
  { keys: KEYS('ALEX'), within: 3000, fn: () => castWord('alex') }
];
let typed = [];
function liveWord(e) {
  const n = performance.now();
  typed = typed.concat({ c: e.code, t: n }).slice(-7);
  const W = WORDS.find(w => typed.length >= w.keys.length && n - typed[typed.length - w.keys.length].t < w.within
    && w.keys.every((k, i) => typed[typed.length - w.keys.length + i].c === k));
  if (!W) return false;
  typed = [];
  W.fn();
  return true;
}
function castWord(c) { if (PICKER && st.phase === 'calm' && simState !== 'run') setCast(c); }
function setStage(on) {
  stageMode = on;
  autoplay = false;
  blurFocus();
  if (!on) { home(); return; }
  hideCursor();
  setWorld(null);   // the presentation mode is Day 143
  reset();
  setSim('off');
}

/* ---------- Keys ---------- */
let zeroAt = 0;
addEventListener('pointerdown', () => Sfx.unlock());
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || still) return;
  // a focused button in the strip takes its own Space or Enter (keyboard users)
  if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof Element && e.target.closest('#sim')) return;
  const was = Sfx.status();
  Sfx.unlock();   // browsers play sound only after a key press or click
  if (liveWord(e)) return;
  const c = e.code, calm = st.phase === 'calm';   // letters by key position, so a Greek layout works too
  if (c === 'KeyM') { if (was !== 'locked') Sfx.toggle(); return; }   // while sound is still locked, M only turns it on
  if (c === 'KeyA' || c === 'KeyE') { if (calm && TRY) toast(Sfx.next(c === 'KeyA' ? 'alarm' : 'earth')); return; }   // only with ?try, never during a run
  if (c === 'KeyH') { const m = Sfx.cabin(); if (calm) toast(m); return; }   // no note on screen during a run
  if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); press(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); undo(); return; }
  if (e.key === '1') { if (stageMode) withVoices(() => start(LIVE.script)); return; }   // visitors never get scene 1
  if (e.key === '0') {   // a deliberate reset: 0 twice within 2 s, back to the visitor's page, from the presentation mode too (decision 37)
    const n = performance.now();
    if (n - zeroAt < 2000) { zeroAt = 0; if (stageMode) setStage(false); else home(); } else zeroAt = n;
  }
});

/* ---------- Full screen (decision 30) ----------
   From the strip's key, or the F key (slides.js, decision 36; browsers allow it from a click or a key, never Esc);
   Esc leaves it. On a tablet it also asks to turn the
   screen sideways (Android allows that only in full screen); a phone keeps the way it is held, since its own layout
   works both ways (decision 32). Where a browser does not let pages go full screen
   (Safari on iPhone), the key is not shown. */
const FS_OK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function toggleFs() {
  if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!rq) return;
  // a tablet turns sideways for the larger monitor; a phone has its own layout either way up, so it stays as it is held
  const turn = () => { if (!phone && matchMedia('(pointer: coarse)').matches && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); };
  const p = rq.call(el, { navigationUI: 'hide' });
  if (p && p.then) p.then(turn, () => {}); else turn();
}
function fsChanged() {
  const on = !!fsEl();
  document.body.classList.toggle('fs', on);
  $('#simFs').classList.toggle('exit', on);
  $('#simFsL').textContent = on ? 'Exit full screen' : 'Full screen';
  $('#simFs').setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  fit(); peek();
}
document.addEventListener('fullscreenchange', fsChanged);
document.addEventListener('webkitfullscreenchange', fsChanged);

/* While the bar floats (a run in full screen, or a phone held sideways) it shows for 3 s when the pointer moves or
   the screen is tapped, and stays while the pointer is on it */
let peekT = null;
function peek() {
  const bar = $('#sim');
  clearTimeout(peekT);
  if (!bar.classList.contains('float')) { bar.classList.remove('peek'); return; }
  bar.classList.add('peek');
  peekT = setTimeout(function hide() {
    // stays while a mouse is on it (on a touch screen a tap leaves a sticky hover, so only focus counts there)
    if ((matchMedia('(hover: hover)').matches && bar.matches(':hover')) || bar.contains(document.activeElement)) { peekT = setTimeout(hide, 1000); return; }
    bar.classList.remove('peek');
  }, 3000);
}
/* The mouse pointer hides when it rests */
let curT = null;
const hideCursor = () => document.body.classList.add('nocur');
addEventListener('mousemove', () => { document.body.classList.remove('nocur'); clearTimeout(curT); curT = setTimeout(hideCursor, 2000); peek(); });
addEventListener('pointerdown', peek);

/* ---------- Start ---------- */
buildCrew();
addEventListener('resize', () => { fit(); strips.forEach(s => s.resize()); });
Sfx.onChange(soundMark);
Sfx.clock = shipNow;
$('#simRun').addEventListener('click', runSim);
$('#simStop').addEventListener('click', home);
$('#simSnd').addEventListener('click', () => { if (Sfx.status() === 'locked') Sfx.unlock(); else Sfx.toggle(); });
$('#simFs').hidden = !FS_OK;
$('#simFs').addEventListener('click', toggleFs);
/* ?scenario=day128 opens the page with that scenario on the monitor (a link straight to it) */
{ const i = PICKER ? SCENARIOS.findIndex(c => c.id === Q.get('scenario')) : -1;
  if (i > 0) { simI = i; setWorld(SCENARIOS[i].world || null); loadScVoices(SCENARIOS[i]); } }
buildSim();
setSim(PICKER ? 'pick' : 'off');
soundMark();
if (!PICKER) hideCursor();
if (still) simulate(SNAP[HASH] ?? SNAP.normal);
else {
  reset();
  loadVoices();
  if (PLAY) { autoplay = true; setTimeout(() => withVoices(() => { if (autoplay) start(DAY143); }), 6000); }
}
requestAnimationFrame(frame);
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('boot')));
