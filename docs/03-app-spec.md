# 03. App spec

The app exists to produce one thing: the screen the jury watches during the 1:40 sketch, recorded as a video, with a live actor answering it on stage. Build only what that screen and the "How it works" slides need.

> **Nov 7, decided (docs/05 decision 4):** the app runs live instead of being recorded. A second page, the trigger page, fires the scenario's events (sensor changes, the crew's answers) and the main screen responds as it would in real time. Triggers are fired unseen with keybinds on the laptop (decision 15, Nov 7), so the trigger page became keys on the main screen; built in the live draft (`design/v2-brief.md`, "Run from the keyboard"). So the scenario engine advances on triggers instead of fixed gaps, "recording mode" becomes a backup recording of a live run, and any time Argo says out loud comes from the running ship clock. Alex's v2 review also adds two screen requirements: it must feel alive, and key events get large on-screen announcements (`design/v2-brief.md`, last section).

## Phase 1 (must have): functional app, one hardcoded scenario

A real, runnable app. The Day 143 scenario is hardcoded: what happens and when is scripted in `spec/day143-timeline.json`.

### Screen (one 16:9 screen, readable on a projector)

Principle (docs/01, #9; decision 13): the screen starts calm and elements appear when the scenario needs them. Give every element below a calm state and an active state; the cues in the timeline switch between them.

1. **Habitat map** (center, the hero element). Layout from `spec/habitat.json` and `spec/habitat-map.svg`: 5 modules, 4 hatches, 4 crew dots, 2 med kits, 2 routes. States: kit greyed out, kit highlighted, route lit, crew woken, crew moving along a route, crew arrived.
2. **Vitals panel** for Alex (the patient): heart rate and oxygen (SpO2) as live-looking curves drawn against his personal baseline band. Amber when outside the band. A trend projection for oxygen ("below 90% in 4:10").
3. **Clocks:** "Earth sees this in 12:40" and "Earliest reply in 25:20", counting down from Argo's first line. A third red clock appears at step a4: "Oxygen below 90%: 4:10".
4. **Argo panel:** caption of the current Argo line, plus a "listening" indicator during every gap. The listening indicator is also the live actor's cue to speak.
5. **Procedure card:** "Severe allergic reaction", opens on step 1 with the four matched signals listed beside it. Content in `spec/day143-timeline.json` under `procedure` (illustrative, with its disclaimer).
6. **Source highlighting:** when an Argo line starts, the things listed in its `sources` light up (vitals, clocks, procedure card, map items).
7. **Report to Earth:** at a8 a report leaves the ship (simple travel animation), then a closing caption and an Earth-side view showing the report as received: vitals, timeline, dose and time, the food pack opened at 03:20.

### Scenario engine

- Runs the steps in `spec/day143-timeline.json` in order: play the Argo line (pre-generated TTS audio + caption), fire its cues, then wait `gap_s` for the actor.
- Gap lengths must be editable in a config file without code changes. They get set after rehearsal.
- One start control (key or button) runs the whole scene end to end. A reset control returns to the initial state.
- A clean "recording mode": full screen, no dev UI, no cursor.
- Scene 2 (decision 26, built Nov 7, night): key 2 runs the same script by itself, the patient (Alex) answering in his recorded voice (Alan James, Eleven v4, decision 25) with his words shown in the voice log. It is the version judges try online: `index.html` opens it behind a start card that says it is a scripted demo with simulated data and AI voices. Details in `design/v2-brief.md`, "Scene 2".

### Audio

- Argo's 8 lines pre-generated with text to speech in English, one set only: the talk is in Greek but the sketch is in English (docs/05 decision 20). Done Nov 7 (decision 24): voice Verity X, 45 files with the line 4 and "Logged at" variants, the word sweep following the audio. Details in `design/v2-brief.md`, "Voice".
- The HELIOS repo shows a working edge-tts setup worth reading as reference (see docs/04).

### Vitals data

- Simulated, and labelled as simulated. Curves must satisfy the `consistency_constraints` in the timeline JSON (35 percent heart rate rise at a1, oxygen crossing 90 percent in about 4:10, etc.).
- Optional and cheap: build the baseline from NASA OSDR data (OSD-569, OSD-575), the way HELIOS did, so the "baseline" story is grounded in real NASA data. Credit NASA OSDR.
- Optional and cheap: a simple z-score check on the simulated stream that actually triggers Argo's first line, so the first alert is not just a timestamp. Only if it does not threaten the deadline.

### Visual identity

- Our own look. Do not copy HELIOS's look, fonts or assets (licensing reasons in docs/04).
- Use openly licensed fonts only (for example Google Fonts under OFL). Settled: Barlow, Barlow Semi Condensed and IBM Plex Mono, bundled with the page (docs/05 decision 18).
- Settled Nov 7 (docs/05 decisions 13 and 23): the live screen's look (`design/v2-brief.md`): a real operations display where the map is one panel among others, not the hero.

### Done when

- One start runs the whole Day 143 scene end to end, about 1:40, without errors.
- Every cue in the timeline happens at the right step, and every Argo line lights its sources.
- Gap lengths come from a config file.
- A clean 1080p screen recording exists, plus a backup copy.
- No HELIOS assets are in our repo; any copied code (should be none, or tiny) keeps its MIT notice.

### Stack (settled Nov 7, docs/05 decision 21)

The live draft is the app: plain HTML and JavaScript in `design/draft-v2/`, opened from a file in Chrome, everything client-side, with no server, build step or internet. The scenario, vitals simulation, sound and Argo's voice all run in the browser. The earlier proposal, Vite + React + TypeScript, was dropped: the draft already runs and passes its tests, and a rebuild would put that at risk before the event.

## Phase 2 (only if phase 1 is recorded and time is left)

Replace scripted Argo lines with a real LLM, without breaking the scripted path used for the recording.

- Input to the model: current vitals summary, `spec/habitat.json` state, the procedure text. The model may only answer from that material, must name its sources, and must not diagnose.
- Prefer a local model (for example through Ollama) so "onboard, offline" is true; fall back to an API if local is too slow.
- Test question: "Why did you wake Maria and not Stelios?" The right answer comes from the map: Maria is the crew medical officer and one hatch away; Stelios is two hatches away in Hab B.
- The scripted recording stays the default for the presentation. Phase 2 is a bonus to mention or show, never a risk to the main demo.

## Not in scope (see the parking lot in docs/05)

More scenarios, 3D views, mobile layout, real sensor input, multi-crew dashboards, accounts, deployment.
