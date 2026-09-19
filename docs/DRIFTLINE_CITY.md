# Driftline: City Edition

Driftline now opens into Bellwether, a freely explorable 3D city. It replaces the original scrolling road game. There is no timer, automatic acceleration, or finish line.

## What changed

- A permanent Three.js world, approximately 1.4 km across: 64 blocks, 248 buildings, two parks, downtown towers, older shopfronts, an industrial quarter, and a waterfront promenade with boats.
- A modeled coupe with tapered glass, painted bodywork, mirrors, rotating wheels, front-wheel steering, rims, headlights, and working brake lights. Four paint colors are available.
- Generated road, paving, brick, stone, window, shop-sign, and number-plate textures. Golden hour, daylight, and blue hour lighting; detailed shadows, automatic adjustment on slower devices, and a performance setting.
- Free steering with speed-sensitive response, acceleration, coasting, braking, reverse, handbraking, off-road resistance, building/tree/traffic/boundary collision, and road recovery.
- City traffic follows right-hand lanes, waits at red signals, and stops behind the player or another vehicle. Traffic can be switched off.
- Chase, driver, and panorama cameras; a local minimap and larger destination map with routes along the street network.
- Six optional discoveries, a saved lifetime odometer, and a travel journal. Finish a drive of at least 100 metres from the pause screen to save a score. Discovery and odometer saves do not require finishing a drive.
- Keyboard, controller, and simultaneous touch pedals. Blur/visibility changes pause the simulation and release held controls.

The old road renderer attached trees and other scenery to projected road strips, with visibility depending on rounded strip heights. This could cause scenery to blink between visible and invisible while driving. The city uses fixed world coordinates and normal 3D depth testing. Road markings sit above the road surface; scenery placement never regenerates per frame.

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Accelerate | W / Up | Right trigger |
| Brake, then reverse | S / Down | Left trigger |
| Steer | A D / Left Right | Left stick |
| Handbrake | Space | A |
| Camera | C | Y |
| Pause | P / Escape | Start |
| Map | M | On-screen map button |
| Return to road | R | Pause menu |

City progress uses `afterhours:driftline-city-v1`; old time-trial records are left intact. Paint and motion preferences carry over. This is a stylized city driving game with simplified vehicle physics, rather than a licensed vehicle simulation.

## Validation

- 213 frontend tests pass, including 17 city-specific tests for acceleration, reverse, steering, pause, collision, recovery, road-constrained routing, continuous traffic turns, and deterministic scenery.
- The long packaged-browser tour finishes nine waypoints, drives **2.45 km**, and stops at the marina with **zero collisions and zero browser errors**, using the standard controller input path. [Park](screenshots/driftline-city-tour-4.png) · [Downtown](screenshots/driftline-city-tour-7.png) · [Waterfront](screenshots/driftline-city-tour-9.png).
- A 2.44 km simulated journey follows nine waypoints, discovers the park, downtown, and marina, and finishes without collisions.
- Six focused browser scenarios cover driving controls, controller input, map routes, preference persistence, saved mileage and scores, identical paused scene frames, renderer remounting, all lighting presets, multi-touch release/cancel, and landscape controls.
- Additional 320 px visual inspection checks the smaller HUD, responsive chase camera, and scrolling destination map.
- Frontend production build and executable Spring Boot packaging pass; all 10 backend tests pass.

Screenshots: [Golden hour](screenshots/driftline-city-golden.png), [blue hour](screenshots/driftline-city-blue.png), [driver camera](screenshots/driftline-city-hood.png), [panorama camera](screenshots/driftline-city-orbit.png), [320 px driving layout](screenshots/driftline-city-320-final.png), [phone map](screenshots/driftline-city-map-320.png).

The optional long browser tour is reproducible with `node e2e/driftline-tour.mjs` from `frontend/` after starting the packaged server on port 8080. It supplies ordinary controller inputs, follows a multi-neighborhood route, and saves screenshots under `/tmp/afterhours-playtest`. Set `TOUR_URL` to use another local server. No vehicle or world state is teleported or bypassed.

Rendering note: the long automated run used Chrome's **SwiftShader software WebGL** renderer and averaged about 170 ms per frame after adaptive detail engaged. This verifies the full route and rendering stability, but is not a hardware-accelerated frame-rate benchmark. Actual browser performance should be checked on the target GPU; the graphics selector and automatic adjustment are available for slower devices.

Final executable: `backend/target/arcade-0.0.1-SNAPSHOT.jar` (SHA-256 `c10ef57afe261efce92f39abdeae5c557011c6c5021fe6282694f4b4ea967665`). A final packaged-browser smoke check verifies WebGL startup, handbrake hold, acceleration, map opening, and Escape-to-pause behavior. Temporary website servers were stopped after testing.
