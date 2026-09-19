# The Space Game (2009): Starfall fidelity reference

Research date: 2026-09-06. Scope: Casual Collective’s **original** The Space Game, released before the July 2009 sequel, *The Space Game: Missions*. This is a mechanics reference for an independently written game with original art/audio. It is not permission to reuse assets or program code.

## Evidence status

This document is being assembled from contemporary reviews, walkthroughs and visible game UI. Numeric claims distinguish confirmed values from timing interpretations. The original Flash program code has not been inspected or copied; only visible rendering has been observed. Do not present an unverified timing or reconstructed map as an exact original value.

Sources:

- [A — Tower Defense Wiki: original game](https://w.atwiki.jp/tower_d/pages/68.html), numerical tables and original modes. Accessed 2026-09-06; page states last update 19 August 2010.
- [B — Ayumilove, 1 March 2009 walkthrough](https://ayumilove.wordpress.com/2009/03/01/casualcollective-the-space-game-walkthrough-tips-review/), weapon statistics, original mission-six video, contemporary player observations.
- [C — Jay Is Games, 15 February 2009 review](https://jayisgames.com/review/the-space-game.php), original gameplay and contemporary comments.
- [D — Casual Collective’s Kongregate sequel listing](https://www.kongregate.com/en/games/casualcollective/the-space-game-missions), developer description explicitly identifies the sequel and its 21 missions/four difficulties. Those counts must not be attributed to the original.
- [E — Kongregate Wiki, sequel unit reference](https://kongregate.fandom.com/wiki/The_Space_Game%3A_Missions), useful corroboration of shared unit values, but not sufficient alone to establish an original-game rule.
- [F — Soft4Everyone, 19 February 2009 overview](https://www.soft4everyone.com/blog/2009/02/space-game-strategy-game.html), contemporary original-game unit descriptions.

## Original campaign

| Mission | Objective | Confidence |
| --- | --- | --- |
| 1, 2, 4, 5, 7, 8 | Extract 50% of the field’s minerals | Medium: A |
| 3 | Survive 10 minutes | Medium: A |
| 6 | Eliminate attackers; B identifies 20 motherships | High: A+B |
| 9 | Survive 20 minutes | Medium: A |

Most mission layouts, titles, initial funds, unlock order and exact wave scripts remain unverified (mission-one starting funds are verified in the footage section). Reconstruct them explicitly rather than claiming identical maps.

## Immediate implementation corrections

- Current Starfall has a mandatory command ark and one global energy pool. Original play evidence instead centers on solar-powered relay networks. Verify disconnected subnetworks and local energy storage before finalizing a replacement.
- Current Starfall’s miner rate is orders of magnitude faster than the original table: original values are **80/200 minerals per minute**, not per second (A, corroborated by E).
- The basic laser branches into Pulser and THEL. Pulser intercepts missiles; THEL is long-range beam defense and does not intercept missiles (B).
- Missile ammo uses **five minerals**, not Starfall’s current energy-only shot model. Exact per-projectile/salvo interpretation still needs direct observation (A).
- Repair stations deploy up to four repair drones (E, with drones independently described by F); use visible moving drones rather than a single abstract repair beam.

## Known numeric data

Slash-separated values are successive levels. Costs are purchase followed by each incremental upgrade, not cumulative totals. Energy quantities below are **internal capacity**, according to E; A’s ambiguous energy column must not be treated as generation or consumption per second.

| Unit | HP | Cost steps | Capacity / other |
| --- | --- | --- | --- |
| Relay | 100 (E) | 20 | six links |
| Miner | 300/500 | 45/100 | capacity 1/1; output 80/200 per minute |
| Solar | 600/800/1000 | 200/200/200 | capacity 4/9/14 |
| Store | 500/750 | 300/500 | capacity 200/600 |
| Repair | 400/600 | 300/150 | range 200/300; four drones |

The non-relay HP/cost/capacity values are A, with HP/capacity corroborated by E. A lists repair-level-two resale as zero; treat this as a suspected transcription/implementation quirk pending confirmation.

## Additional original-game evidence

- [G — ScienceBlogs, 20 February 2009](https://scienceblogs.com/sciencepunk/2009/02/20/friday-flash-fun-the-space-gam) describes a **30,000-mineral Mining goal**, independently powered mining hubs, and power affecting both the ability and speed of building. These are direct play observations; the selected mining difficulty is unspecified.
- [H — Dakwamine, 28 February 2009](https://blog.dakwamine.fr/?p=72) independently confirms six relay connections versus unrestricted solar connections. It explains that solar upgrades raise generation and storage, and shows original final-mission completion/resource graphs.
- [I — Chris Jean, 28 February 2009](https://chrisjean.com/the-space-game-a-flash-rts/) describes power breaks when a relay is destroyed and confirms all structures except relays upgrade. Its claim of five connections conflicts with A/H; likely five downstream plus one incoming, but that interpretation is not proven.
- [J — Armor Games player guide, 24 February 2009](https://armorgames.com/community/thread/2965757/the-space-game-how-not-to-get-owned-by-a-fistload-of-motherships) describes starting with a solar station and expanding a relay fence around miners. Its numerical mining-upgrade percentage is inconsistent with A; do not use that percentage.

### Inspected original screenshots

These are external observation references, **not production assets**. No reference art is included in Starfall.

| Reference | Direct observations | Limits |
| --- | --- | --- |
| [Mission 6 defense formation](https://ayumilove.files.wordpress.com/2009/03/cc_spacegame_mission6b.jpg) | Solar stations at left; stores form two linked rows; repair/weapon cluster at right; no visible relay. **Energy stores transmit power**, rather than being terminal sinks. UI shows four speed states, inbound mothership countdown, minimap, minerals, mining rate, energy amount and percentage. | Still image does not establish edge bandwidth, precise connectivity rules or energy-per-second. Overlay text is walkthrough commentary. |
| [Original Hard mining screenshot](https://img.atwiki.jp/tower_d/attach/68/192/space.jpg) | Pausing/slowing/normal/fast, mined counter and percent, type/count warning, minimap and seven-unit toolbar. The toolbar numbers are mineral costs, **not ranges**. | Too small to measure distances reliably. |
| [Mission 5, contemporary screenshot](https://avoision.com/portnoy/images/2009/july/theSpaceGame.jpg) | Original mission five’s expanded network and per-minute economy. | Full-size image inspected: 9,656 mined at 82%; this rounded percentage does not establish an exact total. |
| [Final completion](https://blog.dakwamine.fr/wp-content/uploads/2009/02/thespacegame-fin.png) | Twenty-minute final objective and separate resource graphs. | Full-size image inspected: graphs are energy reserves and minerals per minute, with observed maxima 196 and 4,480. These are that run’s results, not universal limits. |

### Availability checks, 6 September 2026

- Original Kongregate game URL currently redirects to the portal home, though original comments remain indexed.
- [Not Doppler’s licensed listing](https://www.notdoppler.com/thespacegame.php) explicitly says its hosted game was used with permission; its old embedded SWF URL remains visible in the page. That embed was not executed here.
- [Bubblebox’s Ruffle version](https://bubblebox.com/the-space-game) was actually launched in Chrome. Its loader displayed an inability to load the game, so no gameplay values were measured there.
- [Ayumilove mission-six video](https://www.youtube.com/watch?v=bAARH9NuTtE) was opened in Chrome and reports that it is unavailable. The associated screenshot remains accessible.

## Cross-version discrepancies and timing estimates

E is a sequel reference and contains explicitly approximate timing. Keep these separate from original confirmed unit statistics:

| Quantity | Original guide A | Sequel guide E | Interpretation |
| --- | --- | --- | --- |
| Pulser capacity | 2/7/9 | 2/5/7 | Prefer original table for original rules; not independently verified |
| THEL capacity | 6/10/17 | 5/10/17 | Level-one disagreement remains |
| Missile level-three salvo | 5 | 4 | Original guide favors five projectiles |
| Solar generation | Not specified | Level three approximately 9/second | Estimate only; efficiencies 30/70/100% are supported by B |
| Basic laser timing | Not specified | Beam ~0.2s, reload ~0.25s | Reconstructed cadence must be documented |
| Pulser timing | Not specified | Beam ~0.125s, reload ~0.1s | Same caveat |
| THEL timing | Not specified | Damage every frame; ~0.5s retarget | Frame rate itself questioned by source |
| Missile timing | Not specified | ~10s reload | Same caveat |

The weapon energy numbers describe reserves; they are not established per-shot costs. Relay, repair and missile internal reserve sizes; exact construction-energy costs; per-link range/bandwidth; consumer forwarding; damage tick duration; projectile velocity; splash radius; and enemy HP/speed/shield formulas remain unverified.

A [July 2010 sequel player comment](https://www.kongregate.com/games/casualcollective/the-space-game-missions/comments?pdis=q-b&srid=4706867) explicitly describes waves triggered by mined percentage. This is strong evidence for the sequel but **not independent proof for the original**. Do not silently assert that original waves use identical thresholds.

## Weapons and upgrades

Weapon HP, range, damage and purchase/upgrade steps below are corroborated by B for lasers. Missile figures are A/E; original salvo count follows A. Slash-separated weapon damage is **listed damage**, not calculated DPS.

| Weapon | HP | Range | Listed damage | Incremental mineral costs |
| --- | --- | --- | --- | --- |
| Basic laser | 200 | 90 | 30 | 100 |
| Pulser branch | 300/500/900 | 110/115/130 | 12/14/16 | 100/150/300 after basic |
| THEL branch | 400/600/960 | 200/290/390 | 1/5/10 per damage tick | 500/800/1000 after basic |
| Missile | 500/520/540 | 400/480/576 | 450/500/550 | 400/500/1000 |

A missile costs five minerals to manufacture (E). The original salvo progression is 1/2/5 (A). Homing, splash damage and missile interception by short-range lasers matter tactically; THEL and friendly missile launchers do not target incoming missiles. Claims of zero firing energy are consistent with the original guides but have not been directly measured. Missile turn rate, blast radius, speed, retargeting and energy-at-launch remain calibration items.

Original-guide full-health resale values fit `base purchase + 50% of upgrade spending`: miner 45/95; solar 200/300/400; store 300/550; laser 100; pulser 150/225/375; THEL 350/750/1250; missile 400/650/1150. Repair is the anomalous A entry (300/0). Contemporary C comments independently describe full refund of unupgraded units. [A sequel strategy comment](https://www.jayisgames.com/review/the-space-game-missions.php) says repairing a damaged laser restores its full resale price; an original damaged-health formula remains unverified.

## Enemy roster and intended counterplay

| Original enemy | Required behavior | Confidence |
| --- | --- | --- |
| Red fighters | Short-range laser attackers | A; visually corroborated by original battles |
| Green missile ships | Stand off and launch interceptable missiles | A |
| Orange self-destructors | Close in, collide and explode | A |
| Yellow ringers | Laser fire plus damage-reducing shield | A; C discusses their toughness |
| Gray swarmers | Large, tightly packed groups | A; C discusses splash missiles as counter |
| Purple motherships | Long-range beam and spawned small fighters | A+B |
| Mothership fighters | Small purple attack craft produced in battle | A+B |

The enemy roster must affect movement, weapons and targeting; recoloring the same attacker is insufficient. Preserve warning lead time so players can build toward the approaching side. Swarms should stress area defense, rings should make cheap sustained lasers useful, and motherships should force long-range investment. These are implementation conclusions from the observed roles, not new claims of original numerical AI rules.

C’s original player accounts describe recurring order: fighters, missile ships, exploders, rings, swarmers, motherships; later attacks become stronger. Exact formations, counts, arrival times, spawn arc, targeting distance, shield reduction and scaling are not recovered. B’s original player discussion describes nearest-target mothership behavior. Do not import the sequel’s giant super-mothership, moving jump ships, repair objectives or mega-asteroid missions into the original campaign and call them original features.

## Modes and controls

A lists Training, nine Missions, four Mining difficulties, and three endless Survival choices: gentle, intermediate, hardest. Bonus features were a six-wave selectable challenge, enemy-free speed mining, and paid sandbox. Exact Mining difficulty labels/parameters and bonus unlock conditions need direct menu observation. G confirms a Mining target of 30,000 for the mode played there; this does not prove every original difficulty has the same target.

The original hotkeys in A are: WASD/arrows pan; Q/E zoom; U/Space upgrade; T selects the THEL branch; R recycle; 1–7 select buildings; Esc cancel; Shift repeat placement. The seven toolbar positions are relay, miner, solar, store, repair, basic laser, missile (visible original screenshots). Space is an upgrade key, so assigning it exclusively to pause would break a familiar original control.

The four time controls and minimap are directly visible in the original screenshots. C confirms full mouse-only play and colorblind support. Selection should expose unit HP, remaining asteroid resources, reserves, range, branch choices and costs without obstructing the field. Paused building is described in original contemporary C/H player strategies and is visible in original gameplay footage. [A sequel guide](https://kongregate.blog.fc2.com/blog-entry-180.html) corroborates drag/wheel/minimap navigation and all-miner/all-missile enable switches; original availability of the group switches still needs direct UI confirmation.

A’s setup menu lists smooth camera movement, energy-line visibility, faster laser drawing, moving starfield and colorblind mode. These are graphics preferences; don’t confuse the fast-laser preference with simulation speed or weapon attack-rate upgrades.

## Original video references

- [Developer preview, TheCasualCollective](https://www.youtube.com/watch?v=01AFxGWYE5M), 2:53, **pre-release**. Description says forthcoming late January 2009. It visibly shows construction and resource links, but pre-release names/statistics must not override release references.
- [Mission 1 and 2, hgmenon98](https://www.youtube.com/watch?v=hNIQtylPepQ), 5:35. Actually opened in Chrome and played; menu shows **25 February v1.07**. Mission map contains nine nodes; menus include Training/Missions/Mining/Survival/Bonus. Further timestamp observations are recorded below as verified.
- [Mission 3](https://www.youtube.com/watch?v=BP_oSSFdKQs), [Mission 1](https://www.youtube.com/watch?v=BziL4q_sKWg), [Mission 2](https://www.youtube.com/watch?v=YPlKQeJXCok), and [last ninth mission](https://www.youtube.com/watch?v=J5209EJXRuM) were discovered via YouTube search, but not yet watched; discovery alone is not proof of their content.

## Completed implementation audit — September 6

The replacement lives in `frontend/src/games/custom/starfall/`: a catalog of values, a pure simulation, and a Canvas renderer. `Starfall.tsx` provides the interface and host/guest controls. The obsolete launch simulation has been removed.

| Feature | Implemented behavior and evidence |
| --- | --- |
| Independent solar networks | Connected components retain separate reserves. Tests break a bridge, drain isolated storage, and rebuild a solar hub after the original generator is lost. |
| Transmission and storage | Reciprocal visible links; relays have six links, solar nodes are unlimited. Stores conduct. Capacity upgrades add empty capacity and conserve existing energy. Consumer forwarding/degree beyond the known examples is reconstructed. |
| Energy-based construction | Visible construction and upgrades stall without energy; paused orders wait for simulation. Original Mission 1 starts with one solar and 500 minerals. |
| Original unit economy | Documented mineral costs, HP, upgrade branches, reserves, ranges, and 80/200-per-minute miner output are implemented. Timed mining conserves finite ore. |
| Weapon roles | Basic/Pulser intercept actual enemy missiles. THEL uses a continuous power-hungry beam; missile launchers fire homing splash projectiles costing five minerals each. Shielded ringers resist beams. |
| Repair and recycling | Four traveling drones per repair station; power-limited healing. Full base refund, half completed upgrade investment, health-scaled salvage, and reclaiming all depleted miners. Untouched queued upgrades refund fully. |
| Enemies | Fighter, missile ship, suicide ship, ringer, swarmer, mothership and spawned carrier fighter all exercise their distinct behavior. Fleets wait when the active-enemy cap is full, preserving mission objectives. |
| Campaign | Nine selectable missions with the documented objective types; full ten/twenty-minute defenses and twenty actual mothership kills. Legal, funded strategies complete every mission; [recorded results](starfall-campaign-validation.json). Browser campaign completion saves once to the user’s history. |
| Modes | Interactive Training; Mining at 30,000 with four difficulties; endless Survival at three difficulties; six selectable challenge fleets; no-enemy Speed miner; free Sandbox. Tests complete every finite mode and continue Survival beyond six waves. |
| Navigation and settings | Drag/WASD pan, wheel/Q/E and touch buttons zoom, clickable minimap, original build/upgrade/recycle keys, Shift repeat, pause and four speed choices, energy lines, smooth motion, moving stars, color markings, and fast laser rendering. |
| Warnings and results | Incoming type/count/time plus minimap direction, mineral income and energy reserves/demand, inspection details, original-style absolute-energy and mining-rate charts, recall and next-mission controls. |
| Multiplayer | Cooperative guest construction, upgrades, targeting and recycling on the host’s simulation. Host controls mode/pause/speed/fleets. Snapshots carry projectiles, drones and effects; guest presentation interpolates between snapshots. Late arrivals to completed runs receive no score. |
| Presentation | Original station/enemy art, faceted asteroids, energy webs, mining/weapon beams, missile trails, shields, drones, construction rings and explosions; desktop and touch screenshots reviewed. Original arranged soundtrack retained. |

Cooperative multiplayer is an Afterhours addition: the contemporary review describes original multiplayer as a future plan. Modes and objectives follow the documented original; this is not a recovered Flash binary.

## Explicit reconstruction choices

- Maps, asteroid placement/totals, and exact attack scripts are generated reconstructions. Mission 1’s single starting solar and 500 minerals are verified; other starting funds and Mission 6’s support structures are calibrated choices.
- The solar output scale is estimated at 9 energy/second at 100% efficiency, yielding 2.7/6.3/9 across levels. Consumption, fire cadence, enemy HP/speed/damage, link and mining radii, and repair travel/healing rates are estimates isolated in the catalog.
- Construction normally takes at least three seconds and consumes energy scaled from mineral cost; upgrades take at least four seconds. A disconnected solar can bootstrap in three seconds. Existing solar generation continues during its upgrade. These choices avoid unrecoverable power deadlocks while preserving conservation.
- All completed stations conduct power; consumers share the relay’s six-link cap, while solar is unlimited. The original confirms stores conduct and relays have six links, but does not establish every consumer’s topology or bandwidth.
- Reconstructed campaign attack pacing provides economic setup time, then pressure and appropriate enemy counters. Survive missions retain 600/1,200 seconds. Original scripts were not recovered; completing these reconstructed maps does not prove exact script parity.
- Mining/Wave race scores favor faster completion, and completed races always outrank unfinished attempts. The formula is shown in the operation briefing. Campaign/standard mining score harvested minerals and kills; Survival additionally scores elapsed time. These are Afterhours scorebook rules.
- Original exploit behavior, including infinite-energy relay tricks, is not reproduced. Construction, upgrades, destruction, and component splits obey the conservation tests.

### Verified release-footage observations

[Mission 1/2 footage](https://www.youtube.com/watch?v=hNIQtylPepQ): decoded frames were captured only after the video reached the requested timestamp with `readyState=4` and no pending seek.

| Video time | Visible state | Consequence |
| --- | --- | --- |
| 00:00 | Version v1.07 dated 25 February; nine-node campaign map; six main-menu tabs | Confirms original release scope directly |
| 00:03 | Mission one: sole Solar Station 1; 500 minerals; HP 600; reserve 4; efficiency 30%; upgrade/recycle 200 | Confirms starting funds and distinguishes reserve from generation ratio |
| 00:04 | Solar upgraded; minerals 300; energy still 4, now 44% | Upgrade adds reserve capacity rather than free energy |
| 00:06 | Two incomplete miners, progress bars and solar links; funds 210 | Construction has a visible incomplete state |
| 00:15 | Mission-one timer 00:58; 380 mined at 17%; 880/min income; relay trunk and miners | Campaign mining goal differs from the separate 30,000-mineral challenge |
| 00:37 | Mission-two timer 00:00; several incomplete miners with progress bars placed around solar | Commands can be issued during pause, before simulation/construction advances |

A later batch that jumped beyond buffered video repeatedly showed a spinner/stale frame. Those snapshots were discarded as evidence; they do not establish later mission progress or timings.
