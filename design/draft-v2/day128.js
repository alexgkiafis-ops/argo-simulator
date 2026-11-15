/* Day 128 as data: the second scenario visitors can run in the simulator (docs/05, decision 38; spec/day128-timeline.json).
   A CO2 pocket ("it's the air, not you"). In the middle of the ship's night the fan in Alex's sleep station (CQ-2, in
   Crew Qtrs) stops and will not restart. In zero gravity warm breath does not rise away, so with no fan his own exhaled
   CO2 stays around his face. Argo, which knows he is asleep in there, watches the CO2 badge on his collar and wakes him
   when it passes its wake limit, 1 %. He wakes with a headache and a racing heart and thinks something is wrong with
   him; Argo tells the air from his body (his oxygen is normal). He wants to sleep it off, and that is the danger: asleep
   in the pocket he might not wake up on his own. Argo gets him out into the moving air of Node 2, checks the other three
   crew's air, and reports to Earth, 10:40 away. It is the same monitor, voice and engine as Day 143; world-day128.js draws what is
   particular to it (its night, panels, map, vitals and calm-down).

   Self-playing only (like scene 2, decision 26): the patient (Alex) answers in his recorded voice (Alan James, decision
   25; the answers bn1 to bn5 in voice/en/day128-en.js, made by tools/voice/make-voice.js --scenario day128) and Argo
   carries on when he finishes. Same shape as day143.js; the fields are described there. Two more:
     voices     the scenario's own voice script, voice/en/<voices>-en.js (Argo's lines and the patient's answers)
     replyKey   the patient's answer to line n is <replyKey><n> (Day 143's are n1 to n7)
     reply.thenWalk   he answers first, then moves (out of his station to Node 2); Argo carries on once he is there
   Every number and name Argo says is on the screen as it says it (the harness checks each one): "01:55" the fan's stop on
   the checklist, the map and the log, "over 1 percent" and "0.3 percent" his CO2 badge, Maria's, Stelios's and Giannis's
   badges on the map, and line 6's minutes the two Earth clocks as it starts. "Asleep you might not wake up on your own"
   is the checklist's note (NASA's 2002 analysis of a sleep station without airflow; docs/06, "Day 128"). */
const DAY128 = {
  name: 'Day 128, self-playing',
  who: 'ALEX',
  self: true,
  voices: 'day128',
  replyKey: 'bn',
  opening: [
    { at: 0, cue: 'airAlert' },
    { at: 3, cue: 'contactEarth' }
  ],
  lineAt: 6,
  lines: [
    { id: 'b1',
      text: 'Alex, wake up. The air in your sleep station has stopped moving. How do you feel?',
      cited: 'Alex, wake up. The air in your sleep station has stopped moving<c>1</c>. How do you feel?',
      cues: ['earthClocks', 'wakeCall'],
      sources: [['aFan', 1], ['mapFan', 1], ['co2', 1]],
      gap: 5,
      answer: 'Ugh. What? My head hurts, and my heart’s racing. Is something wrong with me?',
      reply: { tone: 'groggy' } },
    { id: 'b2',
      text: 'It’s the air, not you. Your oxygen is normal. Your fan has been off since 01:55, and in zero gravity your breath stays around your face. The CO2 there is over 1 percent, and that’s the headache.',
      cited: 'It’s the air, not you. Your oxygen is normal<c>1</c>. Your fan has been off since 01:55<c>2</c>, and in zero gravity your breath stays around your face<c>3</c>. The CO2 there is over 1 percent<c>4</c>, and that’s the headache.',
      cues: ['procedure'],
      sources: [['o2', 1], ['sigFan', 2], ['mapFan', 2], ['sigPocket', 3], ['mapPocket', 3], ['co2', 4], ['sigCo2', 4]],
      gap: 3,
      answer: 'Okay... let me just sleep it off.',
      reply: { tone: 'drowsy' } },
    { id: 'b3',
      lead: 'warning',
      text: 'No, not in there. The CO2 keeps rising, and asleep you might not wake up on your own. Unzip and come out through the hatch to Node 2. The air there is moving.',
      cited: 'No, not in there. The CO2 keeps rising<c>1</c>, and asleep you might not wake up on your own<c>2</c>. Unzip and come out through the hatch to Node 2<c>3</c>. The air there is moving<c>4</c>.',
      cues: ['guide'],
      sources: [['co2', 1], ['noteSleep', 2], ['mapHatch', 3], ['mapVent', 4]],
      gap: 3,
      listen: ['alexFloat'],
      answer: 'Okay. Okay, I’m coming out. (unzips his sleeping bag and floats out through the hatch to Node 2)',
      reply: { tone: 'breathless', thenWalk: true } },
    { id: 'b4',
      press: ['alexOut'],
      text: 'Good. Stay by the vent and breathe normally. Your badge reads 0.3 percent now, like the cabin, and your breathing is already slowing.',
      cited: 'Good. Stay by the vent<c>1</c> and breathe normally. Your badge reads 0.3 percent now, like the cabin<c>2</c>, and your breathing is already slowing<c>3</c>.',
      sources: [['mapVent', 1], ['co2', 2], ['rr', 3]],
      gap: 4,
      answer: '(breathing easier) Better. Is Maria okay? Her station’s right next to mine.' },
    { id: 'b5',
      text: 'Her fan is running, and her badge reads 0.3 percent, like Stelios and Giannis in Hab B. It was only your station, so I’ve let them sleep.',
      cited: 'Her fan is running, and her badge reads 0.3 percent<c>1</c>, like Stelios and Giannis in Hab B<c>2</c>. It was only your station<c>3</c>, so I’ve let them sleep.',
      cues: ['crewAir'],
      sources: [['mapMaria', 1], ['mapHabB', 2], ['mapAlexStation', 3]],
      gap: 2,
      answer: 'Does Houston know?',
      reply: { tone: 'tired' } },
    { id: 'b6',
      lead: 'report',
      text: 'They will. Houston sees this in {earthIn}, and their answer gets here in {replyIn}. The report is on its way: the fan, your readings, and the spare for the morning.',
      cited: 'They will. Houston sees this in {earthIn}<c>1</c>, and their answer gets here in {replyIn}<c>2</c>. The report is on its way<c>3</c>: the fan, your readings, and the spare for the morning<c>4</c>.',
      sources: [['ckEarth', 1], ['ckReply', 2], ['report', 3], ['transmit', 3], ['rPlan', 4], ['mapSpare', 4]] }
  ],
  end: 'calmDown'
};
