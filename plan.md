# Shai-Hulud — Implementation Roadmap

## Milestone 1: Scaffold & Game Loop

- [x] Set up project structure (`index.html`, `src/` directory)
- [x] Implement core game loop (`requestAnimationFrame`, delta time)
- [x] Create state machine (title → level1 → level2 → level3 → loop/gameover)
- [x] Render a colored background to confirm Canvas works
- [x] Basic input handler (keyboard events)
- [x] Config module with initial game constants

## Milestone 2: Level 1 — Mount the Worm

- [x] Side-scrolling desert scene with parallax sand dunes
- [x] Worm sprite animation (surface, ride, dive cycle)
- [x] Player sprite (standing, running, jumping)
- [x] Phase 1: Timing-based jump mechanic
- [x] Phase 2: QTE key sequence mechanic
- [x] Death/success transitions
- [x] Difficulty scaling hooks (shorter safe windows, longer QTEs per loop)

## Milestone 3: Level 2 — Ride the Worm

- [x] Top-down desert scene with scrolling terrain
- [x] Worm steering with arrow keys / WASD (momentum-based turning)
- [x] Harkonnen soldier sprites + movement AI (flee/patrol)
- [x] Machine sprites (harvesters, ornithopters) + movement
- [x] Wave spawning system
- [x] Collision detection (worm mouth → enemies)
- [x] Score tracking + combo system
- [x] Level completion condition (target score or wave count)
- [x] Difficulty scaling hooks (worm size growth, faster/more enemies per loop)

## Milestone 4: Level 3 — Dismount the Worm

- [x] Top-down scene with worm diving animation
- [x] Safe zone rendering (shrinks per loop)
- [x] Hazard placement (rocks, quicksand, geysers)
- [x] Jump timing mechanic + landing detection
- [x] Success → award life, increment loop, increase difficulty
- [x] Failure → lose life, retry or game over

## Milestone 5: Screens & HUD

- [x] Title screen with pixel art title text
- [x] Game over screen with score display
- [x] In-game HUD (lives, score, loop counter)
- [x] High score persistence (localStorage)
- [x] Screen transitions (fade or wipe)

## Milestone 6: Audio

- [x] Web Audio API chiptune synthesizer module
- [x] Background music per level (simple looping melodies)
- [x] SFX triggers for game events (jump, hook, eat, death, transitions)
- [x] Volume control / mute toggle

## Milestone 7: Polish

- [x] Screen shake on hits and deaths
- [x] Flash effects on damage
- [x] Particle effects (sand kicked up, spice dust clouds)
- [x] Difficulty curve tuning across loops
- [x] Playtesting and balancing
