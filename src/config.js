// Game constants — all tunable values live here

export const GAME_WIDTH = 640
export const GAME_HEIGHT = 360

export const COLORS = {
  sand: '#d4b483',
  ochre: '#a08050',
  burntOrange: '#8b6030',
  deepBrown: '#2c1a0a',
  bone: '#e8dcc8',
  spiceBlue: '#5a7a8a',
  black: '#0f0a05',
  skyTop: '#1a1208',
  skyHorizon: '#c4a060',
  harkonnen: '#1a1a1e',
  harkAccent: '#4a1010',
  wormSkin: '#8a7560',
  wormMouth: '#5a4030',
  wormTooth: '#c8b898',
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
  playerStartX: 100,
  playerGroundY: 280,
  playerSpeed: 200,
  jumpVelocity: -400,
  gravity: 900,

  // Worm cycle timing (seconds)
  wormCycleDuration: 3.0,    // total surface+dive cycle
  wormSafeWindowBase: 1.4,   // safe landing window at loop 1 (generous start)
  wormSafeWindowMin: 0.35,   // minimum safe window at high loops
  wormSafeWindowDecay: 0.12, // shrink per loop

  // Worm geometry
  wormSegments: 8,
  wormSegmentSize: 40,
  wormY: 260,

  // QTE
  qteKeysBase: 3,            // keys required at loop 1
  qteKeysPerLoop: 1,         // additional keys per loop
  qteKeysMax: 8,
  qteTimeBase: 3.5,          // seconds to complete QTE at loop 1 (generous start)
  qteTimeMin: 1.2,
  qteTimeDecay: 0.25,
  qtePool: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],

  // Death pause
  deathPause: 1.5,
  successPause: 1.0,
}

// Level 2 — Ride the Worm
export const L2 = {
  // Worm
  wormSpeed: 150,
  wormTurnSpeed: 2.5,
  wormBaseLength: 6,
  wormGrowthPerLoop: 2,
  wormMaxLength: 20,
  wormSegmentSize: 20,
  wormTurnRadiusGrowth: 0.15,  // turn speed penalty per extra segment

  // Enemies
  soldierSpeed: 40,
  harvesterSpeed: 25,
  ornithopterSpeed: 70,
  soldierPoints: 10,
  harvesterPoints: 25,
  ornithopterPoints: 50,

  // Waves
  wavesBase: 3,
  wavesPerLoop: 1,
  wavesMax: 8,
  enemiesPerWaveBase: 4,
  enemiesPerWaveGrowth: 2,
  waveInterval: 5.0,         // seconds between waves
  enemySpeedMultPerLoop: 0.15,

  // Combo
  comboWindow: 1.5,           // seconds to chain kills
  comboMultiplier: 0.5,       // extra multiplier per combo step

  // Level end
  successPause: 2.0,
}

// Level 3 — Dismount the Worm
export const L3 = {
  // Worm dive
  wormDiveDuration: 4.0,      // seconds before worm fully submerges
  wormStartRadius: 120,
  wormShrinkRate: 25,         // pixels per second the worm visual shrinks

  // Safe zone
  safeZoneBaseRadius: 60,
  safeZoneShrinkPerLoop: 8,
  safeZoneMinRadius: 20,

  // Jump
  jumpChargeRate: 1.0,        // fill rate (0→1 in 1 second)
  jumpMaxPower: 280,          // max distance in pixels
  playerSpeed: 120,           // directional aiming speed

  // Hazards
  rockCountBase: 3,
  rockCountPerLoop: 2,
  quicksandCountBase: 1,
  quicksandCountPerLoop: 1,
  geyserCountBase: 0,
  geyserCountPerLoop: 1,
  geyserInterval: 2.0,       // eruption cycle in seconds
  geyserDangerDuration: 0.8,

  // Timing
  deathPause: 1.5,
  successPause: 1.5,
}
