# Prompt for the next session (written Nov 8, after the second scenario went live)

Paste everything below the line into a new session.

---

Read CLAUDE.md, then in docs/05 decisions 30, 31, 32, 34, 37, 38 and 39 and the parking lot, then in design/v2-brief.md the sections "The hosted simulator", "The phone layout" and "Day 128, the CO2 pocket, and the scenario switch", then spec/day128-timeline.json, docs/06 ("Day 128"), and the app in design/draft-v2/ (app.js, day128.js, world-day128.js, scenarios.js, style.css).

Where things stand: the simulator at argo-simulator.com has two scenarios. Day 143 (the severe allergic reaction) is exactly as it was. Day 128 (the CO2 pocket in a sleep station) was built on Nov 8 while I finished the presentation: I asked Claude to pick the scenario and the switch design on its own, so I have not chosen between alternatives. The strip's scenario field opens the monitor's scenario list; picking one loads that scenario's night. Everything is deployed and tested (locally, over HTTP and on the live site, laptop and phone).

Today:
- I tried Day 128 and the switch on my laptop and phone; my notes are below. Fix what I list, and tell me plainly if a note would change Day 143.
- [my notes here]

Rules:
- Day 143 stays exactly as it is: its run, the presentation mode (L I V E, then 1), the slides (S, F), 0 twice back to the visitor version, and the phone layout. Check it against the app as it is now (the harness in the Nov 8 second-scenario session's scratchpad has ab-day143.js, desk-ab-stage.js and phone-ab.js for that; the path is in the brief).
- Every number and name Argo says matches the screen at that moment; cite every source in docs/06 and the README.
- Never put the ElevenLabs key or anything secret where it could be published, and keep reference/ out of anything we publish.
- Test one harness run at a time, in the foreground. Deploy to the same Vercel project with the command in tools/site/make-site.js, and test the live site after deploying.
- Record decisions in docs/05 and update the brief and CLAUDE.md.

At the end, show me: the live link, screenshots of what changed on a laptop and a phone, and the test results in plain words.
