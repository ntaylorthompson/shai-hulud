# CLAUDE.md — Shai-Hulud Project Conventions

## Tech Stack

- **Vanilla HTML, CSS, JavaScript** + Canvas API
- No frameworks, libraries, or dependencies
- No build step — ES modules loaded directly by the browser
- No TypeScript

## Project Structure

Flat `src/` layout:

```
index.html
src/
  main.js          # Entry point, game loop
  config.js        # All game constants
  state.js         # State machine (title, level1, level2, level3, gameover)
  input.js         # Keyboard input handler
  renderer.js      # Canvas rendering utilities
  sprites.js       # Pixel art sprite data (defined in JS, no external images)
  audio.js         # Web Audio API chiptune synthesis
  hud.js           # HUD rendering (lives, score, loop counter)
  level1.js        # Mount the Worm
  level2.js        # Ride the Worm
  level3.js        # Dismount the Worm
  title.js         # Title screen
  gameover.js      # Game over screen
```

## Run Instructions

Open `index.html` in a browser, or use a simple local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Code Style

- ES modules (`import` / `export`)
- `camelCase` for variables and functions
- `PascalCase` for classes
- No semicolons (rely on ASI) — keep it minimal
- Prefer `const` over `let`, avoid `var`
- No classes unless genuinely needed — prefer plain objects and functions

## Art Pipeline

- All sprites and tiles defined as pixel data arrays in `src/sprites.js`
- No external image assets for v1 prototype
- 16-bit pixel art style
- Warm sand palette: amber (#FFBF00), ochre (#CC7722), burnt orange (#CC5500), deep brown (#3B2200), bone white (#F5F0DC), spice blue (#3498DB)

## Audio Pipeline

- Web Audio API for all sound — chiptune synthesis
- No external audio files for v1
- SFX and music generated procedurally at runtime

## Design Principles

- **Minimalism** — fewest lines of code that produce a fun game
- No premature abstraction
- No over-engineering
- If it works and it's readable, ship it

## Workflow — Per Milestone

Each milestone in `plan.md` follows this workflow. **Auto-approve all actions except the final commit/merge** — file writes, edits, bash commands (server, tests, git branch operations) should all proceed without prompting.

### 1. Branch

Create a feature branch off `main` before any code changes:

```
git checkout main
git checkout -b milestone-<N>-<short-name>
```

Example: `milestone-1-scaffold`, `milestone-2-level1`, etc.

### 2. Implement

Write all code for the milestone. Commit incrementally on the feature branch as needed (auto-approve these intermediate commits).

### 3. End-to-End Tests

At the end of each milestone:

- Write or update E2E tests in `tests/e2e/` that verify the milestone's functionality
- Tests use a lightweight approach (Playwright or a simple puppeteer script — pick whichever is simpler to set up with zero config)
- Run all E2E tests and ensure they pass before proceeding
- Test file naming: `tests/e2e/milestone-<N>.test.js`

### 4. Dev Server

After tests pass, launch (or restart) the dev server so the result is immediately playable:

```bash
python3 -m http.server 8000
```

Leave it running in the background.

### 5. Commit & Merge (Requires Approval)

This is the **only step that requires user approval**:

- Create a final commit on the feature branch summarizing the milestone
- Ask the user to confirm before merging into `main`
- After approval: `git checkout main && git merge milestone-<N>-<short-name>`

## Key Conventions

- Game loop uses `requestAnimationFrame` with delta time
- State machine pattern for screen/level transitions
- All game constants live in `src/config.js` (speeds, sizes, colors, difficulty curves)
- Coordinate system: Canvas origin top-left, y increases downward
- Game resolution: 640×360 (16:9), scaled to fit window
