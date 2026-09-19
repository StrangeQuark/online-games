# Gameplay iteration acceptance checklist

This is the active September 6 polish goal. Previous launch tests establish only the earlier scope; they do not prove these requirements.

- [x] Chess: hovering, focusing, selecting, moving, and capturing never hide pieces; verify rendered pixels and normal play.
- [x] Chess: clear legal/check/promotion/end states, useful AI, smooth movement/captures and keyboard/mobile interaction.
- [x] Checkers: improve AI, forced captures and chains, animation, clear outcomes, two-browser play.
- [x] Solitaire: polish dealing/turnover/drag/undo/auto-home, hints and outcomes, independent shared-deal race, mobile interaction.
- [x] Rift: actual 3D geometry and collision, mouse pitch/yaw, jump/gravity/landing, connected upper floors via ramps/stairs.
- [x] Rift: rich arena composition, lighting/materials, cover and strategic paths, animated weapon/opponents/effects.
- [x] Rift: multiple functional weapons and ammo/armor/health spawns with respawn, distinct combat and damage effects.
- [x] Rift: playable bots navigating levels, multiplayer movement/aiming/jump/fire/pickups and full round outcomes.
- [x] Starfall: source-backed feature inventory and explicit uncertainty notes for unrecoverable original balance/maps.
- [x] Starfall: original structure costs/upgrades and branching Basic/Pulser/THEL, proper roles and missile interception.
- [x] Starfall: independent solar networks, finite reserves/energy stores, constrained relay links, construction/upgrade energy and time.
- [x] Starfall: finite asteroids, original-paced mining, mineral missile ammunition, repair drones, faithful recycling.
- [x] Starfall: distinct fighter/missile/suicide/ringer/swarm/mothership/attack-fighter enemies with actual mechanics.
- [x] Starfall: training, nine campaign objectives, mining difficulties, endless survival, selectable waves, speed mining and sandbox.
- [x] Starfall: pause/speed controls, construction while paused, smooth pan/zoom, minimap, selection details, hotkeys, incoming-wave cues and settings.
- [x] Starfall: meaningful strategy playtests including long objectives, all new units/enemies/modes and multiplayer.
- [x] Full regression, screenshots, packaged build, documentation and requirement-by-requirement audit.

Do not mark the goal complete from the earlier tests or from a narrower subset of these outcomes. Where original details cannot be verified, implement the closest evidenced behavior and document the approximation precisely.

Final evidence: [validation](VALIDATION.md), [source inventory](SPACE_GAME_REFERENCE.md), [nine campaign completions](starfall-campaign-validation.json), and updated screenshots. All listed acceptance checks are covered; original maps/scripts and unverified timing values remain precisely documented reconstructions.

## Rift arena and movement expansion

- [x] Expanded Foundry and three unique maps, all sharing visible and collision geometry.
- [x] Six functional weapons, including traveling plasma, a precision rail rifle and bouncing grenades.
- [x] Sprint stamina, temporary overdrive/cloak/jetpack pickups and clear resource/perk HUD.
- [x] Anatomical armored characters, six detailed weapon models, articulated animations and pooled effects.
- [x] Host arena selection, friends-only/practice toggle, round-tagged inputs and shared perk/pickup state.
- [x] 60 Rift engine/map tests, 18 Rift/shared E2E scenarios, reviewed desktop/touch imagery and packaged multiplayer smoke check.
