# Shai-Hulud — Implementation Roadmap

## Milestone 1: Scaffold & Game Loop

- [ ] Set up project structure (`index.html`, `src/` directory)
- [ ] Implement core game loop (`requestAnimationFrame`, delta time)
- [ ] Create state machine (title → level1 → level2 → level3 → loop/gameover)
- [ ] Render a colored background to confirm Canvas works
- [ ] Basic input handler (keyboard events)
- [ ] Config module with initial game constants

## Milestone 2: Level 1 — Mount the Worm

- [ ] Side-scrolling desert scene with parallax sand dunes
- [ ] Worm sprite animation (surface, ride, dive cycle)
- [ ] Player sprite (standing, running, jumping)
- [ ] Phase 1: Timing-based jump mechanic
- [ ] Phase 2: QTE key sequence mechanic
- [ ] Death/success transitions
- [ ] Difficulty scaling hooks (shorter safe windows, longer QTEs per loop)

## Milestone 3: Level 2 — Ride the Worm

- [ ] Top-down desert scene with scrolling terrain
- [ ] Worm steering with arrow keys / WASD (momentum-based turning)
- [ ] Harkonnen soldier sprites + movement AI (flee/patrol)
- [ ] Machine sprites (harvesters, ornithopters) + movement
- [ ] Wave spawning system
- [ ] Collision detection (worm mouth → enemies)
- [ ] Score tracking + combo system
- [ ] Level completion condition (target score or wave count)
- [ ] Difficulty scaling hooks (worm size growth, faster/more enemies per loop)

## Milestone 4: Level 3 — Dismount the Worm

- [ ] Top-down scene with worm diving animation
- [ ] Safe zone rendering (shrinks per loop)
- [ ] Hazard placement (rocks, quicksand, geysers)
- [ ] Jump timing mechanic + landing detection
- [ ] Success → award life, increment loop, increase difficulty
- [ ] Failure → lose life, retry or game over

## Milestone 5: Screens & HUD

- [ ] Title screen with pixel art title text
- [ ] Game over screen with score display
- [ ] In-game HUD (lives, score, loop counter)
- [ ] High score persistence (localStorage)
- [ ] Screen transitions (fade or wipe)

## Milestone 6: Audio

- [ ] Web Audio API chiptune synthesizer module
- [ ] Background music per level (simple looping melodies)
- [ ] SFX triggers for game events (jump, hook, eat, death, transitions)
- [ ] Volume control / mute toggle

## Milestone 7: Polish

- [ ] Screen shake on hits and deaths
- [ ] Flash effects on damage
- [ ] Particle effects (sand kicked up, spice dust clouds)
- [ ] Difficulty curve tuning across loops
- [ ] Playtesting and balancing
