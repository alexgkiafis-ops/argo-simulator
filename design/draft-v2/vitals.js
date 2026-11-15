/* Simulated vitals for the Day 143 draft. Nothing here is real patient data.
   Values are functions of ship time in seconds, so the trends, the numbers and the waves always agree.
   Normal mode shows calm baselines. In an emergency, the patient (Alex) follows one continuous curve anchored to the moments
   the run sets as it unfolds (EV): the alarm, the dose. The numbers keep spec/day143-timeline.json:
   - at the alarm and through Argo's first line, heart rate 85 (+35% on his baseline of 63), SpO2 95 and falling;
   - SpO2 falls about one point a minute, so at Argo's fourth line it reads 94 with 90% about 4:10 away;
   - heart rate about 92 by the time Argo names Locker N3.
   The steps, not a fixed clock, decide when those lines come. Before the fourth line, a "disease clock" (dz)
   runs at real speed while Alex answers at a normal pace and slows to a near stop if he takes much longer, so
   the numbers Argo says are on the screen whenever it says them. From then on time runs at real speed.
   After the dose (docs/05 item 7, and the visible step-down Alex approved on Nov 7): oxygen recovers first,
   about a point every 15 to 30 s (back inside its limit of 96 about 45 s after the dose), breathing settles
   (back inside its limit of 20 after about 65 s), and heart rate stays up for a while, since epinephrine
   itself raises it, then eases slowly (below its alarm limit of 80 after about 5 min, toward 70 after 15).
   Real recovery takes a few minutes; the stage compresses it to about a minute. */

const sec = s => { const [h, m, x] = s.split(':').map(Number); return h * 3600 + m * 60 + (x || 0); };
const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const sc = (x, w) => x <= 0 ? 0 : x < w ? x * x / (2 * w) : x - w / 2;
/* A recovery that starts gently a seconds after the dose and closes in on its target (0 to 1, time scale tau) */
const rise = (u, a, tau) => { const x = Math.max(0, u - a) / tau; return 1 - Math.exp(-x) * (1 + x); };
/* Repeatable noise: nz wanders over tens of seconds, jit changes every second or two. Both depend only on
   time, so a value drawn into a trend now is the same value the trend shows a minute later. */
const nz = (t, seed, a) => a * (0.55 * Math.sin(t * 0.21 + seed) + 0.3 * Math.sin(t * 0.53 + seed * 2.1) + 0.15 * Math.sin(t * 1.37 + seed * 0.7));
const jit = (t, seed, a) => a * (0.5 * Math.sin(t * 2.1 + seed * 1.7) + 0.3 * Math.sin(t * 3.7 + seed * 0.9) + 0.2 * Math.sin(t * 0.83 + seed * 2.3));

/* Scenario moments (ship time), set by app.js as they happen; null until then.
   raised: the alarm (key 1). epi: the dose; v0 holds the patient's values at that moment. */
const EV = { raised: null, epi: null, v0: null };

/* The disease clock. Marks are added by the run: { t: ship time, allow: seconds at full speed }. After a
   mark, the clock runs at real speed for `allow` seconds, then slows smoothly and adds at most DZ_K more,
   however long the wait. allow Infinity means real speed. Adding a mark never changes the past.
   DZ_K was 4 until Argo got its voice (Nov 7): line 4 now lasts as long as the voice, about a second longer
   than the text timing, and after three very slow answers (the harness's slow run) SpO2 ticked to 93 at the
   end of it. At 2 the margin is back; answers at a normal pace never reach this limit, so nothing else changes. */
const DZ = { marks: [] }, DZ_K = 2;
function dz(s) {
  const m = DZ.marks;
  if (!m.length || s <= m[0].t) return s;
  let D = m[0].t;
  for (let i = 0; i < m.length; i++) {
    const end = i + 1 < m.length ? Math.min(s, m[i + 1].t) : s;
    const w = end - m[i].t, a = m[i].allow;
    D += w <= a ? w : a + DZ_K * (1 - Math.exp(-(w - a) / DZ_K));
    if (end >= s) return D;
  }
  return D;
}

/* Before the dose, as functions of d, disease seconds since the alarm. The rise starts before the alarm
   (heart rate 104 s, oxygen 181 s), which is what the alarm caught. Oxygen eases off above 90.5 in a very
   long stall instead of crossing 90 with nobody acting. */
const soft = v => v >= 92 ? v : 92 - 1.5 * (1 - Math.exp(-(92 - v) / 1.5));
const PRE = {
  hr: d => 63 + 22 * ss((d + 104) / 104) + 7.5 * ss((d - 15) / 50),
  o2: d => soft(97.6 - sc(d + 181, 30) / 60),
  rr: d => 14 + 8 * ss((d + 104) / 104) + 2 * ss(d / 61),
  tp: d => 36.6 + 0.2 * ss((d + 104) / 104) + 0.1 * ss(d / 61)
};
/* After the dose, as functions of u, real seconds since the dose, from the values at the dose (v) */
const POST = {
  hr: (u, v) => { const b = v + 3 * ss((u - 5) / 40), w = ss((u - 60) / 60) * (1 - Math.exp(-Math.max(0, u - 60) / 230)); return b - (b - 70) * w; },
  o2: (u, v) => v + (97.7 - v) * rise(u, 2, 22),
  rr: (u, v) => v - (v - 14.5) * rise(u, 4, 44),
  tp: (u, v) => v - 0.15 * ss((u - 30) / 300)
};
const CALM_NIKOS = { hr: s => 63.6 + nz(s, 1, 1.1), o2: s => 97.7 + nz(s, 4, 0.3), rr: () => 14, tp: s => 36.6 + nz(s, 3, 0.04) };
/* The patient (Alex) during the event (smooth model; add nz for trends and jit for the numbers) */
const VIT = {};
['hr', 'o2', 'rr', 'tp'].forEach(k => {
  VIT[k] = s => EV.raised === null ? CALM_NIKOS[k](s)
    : EV.epi === null || s <= EV.epi ? PRE[k](dz(s) - EV.raised)
    : POST[k](s - EV.epi, EV.v0[k]);
});
/* The dose: freeze the values it starts from (null clears it, for undo and reset) */
function setEpi(t) {
  EV.epi = t;
  EV.v0 = t === null ? null : { hr: PRE.hr(dz(t) - EV.raised), o2: PRE.o2(dz(t) - EV.raised), rr: PRE.rr(dz(t) - EV.raised), tp: PRE.tp(dz(t) - EV.raised) };
}
/* Oxygen projection: seconds until SpO2 reaches 90 at about one point a minute (the rate on the monitor) */
const o2Eta = s => Math.max(0, (VIT.o2(s) - 90) * 60);
/* Heart rate on the monitor holds steadier around the alarm, so it reads 85 (+35%) all through Argo's first line */
const hrJit = s => EV.raised !== null && s >= EV.raised && s < EV.raised + 16 ? 0.35 : 0.8;
/* Trend lines (smooth wander) */
const TR = { hr: s => VIT.hr(s) + nz(s, 1, 1.0), o2: s => VIT.o2(s) + nz(s, 5, 0.08) };

/* Calm crew, normal mode. Baselines and ranges match the crew tiles. The ids are the first cast's names
   (app.js, Crew): nikos is Alex, sarah is Maria, mike is Stelios, leo is Giannis. */
const CALM = {
  nikos: { hr: s => 63.6 + nz(s, 1, 1.1), o2: s => 97.7 + nz(s, 4, 0.3), tp: s => 36.6 + nz(s, 3, 0.04) },
  sarah: { hr: s => 52 + nz(s, 5, 1.2), o2: s => 97 + nz(s, 6, 0.3), tp: s => 36.3 + nz(s, 7, 0.04) },
  mike: { hr: s => 57 + nz(s, 8, 1.6), o2: s => 96.4 + nz(s, 9, 0.3), tp: s => 36.4 + nz(s, 2, 0.04) },
  leo: { hr: s => 55 + nz(s, 4, 1.0), o2: s => 97.8 + nz(s, 1, 0.3), tp: s => 36.2 + nz(s, 6, 0.04) }
};

/* ---------- Trend chart: personal baseline band, out-of-band coloring, projection, event markers ----------
   The time axis is anchored (x0 to x1, ship seconds) and the line grows to the right as time passes. */
function trend(svg, o) {
  // as wide as the chart is on screen (at least 300), so a wider panel shows a wider chart, not a margin
  const H = 150, W = Math.max(300, Math.round(H * (svg.clientWidth || 300) / (svg.clientHeight || H))), top = 16, bot = 126, span = o.x1 - o.x0;
  if (svg._w !== W) { svg._w = W; svg.setAttribute('viewBox', `0 0 ${W} ${H}`); }
  const x = s => (s - o.x0) / span * W;
  const y = v => bot - (v - o.lo) / (o.hi - o.lo) * (bot - top);
  const pts = [];
  for (let s = Math.ceil(o.x0 / 2) * 2; s < o.now; s += 2) pts.push([x(s), y(o.fn(s))]);
  const vNow = o.fn(o.now);
  pts.push([x(o.now), y(vNow)]);
  const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  const id = svg.id, b1 = y(o.bandHi), b2 = y(o.bandLo), xn = x(o.now), last = pts[pts.length - 1];
  const out = vNow > o.bandHi || vNow < o.bandLo;
  let s = `<defs>
    <clipPath id="${id}-in"><rect x="-5" y="${b1}" width="${W + 10}" height="${b2 - b1}"/></clipPath>
    <clipPath id="${id}-out"><rect x="-5" y="-40" width="${W + 10}" height="${b1 + 40}"/><rect x="-5" y="${b2}" width="${W + 10}" height="${H + 40 - b2}"/></clipPath>
  </defs>`;
  for (let i = 1; i < 4; i++) { const gx = i * W / 4; s += `<line class="grid" x1="${gx}" x2="${gx}" y1="${top}" y2="${bot}"/>`; }
  s += `<rect class="band" x="0" y="${b1}" width="${Math.max(0, xn)}" height="${b2 - b1}" rx="3"/>`;
  s += `<text class="band-l" x="6" y="${o.kind === 'o2' || o.bandTop ? b1 - 5 : b2 + 13}">baseline ${o.bandLo} to ${o.bandHi}</text>`;
  // event markers; a label close to the one before it goes on the other side of its line, so they never overlap
  let prevX = -1e9;
  (o.events || []).forEach(e => {
    const ex = x(e.s);
    if (ex < 2 || ex > W) return;
    const right = e.right || ex - prevX < 64;
    s += `<line class="ev" x1="${ex}" x2="${ex}" y1="${top}" y2="${bot + 4}"/>`;
    s += `<text class="ev-l" x="${right ? ex + 4 : ex - 4}" y="${bot + 13}" text-anchor="${right ? 'start' : 'end'}">${e.label}</text>`;
    prevX = ex;
  });
  s += `<path class="ln in-${o.kind}" d="${d}" clip-path="url(#${id}-in)"/>`;
  s += `<path class="ln out" d="${d}" clip-path="url(#${id}-out)"/>`;
  s += `<text class="ax" x="0" y="${H - 2}">${o.leftLabel}</text>`;
  if (o.proj) {
    const x1 = x(o.proj.s), y1 = y(o.proj.v);
    s += `<line class="thr" x1="0" x2="${W}" y1="${y1}" y2="${y1}"/>`;
    s += `<text class="thr-l" x="${W}" y="${y1 - 5}" text-anchor="end">${o.proj.thr || '90%'}</text>`;
    s += `<line class="proj" x1="${last[0]}" y1="${last[1]}" x2="${x1}" y2="${y1}"/>`;
    s += `<circle class="proj-dot" cx="${x1}" cy="${y1}" r="4.5"/>`;
    s += `<text class="proj-l" x="${x1 - 2}" y="${y1 + 20}" text-anchor="end">${o.proj.label}</text>`;
  }
  s += `<line class="nowline" x1="${xn}" x2="${xn}" y1="${top}" y2="${bot + 4}"/>`;
  s += `<text class="ax now" x="${Math.min(xn, W - 12)}" y="${H - 2}" text-anchor="middle">now</text>`;
  const dot = out ? 'var(--amber)' : (o.kind === 'hr' ? 'var(--green)' : 'var(--cyan)');
  if (o.ping) s += `<circle class="ping" cx="${last[0]}" cy="${last[1]}" r="5" stroke="${dot}"/>`;
  s += `<circle class="now-dot" cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${dot}"/>`;
  svg.innerHTML = s;
}

/* ---------- Crew sparklines ---------- */
const SPARK_W = 120, SPARK_H = 30;
function sparkPath(values, lo, hi) {
  return 'M' + values.map((v, i) => `${(i / (values.length - 1) * SPARK_W).toFixed(1)} ${(SPARK_H - 3 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (SPARK_H - 6)).toFixed(1)}`).join('L');
}
function sparkEnd(values, lo, hi) {
  const v = values[values.length - 1];
  return [SPARK_W, SPARK_H - 3 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (SPARK_H - 6)];
}

/* ---------- Monitor waveforms ----------
   A beat generator with realistic variation: respiratory sinus arrhythmia and small random changes in
   the interval, R-wave and T-wave height, and a breathing-linked baseline drift. ECG lead II and the
   pulse oximeter pleth come from the same beats (the pulse arrives about 0.2 s after the R wave).
   The strips are drawn like a bedside monitor: a bright write point sweeps left to right, the newest
   trace is brightest, and a short erase gap runs ahead of it. */
const G = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (2 * w * w));
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const heart = { hr: 63, rr: 14, beats: [], next: null, rand: rng(143) };
function gauss() { const r = heart.rand; let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function beatsUntil(t) {
  if (heart.next === null || heart.next < t - 8) { heart.beats = []; heart.next = t - 6; }
  while (heart.next <= t + 1.5) {
    const bt = heart.next, br = Math.sin(2 * Math.PI * bt * heart.rr / 60);
    heart.beats.push({ t: bt, hr: heart.hr, a: 1 + 0.07 * br + 0.05 * gauss(), ta: 1 + 0.12 * gauss(), pa: 1 + 0.15 * gauss(), pl: 1 + 0.12 * br + 0.05 * gauss() });
    heart.next = bt + 60 / heart.hr * (1 - 0.035 * br + 0.018 * gauss());
  }
  while (heart.beats.length && heart.beats[0].t < t - 9) heart.beats.shift();
}
function ecgAt(t) {
  let v = 0;
  for (const b of heart.beats) {
    const d = t - b.t;
    if (d < -0.32 || d > 0.62) continue;
    const qt = 0.3 - 0.0017 * (b.hr - 63);
    v += 0.12 * b.pa * G(d, -0.165, 0.024) - 0.1 * G(d, -0.028, 0.009) + b.a * G(d, 0, 0.0105) - 0.24 * G(d, 0.026, 0.011) + 0.3 * b.ta * G(d, qt, 0.048);
  }
  return v + 0.045 * Math.sin(2 * Math.PI * t * heart.rr / 60 + 1.2) + (Math.random() - 0.5) * 0.018;
}
function plethAt(t) {
  let v = 0;
  for (const b of heart.beats) {
    const d = t - b.t - 0.21;
    if (d < -0.15 || d > 1.1) continue;
    v += b.pl * (0.95 * G(d, 0.11, 0.045) + 0.35 * G(d, 0.2, 0.08) + 0.32 * G(d, 0.36, 0.07) + 0.12 * G(d, 0.5, 0.14));
  }
  return v + 0.06 * Math.sin(2 * Math.PI * t * heart.rr / 60 + 0.4);
}
function lastBeat(t) { for (let i = heart.beats.length - 1; i >= 0; i--) if (heart.beats[i].t <= t) return heart.beats[i]; return null; }

const DPR = 2;
class Strip {
  constructor(canvas, sample, o) { this.c = canvas; this.sample = sample; this.o = o; this.ctx = canvas.getContext('2d'); this.resize(); }
  resize() {
    this.w = Math.max(20, Math.round(this.c.clientWidth)); this.h = Math.max(20, Math.round(this.c.clientHeight));
    this.c.width = this.w * DPR; this.c.height = this.h * DPR;
    this.ys = new Float32Array(this.w).fill(NaN); this.hx = null;
  }
  /* Store one sample per pixel column up to time t; the first call fills a whole sweep. */
  write(t) {
    const sp = this.o.speed, w = this.w, hx = Math.floor(t * sp);
    const from = this.hx === null || hx - this.hx >= w || hx < this.hx ? hx - w : this.hx;
    for (let X = from + 1; X <= hx; X++) this.ys[((X % w) + w) % w] = this.sample(X / sp);
    this.hx = hx;
  }
  draw() {
    const { ctx, w, h, o, ys } = this;
    if (this.hx === null) return;
    const head = ((this.hx % w) + w) % w;
    const Y = v => h * o.base - v * h * o.scale;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(185, 196, 209, .05)';
    ctx.beginPath();
    for (let gx = 25.5; gx < w; gx += 25) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
    ctx.stroke();
    // soft glow trailing the write point
    const g = ctx.createLinearGradient(head - 70, 0, head + 2, 0);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)'); g.addColorStop(1, o.glow);
    ctx.fillStyle = g; ctx.fillRect(head - 70, 0, 72, h);
    // trace, oldest to newest, brighter toward the write point; the erase gap sits just ahead of it
    const gap = 22, span = w - gap, CH = 20;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = o.color; ctx.lineWidth = o.lw;
    const path = (aFrom, aTo) => {
      ctx.beginPath();
      let prev = -1;
      for (let a = aFrom; a >= aTo; a--) {
        const x = (head - a + w) % w, v = ys[x];
        if (Number.isNaN(v)) { prev = -1; continue; }
        if (prev < 0 || x < prev) ctx.moveTo(x, Y(v)); else ctx.lineTo(x, Y(v));
        prev = x;
      }
      ctx.stroke();
    };
    for (let a0 = span; a0 > 0; a0 -= CH) {
      ctx.globalAlpha = 0.46 + 0.54 * Math.pow(1 - a0 / span, 1.5);
      path(a0, Math.max(0, a0 - CH));
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = o.color; ctx.shadowBlur = 12; ctx.strokeStyle = o.hot; ctx.lineWidth = o.lw + 0.6;
    path(36, 0);
    const v = ys[head];
    if (!Number.isNaN(v)) {
      ctx.shadowBlur = 18; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(head, Y(v), 3.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}
