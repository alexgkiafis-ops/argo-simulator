/* Day 143 as data: the situation the screen runs, live on stage or self-playing in the simulator.
   Lines, gap lengths and order mirror spec/day143-timeline.json. Argo's lines are pre-written (docs/05,
   decision 4): the operator's key (or, self-playing, the patient finishing) only decides when Argo answers,
   never what it says.
   The patient is Alex, the flight engineer, alone in the Lab; Argo wakes Maria, the crew medical officer
   (docs/05, decision 14: the crew carries the team's own names). Two scenes run it (docs/05, decision 26):
   scene 1 (the live Day 143, started with the operator's word, scenarios.js), where Alex plays the patient live and
   the operator presses when he has finished, and scene 2 (DAY143_SELF at the end, the one visitors run from the
   simulator strip, scenarios.js), where the patient answers by himself in his
   recorded voice and nobody presses anything.

   The engine in app.js runs any script of this shape. Cue and source names refer to handlers in app.js
   (CUES, SOURCES).

   opening:  automatic moments after the start, in seconds (the alarm, contacting Earth)
   lineAt:   seconds after the start when Argo's first line starts
   lines:    Argo's lines in order. Each one:
     text / cited   what Argo says; <c>n</c> marks the source number n shown in the transcript.
                    {dose} is replaced by the ship clock's hh:mm at the dose (times come from the clock);
                    {earthIn} and {replyIn} by the minutes the two Earth clocks show as the line starts
                    (nearest minute; "12 minutes" and "25" at the script's pace; Alex, Nov 7).
     press          cues fired the moment the operator presses (Alex has just finished his answer)
     lead           an announcement that plays before the line; the line starts as it lands
     cues           cues fired as the line starts
     sources        what lights up while Argo says it: [target, number]
     gap            Alex's answer after this line: its usual length in seconds (#play waits this long)
     hold           true: the numbers Argo says next must still be on screen however long Alex takes,
                    so the vitals slow down if he takes much longer than the gap (vitals.js, dz)
     listen         cues fired as Argo starts listening
     answer         what Alex is expected to say (for the cue list; scene 1 never shows it). Scene 2 makes
                    the patient's recorded answer from it (tools/voice/make-voice.js): a stage direction that makes a
                    sound becomes an audio tag ((coughs) is [coughs], (breathing easier) is [exhales]), and
                    silent actions (touching his lips, walking, miming the injection) are not spoken.
     reply          scene 2 only: tone, how his voice sounds (an Eleven v4 audio tag, as in the auditions);
                    pause, seconds from Argo starting to listen until he answers (0.8 if not given);
                    afterWalk, he answers only once his walk to Locker N3 has finished; after, extra seconds
                    before Argo answers him
   end:      what happens after the last line (the calm-down) */
const DAY143 = {
  name: 'Day 143',
  who: 'ALEX',   // the patient: his voice entries in the voice log, and whom Argo's lines are addressed to
  opening: [
    { at: 0, cue: 'medicalAlert' },
    { at: 3, cue: 'contactEarth' }
  ],
  lineAt: 6,
  lines: [
    { id: 'a1',
      text: 'Alex, your heart rate is up 35 percent from your normal, and your oxygen is dropping. You’re not on the treadmill. How are you feeling?',
      cited: 'Alex, your heart rate is up 35 percent from your normal<c>1</c>, and your oxygen is dropping<c>2</c>. You’re not on the treadmill<c>3</c>. How are you feeling?',
      cues: ['earthClocks', 'checkIn'],
      sources: [['hr', 1], ['o2', 2], ['activity', 3], ['mapLab', 3]],
      gap: 5, hold: true,
      answer: 'I’m fine, just... (coughs) My throat’s itchy. It feels tight.',
      reply: { tone: 'strained' } },
    { id: 'a2',
      text: 'Any swelling in your lips or face?',
      cited: 'Any swelling in your lips or face<c>1</c>?',
      cues: ['symptomCheck'],
      sources: [['check', 1]],
      gap: 4, hold: true,
      answer: '(touches his lips) Yeah. My lips.',
      reply: { tone: 'strained' } },
    { id: 'a3',
      text: 'Tight throat, swelling, fast heart, falling oxygen. That matches the onboard procedure for a severe allergic reaction. Step one is epinephrine.',
      cited: 'Tight throat<c>1</c>, swelling<c>2</c>, fast heart<c>3</c>, falling oxygen<c>4</c>. That matches the onboard procedure for a severe allergic reaction<c>5</c>. Step one is epinephrine.',
      cues: ['procedure'],
      sources: [['sig0', 1], ['sig1', 2], ['sig2', 3], ['sig3', 4], ['procTitle', 5]],
      gap: 4, hold: true,
      answer: 'Shouldn’t we call Houston first?',
      reply: { tone: 'anxious' } },
    { id: 'a4',
      lead: 'warning',
      text: 'Houston sees this in {earthIn}. Their answer gets here in {replyIn}, at the earliest. At this rate, your oxygen drops below 90 in about four minutes. The procedure says don’t wait.',
      cited: 'Houston sees this in {earthIn}<c>1</c>. Their answer gets here in {replyIn}<c>2</c>, at the earliest. At this rate, your oxygen drops below 90 in about four minutes<c>3</c>. The procedure says don’t wait<c>4</c>.',
      sources: [['ckEarth', 1], ['ckReply', 2], ['ckO2', 3], ['dont', 4]],
      gap: 3,
      answer: 'Okay. The kit’s right here. (reaches to his side)',
      reply: { tone: 'breathless', after: 0.6 } },   // he reaches for the empty kit before Argo answers
    { id: 'a5',
      text: 'That kit’s injector was used on day 112. The closest one is in Node 2, through the hatch behind you. Locker N3. I’ve woken Maria.',
      cited: 'That kit’s injector was used on day 112<c>1</c>. The closest one is in Node 2, through the hatch behind you<c>2</c>. Locker N3<c>3</c>. I’ve woken Maria<c>4</c>.',
      cues: ['guide'],
      sources: [['mapKitLab', 1], ['mapHatch', 2], ['mapN3', 3], ['sarah', 4]],
      gap: 6,
      listen: ['nikosWalk'],
      answer: '(crosses the stage as his dot moves, mimes opening the locker) Got it.',
      reply: { tone: 'breathless', afterWalk: true, pause: 0.5 } },   // at the locker, then opens it
    { id: 'a6',
      press: ['nikosArrive'],
      text: 'Outer thigh. Through the fabric is fine.',
      cited: 'Outer thigh. Through the fabric is fine<c>1</c>.',
      cues: ['injectionGuidance'],
      sources: [['step0', 1]],
      gap: 4,
      answer: '(mimes the injection) Done.',
      reply: { tone: 'strained', pause: 2.5 } },   // the injection takes a moment
    { id: 'a7',
      press: ['dose'],
      text: 'Logged at {dose}. If you’re not better in five minutes, the second injector is in the same locker.',
      cited: 'Logged at {dose}<c>1</c>. If you’re not better in five minutes, the second injector is in the same locker<c>2</c>.',
      sources: [['step0', 1], ['step2', 2], ['mapN3', 2]],
      gap: 4,
      answer: '(breathing easier) What do we tell Houston?' },
    { id: 'a8',
      lead: 'report',
      text: 'It’s already written: vitals, timeline, the dose, and the new food pack you opened at 03:20. It’s on its way.',
      cited: 'It’s already written<c>1</c>: vitals, timeline, the dose, and the new food pack you opened at 03:20<c>2</c>. It’s on its way<c>3</c>.',
      sources: [['report', 1], ['trigger', 2], ['foodPack', 2], ['transmit', 3]] }
  ],
  end: 'calmDown'
};

/* Scene 2: the same Day 143, self-playing, the scenario visitors run in the simulator (docs/05, decisions 26 and 30).
   the patient (Alex) answers by himself in his recorded voice (decision 25; voice/en/nikos-en.js) and Argo
   carries on when he finishes, so nobody speaks or presses anything. Same lines, voice, numbers and screen as scene 1. */
const DAY143_SELF = Object.assign({}, DAY143, { name: 'Day 143, self-playing', self: true });
