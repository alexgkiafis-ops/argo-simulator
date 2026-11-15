# 01. Concept and positioning

## The challenge

NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions":
https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

We could not open the official challenge page from the research tools (the site blocks automated access). Alex should read its objectives and considerations himself and check the pitch against them, because the Relevance score depends on hitting what it actually asks for.

Goal: win the local competition in Greece first. Global judging comes second.

## The problem we pitch

On a deep space mission, Earth is minutes away, not seconds.

- Mars is about 3 to 22 light-minutes from Earth, one way. We use 12:40 one way in the story.
- So Earth only *sees* an emergency 12:40 after it starts. The earliest possible answer arrives 25:20 after it starts, plus however long the flight surgeons need to understand it.
- During solar conjunction there is no contact at all for about two weeks.
- Say "Mars transit habitat", never "space station". Judges hear "station", think ISS, and the ISS talks to Houston in near real time.

## Our idea: Argo

An onboard assistant that knows what is happening to the astronaut's body **and** what is happening in the ship, and talks the crew through an emergency in the window before Earth can help.

- **The body:** vitals compared to each astronaut's own baseline.
- **The ship:** a habitat map with crew positions, medical supply locations and inventory, module sensors.
- **The voice:** a local LLM that explains what is going on and walks the astronaut through the onboard procedure, with every claim visible and verifiable on screen.

Taglines we like:

- "The vitals tell you something is wrong. The ship tells you why, and what to do next."
- "Earth will always be 12 minutes away. Argo is already on board."

Name: **Argo** (confirmed Nov 7, docs/05 decision 23). In the myth, a beam of Dodona oak built into the Argo could speak and advise its crew. A ship that talks to its crew is literally Greek, which helps with a Greek jury.

## Design principles (these are also our answer to "what if the AI is wrong?")

1. **The LLM never decides.** Detection is deterministic and statistical. The response comes from pre-written onboard procedures, which is how spaceflight emergencies already work (checklists). The LLM only narrates: it turns the procedure plus live context into plain spoken steps.
2. **Every line shows its source.** When Argo says something, the vital sign, map item or procedure step behind it lights up on screen.
3. **Argo speaks first.** It notices and opens the conversation; it does not wait to be asked.
4. **It asks before concluding.** It checks symptoms with the astronaut instead of announcing a diagnosis.
5. **The astronaut makes the call.** Argo advises, never acts, never hides data. Bring up HAL 9000 yourself before a judge does.
6. **The person in trouble may be the worst person to talk to.** Argo can wake and guide the nearest crewmate.
7. **Earth gets a ready report.** With a 25-minute round trip, a reply that says "send more data" costs another half hour, so the first report must already hold what a flight surgeon needs.
8. **If the model fails, the procedure still shows as a checklist.**
9. **The screen shows what the moment needs.** It starts calm, and each element appears or lights up when the emergency calls for it: vitals turn amber when they drift, the procedure card opens when Argo matches it, the route lights when there is somewhere to go. Dashboards that show every number all the time leave the crew to find the one that matters; Argo puts it in front of them. (Alex, Nov 6, after touring HELIOS.)

## What we are NOT building

- A new detection algorithm. We will not beat NASA at detecting medical emergencies, so detection stays simple, explainable statistics.
- A generic vitals dashboard. Many teams will show one.
- An exercise coach.
- A fine-tuned model. Retrieval over written procedures is the better design anyway: updating a procedure is a document edit, not a retrain, and you can show which text each instruction came from.

## How we differ

- From other 2026 teams: many pitch "offline AI triage + comms delay". What we did not see in any of them is the ship layer (map, crew positions, supply inventory). That is the differentiator, so we lead with it.
- From NASA and Google's CMO-DA (an AI medical assistant tested for deep space crews): it is built around the crew describing symptoms to it. Argo notices first, and knows the ship.

## Honesty rule

The app in the sketch is a prototype with one scripted scenario. We say "prototype" out loud. Never claim the LLM or detection runs live if it does not. Getting caught overclaiming costs far more than admitting it is scripted.
