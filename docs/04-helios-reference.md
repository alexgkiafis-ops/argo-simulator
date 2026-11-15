# 04. HELIOS: reference only, with credit

## Decision

We use HELIOS as a **reference**: we read it to avoid re-solving problems it already solved, and we credit it. We do **not** build our app on top of it.

Why: it is another team's entry to this same 2026 challenge (its LICENSE says "NASA International Space Apps Challenge 2026"; last commit Oct 10, 2026). Legally it is MIT, but "we built on another team's project from this competition" reads badly to judges and hurts Creativity. Ideas and patterns are fine to take, with credit.

Repo (original): https://github.com/afrobad/HELIOS_NasaSpaceAppsChallenge2026
(github.com/haXorFalcon/HELIOS_NasaSpaceAppsChallenge2026 is a fork of it.)

## What it is, in one sentence

An open-source, real-time health monitoring dashboard for a simulated four-person deep space crew: it compares every reading to each astronaut's own normal and raises an alert when something drifts.

Full name: Health Evaluation Logistic Intelligent Onboard System (H.E.L.I.O.S).

## How it works, in 4 stages

1. **Data.** A ready file (`data/astronaut_telemetry_stream.csv`, about 18 minutes per astronaut) of simulated vitals built around NASA OSDR data: blood panels from Inspiration4 (OSD-569) and the SOMA atlas (OSD-575). Replayed as a live stream at 10 readings per second: heart rate, HRV, SpO2, core temperature, sleep score, cabin CO2, lab values, radiation.
2. **Analysis.** Each reading is compared to that astronaut's personal baseline (z-scores), with workout gating so exercise does not look like a crisis. It computes risk indices for early sepsis (EPI), arrhythmia (ARF), thrombosis (TRM) and radiation sickness (RSI).
3. **Decision.** Alert levels NOMINAL, INFO, WARNING, CRITICAL, with a reason and a confidence percentage. A voice assistant, JARVIS, speaks advisories using a small local LLM (Ollama, custom model built on llama3.2:1b, fallback biomistral:7b, optional Gemini). Without an LLM it falls back to canned lines. Voice is Microsoft Edge TTS (needs internet).
4. **Screens.** React 19 + TypeScript + Vite + three.js. Routes: `/` crew HUD, `/telemetry/<name>` per astronaut, `/mcc` Earth Mission Control, `/scanner` 3D body scanner. Buttons trigger 18 ready scenarios (CO2 scrubber failure, decompression hypoxia, solar storm, ammonia leak, arrhythmia, sepsis and more) and a Mars delay toggle (22 minutes).

Backend: Python FastAPI + WebSocket, SQLite for alerts.

## What we verified (Nov 6, in a Linux container)

- Backend starts; 90 of 91 tests pass (the one failure only because the frontend had not been built yet).
- Frontend builds.
- Triggering a scenario produced a CRITICAL alert with a reason ("CO2 scrubber breach with collective crew hypoxia", 99% confidence).
- Without Ollama, the voice query fell back to a canned line and answered about the wrong astronaut (asked about the pilot, got the commander).
- Not checked: behavior with Ollama installed.

## What we saw in the UI (Nov 6 evening, local run on Alex's laptop)

Their online copy on Render is suspended, so running it locally is the only way to see it.

- **Dashboard** (`/`): one row per astronaut with photo, 4 vital tiles and a live ECG + SpO2 waveform; an "AI Surgeon" caption bar types advice at the bottom.
- **Health-Telemetry** (`/telemetry/haley`): alert card with confidence, organ systems, list of worn sensors.
- **Earth MCC** (`/mcc`): delay presets up to 22 min at Mars, Earth vs spacecraft clocks, incident card comparing each value to its baseline.
- **Scanner** (`/scanner`): rotating 3D wireframe body. **Suit HUD** (`/suit-hud`): Mars helmet view.
- **Scenarios:** a modal with 18 (5 cabin-wide, 13 per astronaut), each with a NASA citation. Scenario 12 (cytokine storm) on Haley turned her row red and CRITICAL.

Ideas worth taking (credit them): the baseline printed next to the value ("126 bpm, resting baseline 78"), a NASA source on every scenario, Earth time and ship time side by side, and scenario trigger buttons that drive the live dashboard (our trigger page follows the same idea, simpler; Alex, Nov 7).

Weak spots we saw, each one answered by our design:

- Numbers disagree between screens: Haley's heart rate was +103% on her telemetry page and +61.5% on Earth MCC. (Ours: every number comes from one source, see `consistency_constraints`.)
- Advice did not match the emergency: the scenario says "requires emergency steroid medication"; the AI Surgeon said rest and IV fluids, then "levels are beginning to decline" while the screen still showed critical. (Ours: Argo reads from a written procedure.)
- Earth MCC was set to a 22-minute delay, yet it showed the emergency within 2 minutes. (Ours: the delay is the plot.)
- Dense small text; would not read on a projector. (Ours: fewer, bigger elements, map in the center.)

## What it does not have (our space)

- No ship: no map, no crew positions, no med supply locations or inventory. We searched the code; none of it exists.
- No written procedures behind its advice.
- Its risk indices are not validated; its own README says so.

## How to run it locally (Claude Code: clone into `./reference/helios`)

```
git clone https://github.com/afrobad/HELIOS_NasaSpaceAppsChallenge2026 reference/helios
cd reference/helios
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --port 8000
# second terminal
cd frontend && npm install && npm run dev
```

On Alex's Windows laptop `python` is not on PATH; use the `py` launcher and a venv (already created in `reference/helios/.venv`):

```
cd reference/helios
py -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements.txt
.venv\Scripts\python -m uvicorn backend.app.main:app --port 8000
# second terminal
cd reference/helios/frontend && npm install && npm run dev
```

Open http://localhost:3000 (Vite proxies `/api` and `/ws` to port 8000). API docs at http://localhost:8000/docs.

## Files worth reading as reference

- **Vitals simulation:** `scripts/generate_telemetry_stream.py` and `data/nasa_astronaut_baselines.json`. How they turned NASA data into a 10 Hz stream. Most useful for making realistic anaphylaxis curves.
- **Scenarios:** `backend/app/streaming/telemetry_feeder.py` (`SCENARIO_OFFSETS` and the per-scenario branches). How a scenario changes vitals over time.
- **Detection (for the teammates' analysis):** `backend/app/core/zscore_evaluator.py`, `baselines.py`, `activity_gating.py` (about 50 lines each), and `backend/app/ai/decision_engine.py` (evidence weights and a confidence formula across signals).
- **NASA data download:** `scripts/download_nasa_osdr.py` and `data/nasa_osdr/*.csv`.
- **Voice:** `backend/app/ai/voice_engine.py` and `scripts/generate_voiceover.py` (edge-tts usage, voices, rate, pitch).
- **Front end:** `frontend/src/components/TelemetryCanvas.tsx` and `EcgRowCanvas.tsx` (drawing live curves), `JarvisConsole.tsx` (assistant panel).

Their front end is huge (over 17,000 lines of components; `MissionControlView.tsx` alone is over 6,000), so point at specific files, never "read the whole repo".

They also keep their own pitch scripts in `Video_Script/`. Fine to glance at to make ours different; never copy them.

## Do not take

- **Any asset.** MIT covers their code, not necessarily their fonts, 3D models, photos and videos. Example: the Aeronaut font in `frontend/public/Aeronaut_font/` is a trial font licensed "Personal Use Only". The Space Apps terms require non-NASA materials to be freely available or open source. So none of their fonts, models (`*.glb`, `*.obj`), crew photos or videos go into our repo.
- **Their look.** Take techniques, not appearance. If our screen looks like theirs, it reads as a copy.

## Credit

- Reading and rewriting: one line in the submission references and in our README.
- Copying any code, even a small piece: also keep their MIT copyright notice in that file.

Ready line for references:

> Reference: H.E.L.I.O.S by Zihaduzzamaan, Afrobad and the H.E.L.I.O.S Development Team (github.com/afrobad/HELIOS_NasaSpaceAppsChallenge2026, MIT). We studied its telemetry simulation and baseline detection; all code in this repo is our own unless marked.
