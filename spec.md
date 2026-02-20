# Shai-Hulud — Game Design Specification

## Game Overview

- **Title:** Shai-Hulud
- **Genre:** Arcade minigame collection
- **Theme:** Dune universe — sandworms, Fremen, Harkonnens
- **Aesthetic:** 16-bit pixel art, warm sand tones (amber, ochre, burnt orange, deep brown)
- **Platform:** Web browser, keyboard controls
- **Progression:** Arcade loop — complete all 3 levels, restart at higher difficulty

## Lives & Scoring

- Start with 3 lives
- Earn +1 life for each successful loop completion (safe dismount → new loop)
- Score accumulates across loops
- Game over when all lives are lost; high score displayed

## Level 1 — Mount the Worm (Side-Scrolling)

### Phase 1: Timing

Player stands in the desert. A sandworm surfaces and dives rhythmically from the right side of the screen. The player must time a jump (spacebar) to land on the worm's back during a safe window.

- **Mistimed jump:** Eaten or thrown off → lose a life

### Phase 2: Key Sequence (QTE)

Once on the worm, a quick-time event sequence appears. The player must hit the correct keys to plant maker hooks, grip on, and stand up.

- **Wrong keys or too slow:** Thrown off → lose a life

### Difficulty Scaling

- Worm surfaces for shorter windows each loop
- QTE sequences get longer and faster

## Level 2 — Ride the Worm (Top-Down, Open Desert)

### Mechanic

Player steers the worm freely across an open desert using arrow keys or WASD. The worm has momentum-based turning (wider turning radius at speed).

### Objective

Eat Harkonnen soldiers and their machines (harvesters, ornithopters) that spawn in waves.

### Scoring

- Points per enemy eaten
- Combos for quick successive kills

### Level End

Reach a target score or survive a set number of waves to advance.

### Difficulty Scaling

- Worm grows larger each loop (harder to maneuver, wider turning radius)
- Enemies move faster and spawn in greater numbers

## Level 3 — Dismount the Worm (Top-Down)

### Mechanic

The worm is diving back into the sand. The player must time a jump to land on a safe zone on the desert surface.

### Hazards

- Rocks
- Quicksand patches
- Spice blow geysers

### Difficulty Scaling

- Safe landing zone shrinks each loop
- More hazards appear around the landing area

### Success

Land safely → earn +1 life → start next loop at increased difficulty.

### Failure

Miss the safe zone → lose a life. If lives remain, retry Level 3.

## Audio

- Chiptune background music synthesized via Web Audio API
- Different music theme per level
- SFX:
  - Worm rumble (low-frequency oscillation)
  - Jump
  - Hook plant
  - Eating enemies
  - Death
  - Level transitions

## Screens

### Title Screen

- Game title ("SHAI-HULUD" in pixel font)
- "Press any key to start"
- High score display

### Game Over Screen

- Final score
- High score
- "Press any key to restart"

### HUD (In-Game)

- Lives (top-left)
- Score (top-right)
- Current loop number (top-center)
- Minimal overlay — don't obscure gameplay
