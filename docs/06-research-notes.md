# 06. Research notes

Collected on Nov 6, 2026. Rules pages found were the current public ones (some labelled 2025); the 2026 versions may differ, so double-check anything decisive.

## Space Apps submission and judging

Source: https://www.spaceappschallenge.org/resources/project-submission-guide

- Demo for global judging: a video of up to 30 seconds **or** a slide deck of up to 7 slides including the title slide. Going over either limit makes the project ineligible for global judging.
- Five judging criteria: **Impact, Creativity, Validity, Relevance, Presentation.**
- The submission should explain how space agency open data and technology made the project possible.
- Validity (wording from an older guide): is it scientifically valid, will it do what it sets out to do, can it work in the real world. This is where an LLM in a medical emergency gets questioned, hence our design principles in docs/01.

Terms: https://spaceappschallenge.org/legal

- Non-NASA materials (code, datasets, assets) must be freely and publicly available or open source, with licenses identified.
- Every source used must be cited, even open-source ones. NASA can remove awards from teams that do not cite.
- An older submission form also asked teams to confirm the project is their own original work.

The local event may have its own pitch format and rules. Check with the organizers.

## Related work worth naming

**NASA + Google CMO-DA (Crew Medical Officer Digital Assistant).** A proof-of-concept clinical decision support system for crews beyond low Earth orbit, taking voice, text and image input. Early results focused on diagnosing from symptoms the crew reports; test cases included an ankle injury, flank pain and ear pain.
https://www.space.com/technology/nasa-and-google-test-ai-medical-assistant-for-astronaut-missions-to-the-moon-and-mars

Our contrast: CMO-DA waits for the crew to describe symptoms. Argo notices first, and knows the ship.

## Other 2026 entries for this challenge (ideas only; check licenses before touching code)

- **HELIOS** (MIT): see docs/04.
- **AURORA** (Apache 2.0), https://github.com/fabriciojunio/aurora-astronaut-health
  - Offline assistant that answers only from its own procedures and cited studies (BM25 retrieval), refuses to diagnose, and treats user text purely as a search query.
  - A file where every threshold and procedure cites its source.
  - A model card with false-alarm and catch rates, which openly documents an early mistake.
  - Real radiation data from the May 2024 solar storm (incl. Curiosity RAD on Mars) via NASA OSDR RadLab and NOAA GOES.
  - Per-category consent for data sent to the ground, signed batches.
  - A demo case where the crew medical officer is the one who is ill.
- **HILO / ORBIT-SENTRA** (no license file seen), https://github.com/Jeevan-ZGDX/ORBIT-SENTRA
  - Personal baselines with median absolute deviation and EWMA.
  - Tells sensor faults (spikes, frozen data, dropouts) apart from real crises.
  - Flight surgeon review view; a 4-scene demo: baseline, anomaly, offline, reconnect and review.
- **VITA** (no license file seen), https://github.com/Nav33dCodes/vita-astronaut-health-monitor
  - Signal quality per stream (live, stale, lost); reference ranges from NASA-STD-3001.
  - Escalation: a critical alert unacknowledged for 2 minutes triggers a master alarm that climbs every 5 minutes.
  - Trend line over the last 60 minutes that estimates when a vital will cross its safe limit (the idea behind our red oxygen clock).
- **AstroHealth** (no license file seen), https://github.com/Ridwanulkarim/nasa-challenge-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions
  - Maps NASA's five human spaceflight hazards to features (could be one slide).
  - Link status badge (online, delayed, offline); checksum-verified packets to the ground; 14-day rolling baseline.
- **VitalGrid**, https://github.com/86developer/NASA-Spaceapps-2026: pitches itself as an "Autonomous Flight Surgeon".

No license file means: ideas only, no code. Credit any idea we visibly reuse in the references.

## Facts for the pitch and Q&A

- Mars is about 3 to 22 light-minutes away, one way. Round trip up to about 44 minutes. During solar conjunction there is no contact for about two weeks.
- The ISS talks to Houston in near real time, which is why our setting is a Mars transit habitat.
- Spaceflight is known to disrupt the immune system; long missions bring new food batches. This makes a sudden allergic reaction plausible.
- Epinephrine is the first-line treatment for anaphylaxis: outer thigh, through clothing is fine, a second dose if there is no improvement after several minutes. Epinephrine usually raises heart rate, so do not show heart rate dropping fast right after the injection.
- **After the dose (facts behind the calm-down step-down, Nov 7).** Use these if a doctor on the jury asks why the alarm steps down while Alex's heart rate is still high.
  - Injected into the outer thigh, epinephrine reaches higher blood levels than in the arm ([Simons et al. 2001](https://pubmed.ncbi.nlm.nih.gov/11692118/)); its level peaks about 5 to 10 minutes after the injection, often with a second smaller peak at 30 to 50 minutes ([2021 review](https://link.springer.com/content/pdf/10.1186/s13223-021-00511-y.pdf)). It raises heart rate, so a fast heart for several minutes after the dose is the drug working.
  - Repeat the dose if symptoms have not resolved after 5 minutes ([Resuscitation Council UK evidence update, 2021](https://pubmed.ncbi.nlm.nih.gov/33895231/)). That is MED-07 step 3 on our screen and Argo's "If you're not better in five minutes".
  - Observation after anaphylaxis: at least 2 hours after symptoms resolve for a quick, good response to one dose; at least 6 hours if two doses were needed; 12 hours for severe cases ([NICE NG258](https://www.nice.org.uk/guidance/ng258/chapter/Period-of-observation), adapted from the RCUK 2021 guidance). This is why our step-down is an advisory "under observation", never "all clear".
  - Monitors alarm on limits the care team sets. A common adult heart-rate limit is 50 to 120 ([Zoll X Series defaults](https://www.manualslib.com/manual/1283001/Zoll-X-Series.html?page=106); GE ApexPro uses 50 to 150). Our screen keeps Alex's personal limit (80) until oxygen and breathing are back, then counts a heart rate up to 120 as the expected effect of epinephrine (procedure MED-07, our fiction).
  - Alarm colors follow IEC 60601-1-8: red for high priority, yellow for medium ([Vocera summary](https://pubs.vocera.com/vam/vam_2.2.4/help/vam_admin_help/topics/vam_configalarmlevel.html)), and cyan is allowed for low priority ([commentary on the standard](https://standards.har-el.com/Projects/181701/60601-1-8/html/A2SubCl-6-3-2-2-Visual-Characteristics.htm)). Our WARNING, CAUTION and ADVISORY use red, amber and cyan.
  - On stage, oxygen is back inside its limit about 45 s after the dose and breathing about 65 s after. Real recovery takes a few minutes; the script already compresses it (Alex says he is breathing easier seconds after the dose).
- In microgravity there is no natural convection, so exhaled CO2 can pool around a person in a poorly ventilated spot (why ISS crew quarters have fans). This was the parked alternative scenario.

## Day 128, the CO2 pocket (the second scenario, Nov 8)

Sources behind the second scenario in the simulator (docs/05, decision 38; `spec/day128-timeline.json` lists each with the claim it supports). Collected Nov 8, 2026; every link was opened. All numbers on screen are simulated and kept to these.

- **Why pockets form.** In microgravity there is almost no convection, so "local pockets of CO2 may form around sources of CO2 such as the nose and mouth" (Law, Watkins and Alexander, NASA/TP-2010-216126; abstract: https://ntrs.nasa.gov/citations/20100036637). A CFD study cited there found that with no ventilation, CO2 around a sleeping crew member's mouth and chin "could rise above 9 mm Hg within 10 minutes" (about 1.2 %). The Canadian Space Agency, for the public: exhaled CO2 "could form a bubble around their head. That is why they have to sleep near an air vent." (https://www.asc-csa.gc.ca/eng/astronauts/living-in-space/sleeping-in-space.asp). NASA-STD-3001 Vol. 2 Rev F (2026), [V2 6107]: ventilation must "prevent CO2 and thermal pockets from forming" (https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf).
- **Sleep stations and fans.** ISS US crew quarters: 2.1 m3 inside, airflow for "flushing of carbon dioxide concentrations to prevent crewmember asphyxiation", at least 0.85 m3/min with the door closed (Broyan et al., ICES 2008: https://ntrs.nasa.gov/api/citations/20080013462/downloads/20080013462.pdf). CO2 asphyxiation there is "categorized as a catastrophic hazard"; on orbit, lint reduced one crew quarters' airflow (Broyan et al., ICES 2010: https://ntrs.nasa.gov/api/citations/20100017014/downloads/20100017014.pdf).
- **A sleeper may not wake on his own.** NASA's 2002 model of the ISS Temporary Sleep Station with no airflow: CO2 reached the then one-hour limit (1.3 %) in about 13 minutes, and the analysis "did not conclusively indicate that the crew would wake up on their own accord" (Keener et al., ICES 2002: https://ntrs.nasa.gov/api/citations/20150020425/downloads/20150020425.pdf). In sleep the breathing response to CO2 is 49 % lower in non-REM and 69 % lower in REM (Berthon-Jones and Sullivan 1984: https://pubmed.ncbi.nlm.nih.gov/6432751/). This is the danger Argo names in line 3 and why the patient's numbers barely move before Argo wakes him.
- **Limits.** NASA-STD-3001 Vol. 2 Rev F [V2 6004]: one-hour average CO2 in the habitable volume no more than 3 mmHg (0.4 %). ISS: 24-hour average limited to 4.0 mmHg since 2010, then 3.0 (Law and Alexander 2016: https://ntrs.nasa.gov/api/citations/20150019624/downloads/20150019624.pdf; NASA OCHMO-TB-004, 2026: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf, "0.5% CO2 = 3.8 mmHg"). NASA's CO2 SMACs were withdrawn in 2020 (JSC 20584 Rev A), so the scenario does not show them. NIOSH: 0.5 % (8-hour), 3 % (15-minute), 4 % immediately dangerous (https://www.cdc.gov/niosh/npg/npgd0103.html). Argo's wake limit, 1 % at the face, is our fiction framed by these.
- **Symptoms and recovery.** For each 1 mmHg of CO2 the odds of an ISS crew member reporting a headache doubled (Law et al., J Occup Environ Med 2014: https://pubmed.ncbi.nlm.nih.gov/24806559/; note: JOEM, not Aviation, Space, and Environmental Medicine). Headache and shortness of breath at a few percent, confusion and unconsciousness only far higher (US EPA 2000, Table B-1: https://www.epa.gov/sites/default/files/2015-06/documents/co2report.pdf). Oxygenation stays intact while breathing extra CO2 (van der Schrier et al. 2022: https://www.frontiersin.org/articles/10.3389/ftox.2022.1001709), which is how Argo tells the air from his lungs. Breathing returns to normal within minutes in fresh air; headaches can begin or worsen after the exposure (NIOSH criteria document 1976: https://stacks.cdc.gov/view/cdc/19367), hence the advisory "headache · under observation". The scenario compresses the recovery to about half a minute, as Day 143 compresses its own.
- **How much CO2 a sleeper breathes out.** 0.44 g a minute, about 0.22 L (NASA BVAD Rev 2, 2022: https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf).
- **The CO2 badge.** NASA flew crew-worn Personal CO2 Monitors on the ISS (2016 to 2017) because pockets are hard to detect with fixed sensors (ISS daily summary, Sep 21, 2016: https://www.nasa.gov/blogs/stationreport/2016/09/21/iss-daily-summary-report-09-21-2016/; NASA 2024: https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research).
- **Why Argo, not Houston.** On the ISS, Mission Control watches life support around the clock (the ETHOS console: https://www.nasa.gov/johnson/jsc-mission-control-center). On a Mars transit the ground sees the fan stop minutes late (10:40 one way in this scenario; NASA expects 0 to 22 minutes over a Mars mission: https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf).
