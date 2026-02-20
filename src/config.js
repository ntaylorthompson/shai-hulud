// Game constants — all tunable values live here

export const GAME_WIDTH = 640
export const GAME_HEIGHT = 360

export const COLORS = {
  sand: '#FFBF00',
  ochre: '#CC7722',
  burntOrange: '#CC5500',
  deepBrown: '#3B2200',
  bone: '#F5F0DC',
  spiceBlue: '#3498DB',
  black: '#0a0800',
}

export const STATES = {
  TITLE: 'title',
  LEVEL1: 'level1',
  LEVEL2: 'level2',
  LEVEL3: 'level3',
  GAMEOVER: 'gameover',
}

export const INITIAL_LIVES = 3
export const TARGET_FPS = 60

// Level 1 — Mount the Worm
export const L1 = {
  // Parallax scroll speeds
  duneSpeedFar: 20,
  duneSpeedNear: 40,
  groundSpeed: 60,

  // Player
  playerX: 100,
  playerGroundY: 280,
  jumpVelocity: -400,
  gravity: 900,

  // Worm cycle timing (seconds)
  wormCycleDuration: 3.0,    // total surface+dive cycle
  wormSafeWindowBase: 1.2,   // safe landing window at loop 1
  wormSafeWindowMin: 0.4,    // minimum safe window at high loops
  wormSafeWindowDecay: 0.1,  // shrink per loop

  // Worm geometry
  wormSegments: 8,
  wormSegmentSize: 40,
  wormY: 260,

  // QTE
  qteKeysBase: 3,            // keys required at loop 1
  qteKeysPerLoop: 1,         // additional keys per loop
  qteKeysMax: 8,
  qteTimeBase: 3.0,          // seconds to complete QTE at loop 1
  qteTimeMin: 1.5,
  qteTimeDecay: 0.2,
  qtePool: ['KeyA', 'KeyS', 'KeyD', 'KeyW', 'KeyJ', 'KeyK', 'KeyL'],

  // Death pause
  deathPause: 1.5,
  successPause: 1.0,
}
