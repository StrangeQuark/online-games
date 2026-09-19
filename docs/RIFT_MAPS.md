# Rift arenas

All four layouts are original. Rendering, movement, weapon collision, item placement and bot navigation use the same geometry in `frontend/src/games/custom/rift/map.ts`. A map is selected before a round and travels with the host's match state.

| Arena | Size | Playable levels | Character and routes |
| --- | --- | --- | --- |
| Ion Foundry | 58 × 50 m | Ground, 4.5 m | The original reactor hall retains its ramps, stairs, seven spawn locations and pickups. Wider north galleries connect two added maintenance wings; their own ramps and outer ground lanes give players another way around the reactor crossfire. |
| Mosswater Aqueduct | 56 × 68 m | Ground, 5 m | Twin stone aqueducts run north–south above a garden floor. Two crossbridges make an elevated loop; opposing southern approaches and a separate northern stair create three routes up. Broken walls interrupt the ground lanes. |
| Ember Citadel | 62 × 62 m | Ground, 3 m, 6 m | A central courtyard offers a short ramp and stair route to the battlements. Long east and west galleries have broad, opposing ramps at the southern end. The lower perimeter provides a sheltered route behind the fortress. |
| Orbital Array | 64 × 64 m | Ground, 4 m, 7.5 m | Four docking pads surround a command hub, joined by a ring and cross-spokes. Each outer pad has a ramp from the service floor; a short inner stair reaches the observation platform. The ground floor and raised ring support different rotations. |

Each map includes scatterguns, rockets, plasma, a rail rifle, a grenade launcher, health, ammunition, armor, speed, invisibility and a jetpack. The ion carbine remains starting equipment. Powerful equipment occupies different routes: the Foundry rail rifle sits in its east maintenance gallery; the Aqueduct rail rifle watches a long northern waterway; the Citadel rail rifle controls the highest north gallery; the Orbital jetpack is contested on the observation platform.

## Useful walkthroughs

Coordinates use X east, Z south and Y height. Initial spawns face north. These are routes through the actual level, without teleporting or developer controls.

- **Foundry maintenance loop:** From the initial southwest spawn, step south to Z15, west to X−24, then north to the plasma pickup at (−24, 0, 12). Continue up the maintenance ramp to the upper west wing. Go around the cover at X−26 to the north gallery at Z−20, then cross through the jetpack to the east wing and rail rifle. The ground lane outside X±27.5 bypasses both maintenance ramps and reaches the speed and invisibility pickups beneath the north deck.
- **Citadel courtyard climb:** From (−25, 0, 27), move south to Z28, then east to X0 for speed. Walk north up the courtyard ramp to plasma at (0, 3, 0), continue to the jetpack at (0, 3, −6), then climb the north stair to the rail rifle at (0, 6, −23). The grenade launcher lies on the east battlement near (22, 6, 16).
- **Aqueduct north approach:** Use the outside garden lane to reach Z−32.5, cross to X0 and climb south up the north stair. The bridge gives access to the jetpack and both aqueducts, while the elevated center crossing holds the grenade launcher.
- **Orbital observation climb:** Climb any outer docking ramp and follow the raised ring to the south bridge at (0, 4, 18). Walk north along the hub's south spoke, then climb the short observation stair to (0, 7.5, 0). Ground-level routes around the hub remain open when opponents control the platform.

## Verification

`map.test.ts` checks all four maps for supported item/spawn positions, standing clearance, complete equipment coverage and a connected navigation graph. Every advertised navigation edge is traversed in both directions using the actual player movement simulation, including continuous ramps, stair treads and platform transitions. It also covers both railing orientations and ramps that rise along either axis from an elevated base.

The engine integration tests start and respawn actors on each map, send bots up real routes to collect each arena's rail rifle, and simulate live fights to check movement, shooting, arena bounds and network packet size. Browser coverage is recorded in the main validation document.

## Equipment and movement

| Equipment | Role |
| --- | --- |
| Ion carbine | Starting automatic hitscan weapon; 24-round magazine. |
| Scattergun | Close-range pellet spread; six shells. |
| Rocket launcher | Traveling rockets with splash and self-damage; four rockets. |
| Plasma caster | Fast, dodgeable energy bolts; 36-round magazine. |
| Arc rail rifle | Precise 90-damage hitscan shot with a long recovery; three shots. |
| Breach launcher | Arcing grenades bounce off solid surfaces and explode after a 2.25-second fuse; five grenades. |

Hold Shift while moving to sprint. Sprinting uses stamina, stops while firing or reloading, and recovers when released. Overdrive lasts 18 seconds and increases movement speed. Phase cloak lasts 15 seconds; shooting exposes the wearer for 1.8 seconds and taking damage exposes them for 2.3 seconds. Nearby opponents can see a faint distortion. The vector jetpack lasts 22 seconds: hold Space after jumping to thrust, release it to recharge fuel, and land to recharge faster. Flight obeys real floors, ceilings and map bounds. Death removes temporary perks, and picking up another of the same type refreshes its timer instead of multiplying its strength.

The host can switch sentinels off before a round for quiet practice or a room containing only friends. Use **New match** to return to arena selection; guests follow the host's map and wait until the host enters. Number keys 1–6, Q and the mouse wheel select owned weapons. Touch controls include held sprint and jump/jetpack input.
