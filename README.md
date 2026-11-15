# Argo Simulator

**Live: [argo-simulator.com](https://argo-simulator.com)**

Argo is an onboard assistant for a Mars transit crew. It combines an astronaut's vitals with knowledge of the ship (map, crew positions, medical supplies) and talks the crew through an emergency in the minutes before Earth can answer.

The Argo Simulator is an open-source project that simulates realistic space scenarios and shows how Argo would act in them. Open the site, pick a scenario and watch it play.

**Scenarios**
- Day 143: a severe allergic reaction on the way to Mars
- Day 128: a CO2 pocket in a sleep station during the ship's night

The simulator is a scripted demo with simulated data, pre-written lines and AI-generated voices, and the site says so on screen.

Built by team **Argonauts** for NASA Space Apps Challenge 2026.

## What's in this repository

| Path | What it holds |
| --- | --- |
| `design/draft-v2/` | The simulator itself: plain HTML, CSS and JavaScript with no build step. `argo-screen-v2.html` is the page, `scenarios.js` the scenario list, `day143.js` and `day128.js` the scenario scripts, `world-day128.js` what the monitor shows for Day 128, `vitals.js` the vital signs, `sound.js` the sounds (all synthesized in the browser), `voice/en/` the voices, `fonts/` and `portraits/` the bundled fonts and crew portraits |
| `design/draft/` | The first screen draft, replaced by v2 |
| `design/voice-auditions/`, `design/portraits-first-cast/` | Voices and portraits tried before the final ones |
| `spec/` | Both scenarios as timelines with cues and sources, and the habitat as data and as a map |
| `docs/` | The concept, pitch plan, app spec, decisions log and research notes with every source |
| `tools/site/make-site.js` | Builds the folder deployed to Vercel (only the files the page needs) and refuses to finish if anything in it looks like an API key |
| `tools/voice/make-voice.js` | Generates the voice files with ElevenLabs and checks each one word for word with ElevenLabs speech to text (needs your own `ELEVENLABS_API_KEY`) |
| `tools/slides/export-slides.ps1` | Exports the pitch deck as the slide images the site shows on S |
| `CLAUDE.md` | The project brief Claude Code works from |

To build the site: `node tools/site/make-site.js` copies the page and what it needs into `../argo-online/`, the folder that is deployed (the deploy command is in the file).

## Credits and licenses

Space Apps asks every team to cite every non-NASA material and its license.

- **Fonts** bundled with the live screen (`design/draft-v2/fonts/`): Barlow and Barlow Semi Condensed (The Barlow Project Authors, https://github.com/jpt/barlow) and IBM Plex Mono (IBM Corp.), all under the SIL Open Font License 1.1. License texts are in that folder.
- **HELIOS**, another team's 2026 entry: read as a reference only, never built on. H.E.L.I.O.S by Zihaduzzamaan, Afrobad and the H.E.L.I.O.S Development Team (https://github.com/afrobad/HELIOS_NasaSpaceAppsChallenge2026, MIT). We studied its telemetry simulation and baseline detection; all code in this repo is our own unless marked (details in `docs/04-helios-reference.md`).
- **Sounds:** none copied. Every sound is synthesized in the browser (`design/draft-v2/sound.js`).
- **Argo's voice:** ElevenLabs text to speech (Eleven Multilingual v2), voice "Verity X - Calm British Narration" from the ElevenLabs Voice Library, generated with the team's ElevenLabs account (docs/05 decision 24; files in `design/draft-v2/voice/en/`, made by `tools/voice/make-voice.js`).
- **The patient's voice** in Day 143 (his answers as Alex, the patient on screen; not Alex's own voice): ElevenLabs text to speech (Eleven v4, with audio tags for his cough and breathing), voice "Alan James - Stoic, Grainy and Serious" from the ElevenLabs Voice Library, generated with the team's ElevenLabs account (docs/05 decisions 25 and 26; files `n1` to `n7` in `design/draft-v2/voice/en/`, made by `tools/voice/make-voice.js`). ElevenLabs speech to text (Scribe) checks every voice file against the script and times the patient's words on screen.
- **Crew portraits:** the team's own: AI-generated portraits of Alex, Maria, Stelios and Giannis, each made from that member's photo, cropped to the crew tiles with no NASA logo in frame (`design/draft-v2/portraits/`; docs/05 decision 14). No real astronaut's face appears anywhere. The first cast's illustrated portraits, no longer used, are in `design/portraits-first-cast/`.
- **Day 128, the second scenario (the CO2 pocket; docs/05, decisions 38 and 39):** the same voices as Day 143 (Argo: Verity X, Eleven Multilingual v2; the patient: Alan James, Eleven v4), generated with the team's ElevenLabs account and checked word for word with ElevenLabs speech to text (`design/draft-v2/voice/en/day128-en.js`, made by `tools/voice/make-voice.js --scenario day128`). Its facts and numbers come from NASA and public-health sources, all cited in `docs/06-research-notes.md` ("Day 128") and `spec/day128-timeline.json`: NASA/TP-2010-216126 (CO2 pockets in microgravity), NASA-STD-3001 Vol. 2 Rev F, the ISS crew quarters papers (Broyan et al., ICES 2008 and 2010), NASA's 2002 sleep-station ventilation analysis (Keener et al., ICES 2002), NASA's CO2 technical brief OCHMO-TB-004, the NASA BVAD, NASA's Personal CO2 Monitor on the ISS, the NIOSH Pocket Guide and 1976 criteria document, the US EPA's 2000 CO2 report, Law et al. 2014 (J Occup Environ Med), Berthon-Jones and Sullivan 1984, van der Schrier et al. 2022, and the Canadian Space Agency's page on sleeping in space. The habitat, the procedure ENV-04 and every reading are fiction (simulated data), labelled as such on the site.
