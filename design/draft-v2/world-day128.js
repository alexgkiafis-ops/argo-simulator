/* What the monitor shows for Day 128, the CO2 pocket (docs/05, decision 38; script in day128.js, spec in
   spec/day128-timeline.json). app.js draws Day 143; when a visitor picks Day 128 in the strip, setWorld swaps this world
   in: its night (Mission day 128, 01:58, everyone asleep, the Earth link through Canberra 10:40 away), the crew's places
   and sleep stations, its panels (the sleep stations' air on the calm screen; the assessment, the ENV-04 checklist and
   the report in the emergency), the plan (the pocket, the stopped fan, the way out to the vent in Node 2, everyone's CO2
   badge), the patient's model (CO2 at his face, his breathing and heart rate; oxygen normal), its cues and its
   calm-down. load() swaps its pieces into the monitor and unload() puts Day 143's back exactly as they were (the same
   nodes and attributes), so picking Day 143 again shows Day 143 as it always was.

   The story in numbers (all simulated, kept to what the sources say; docs/06, "Day 128"):
   - 01:55:22 the fan in sleep station CQ-2 stops and three restarts fail. Argo knows Alex is asleep inside, so it
     watches the CO2 badge on his collar (NASA flew such personal CO2 monitors on the ISS) and wakes him when it passes
     its wake limit, 1 % (about twice the 8-hour limit; NASA's current limit for the cabin air is 0.4 %, 3 mmHg);
   - with no airflow the CO2 at his face climbs from the cabin's 0.3 % toward about 1.8 %, past 1 % in about five minutes
     (NASA's model of a sleeping crew member with no ventilation: above 9 mmHg, 1.2 %, within 10 minutes);
   - asleep, the body answers CO2 weakly (half or less of its waking response), so his breathing and heart rate barely
     move before Argo wakes him; awake, short of breath with a headache, his heart races (about 80) and he breathes faster
     (about 21, above his limit of 20); his oxygen stays normal (97), which is how Argo tells the air from his body;
   - the danger is that he falls asleep again in the pocket: NASA's 2002 analysis of a sleep station without airflow could
     not show that a sleeper would wake up on his own;
   - out in the moving air of Node 2 his badge reads the cabin's 0.3 % within seconds, his breathing settles within about
     half a minute and his heart rate eases; the alarm steps down to an advisory (a CO2 headache can last for hours, so he
     stays under observation). Real recovery takes a few minutes; the scenario compresses it, as Day 143 does. */
const WORLD128 = (() => {
  const FAN_STOP = sec('01:55:22');
  const CALM_AT = sec('01:58:40');    // the landing's night starts here; Run starts it again from 02:00:40
  const DELAY = 640;                  // the Earth link's one-way delay: 10:40 (on day 143, farther out: 12:40)
  const CABIN = 0.3, WAKE = 1.0;
  const RISE = 1.5, TAU = 480;        // CO2 at his face with no airflow: toward the cabin's + 1.5 %, time scale 8 minutes
  const RR0 = 13, HR0 = 54, HR_AWAKE = 63, RR_LIM = 20, HR_LIM = 80;   // his sleep baselines, awake baseline, limits
  const WALK = 8;                     // from unzipping his sleeping bag to the vent in Node 2, seconds

  /* ---------- His model: functions of ship time, so the numbers, trends and log always agree ---------- */
  const T = () => st.t;
  const leftAt = () => T().walk == null ? null : T().walk + 1;   // out of the stagnant air of his station
  const pocket = s => s <= FAN_STOP ? CABIN : CABIN + RISE * (1 - Math.exp(-(s - FAN_STOP) / TAU));
  /* his collar badge: the pocket while he is in it; in the moving air of Node 2 the cabin's within seconds */
  function co2(s) {
    const L = leftAt();
    if (L == null || s <= L) return pocket(s) + nz(s, 21, 0.006);
    return CABIN + 0.02 + (pocket(L) - CABIN) * Math.exp(-(s - L) / 0.8) + nz(s, 22, 0.006);
  }
  /* Asleep his breathing and heart rate barely answer the CO2; Argo's voice wakes him (st.t.woken), and awake, short of
     breath with a headache, his heart races and he breathes faster; out in the moving air both settle */
  const wokeK = (s, w) => { const W0 = T().woken; return W0 == null || s <= W0 ? 0 : ss((s - W0) / w); };
  const rrIn = s => RR0 + 1.2 * Math.max(0, pocket(s) - CABIN) + 7.4 * wokeK(s, 14) + nz(s, 23, 0.15);
  const hrIn = s => HR0 + 2.5 * Math.max(0, pocket(s) - CABIN) + 24.5 * wokeK(s, 9) + nz(s, 26, 0.5);
  function rr(s) { const L = leftAt(); return L == null || s <= L ? rrIn(s) : 15 + (rrIn(L) - 15) * Math.exp(-(s - L) / 26); }
  function hr(s) { const L = leftAt(); return L == null || s <= L ? hrIn(s) : 65 + (hrIn(L) - 65) * Math.exp(-(s - L) / 50); }
  const o2 = s => 97.25 + nz(s, 24, 0.22);
  const vit = { hr, rr, o2, tp: s => 36.4 + nz(s, 25, 0.03) };
  /* As the monitor shows them: heart rate every second, oxygen every 2, breathing every 4, his badge every 2 */
  const PER = { hr: 1, o2: 2, rr: 4, co2: 2 };
  const JIT = { hr: 0.6, o2: 0.1, rr: 0.2, co2: 0 };
  function show(k, s) {
    const ts = Math.floor(s / PER[k]) * PER[k];
    const v = (k === 'co2' ? co2 : vit[k])(ts) + jit(ts, { hr: 31, o2: 32, rr: 33, co2: 34 }[k], JIT[k]);
    return k === 'co2' ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v);
  }
  const awake = s => T().woken != null && s >= T().woken;
  const pct = (v, b) => Math.round((v - b) / b * 100);
  /* The calm night: everyone asleep, his numbers at his sleep baseline */
  const calm = {
    nikos: { hr: s => 54.6 + nz(s, 1, 1.0), o2: s => 97.4 + nz(s, 4, 0.3), tp: s => 36.4 + nz(s, 3, 0.04) },
    sarah: CALM.sarah, mike: CALM.mike, leo: CALM.leo
  };

  /* ---------- Pieces of the monitor this scenario changes (put back exactly on unload) ---------- */
  const undo = [];
  function kids(el, html) {   // replace an element's content; its own nodes are kept aside and come back on unload
    const keep = document.createDocumentFragment();
    while (el.firstChild) keep.appendChild(el.firstChild);
    el.innerHTML = html;
    undo.push(() => { el.textContent = ''; el.appendChild(keep); });
  }
  function attrs(el, names) {   // remember attributes it will change, and put them back as they were (or absent)
    const old = names.map(n => [n, el.getAttribute(n)]);
    undo.push(() => old.forEach(([n, v]) => v == null ? el.removeAttribute(n) : el.setAttribute(n, v)));
  }
  const svg = html => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.innerHTML = html; return g; };
  const MAP = `
    <defs><radialGradient id="w2pg"><stop offset="0" stop-color="#ff4a4a" stop-opacity=".55"/><stop offset=".5" stop-color="#ffab2e" stop-opacity=".26"/><stop offset="1" stop-color="#ffab2e" stop-opacity="0"/></radialGradient></defs>
    <rect class="stn" id="w2stCQ1" x="428" y="96" width="46" height="44" rx="5"/>
    <rect class="stn" id="w2stCQ2" x="300" y="100" width="62" height="44" rx="5"/>
    <circle class="pocket" id="w2pocket" cx="324" cy="120" r="36" fill="url(#w2pg)"/>
    <g class="fan off" id="w2fan" transform="translate(350 111)"><circle r="8"/><path class="bl" d="M0 -5.5L1.6 -1.2M4.8 2.8L0.6 1.6M-4.8 2.8L-2 0"/><path class="x" d="M-5 -5L5 5M5 -5L-5 5"/></g>
    <text class="fanl" x="366" y="108">FAN OFF</text><text class="fanl t" x="366" y="124">01:55</text>
    <g class="vent" id="w2vent"><rect x="390" y="199" width="26" height="8" rx="2"/><path d="M394 199v8M399 199v8M404 199v8M409 199v8"/>
      <path class="air" d="M396 212q-3 12 -10 22M403 212q0 13 -6 25M410 212q3 12 -2 26"/></g>
    <text class="eq" x="440" y="232">VENT</text>
    <g class="eqg"><rect class="eqbox" x="548" y="230" width="78" height="24" rx="3"/><text class="eq" x="587" y="246" text-anchor="middle">SPARE FAN</text></g>
    <g id="w2route" class="hide">
      <path class="route-halo" d="M324 120L340 140H420L430 150V206L384 240"/><path class="route" d="M324 120L340 140H420L430 150V206L384 240"/>
      <path class="route-flow" d="M324 120L340 140H420L430 150V206L384 240"/><circle class="wp" cx="430" cy="174" r="5"/></g>
    <g id="w2rd" class="hide">
      <rect class="rdb" x="480" y="104" width="44" height="22" rx="4"/><text class="rd" x="502" y="116">0.3%</text>
      <rect class="rdb" x="545" y="420" width="42" height="20" rx="4"/><text class="rd" x="566" y="431">0.3%</text>
      <rect class="rdb" x="589" y="420" width="42" height="20" rx="4"/><text class="rd" x="610" y="431">0.3%</text>
    </g>`;
  const PATH = [[324, 120], [340, 140], [420, 140], [430, 150], [430, 206], [384, 240]], BASE = [196, 251];   // his marker's own place (the Lab)

  function load() {
    document.body.classList.add('w-day128');
    // status bar: the mission day and the Earth link
    const sb = document.querySelectorAll('.sbar > .sb');
    kids(sb[1].querySelector('.v'), '<b>128</b> · Mars transit');
    kids(sb[3].querySelector('.v'), '<i class="led ok" id="linkLed"></i>DSN Canberra · delay <b class="mono">10:40</b> one way');
    kids($('#memo'), '<span class="no">NO ACTIVE ALARMS</span><span class="m">Sleep period <b>22:00 to 06:00</b></span><span class="m">Argo monitoring <b>4 crew</b> against personal baselines</span><span class="m">Fan CQ-2 <b>off · ticket M-418</b></span><span class="m">Next crew health check <b id="memoCheck">02:00</b></span>');
    kids($('#ckO2 .k'), 'No airflow for');
    // the patient monitor: his CO2 badge in the place of skin temperature, the breathing and CO2 trends
    kids($('#monitor .ph .r'), '<i class="led ok" id="monLed"></i>Biomonitor shirt + finger SpO2 + CO2 badge · <b>synced 1 s ago</b> · <span id="monLim">alarm limits: personal</span>');
    const ths = document.querySelectorAll('#monitor .tr .th');
    kids(ths[0], 'Breathing trend <b id="hrNote"></b>');
    kids(ths[1], 'CO2 at his face <b id="o2Note"></b>');
    const tp = $('#monitor .sm.tp');
    attrs(tp, ['class', 'id']); tp.className = 'sm co2'; tp.id = 'numCO2';
    kids(tp, `<div class="lab">CO2 <small>% at his face · cabin ${CABIN}</small><span class="tag" id="co2Tag">ABOVE LIMIT</span></div><div class="v" id="co2Val">1.0</div>`);
    // the panels: the sleep stations' air (calm), the assessment, the ENV-04 checklist, the report
    kids($('#inv .ph'), '<span class="t">Sleep stations · air</span><span class="r">Fans and CO2 badges · <b>live</b></span>');
    [...$('#inv').children].filter(e => !e.classList.contains('ph')).forEach(e => { attrs(e, ['hidden']); e.hidden = true; });
    const inv = document.createElement('div'); inv.id = 'w2inv'; $('#inv').appendChild(inv); undo.push(() => inv.remove());
    kids($('#assess .body'), '<div id="w2assess"></div>');
    kids($('#proc .ph .t'), 'Procedure · ENV-04');
    kids($('#proc .body'), '<div class="p-title" id="pTitle">CO2 POCKET · NO AIRFLOW</div><div class="p-sig" id="w2sig"></div><ol class="p-steps" id="pSteps"></ol><div class="p-dont" id="pDont">A SLEEPER IN A CO2 POCKET MAY NOT WAKE · GET OUT</div>');
    kids($('#report .ph .r'), 'ENV-04 step 5 · <b>auto-generated</b>');
    kids($('#report .body'), `<div class="r-title" id="w2rt"></div><div class="r-sub">Written by Argo at <span id="rWritten"></span> ship time, for the flight surgeon and life support team</div>
      <ul class="r-list"><li><span>Exposure</span><b id="rExpo"></b></li><li><span>Vitals</span><b id="rVitals"></b></li>
      <li id="rCause"><span>Cause</span><b><em>Fan CQ-2 stopped</em> 01:55:22 · 3 restarts failed</b></li>
      <li id="rPlan"><span>Tonight</span><b id="rPlanB"></b></li><li><span>Attached</span><b>CO2 trend · vitals · transcript</b></li></ul>
      <div class="r-tx" id="rTx"><div class="k" id="rTxK">Transmitting · DSN Canberra</div><div class="bar"><i id="rBar"></i></div><div class="row"><span id="rEtaK">Arrives at Earth in</span><b id="rEta">10:40</b></div></div>`);
    kids($('#xsHead'), 'Channel: <b>Crew Qtrs</b>');
    // the plan: its own layer (stations, the pocket, the fan, the vent, the spare fan, the way out, the badges)
    const g = svg(MAP); g.id = 'w2map'; $('#map').insertBefore(g, $('#mapCites')); undo.push(() => g.remove());
    ['#routes', '#m-cq', '#m-node2', '#h-cqn2', '#mk-nikos', '#mk-sarah', '#mk-mike', '#mk-leo', '#kitLab', '#kitLabS', '#kitN3', '#kitN3S'].forEach(s => attrs($(s), ['class', 'style']));
    $('#routes').setAttribute('class', 'hide');
    $('#mk-sarah').style.transform = 'none';   // Maria asleep in CQ-1, whatever a Day 143 run left
    // the medical kits as they are on day 128 (the Lab kit's injector used on day 112, Locker N3 full), whatever a Day 143 run left
    $('#kitLab').setAttribute('class', 'kit'); $('#kitLabS').setAttribute('class', 'ks amber hide');
    $('#kitN3').setAttribute('class', 'kit'); $('#kitN3S').setAttribute('class', 'ks dim');
    kids($('#kitN3S'), 'EPI 2');
    kids($('#wf'), '<div id="w2wf"></div>');
    kids($('#legend'), '<span><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#1b2736" stroke="#8fa3b8" stroke-width="1.4"/></svg>Crew</span>'
      + '<span><svg viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="2" fill="none" stroke="#5b6b80" stroke-width="1.3" stroke-dasharray="3 2"/></svg>Sleep station</span>'
      + '<span><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#8fa3b8" stroke-width="1.4"/><path d="M8 3.5v4M11.5 10.5l-3-2M4.5 10.5l3-2" stroke="#8fa3b8" stroke-width="1.4"/></svg>Fan</span>'
      + '<span><svg viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="5" rx="1.5" fill="none" stroke="#7fd3f0" stroke-width="1.3"/></svg>Vent</span>'
      + '<span><b class="mono">CO2</b>Badge, % at the face</span>');
  }
  function unload() {
    while (undo.length) undo.pop()();
    document.body.classList.remove('w-day128');
    dom = null;
  }

  /* ---------- The calm night and its history ---------- */
  const home = {
    nikos: { loc: 'Crew Qtrs', v: [55, 97, '36.4'], bl: ['sleep baseline 54', 'baseline 96 to 99', 'baseline 36.5'] },
    sarah: { loc: 'Crew Qtrs', v: [52, 97, '36.3'], bl: ['baseline 54', 'baseline 96 to 99', 'baseline 36.4'] },
    mike: { loc: 'Hab B', v: [57, 96, '36.4'], bl: ['baseline 58', 'baseline 95 to 98', 'baseline 36.5'] },
    leo: { loc: 'Hab B', v: [55, 98, '36.2'], bl: ['baseline 56', 'baseline 96 to 99', 'baseline 36.3'] }
  };
  const sensors = { nikos: 'Biomonitor shirt · CO2 badge', sarah: 'Biomonitor shirt · CO2 badge', mike: 'Biomonitor shirt · CO2 badge', leo: 'Biomonitor shirt · CO2 badge' };
  function calmStatus(id) {
    if (id === 'nikos') return `Asleep · ${stage(id)} sleep · CQ-2`;
    if (id === 'sarah') return `Asleep · ${stage(id)} sleep · CQ-1`;
    return null;   // Stelios and Giannis as on any night
  }
  const evening = [
    ['21:58:10', 'ARGO', 'ALL', 'Sleep period starts in two minutes. Cabin lights dimming.'],
    ['22:35:12', 'ALEX', null, '0:02'],
    ['22:35:15', 'ARGO', 'ALEX', 'Station CQ-2: lights off, fan on. Good night.']
  ];
  const LOG = [
    ['01:56:54', 'ARGO', `CQ-2 occupied (Alex, asleep) · no airflow · watching his CO2 badge · wakes him at ${WAKE.toFixed(1)}%`, 'argo'],
    ['01:56:53', 'MAINT', 'Ticket M-418: fan CQ-2 · for the morning'],
    ['01:56:52', 'ATMO', 'Fan CQ-2 restart 3 of 3 failed', 'med'],
    ['01:56:22', 'ATMO', 'Fan CQ-2 restart 2 of 3 failed'],
    ['01:55:52', 'ATMO', 'Fan CQ-2 restart 1 of 3 failed'],
    ['01:55:22', 'ATMO', 'Sleep station CQ-2 fan stopped · motor current 0 A', 'med'],
    ['01:00:00', 'HEALTH', 'Crew check: 4 of 4 within personal baseline', 'ok'],
    ['00:31:40', 'CREW', 'Alex: sleep stage light to deep'],
    ['23:58:10', 'COMM', 'Earth link handover Madrid to Canberra'],
    ['22:36:02', 'CREW', 'Alex asleep · CQ-2'],
    ['22:29:47', 'CREW', 'Maria asleep · CQ-1']
  ].map(r => ({ tm: r[0], cat: r[1], tx: r[2], cls: r[3] || '' }));
  const crewCount = () => st.phase === 'calm' || st.t.woken == null ? '4 aboard · 4 asleep' : '4 aboard · 3 asleep';

  /* ---------- Banner, tiles, panels and plan ---------- */
  const out = () => st.t.epi != null;   // in the moving air of Node 2 (st.t.epi: the moment the danger passed, as in Day 143)
  const banner = {
    amber: () => !st.f.proc ? { cls: 'amber', level: 'CAUTION', title: 'CO2 ALERT · ALEX · CQ-2', why: `<small>Trigger</small>CO2 at his face over ${WAKE.toFixed(1)}% · no airflow · asleep` }
      : !out() ? { cls: 'amber', level: 'CAUTION', title: 'CO2 POCKET · ALEX · CQ-2', why: '<small>Cause</small>Fan CQ-2 off since 01:55 · no convection' }
      : { cls: 'amber', level: 'CAUTION', title: 'CO2 EXPOSURE · ALEX · NODE 2', why: `<small>Status</small>In moving air since ${hms(st.t.epi)} · recovering` },
    red: () => ({ cls: 'red', level: 'WARNING', title: 'CO2 POCKET · ALEX · CQ-2', why: '<small>ENV-04</small>Asleep in a pocket, he may not wake on his own: out now' }),
    adv: () => ({ cls: 'adv', level: 'ADVISORY', title: 'CO2 EVENT · ALEX · NODE 2', why: '<small>Status</small>Breathing back to normal · headache · under observation' })
  };
  function tileSpec(id) {
    const t = st.t, f = st.f;
    if (id === 'nikos') {
      if (out()) {
        const adv = t.clear != null;
        return { loc: 'Node 2', cls: adv ? 'adv' : 'alarm', resp: `<b style="color:var(--${adv ? 'cyan' : 'amber'})">IN MOVING AIR ${hms(t.epi)}</b> · ${t.rrok != null ? 'breathing normal' : 'recovering'}<br>CO2 <b data-v="co2">${bound.co2}</b>% · headache · resting by the vent` };
      }
      const col = f.warn ? 'red' : 'amber';
      return { loc: 'Crew Qtrs', cls: f.warn ? 'alarm red' : 'alarm', resp: `<b style="color:var(--${col})">ALERT ${hms(t.raised)}</b> · CO2 <b data-v="co2">${bound.co2}</b>% · HR <b data-v="hr">${bound.hr}</b><br>`
        + (f.guide ? 'Guided out of CQ-2 to Node 2' : f.proc ? 'CO2 pocket in CQ-2 · fan off' : t.woken != null ? 'In CQ-2 · woken by Argo' : 'Asleep in CQ-2 · fan off') };
    }
    const ok = '<b style="color:var(--green)">CO2 0.3%</b> · fan on · asleep';
    if (id === 'sarah') return { loc: 'Crew Qtrs', dim: !f.crewAir, resp: f.crewAir ? ok + ' · CQ-1' : `Asleep · ${stage('sarah')} sleep · CQ-1` };
    return { loc: 'Hab B', dim: !f.crewAir && t.clear == null, resp: f.crewAir ? ok : `Asleep · ${stage(id)} sleep` };
  }
  const row = (id, v, s, cls = '') => `<div class="a-row ${cls}"${id ? ` id="${id}"` : ''}><span class="a-v">${v}</span><span class="a-s">${s}</span></div>`;
  function assessHtml() {
    const a = st.rep0 || { rr: 14, hr: 56, c: '1.0' };
    return '<div class="a-h">Ship</div>'
      + row('aFan', 'Fan CQ-2 <b>off since 01:55</b>, 3 restarts failed', 'life support', 'warn')
      + row('aCo2', `CO2 at his face <b>${a.c}%</b>, rising · cabin ${CABIN}%`, 'badge', 'warn')
      + row('aSleep', 'Alex <b>asleep</b> in sleep station CQ-2, door closed', 'sensor · motion', 'warn')
      + '<div class="a-h">His signals at the alert</div>'
      + row('aRR', `Breathing <b>${a.rr}</b>, sleep baseline ${RR0}`, 'sensor · chest')
      + row('aHR', `Heart rate <b>${a.hr}</b>, sleep baseline ${HR0}`, 'sensor · ECG')
      + row('aO2', 'SpO2 <b>97</b>, normal', 'sensor · finger')
      + '<div class="a-h">Crew report</div>'
      + `<div class="a-row wait"><span class="a-v"><span class="pulse ps"></span>${st.t.woken == null ? 'Waking Alex' : 'Awaiting Alex\'s answer'}</span><span class="a-s">voice</span></div>`;
  }
  const STEPS2 = [['LEAVE THE STATION', 'MOVING AIR'], ['SYMPTOMS', 'WATCH'], ['OTHER CREW CO2', 'CHECK'], ['CQ-2', 'CLOSED TILL FAN SWAP'], ['REPORT TO GROUND', 'SEND']];
  const stt = s => `<div class="sub"><span class="stt">${s}</span></div>`;
  function stepsHtml() {
    const t = st.t, f = st.f, cls = ['now', 'later', 'later', 'later', 'later'], ex = {};
    if (!out()) ex[0] = '<div class="sub"><span class="hint">Unzip, out through hatch CQ-N2.</span><span class="stt">Now</span></div>';
    else {
      cls[0] = 'done'; ex[0] = stt(`In Node 2 ${hms(t.epi)}`);
      cls[1] = 'now'; ex[1] = `<div class="sub"><span class="hint">Headache, breathing, confusion.</span><span class="stt">${t.rrok != null ? 'Breathing normal' : 'Watching'}</span></div>`;
      if (f.crewAir) { cls[2] = 'done'; ex[2] = stt('Maria, Stelios, Giannis 0.3%'); cls[3] = 'done'; ex[3] = stt('Spare fan G-12 · morning'); }
      else cls[2] = 'now';
      if (f.report) { cls[4] = 'done'; ex[4] = stt(`Sent ${hms(t.report)}`); }
    }
    const n = cls.indexOf('now') + 1;
    return { n: n || 5, html: STEPS2.map((s, i) => `<li class="${cls[i]}"><span class="k">${i + 1}</span><div class="ln"><span>${s[0]}</span><span class="dots"></span><span>${s[1]}</span></div>${ex[i] || ''}</li>`).join('') };
  }
  function sigHtml() {
    const chip = (id, h, i) => `<span id="${id}">${h}<i>${i}</i></span>`;
    return chip('sigHead', 'Headache, heart racing', 'crew') + (st.t.drowsy != null ? chip('sigDrowsy', 'Drowsy', 'crew') : '')
      + chip('sigFan', 'Fan off 01:55', 'ship') + chip('sigCo2', `CO2 <b data-v="co2">${bound.co2}</b>% at face`, 'badge')
      + chip('sigPocket', 'Zero g: no convection', 'physics');
  }
  const ON = '<span class="s"><i class="led ok"></i>On</span>', OFF = '<span class="s" style="color:var(--amber)"><i class="led amber"></i>Off 01:55</span>';
  function invHtml() {
    const r = (s, who, fan, air) => `<tr><td>${s}</td><td>${who}</td><td>${fan}</td><td>${air}</td></tr>`;
    return `<table><tr><th>Station</th><th>Crew</th><th>Fan</th><th>Air</th></tr>${r('CQ-1', 'Maria', ON, 'OK')}${r('CQ-2', 'Alex', OFF, '<span style="color:var(--argo)">Argo watching</span>')}${r('HB-1', 'Stelios', ON, 'OK')}${r('HB-2', 'Giannis', ON, 'OK')}</table>`
      + '<div class="note">Fan CQ-2 stopped at 01:55:22; three restarts failed. Ticket M-418 for the morning; the spare fan is in Galley stowage G-12.</div>';
  }
  function wfHtml() {
    return `<div class="r1"><span class="who">ALEX</span><span class="path">CQ-2 <i>→ hatch</i> CQ-N2 <i>→</i> vent, Node 2</span><span class="m" id="w2wfN">5.2 m · 8 s</span></div>`
      + '<div class="r1"><span class="who s">FAN</span><span class="path">Spare in Galley stowage <i>·</i> G-12</span><span class="m">1 spare · morning</span></div>';
  }
  /* Draw this scenario's panels and plan; says whether a panel's content moved (its sources are then lit again) */
  function render2(v, emg, lv, guide) {
    const t = st.t, f = st.f;
    let moved = setHtml($('#w2assess'), castText(assessHtml()));
    moved = setHtml($('#w2sig'), castText(sigHtml())) || moved;
    const S = stepsHtml();
    moved = setHtml($('#pSteps'), castText(S.html)) || moved;
    $('#pHead').innerHTML = `<b>Step ${S.n} of 5</b> · illustrative, not a flight procedure`;
    setHtml($('#w2inv'), castText(invHtml()));
    setHtml($('#w2wf'), castText(wfHtml()));
    // the plan
    const inPocket = st.phase !== 'calm' && !out() && (t.walk == null || shipNow() < leftAt() + 1);
    $('#m-cq').setAttribute('class', 'mod' + (emg && !out() ? (f.warn ? ' crit' : ' hot') : ''));
    $('#m-node2').setAttribute('class', 'mod' + (guide ? ' dest' : ''));
    $('#h-cqn2').setAttribute('class', 'hid' + (guide ? ' on' : ''));
    $('#w2route').setAttribute('class', guide ? '' : 'hide');
    $('#w2pocket').setAttribute('class', 'pocket' + (inPocket ? ' on' : ''));
    $('#w2rd').setAttribute('class', f.crewAir ? '' : 'hide');
    $('#w2vent').setAttribute('class', 'vent' + (guide ? ' lit' : ''));
    $('#planMode').innerHTML = guide ? castText('<b style="color:var(--argo)">Guidance</b> · Alex to the vent, Node 2') : 'Overview · deck 1';
    $('#mk-nikos').setAttribute('class', 'cm ' + (!emg ? 'sleep' : lv === 'adv' ? 'awake' : !out() && f.warn ? 'alarm red' : 'alarm'));
    ['#mk-sarah', '#mk-mike', '#mk-leo'].forEach(s => $(s).setAttribute('class', 'cm sleep'));
    walkers(shipNow());
    return moved;
  }
  /* Alex in his station, then along the way out to the vent */
  const walkP = now => st.t.walk == null ? 0 : clamp((now - st.t.walk) / WALK);
  function at(p) {
    const seg = PATH.slice(1).map((q, i) => Math.hypot(q[0] - PATH[i][0], q[1] - PATH[i][1]));
    let d = p * seg.reduce((a, b) => a + b, 0);
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, d / seg[i]) : 0; return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * k, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * k]; }
      d -= seg[i];
    }
    return PATH[PATH.length - 1];
  }
  function walkers(now) {
    const [x, y] = st.phase === 'calm' ? PATH[0] : at(walkP(now)), el = $('#mk-nikos');
    el.style.transition = 'none';
    el.style.transform = `translate(${(x - BASE[0]).toFixed(1)}px, ${(y - BASE[1]).toFixed(1)}px)`;
  }
  function wayfinding(now) {
    const p = walkP(now), el = $('#w2wfN');
    if (el) el.textContent = st.t.walk == null ? '5.2 m · 8 s' : p < 1 ? `${(5.2 * (1 - p)).toFixed(1)} m · floating` : 'At the vent · Node 2';
  }
  function fillReport() {
    const t = st.t, r = st.rep;
    if (!r) return;
    $('#w2rt').textContent = castText('CO2 EXPOSURE · DAY 128 · ALEX');
    $('#rWritten').textContent = hms(t.report);
    $('#rExpo').textContent = `CO2 at his face up to ${r.peak}% · ${Math.floor(r.secs / 60)} min ${r.secs % 60} s with no airflow`;
    $('#rVitals').textContent = `Breathing ${RR0} → ${r.rrPeak} → ${r.rr} · HR ${HR0} → ${r.hrPeak} → ${r.hr} · SpO2 97`;
    $('#rPlanB').textContent = castText('Alex sleeps in Node 2 · CQ-2 closed · spare fan G-12 in the morning');
  }

  /* ---------- The monitor ---------- */
  function monitor(now) {
    const t = st.t, gone = out(), up = awake(now), h = show('hr', now), o = show('o2', now), r = show('rr', now), c = show('co2', now);
    bound.hr = h; bound.o2 = o; bound.rr = r; bound.co2 = c;
    $('#hrVal').textContent = h; $('#o2Val').textContent = o; $('#rrVal').textContent = r; $('#co2Val').textContent = c;
    const rrOk = t.rrok != null || r <= RR_LIM, hrHigh = up && !gone, hrOk = !up || (gone && h <= 72), warnOn = !!st.f.warn && !gone, high = +c >= WAKE;
    const H = $('#numHR'), O = $('#numO2'), R = $('#numRR'), C = $('#numCO2');
    H.classList.toggle('al', hrHigh); H.classList.toggle('exp', false); H.classList.toggle('ok', hrOk && !hrHigh);
    O.classList.toggle('al', false); O.classList.toggle('crit', false); O.classList.toggle('ok', true);
    R.classList.toggle('al', !rrOk); R.classList.toggle('ok', rrOk);
    C.classList.toggle('al', high); C.classList.toggle('crit', warnOn); C.classList.toggle('ok', !high);
    setHtml($('#hrLim'), `${HR_LIM}<br>48`);
    $('#hrTag').textContent = !up ? `ASLEEP · BASELINE ${HR0}` : !gone ? `+${pct(h, HR_AWAKE)}% VS BASELINE ${HR_AWAKE}` : hrOk ? 'WITHIN LIMITS' : 'AWAKE · EASING';
    $('#hrNote').textContent = !up ? `Asleep · sleep baseline ${RR0}` : !gone ? 'Awake, short of breath' : rrOk ? 'Back within limits' : 'Settling in moving air';
    $('#hrNote').className = gone && rrOk ? 'ok' : '';
    $('#o2Tag').textContent = 'NORMAL';
    $('#rrTag').textContent = rrOk ? 'WITHIN LIMITS' : 'ABOVE LIMIT';
    $('#co2Tag').textContent = warnOn ? 'NO AIRFLOW' : high ? 'OVER WAKE LIMIT' : 'CABIN AIR';
    $('#o2Note').textContent = gone ? 'Cabin air again' : 'Rising · no airflow';
    $('#o2Note').className = warnOn ? 'crit' : gone ? 'ok' : '';
  }
  /* Trends anchored at the alert, growing to the right, zooming out rather than scrolling (as in Day 143); the CO2 chart
     marks the fan stopping */
  let dom = null;
  function trends(now) {
    const R = st.t.raised;
    if (!dom || dom.R !== R) dom = { R, x0: R - 390, x1: R + 60 };
    dom.x1 = Math.max(dom.x1, now + 2);
    const L = leftAt(), evs = [{ s: FAN_STOP, label: 'FAN OFF', right: true }, { s: R, label: 'ALERT' }];
    if (L != null && now >= L) evs.push({ s: L, label: 'OUT' });
    trend($('#hrChart'), { fn: s => rr(s), kind: 'rr', lo: 8, hi: 28, bandLo: 12, bandHi: 15, x0: dom.x0, x1: dom.x1, now, leftLabel: hm(dom.x0), events: evs, ping: true });
    trend($('#o2Chart'), { fn: s => co2(s), kind: 'co2', bandTop: true, lo: 0, hi: 2, bandLo: 0.2, bandHi: 0.5, x0: dom.x0, x1: dom.x1, now, leftLabel: hm(dom.x0), events: evs, ping: true });
  }
  /* The red clock in the WARNING: how long his station has had no airflow */
  const noAir = s => Math.max(0, s - FAN_STOP);

  /* ---------- Its moments, checked every ship second, and the calm-down ----------
     After he is out: breathing back inside its limit, logged; once it has held for 10 s (HOLD) and at least 15 s after
     Argo's last line, the alarm steps down to an advisory (a CO2 headache can last for hours: he stays under
     observation); heart rate back near his own baseline, logged. */
  function watch(now) {
    const t = st.t;
    if (t.walk != null && t.nikosIn == null && walkP(now) > 0.55) { t.nikosIn = now; logAdd(now, 'CREW', 'Alex left CQ-2 through hatch CQ-N2', ''); render(); }
    if (!out()) return;
    let changed = false;
    if (t.rrok == null && show('rr', now) <= RR_LIM) { t.rrok = now; changed = true; logAdd(now, 'MED', `Alex: breathing ${show('rr', now)} a minute, back within limits`, 'ok'); }
    if (t.clear == null && st.phase === 'after' && t.rrok != null && now >= t.rrok + HOLD && now >= t.after + 15) {
      t.clear = now; changed = true;
      logAdd(now, 'MED', 'Alarm stepped down to advisory · headache, monitoring continues', 'ok');
      pulse($('#banner'), CYAN);
    }
    if (t.hrok == null && hr(now) < 72) { t.hrok = now; changed = true; logAdd(now, 'MED', `Alex: heart rate ${show('hr', now)}, easing toward his baseline`, 'ok'); }
    if (changed) { render(); monitor(now); }
    if (t.clear != null && simState === 'run' && SC.self) simOver();
  }

  /* ---------- Announcements, cues and leads ---------- */
  const lineTarget = () => phone ? phoneTarget('alarm') : ({ l: 16, t: 66, w: stageW - 32, h: 62 });
  const anns = {
    air: () => ({ kind: 'caution', level: 'CAUTION', code: castText('AIR · ALEX · CQ-2'), time: hms(shipNow()), title: 'CO2 ALERT',
      sub: `CO2 at his face <b>${show('co2', shipNow())}%</b> · no airflow since 01:55 · he is asleep`, flash: 2, hold: 1900,
      target: lineTarget, sound: () => Sfx.alarm('medium'),
      land: () => { st.f.banner = true; st.f.paused = true; render(); pulse($('#banner'), AMBER); } }),
    earth: () => ({ kind: 'argo', level: 'ARGO', code: 'CO2 ALERT · DSN CANBERRA', time: hms(shipNow()), title: 'CONTACTING EARTH',
      sub: 'Earth sees this in <b>10:40</b> · earliest reply in <b>21:20</b>', link: ['MARS TRANSIT · DAY 128', 'EARTH · 10:40 AWAY'], hold: 1700,
      target: () => phone ? phoneTarget('clocks') : ({ l: stageW - 498, t: 66, w: 482, h: 62 }),
      sound: () => Sfx.earth('contact'),
      land: () => { st.f.clocks = true; render(); tick(); ['ckEarth', 'ckReply'].forEach(id => pulse(document.getElementById(id), VIOLET)); } }),
    warning: () => ({ kind: 'warning', level: 'WARNING', code: castText('CO2 · ALEX · CQ-2'), time: hms(shipNow()), title: 'WARNING',
      sub: `No airflow for <b>${cd(noAir(shipNow()))}</b> · drowsy · asleep he may not wake: out now`, flash: 3, hold: 2100,
      target: lineTarget, sound: () => { st.f.paused = false; render(); Sfx.alarm('high'); },
      land: t => { st.f.warn = true; st.f.paused = true; st.t.warn = t; render(); tick(); pulse($('#banner'), RED); pulse($('#ckO2'), RED); } }),
    report: () => ({ kind: 'argo', level: 'ARGO', code: 'ENV-04 STEP 5 · DSN CANBERRA', time: hms(shipNow()), title: 'REPORT TO EARTH',
      sub: 'Exposure, vitals, cause and tonight’s plan · arrives in <b>10:40</b>', link: ['MARS TRANSIT · DAY 128', 'EARTH · DSN CANBERRA'], hold: 1700,
      target: () => phone ? phoneTarget('report') : ({ l: 452 + (stageW - 1920) * .15, t: 608, w: 464 + (stageW - 1920) * .275, h: 400 }),
      sound: () => Sfx.earth('report'),
      land: t => {
        const L = leftAt() ?? t;
        st.f.report = true; st.t.report = t;
        st.rep = { peak: pocket(L).toFixed(1), secs: Math.round(L - FAN_STOP), rrPeak: Math.round(rrIn(L)), hrPeak: Math.round(hrIn(L)), rr: show('rr', t), hr: show('hr', t) };
        logAdd(t, 'REPORT', 'Event report sent to Earth · arrives in 10:40', 'argo');
        render(); tick(); pulse($('#report'), VIOLET);
      } })
  };
  const cues = {
    airAlert: t => {
      st.rep0 = { rr: show('rr', t), hr: show('hr', t), c: show('co2', t) };
      logAdd(t, 'ATMO', `CO2 alert: Alex's badge ${st.rep0.c}% (wake limit ${WAKE.toFixed(1)}%) · no airflow in CQ-2 · asleep`, 'med');
      showAnn(anns.air(), t);
    },
    contactEarth: t => { showAnn(anns.earth(), t); },
    earthClocks: t => { st.t.earth = t; logAdd(t, 'COMM', `CO2 alert sent to Earth · DSN Canberra · arrives ${hms(t + DELAY)}`, 'argo'); tick(); },
    wakeCall: t => { st.t.woken = t + 1.2; logAdd(t, 'ARGO', 'Wake call to Alex (voice, CQ-2)', 'argo'); },
    procedure: t => {
      st.f.proc = true; st.t.proc = t; st.t.view = t;
      logAdd(t, 'PROC', 'ENV-04 CO2 pocket: no airflow, headache, oxygen normal · not his heart or lungs', 'argo');
      render(); logReclass();
    },
    guide: t => { st.f.guide = true; logAdd(t, 'ARGO', 'Guidance: Alex out of CQ-2 to the vent in Node 2, via hatch CQ-N2', 'argo'); render(); },
    alexFloat: t => { st.t.walk = t; },
    alexOut: t => {
      if (st.t.epi != null) return;
      st.t.epi = t; st.t.view = t; syncModel();
      logAdd(t, 'CREW', `Alex in Node 2 by the vent · CO2 at his badge ${show('co2', t)}%`, 'ok');
      render(); logReclass(); tick();
    },
    crewAir: t => { st.f.crewAir = true; logAdd(t, 'ARGO', 'CO2 badges: Maria 0.3%, Stelios 0.3%, Giannis 0.3% · only CQ-2 had no airflow', 'argo'); render(); },
    calmDown: t => { st.phase = 'after'; st.t.after = t; }
  };
  const leads = {
    warning: t => { st.t.drowsy = t; logAdd(t, 'MED', `WARNING: Alex drowsy in CQ-2 · no airflow for ${cd(noAir(t))} · asleep he may not wake`, 'med crit'); return showAnn(anns.warning(), t); },
    report: t => showAnn(anns.report(), t)
  };
  function showAnn(spec, t) { return new Promise(res => { const land = spec.land; spec.land = () => { land(shipNow()); res(); }; Ann.show(spec); }); }

  /* ---------- What each line cites ---------- */
  const sources = {
    // the breathing and CO2 cells: on a phone the number sits beside the cell's tag, clear of the value
    rr: n => phone ? inlineCite($('#numRR'), n, $('#numRR .lab')) : source($('#numRR'), n),
    co2: n => phone ? inlineCite($('#numCO2'), n, $('#numCO2 .lab')) : source($('#numCO2'), n),
    aFan: n => inlineCite($('#aFan'), n, $('#aFan .a-v')),
    asleep: n => inlineCite($('#aSleep'), n, $('#aSleep .a-v')),
    sigFan: n => inlineCite($('#sigFan'), n), sigCo2: n => inlineCite($('#sigCo2'), n), sigPocket: n => inlineCite($('#sigPocket'), n),
    mapFan: n => mapCite(372, 140, n),
    mapPocket: n => { mapBox(288, 84, 72, 72); mapCite(286, 160, n); },
    noteSleep: n => inlineCite($('#pDont'), n),   // (not "dont": on a phone the plan stays up for the way out)
    mapHatch: n => mapCite(456, 174, n),
    mapVent: n => { mapBox(384, 194, 38, 48); mapCite(380, 256, n); },
    mapMaria: n => { mapCite(532, 106, n); source($('#t-sarah'), n); },
    mapHabB: n => { mapBox(540, 386, 96, 58); mapCite(650, 400, n); source($('#t-mike'), n); source($('#t-leo'), n); },
    mapAlexStation: n => { mapBox(298, 98, 66, 48); mapCite(296, 96, n); },
    rPlan: n => source($('#rPlan'), n),
    mapSpare: n => { mapBox(544, 226, 86, 32); mapCite(640, 226, n); }
  };
  /* On a phone the plan shows the part with the way out (Crew Qtrs and Node 2), and all of it when Argo checks the crew */
  const mapView = () => st.f.guide && !st.f.crewAir && st.phase !== 'calm' ? '262 74 262 200' : '30 56 700 392';
  /* On a phone, Argo's check of the crew's air brings up the crew page (their tiles carry the badges) */
  const autoPage = s => s.includes('mapMaria') ? 'crew' : null;

  return { id: 'day128', calmStart: CALM_AT, delay: DELAY, dsn: 'DSN Canberra', walkSecs: WALK, sleep: { nikos: 1, sarah: 1, mike: 3, leo: 0 },
    home, calm, sensors, calmStatus, evening, logBase: () => LOG, crewCount, banner, tileSpec, render: render2, walkers, wayfinding,
    fillReport, monitor, trends, eta: noAir, watch, vit, cues, leads, sources, mapView, autoPage, pageKeys: { inv: 'Stations' }, load, unload };
})();
