/* Makes the voices for the live screen from design/draft-v2/day143.js, and the scripts the page loads them from
   (a page opened from a file cannot fetch audio, so the MP3s travel inside scripts):
   - Argo's lines (docs/05, decision 24): one MP3 per line, and per variant of a line whose numbers follow the
     clocks, bundled in voice-en.js. Numbers are typed as spoken; the screen shows them as digits, and each word
     on screen gets the start time of the words that say it (from ElevenLabs' character timestamps).
   - The patient's answers for scene 2, the self-playing Day 143 (decisions 25 and 26; the patient is Alex on
     screen since Nov 7, night, and NIKOS here is his first-cast name): one MP3 per answer, n1 to n7
     (n1 answers Argo's line a1), bundled in nikos-en.js. Each is made from the line's `answer`: a stage
     direction that makes a sound becomes an Eleven v4 audio tag ((coughs) is [coughs]), every other direction
     is an action and is not spoken, and the line's reply.tone sets how he sounds ([strained]). The page times
     his answer, and the sweep over his words, from speech to text (ElevenLabs Scribe word times).
   - Giannis's takes (docs/05, decision 34): the team has not decided whether Alex or Giannis plays the patient, and
     the operator switches the page to Giannis by typing G I A N N I S. Every line of Argo's that names the patient
     (today only line 1, "Alex, your heart rate...") gets a second file, <key>-giannis, that says Giannis instead
     (the names swapped as app.js swaps them on screen, castText). SAY below is how the voice is told to say a name,
     for the voice only (the screen still shows Giannis): the spelling Alex picked by ear from the auditions. The
     patient's recorded answers name nobody, so they serve both.
   After a script change, run this again. Files whose text and settings have not changed are reused, so only
   changed lines cost characters.

   Day 128, the second scenario (docs/05, decision 38): --scenario day128 makes its voices from day128.js instead, with the
   same voices, settings and seed (Argo's lines, their Giannis takes and line 6 per Earth-clock pair; the patient's answers
   bn1 to bn5), all in one script, voice/en/day128-en.js, which the page loads the first time a visitor picks Day 128.
   Without --scenario it makes Day 143's, exactly as before.

   Usage (from argo-plan):  node tools/voice/make-voice.js [--scenario day128] [--dry] [--check]
     --dry    print what each file says and call nothing
     --check  also transcribe every file with ElevenLabs speech to text and compare it with the script, and for
              the patient check that his sounds are heard too (the cough, the relieved breath)
            node tools/voice/make-voice.js --audition Giannis,Yannis,...
     Giannis's takes once per spelling of his name, into design/voice-auditions/giannis/ (MP3, and JSON with the
     text, settings and timing), each transcribed; changes nothing in the app. After Alex picks one, its MP3 and
     JSON go to voice/en/<key>-giannis.mp3 and cache/<key>-giannis.json, SAY gets its spelling, and this script
     reuses that very take.
   The ElevenLabs key comes from ELEVENLABS_API_KEY, argo-plan/.env, or the ElevenLabs MCP config in
   ~/.claude.json. It is never printed. */
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');

const VOICE = { id: '1hlpeD1ydbI2ow0Tt3EW', name: 'Verity X - Calm British Narration' };
const MODEL = 'eleven_multilingual_v2';
const SETTINGS = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.0 };
const SEED = 143;
/* Variants. Line 4 says the minutes the two Earth clocks show as it starts (12:40 and 25:20 after the alert,
   to the nearest minute): cover line 4 starting 20 s to 5 minutes after the alert. Line 7 says the ship time
   of the dose: cover 03:31 to 03:59 (the ship clock starts at 03:30:40 when the screen is reset). */
const LINE4_AFTER_ALERT = [20, 300];
const DOSE_MINUTES = [31, 59];
/* The scenarios: their script, the Earth link's one-way delay (the clocks a line's {earthIn} and {replyIn} follow) and
   how long after the alert such a line can start (Day 128's line 6 at the script's pace: about 1:30) */
const SCENARIOS = {
  day143: { file: 'day143.js', name: 'DAY143', delay: 760, after: LINE4_AFTER_ALERT },
  day128: { file: 'day128.js', name: 'DAY128', delay: 640, after: [40, 200] }
};
const SCN = (i => i < 0 ? 'day143' : process.argv[i + 1])(process.argv.indexOf('--scenario'));
if (!SCENARIOS[SCN]) throw new Error('--scenario: one of ' + Object.keys(SCENARIOS).join(', '));
const SCX = SCENARIOS[SCN];

/* The patient's voice (decision 25): the settings Alex heard in the auditions, seed 143 like Argo */
const NIKOS = { id: 'rNCpBDykmtbS99HIj7Ku', name: 'Alan James - Stoic, Grainy and Serious' };
const NIKOS_MODEL = 'eleven_v4';
const NIKOS_SETTINGS = { stability: 0.5, similarity_boost: 0.75 };
/* Stage directions that make a sound, as audio tags. Every other direction is an action and is not spoken. */
const SOUNDS = { 'coughs': 'coughs', 'breathing easier': 'exhales' };
/* What speech to text must hear for each sound (it reports an exhale as a sigh) */
const HEARD = { coughs: /cough/i, exhales: /sigh|exhal|breath/i };

/* Who plays the patient (decision 34). The script is written for Alex; Giannis's takes swap the two names, as the
   page does. SAY: a name as the voice is told to say it, when the voice needs another spelling to say it right; the
   screen shows the name as written. Empty: Verity X says Giannis the Greek way (YAH-nees) as written. Alex picked that
   take by ear from seven spellings on Nov 8 (design/voice-auditions/giannis/, take 1; the page
   https://claude.ai/artifact/LPGGvm24MiD8Q98X1WpYEZ), and a1-giannis is that very take. */
const SWAP = { Alex: 'Giannis', Giannis: 'Alex', ALEX: 'GIANNIS', GIANNIS: 'ALEX' };
const castSwap = t => t.replace(/\b(Alex|Giannis|ALEX|GIANNIS)\b/g, m => SWAP[m]);
const SAY = {};
/* How speech to text may write Giannis said the Greek way (the check compares words, so these count as the same) */
const GIANNIS_HEARD = /\b(giannis|yannis|yiannis|yanis|yahnis)\b|γιάννης|γιαννης/g;

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'design', 'draft-v2');
const OUT = path.join(APP, 'voice', 'en');
const CACHE = path.join(__dirname, 'cache');
const args = new Set(process.argv.slice(2));

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const env = path.join(ROOT, '.env');
  if (fs.existsSync(env)) {
    const m = fs.readFileSync(env, 'utf8').match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  try {
    const k = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8'))?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY;
    if (k) return k;
  } catch (e) { /* no MCP config */ }
  throw new Error('No ElevenLabs key: set ELEVENLABS_API_KEY or put ELEVENLABS_API_KEY=... in argo-plan/.env');
}

/* The script, as the page has it */
function loadScript() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(APP, SCX.file), 'utf8') + `\n;this.${SCX.name} = ${SCX.name};`, ctx);
  return ctx[SCX.name];
}

/* Numbers as spoken */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const num = n => n < 20 ? ONES[n] : n < 100 ? TENS[n / 10 | 0] + (n % 10 ? '-' + ONES[n % 10] : '')
  : ONES[n / 100 | 0] + ' hundred' + (n % 100 ? ' ' + num(n % 100) : '');
const clockWords = (h, m) => num(h) + ' ' + (m === 0 ? "o'clock" : m < 10 ? 'oh ' + ONES[m] : num(m));
function spokenWord(word, say = SAY) {
  const [, core, tail] = word.replace(/’/g, "'").match(/^(.*?)([.,:;?!]*)$/);
  if (say[core]) return say[core] + tail;                                                                            // Giannis -> as picked
  if (/^\d{1,2}:\d\d$/.test(core)) { const [h, m] = core.split(':').map(Number); return clockWords(h, m) + tail; }   // 03:34 -> three thirty-four
  if (/^\d+$/.test(core)) return num(+core) + tail;                                                                  // 112 -> one hundred twelve
  if (/^[A-Z]\d$/.test(core)) return core[0] + ' ' + num(+core[1]) + tail;                                           // N3 -> N three
  if (/^\d+\.\d+$/.test(core)) { const [a, b] = core.split('.'); return num(+a) + ' point ' + [...b].map(d => ONES[+d]).join(' ') + tail; }   // 0.3 -> zero point three
  if (core === 'CO2') return 'C O two' + tail;                                                                        // CO2 -> C O two (Day 128)
  return core + tail;
}
/* The same filling as the page's fillText (app.js) */
const fill = (t, v) => t.replace('{dose}', () => v.dose)
  .replace('{earthIn}', () => v.earthIn === 1 ? '1 minute' : v.earthIn + ' minutes')
  .replace('{replyIn}', () => String(v.replyIn));
const clockMin = (total, e) => Math.max(0, Math.round((total - e) / 60));

function jobs(SC) {
  const out = [];
  for (const L of SC.lines) {
    if (/\{earthIn\}|\{replyIn\}/.test(L.text)) {
      const seen = new Set();
      for (let e = SCX.after[0]; e <= SCX.after[1]; e++) {
        const a = clockMin(SCX.delay, e), b = clockMin(2 * SCX.delay, e), key = `${L.id}-${a}-${b}`;
        if (!seen.has(key)) { seen.add(key); out.push({ key, shown: fill(L.text, { earthIn: a, replyIn: b }) }); }
      }
    } else if (L.text.includes('{dose}')) {
      for (let m = DOSE_MINUTES[0]; m <= DOSE_MINUTES[1]; m++) {
        const dose = '03:' + String(m).padStart(2, '0');
        out.push({ key: `${L.id}-${dose.replace(':', '')}`, shown: fill(L.text, { dose }) });
      }
    } else out.push({ key: L.id, shown: L.text });
  }
  // Giannis's take of every file that names the patient (decision 34): line 1 today
  for (const j of out.slice()) if (castSwap(j.shown) !== j.shown) out.push({ key: j.key + '-giannis', shown: castSwap(j.shown) });
  for (const j of out) { j.phrases = j.shown.split(' ').map(w => spokenWord(w)); j.text = j.phrases.join(' '); }
  return out;
}
/* The patient's answers: shown is what the screen shows (his words, his sounds in brackets like subtitles), text
   what Eleven v4 reads (his tone first, straight apostrophes, as in the auditions) */
function nikosJobs(SC) {
  return SC.lines.map((L, i) => ({ L, key: (SC.replyKey || 'n') + (i + 1) })).filter(x => x.L.answer).map(({ L, key }) => {
    const shown = L.answer.replace(/\(([^)]*)\)/g, (m, d) => SOUNDS[d] ? `[${SOUNDS[d]}]` : '').replace(/\s+/g, ' ').trim();
    const tone = (L.reply && L.reply.tone) || null;
    return { key, answer: L.answer, tone, shown, text: ((tone ? `[${tone}] ` : '') + shown).replace(/’/g, "'"),
      sounds: (shown.match(/\[[^\]]+\]/g) || []).map(t => t.slice(1, -1)) };
  });
}

async function call(p, opts, tries = 3) {
  let res;
  try { res = await fetch('https://api.elevenlabs.io' + p, { ...opts, headers: { 'xi-api-key': apiKey(), ...(opts.headers || {}) } }); }
  catch (e) {   // a dropped connection: wait and try again
    if (tries <= 1) throw new Error(p + ' -> ' + e.message + (e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''));
    await new Promise(r => setTimeout(r, 2000));
    return call(p, opts, tries - 1);
  }
  if (!res.ok) throw new Error(p + ' -> ' + res.status + ' ' + (await res.text()).slice(0, 300));
  return res;
}
const api = async (p, opts) => (await call(p, opts)).json();
const cacheFile = key => path.join(CACHE, key + '.json');
const mp3File = key => path.join(OUT, key + '.mp3');
const readCache = key => { try { return JSON.parse(fs.readFileSync(cacheFile(key), 'utf8')); } catch (e) { return null; } };
function cached(j) {
  const c = readCache(j.key);
  const same = c && c.text === j.text && c.voice === VOICE.id && c.model === MODEL && c.seed === SEED && JSON.stringify(c.settings) === JSON.stringify(SETTINGS);
  return same && fs.existsSync(mp3File(j.key)) ? c : null;
}
function nikosCached(j) {
  const c = readCache(j.key);
  const same = c && c.text === j.text && c.voice === NIKOS.id && c.model === NIKOS_MODEL && c.seed === SEED && JSON.stringify(c.settings) === JSON.stringify(NIKOS_SETTINGS);
  return same && fs.existsSync(mp3File(j.key)) ? c : null;
}
async function render(j, mp3 = mp3File(j.key), json = cacheFile(j.key)) {
  const r = await api(`/v1/text-to-speech/${VOICE.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: j.text, model_id: MODEL, voice_settings: SETTINGS, seed: SEED })
  });
  fs.writeFileSync(mp3, Buffer.from(r.audio_base64, 'base64'));
  const c = { text: j.text, voice: VOICE.id, model: MODEL, settings: SETTINGS, seed: SEED, made: new Date().toISOString(), alignment: r.alignment };
  fs.writeFileSync(json, JSON.stringify(c));
  return c;
}
async function nikosRender(j) {
  const res = await call(`/v1/text-to-speech/${NIKOS.id}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: j.text, model_id: NIKOS_MODEL, voice_settings: NIKOS_SETTINGS, seed: SEED })
  });
  fs.writeFileSync(mp3File(j.key), Buffer.from(await res.arrayBuffer()));
  const c = { text: j.text, voice: NIKOS.id, model: NIKOS_MODEL, settings: NIKOS_SETTINGS, seed: SEED, made: new Date().toISOString() };
  fs.writeFileSync(cacheFile(j.key), JSON.stringify(c));
  return c;
}
/* Start time of each word on screen: the start of the first spoken word that says it */
function timing(j, c, file = mp3File(j.key)) {
  const ch = c.alignment.characters, st = c.alignment.character_start_times_seconds, en = c.alignment.character_end_times_seconds;
  const starts = [];
  ch.forEach((x, i) => { if (x.trim() && (i === 0 || !ch[i - 1].trim())) starts.push(st[i]); });
  const counts = j.phrases.map(p => p.split(' ').length), total = counts.reduce((a, b) => a + b, 0);
  if (starts.length !== total) throw new Error(`${j.key}: ${starts.length} timed words, ${total} spoken`);
  let w = 0;
  const at = counts.map(n => { const t = starts[w]; w += n; return +t.toFixed(3); });
  const end = Math.max(...en);
  const audio = fs.statSync(file).size * 8 / 128000;   // CBR 128 kbps
  return { at, end: +end.toFixed(3), dur: +Math.min(audio, end + 0.3).toFixed(3) };
}
/* The patient's timing, from speech to text: when his first and last words or sounds start and end, when each word
   on screen is said (words in order; a sound in brackets takes the time of the sound heard, if any), and where
   his sounds are (the page levels his voice on his words, so a cough's peak does not make the answer quieter) */
function nikosTiming(j, c) {
  const ws = c.heard.words, W = ws.filter(w => w.k === 'word'), E = ws.filter(w => w.k !== 'word');
  if (!ws.length) throw new Error(`${j.key}: speech to text heard nothing`);
  let wi = 0, ei = 0;
  const at = j.shown.split(' ').map(t => (/^\[.*\]$/.test(t) ? E[ei++] : W[wi++]) || null).map(w => w && w.s);
  for (let i = 0; i < at.length; i++) at[i] = Math.max(at[i] ?? 0, i ? at[i - 1] : ws[0].s);
  return { at: at.map(t => +t.toFixed(3)), start: +ws[0].s.toFixed(3), end: +ws[ws.length - 1].e.toFixed(3),
    sounds: E.map(w => [+w.s.toFixed(3), +w.e.toFixed(3)]), dur: +(fs.statSync(mp3File(j.key)).size * 8 / 128000).toFixed(3) };
}

/* Speech-to-text check: every word of the script heard */
const normWords = t => t.toLowerCase().replace(/₂/g, '2').replace(GIANNIS_HEARD, 'giannis').replace(/%/g, ' percent').replace(/[’']/g, '')
  .replace(/\bco2\b|\bc\.? ?o\.? ?(2|two)\b|carbon dioxide/g, ' c o two ')                                       // Day 128: CO2 however it is written
  .replace(/\b(\d+)\.(\d+)\b/g, (m, a, b) => num(+a) + ' point ' + [...b].map(d => ONES[+d]).join(' '))         // 0.3 -> zero point three
  .replace(/\b(\d{1,2}):(\d\d)\b/g, (m, h, mi) => clockWords(+h, +mi)).replace(/\b([a-z])(\d)\b/g, (m, l, d) => l + ' ' + num(+d))
  .replace(/\b\d+\b/g, d => num(+d)).replace(/-/g, ' ').replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
const noTags = t => t.replace(/\[[^\]]*\]/g, ' ');
function wordDiff(a, b) {
  const D = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) D[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return D[a.length][b.length];
}
async function transcribe(key, file = mp3File(key)) {
  const fd = new FormData();
  fd.append('model_id', 'scribe_v2');
  fd.append('language_code', 'en');
  fd.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/mpeg' }), key + '.mp3');
  return (await api('/v1/speech-to-text', { method: 'POST', body: fd })).text;
}
/* Speech to text with sounds ([coughs]) and the time of each word and sound */
async function hear(key) {
  const fd = new FormData();
  fd.append('model_id', 'scribe_v2');
  fd.append('language_code', 'en');
  fd.append('tag_audio_events', 'true');
  fd.append('timestamps_granularity', 'word');
  fd.append('file', new Blob([fs.readFileSync(mp3File(key))], { type: 'audio/mpeg' }), key + '.mp3');
  const r = await api('/v1/speech-to-text', { method: 'POST', body: fd });
  return { text: r.text, words: (r.words || []).filter(w => w.type !== 'spacing').map(w => ({ t: w.text, s: w.start, e: w.end, k: w.type === 'word' ? 'word' : 'sound' })) };
}
/* The patient: every word heard, and every sound in his answer heard as a sound */
function nikosProblems(j, heard) {
  const out = [], n = wordDiff(normWords(noTags(j.shown)), normWords(noTags(heard.text)));
  if (n) out.push(`${n} word(s) differ`);
  const sounds = heard.words.filter(w => w.k === 'sound').map(w => w.t);
  for (const s of j.sounds) if (!sounds.some(x => HEARD[s].test(x))) out.push(`no ${s} heard`);
  return out;
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]; await fn(x); } }));
}
/* --audition: Giannis's takes once per spelling, for Alex to pick by ear (nothing in the app changes) */
async function audition(all) {
  const list = process.argv[process.argv.indexOf('--audition') + 1];
  if (!list || list.startsWith('--')) throw new Error('--audition needs the spellings, e.g. --audition Giannis,Yannis');
  const dir = path.join(ROOT, 'design', 'voice-auditions', 'giannis');
  fs.mkdirSync(dir, { recursive: true });
  const lines = all.filter(j => j.key.endsWith('-giannis')), takes = [];
  list.split(',').forEach((say, i) => lines.forEach(j => {
    const phrases = j.shown.split(' ').map(w => spokenWord(w, { Giannis: say }));
    takes.push({ key: `${j.key}-${i + 1}-${say.replace(/[^A-Za-z]/g, '').toLowerCase() || 'greek'}`, say, shown: j.shown, phrases, text: phrases.join(' ') });
  }));
  await pool(takes, 3, async t => {
    const c = await render(t, path.join(dir, t.key + '.mp3'), path.join(dir, t.key + '.json'));
    const heard = await transcribe(t.key, path.join(dir, t.key + '.mp3'));
    const tm = timing(t, c, path.join(dir, t.key + '.mp3'));
    Object.assign(c, { say: t.say, shown: t.shown, heard, dur: tm.dur, wordStarts: tm.at });
    fs.writeFileSync(path.join(dir, t.key + '.json'), JSON.stringify(c));
    t.out = `${t.key.padEnd(24)} ${tm.dur.toFixed(2)} s, next word at ${tm.at[1].toFixed(2)} s, heard: ${heard}`;
  });
  takes.forEach(t => console.log(t.out));
}

/* Another scenario's voices (Day 128): Argo's lines (with their Giannis takes) and the patient's answers in one script,
   voice/en/<scenario>-en.js, which the page loads when a visitor picks it; its own manifest next to it (not published) */
function writeScenario(all, nik, today, made, chars) {
  const argo = { voice: VOICE.name, voiceId: VOICE.id, model: MODEL, made: today, say: SAY, lines: {} };
  const patient = { voice: NIKOS.name, voiceId: NIKOS.id, model: NIKOS_MODEL, made: today, lines: {} };
  const manifest = {};
  for (const j of all) {
    const c = cached(j), t = timing(j, c);
    argo.lines[j.key] = { text: j.shown, dur: t.dur, at: t.at, mp3: fs.readFileSync(mp3File(j.key)).toString('base64') };
    manifest[j.key] = { shown: j.shown, spoken: j.text, dur: t.dur, speechEnds: t.end, wordStarts: t.at };
  }
  for (const j of nik) {
    const c = nikosCached(j), t = nikosTiming(j, c);
    patient.lines[j.key] = { answer: j.answer, tone: j.tone, text: j.shown, dur: t.dur, start: t.start, end: t.end, at: t.at, sounds: t.sounds, mp3: fs.readFileSync(mp3File(j.key)).toString('base64') };
    manifest[j.key] = { shown: j.shown, spoken: j.text, dur: t.dur, speechStarts: t.start, speechEnds: t.end, wordStarts: t.at, heard: c.heard.text };
  }
  const file = `${SCN}-en.js`;
  fs.writeFileSync(path.join(OUT, file),
    `/* The voices of ${SCX.name.replace('DAY', 'Day ')} (docs/05, decision 38), English: Argo, ${VOICE.name} (ElevenLabs voice library), ${MODEL},\n` +
    `   the lines that name the patient also said to Giannis (decision 34); the patient (Alex on screen), ${NIKOS.name}, ${NIKOS_MODEL}.\n` +
    `   Same voices, settings and seed as Day 143 (decisions 24 and 25). The page loads this the first time a visitor picks the scenario.\n` +
    `   Made by tools/voice/make-voice.js --scenario ${SCN} from ${SCX.file} on ${today}. Do not edit: run the script again. */\n` +
    `(window.SCENARIO_VOICES = window.SCENARIO_VOICES || {})[${JSON.stringify(SCN)}] = ${JSON.stringify({ argo, patient })};\n`);
  fs.writeFileSync(path.join(OUT, `manifest-${SCN}.json`), JSON.stringify(manifest, null, 1));
  console.log(`${all.length} files for Argo and ${nik.length} for the patient (${made} new, ${chars} characters), ${file} ${(fs.statSync(path.join(OUT, file)).size / 1048576).toFixed(1)} MB`);
}

(async () => {
  const SC = loadScript(), all = jobs(SC), nik = nikosJobs(SC);
  if (args.has('--dry')) {
    all.forEach(j => console.log(j.key.padEnd(10), j.text)); console.log(all.length, 'files for Argo');
    nik.forEach(j => console.log(j.key.padEnd(10), j.text)); console.log(nik.length, 'files for the patient');
    return;
  }
  if (args.has('--audition')) return audition(all);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(CACHE, { recursive: true });
  let made = 0, chars = 0;
  await pool(all, 3, async j => {
    if (cached(j)) return;
    await render(j); made++; chars += j.text.length;
    console.log('made', j.key);
  });
  await pool(nik, 3, async j => {
    let c = nikosCached(j);
    if (!c) { c = await nikosRender(j); made++; chars += j.text.length; console.log('made', j.key); }
    if (!c.heard) { c.heard = await hear(j.key); fs.writeFileSync(cacheFile(j.key), JSON.stringify(c)); }
  });
  const today = new Date().toISOString().slice(0, 10);
  if (SCN !== 'day143') writeScenario(all, nik, today, made, chars);
  else {
  const bundle = { voice: VOICE.name, voiceId: VOICE.id, model: MODEL, made: today, lines: {} };
  const gbundle = { voice: VOICE.name, voiceId: VOICE.id, model: MODEL, made: today, say: SAY, lines: {} };   // Giannis's takes
  const manifest = {};
  for (const j of all) {
    const c = cached(j), t = timing(j, c);
    (j.key.endsWith('-giannis') ? gbundle : bundle).lines[j.key] = { text: j.shown, dur: t.dur, at: t.at, mp3: fs.readFileSync(mp3File(j.key)).toString('base64') };
    manifest[j.key] = { shown: j.shown, spoken: j.text, dur: t.dur, speechEnds: t.end, wordStarts: t.at };
  }
  fs.writeFileSync(path.join(OUT, 'voice-en.js'),
    `/* Argo's voice, English: ${VOICE.name} (ElevenLabs voice library), ${MODEL}, docs/05 decision 24.\n` +
    `   Made by tools/voice/make-voice.js from day143.js on ${bundle.made}. Do not edit: run the script again. */\n` +
    `window.ARGO_VOICE = ${JSON.stringify(bundle)};\n`);
  // Giannis's takes in a script of their own, which the page loads only when the operator types G I A N N I S (decision 34)
  fs.writeFileSync(path.join(OUT, 'voice-en-giannis.js'),
    `/* Argo's voice, English, the lines that name the patient said to Giannis (docs/05 decision 34): ${VOICE.name}, ${MODEL},\n` +
    `   the same settings and seed as voice-en.js. The page loads this only when the operator types G I A N N I S.\n` +
    `   Made by tools/voice/make-voice.js from day143.js on ${gbundle.made}. Do not edit: run the script again. */\n` +
    `window.ARGO_VOICE_GIANNIS = ${JSON.stringify(gbundle)};\n`);
  const nbundle = { voice: NIKOS.name, voiceId: NIKOS.id, model: NIKOS_MODEL, made: today, lines: {} };
  for (const j of nik) {
    const c = nikosCached(j), t = nikosTiming(j, c);
    nbundle.lines[j.key] = { answer: j.answer, tone: j.tone, text: j.shown, dur: t.dur, start: t.start, end: t.end, at: t.at, sounds: t.sounds, mp3: fs.readFileSync(mp3File(j.key)).toString('base64') };
    manifest[j.key] = { shown: j.shown, spoken: j.text, dur: t.dur, speechStarts: t.start, speechEnds: t.end, wordStarts: t.at, heard: c.heard.text, ...(c.from ? { from: c.from } : {}) };
  }
  fs.writeFileSync(path.join(OUT, 'nikos-en.js'),
    `/* The patient's voice (Alex on screen) for scene 2, the self-playing Day 143, English: ${NIKOS.name} (ElevenLabs voice library), ${NIKOS_MODEL},\n` +
    `   docs/05 decisions 25 and 26. Made by tools/voice/make-voice.js from day143.js on ${nbundle.made}. Do not edit: run the script again. */\n` +
    `window.NIKOS_VOICE = ${JSON.stringify(nbundle)};\n`);
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  const mb = f => (fs.statSync(path.join(OUT, f)).size / 1048576).toFixed(1);
  console.log(`${all.length} files for Argo and ${nik.length} for the patient (${made} new, ${chars} characters), voice-en.js ${mb('voice-en.js')} MB, voice-en-giannis.js ${mb('voice-en-giannis.js')} MB, nikos-en.js ${mb('nikos-en.js')} MB`);
  }
  nik.forEach(j => { const t = nikosTiming(j, nikosCached(j)); console.log(`  ${j.key} ${t.dur.toFixed(2)} s, speech ${t.start.toFixed(2)} to ${t.end.toFixed(2)} s: ${j.text}`); });
  if (args.has('--check')) {
    const bad = [];
    await pool(all, 3, async j => {
      const heard = await transcribe(j.key), n = wordDiff(normWords(j.text), normWords(heard));
      if (n) bad.push(`${j.key}: ${n} word(s) differ. Heard: ${heard}`);
    });
    const heardN = {};
    await pool(nik, 3, async j => {
      const h = await hear(j.key), p = nikosProblems(j, h);
      heardN[j.key] = h.text;
      if (p.length) bad.push(`${j.key}: ${p.join(', ')}. Heard: ${h.text}`);
    });
    nik.forEach(j => console.log(`  heard ${j.key}: ${heardN[j.key]}`));
    const total = all.length + nik.length;
    console.log(bad.length ? 'Speech-to-text check, differences:\n  ' + bad.sort().join('\n  ') : `Speech-to-text check: all ${total} files word-perfect, and the patient's sounds heard`);
  }
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
