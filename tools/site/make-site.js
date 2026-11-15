/* Builds the folder for the hosted simulator (docs/05, decisions 26, 30 and 38): only the files the page needs, copied
   from design/draft-v2/ into argo-online/, next to argo-plan/. The page itself (argo-screen-v2.html) becomes
   index.html, so the site's address opens the simulator directly. No reference screenshots, no single MP3s (the
   voices travel inside voice-en.js, nikos-en.js and voice-en-giannis.js, the last loaded only when the operator types
   G I A N N I S, decision 34), no manifest, nothing from tools/, reference/ or docs/.

   It refuses to finish if anything in the folder looks like an API key (the ElevenLabs key lives only in
   ~/.claude.json or an environment variable, never in the app folder), because the folder is published as it is.

   To publish on Vercel (from argo-plan; Vercel CLI pinned to 65.2.0; logged in once with npx --yes vercel@65.2.0 login):
     node tools/site/make-site.js
     npx --yes vercel@65.2.0 deploy ../argo-online --prod --yes --project argos-simulator --create-if-missing
   The first deploy (Nov 8) created the project; the command names it, so every later deploy updates the same site:
   https://argos-simulator.vercel.app and the domains attached to the project, argo-simulator.com (the main address,
   docs/05, decision 33) and argos-simulator.com. (If the CLI ever leaves a link folder, argo-online/.vercel/, a rebuild keeps it.)

   Usage (from argo-plan): node tools/site/make-site.js
   It only ever clears a folder it made itself (the .argo-site marker inside). */
const fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.join(ROOT, 'design', 'draft-v2');
const OUT = path.resolve(ROOT, '..', 'argo-online');
const MARK = '.argo-site';
const KEEP = ['.vercel'];   // Vercel's link to the project: kept, so the address stays the same
const FILES = [['argo-screen-v2.html', 'index.html'], 'style.css', 'app.js', 'day143.js', 'scenarios.js', 'vitals.js', 'sound.js', 'announce.js',
  'slides.js',   // the pitch slides on S (decision 36)
  'day128.js', 'world-day128.js',   // Day 128, the CO2 pocket (decision 38): its script and what the monitor shows for it
  'voice/en/voice-en.js', 'voice/en/nikos-en.js', 'voice/en/voice-en-giannis.js',   // Giannis's take of line 1, loaded on request (decision 34)
  'voice/en/day128-en.js'];   // Day 128's voices, loaded the first time a visitor picks it
const DIRS = ['fonts', 'portraits', 'slides'];   // every file in them (the fonts' license texts too; the slide images, loaded on S)

if (fs.existsSync(OUT)) {
  if (!fs.existsSync(path.join(OUT, MARK))) { console.error(`${OUT} exists but was not made by this script: not touching it.`); process.exit(1); }
  fs.readdirSync(OUT).filter(f => !KEEP.includes(f)).forEach(f => fs.rmSync(path.join(OUT, f), { recursive: true }));
}
const copied = [];
const copy = item => {
  const [rel, as] = Array.isArray(item) ? item : [item, item];
  const from = path.join(APP, rel), to = path.join(OUT, as);
  if (!fs.existsSync(from)) { console.error('Missing in the app folder: ' + rel); process.exit(1); }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied.push([as, fs.statSync(to).size]);
};
FILES.forEach(copy);
DIRS.forEach(d => fs.readdirSync(path.join(APP, d)).sort().forEach(f => copy(d + '/' + f)));
fs.writeFileSync(path.join(OUT, MARK), 'Made by argo-plan/tools/site/make-site.js. Run it again to rebuild this folder.\n');
fs.writeFileSync(path.join(OUT, '.vercelignore'), MARK + '\n');   // the marker stays local

/* Nothing secret may be published: ElevenLabs keys start with sk_, and the header that carries one is xi-api-key */
const SECRET = /\bsk_[A-Za-z0-9]{24,}|xi-api-key|ELEVENLABS_API_KEY\s*[=:]/;
const leaks = copied.filter(([f]) => /\.(html|js|css|txt|json)$/.test(f) && SECRET.test(fs.readFileSync(path.join(OUT, f), 'utf8')));
if (leaks.length) { console.error('Something that looks like an API key is in: ' + leaks.map(x => x[0]).join(', ') + '. Not publishable.'); process.exit(1); }

const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`${copied.length} files, ${mb(copied.reduce((a, x) => a + x[1], 0))}, in ${OUT} (no key found)`);
copied.filter(([, n]) => n > 100000).forEach(([f, n]) => console.log(`  ${f} ${mb(n)}`));
console.log('Publish (from argo-plan, once logged in): npx --yes vercel@65.2.0 deploy ../argo-online --prod --yes --project argos-simulator --create-if-missing');
