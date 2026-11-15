/* The scenarios a visitor can pick in the simulator strip under the monitor (docs/05, decision 30).
   Only self-playing scripts belong here: the crew answers by itself in recorded voices, Argo carries on when they
   finish, and nobody presses anything (like scene 2, decision 26).

   To add a scenario (as Day 128 was, decision 38): write its script next to day143.js (same shape, with self: true and
   its own voices and replyKey, like day128.js), its world (what the monitor shows for it, like world-day128.js), make
   its voices with tools/voice/make-voice.js --scenario <id> (one script, voice/en/<id>-en.js, loaded when it is picked),
   load the script and the world in argo-screen-v2.html before this file, add them to tools/site/make-site.js, and add
   one entry below. The strip shows the picked one in its field and lists them all, in this order (decision 39).

     code      the big name on its chip
     event     what happens, in a few words
     where     where and when, one short line
     brief     one or two sentences that set the scene (shown on a phone held upright, and as the chip's tooltip)
     length    how long it takes, as people read it
     seconds   from Run until the scenario is over (the progress line fills over this; Day 143 ends when the
               alarm steps down to the advisory, about 2:50 after Run)
     startAt   the ship time the run starts from, so every time on screen and in Argo's lines follows the script
     calm      seconds of calm night before the script starts
     world     what the monitor shows for it when it is not Day 143 (world-day128.js: its night, panels, map, vitals and
               calm-down); the strip's scenario list loads it onto the monitor (docs/05, decisions 38 and 39)
   The strip shows the scenario on the monitor in one field; with more than one, a click on the field opens the list. */
const SCENARIOS = [
  { id: 'day143',
    script: DAY143_SELF,
    code: 'DAY 143',
    event: 'Severe allergic reaction',
    where: 'Mars transit · Earth 12:40 away',
    brief: 'The middle of the ship’s night. Alex is awake in the Lab, the rest of the crew is asleep, and Earth is 12:40 away.',
    length: 'about 3 min',
    seconds: 170,
    startAt: '03:32:40',
    calm: 4 },
  { id: 'day128',
    script: DAY128,
    world: WORLD128,
    code: 'DAY 128',
    event: 'CO2 pocket in a sleep station',
    where: 'Mars transit · Earth 10:40 away',
    brief: 'The middle of the ship’s night. The whole crew is asleep. The fan in Alex’s sleep station has stopped, and Earth is 10:40 away.',
    length: 'about 2 min',
    seconds: 130,
    startAt: '02:00:40',
    calm: 4 }
];

/* The presentation mode and scene 1, the live Day 143 (decisions 15 and 30; Alex, Nov 8), for the team on stage:
   typing the letters L I V E (any keyboard layout) removes the strip completely and starts the calm screen again from
   03:30:40, as the old stage page did; then 1 starts this script, where Alex answers live and the operator presses
   when he has finished (Argo speaks in its voice; no recorded patient). Typing the word again brings the strip back. */
const LIVE = { script: DAY143, word: ['KeyL', 'KeyI', 'KeyV', 'KeyE'] };
