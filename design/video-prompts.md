# Reference images and video

> Dropped Nov 7 (docs/05 decision 23): this method was made for the old video plan. The prompts below keep the first cast's names as they were written (Nikos, Sarah, Mike, Leo); since Nov 7, night, the crew is Alex (the patient), Maria (crew medical officer), Stelios and Giannis (decision 14).

Lesson from the first try (Nov 6): short prompts with no context gave random sci-fi that could never be a real app. The model needs the purpose, and the surest way to give it is to show it our draft screen instead of describing it.

The clips and images are references only. The agents rebuild their look and motion in our app with our real content (habitat map from `spec/`, Nikos's numbers and Argo's lines from `spec/day143-timeline.json`), readable on a projector. The jury sees our running app, never these references. Text inside AI images may come out garbled; that does not matter, we only take the look.

Note (Nov 6, late): Alex rejected the v1 draft screens below as looking like an explainer animation rather than a real system. Use the v2 screens once they exist (`design/v2-brief.md`, output in `design/draft-v2/`); the steps stay the same. Nov 7: v2 screens exist (`design/draft-v2/argo-v2-1-normal.png`, `-2-alert`, `-3-peak`, `-4-report`), pending Alex's review. Restyle only after he approves them.

## Step 1. Restyle our draft screen (Nano Banana 2.1)

Draft screens, one per state of the scenario, in `design/draft/`:

- `argo-1-calm.png` (03:31, all quiet)
- `argo-2-alert.png` (Argo notices, vitals amber, clocks start)
- `argo-3-peak.png` (procedure card, red oxygen clock, route to Locker N3, Sarah woken)
- `argo-4-report.png` (recovering, report to Earth)

Live version: open `design/draft/argo-screen.html` in a browser. Keys 1 to 4 switch states; add `#play` to the URL to watch the whole scenario cycle.

Upload `argo-3-peak.png` with:

> This is a draft of a real app screen: Argo, the onboard medical assistant of a crewed spacecraft flying to Mars, shown on a 16:9 wall display while it guides an astronaut through a severe allergic reaction. Keep the layout, every element and all the text where they are. Restyle it into a premium, cinematic interface: real NASA flight software designed by a top film UI studio. Richer depth, light, materials and typography. Keep it readable from across a room, and keep color meaningful: amber for warnings, red for critical.

When one result looks right, restyle the other three in the same look. Upload the draft state plus your chosen result:

> Apply the exact style of the second image to the first image. Keep the first image's layout, elements and text.

Save the four keepers in `design/refs/`.

## Step 2. The whole scenario as one video (Google Flow)

Every AI video generation is a short clip (about 4 to 15 seconds). The long AI videos online are many clips joined in an editor. So build the scenario from three transitions between your four restyled screens, using Flow's start frame and end frame:

1. start: calm, end: alert
2. start: alert, end: peak
3. start: peak, end: report

Prompt for each clip:

> The spacecraft display smoothly transforms from the first screen into the second: panels slide in, lines and colors change, the map updates. Calm, elegant interface animation. Static camera, no camera movement.

Join the three clips in Flow's scene builder or any video editor. Because every clip starts and ends on the same frames, the layout stays the same and it plays as one continuous scenario.

## Fallback: full-context prompt (no draft)

> Design a real software screen, not a movie prop. Argo is the onboard medical assistant of a crewed spacecraft flying to Mars. It runs full screen on a 16:9 wall display inside the ship. It is 3:32 a.m.: astronaut Nikos is having a severe allergic reaction alone in the Lab, and Argo is guiding him.
>
> On screen:
> - Center, largest: a top-down map of the ship. Five rounded modules: Crew Quarters at the top; Lab, Node 2 and Galley in a row; Hab B at the bottom right, joined by small hatches. Crew as dots: Nikos glowing red in the Lab, Sarah walking from Crew Quarters toward Node 2, Mike and Leo asleep in Hab B. The Lab's medical kit is greyed out; a glowing path runs from Nikos through the hatch to "Locker N3" in Node 2.
> - Left: Nikos's heart rate and blood oxygen as live lines against a soft band showing his normal range, both amber and outside it.
> - Top right: countdowns "Earth sees this in 12:40", "Earliest reply in 25:20", and a red one: "Oxygen below 90% in 4:10".
> - Right: a checklist card "Severe allergic reaction", step 1 highlighted: "Epinephrine, outer thigh".
> - Bottom: Argo's spoken line as a large caption.
>
> Style: real NASA flight software, designed by a top film UI studio. Dark, crisp, generous spacing, large readable text. Color only where it matters: amber for warnings, red for critical. Few elements, no clutter, no random numbers.

Calm version, by editing that result:

> Same screen, same layout and style, one minute earlier, before anything happens: everyone asleep, Nikos's lines calm inside their band, no checklist, no path, no countdowns. Almost empty and quiet.
