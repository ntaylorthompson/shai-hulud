// Level 2 — Ride the Worm (top-down, open desert)
// Steer the worm to eat Harkonnen soldiers, harvesters, ornithopters

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L2 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { isDown } from './input.js'
import { switchState } from './state.js'
import { game, addScore } from './game.js'

let worm          // { segments: [{x,y}], angle, speed }
let enemies       // [{x, y, type, vx, vy, alive}]
let wave, totalWaves, waveTimer, enemiesRemaining
let comboCount, comboTimer
let sandTiles     // background texture
let phase         // 'play' | 'success'
let phaseTimer

function spawnEnemy(type) {
  // Spawn from edges
  const edge = Math.floor(Math.random() * 4)
  let x, y
  if (edge === 0) { x = Math.random() * GAME_WIDTH; y = -20 }
  else if (edge === 1) { x = GAME_WIDTH + 20; y = Math.random() * GAME_HEIGHT }
  else if (edge === 2) { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + 20 }
  else { x = -20; y = Math.random() * GAME_HEIGHT }

  const speedMult = 1 + L2.enemySpeedMultPerLoop * (game.loop - 1)
  let speed
  if (type === 'soldier') speed = L2.soldierSpeed * speedMult
  else if (type === 'harvester') speed = L2.harvesterSpeed * speedMult
  else speed = L2.ornithopterSpeed * speedMult

  // Move toward center initially
  const dx = GAME_WIDTH / 2 - x
  const dy = GAME_HEIGHT / 2 - y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  enemies.push({ x, y, type, vx: (dx / dist) * speed, vy: (dy / dist) * speed, alive: true })
}

function spawnWave() {
  const count = L2.enemiesPerWaveBase + L2.enemiesPerWaveGrowth * (game.loop - 1)
  const types = ['soldier', 'soldier', 'soldier', 'harvester', 'ornithopter']
  for (let i = 0; i < count; i++) {
    spawnEnemy(types[Math.floor(Math.random() * types.length)])
  }
  enemiesRemaining += count
}

function generateSandTiles() {
  const tiles = []
  for (let i = 0; i < 60; i++) {
    tiles.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      r: 2 + Math.random() * 4,
      c: Math.random() > 0.5 ? '#b8860b' : '#daa520',
    })
  }
  return tiles
}

export const level2 = {
  enter() {
    const segCount = Math.min(L2.wormBaseLength + L2.wormGrowthPerLoop * (game.loop - 1), L2.wormMaxLength)
    const segments = []
    for (let i = 0; i < segCount; i++) {
      segments.push({ x: GAME_WIDTH / 2 - i * L2.wormSegmentSize, y: GAME_HEIGHT / 2 })
    }
    worm = { segments, angle: 0, speed: L2.wormSpeed }

    enemies = []
    wave = 0
    totalWaves = Math.min(L2.wavesBase + L2.wavesPerLoop * (game.loop - 1), L2.wavesMax)
    waveTimer = 0
    enemiesRemaining = 0
    comboCount = 0
    comboTimer = 0
    sandTiles = generateSandTiles()
    phase = 'play'
    phaseTimer = 0

    // Spawn first wave immediately
    spawnWave()
    wave = 1
  },

  update(dt) {
    if (phase === 'success') {
      phaseTimer += dt
      if (phaseTimer >= L2.successPause) {
        switchState('level3')
      }
      return
    }

    // Steering
    const segCount = worm.segments.length
    const turnPenalty = Math.max(0, (segCount - L2.wormBaseLength) * L2.wormTurnRadiusGrowth)
    const turnSpeed = Math.max(L2.wormTurnSpeed - turnPenalty, 0.8)

    if (isDown('ArrowLeft') || isDown('KeyA')) worm.angle -= turnSpeed * dt
    if (isDown('ArrowRight') || isDown('KeyD')) worm.angle += turnSpeed * dt

    // Move head
    const head = worm.segments[0]
    head.x += Math.cos(worm.angle) * worm.speed * dt
    head.y += Math.sin(worm.angle) * worm.speed * dt

    // Wrap around screen
    if (head.x < -20) head.x = GAME_WIDTH + 20
    if (head.x > GAME_WIDTH + 20) head.x = -20
    if (head.y < -20) head.y = GAME_HEIGHT + 20
    if (head.y > GAME_HEIGHT + 20) head.y = -20

    // Body follows head
    for (let i = 1; i < worm.segments.length; i++) {
      const prev = worm.segments[i - 1]
      const seg = worm.segments[i]
      const dx = prev.x - seg.x
      const dy = prev.y - seg.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > L2.wormSegmentSize) {
        const ratio = L2.wormSegmentSize / dist
        seg.x = prev.x - dx * ratio
        seg.y = prev.y - dy * ratio
      }
    }

    // Combo timer
    if (comboTimer > 0) {
      comboTimer -= dt
      if (comboTimer <= 0) comboCount = 0
    }

    // Enemy movement + collision
    for (const e of enemies) {
      if (!e.alive) continue

      // Soldiers flee from worm head
      if (e.type === 'soldier') {
        const dx = e.x - head.x
        const dy = e.y - head.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          const speedMult = 1 + L2.enemySpeedMultPerLoop * (game.loop - 1)
          const fleeSpeed = L2.soldierSpeed * speedMult * 1.5
          e.vx = (dx / dist) * fleeSpeed
          e.vy = (dy / dist) * fleeSpeed
        }
      }

      e.x += e.vx * dt
      e.y += e.vy * dt

      // Bounce off edges (except soldiers fleeing off-screen — let them go but respawn)
      if (e.x < 0 || e.x > GAME_WIDTH) e.vx *= -1
      if (e.y < 0 || e.y > GAME_HEIGHT) e.vy *= -1
      e.x = Math.max(-30, Math.min(GAME_WIDTH + 30, e.x))
      e.y = Math.max(-30, Math.min(GAME_HEIGHT + 30, e.y))

      // Collision with worm head (mouth)
      const cdx = head.x - e.x
      const cdy = head.y - e.y
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy)
      const eatRadius = L2.wormSegmentSize * 0.8
      if (cdist < eatRadius) {
        e.alive = false
        enemiesRemaining--

        // Score with combo
        comboCount++
        comboTimer = L2.comboWindow
        const basePoints = e.type === 'soldier' ? L2.soldierPoints :
                          e.type === 'harvester' ? L2.harvesterPoints : L2.ornithopterPoints
        const multiplier = 1 + (comboCount - 1) * L2.comboMultiplier
        addScore(Math.round(basePoints * multiplier))
      }
    }

    // Remove dead enemies
    enemies = enemies.filter(e => e.alive)

    // Wave spawning
    waveTimer += dt
    if (wave < totalWaves && waveTimer >= L2.waveInterval) {
      waveTimer = 0
      spawnWave()
      wave++
    }

    // Win condition: all waves spawned and all enemies eaten
    if (wave >= totalWaves && enemies.length === 0) {
      phase = 'success'
      phaseTimer = 0
    }
  },

  render() {
    const ctx = getCtx()

    // Desert background
    clear(COLORS.sand)

    // Sand texture tiles
    for (const t of sandTiles) {
      ctx.fillStyle = t.c
      ctx.beginPath()
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue
      if (e.type === 'soldier') {
        // Small red figure
        ctx.fillStyle = '#8b0000'
        ctx.fillRect(e.x - 4, e.y - 6, 8, 12)
        ctx.fillStyle = '#cc0000'
        ctx.fillRect(e.x - 3, e.y - 9, 6, 4)
      } else if (e.type === 'harvester') {
        // Large boxy machine
        ctx.fillStyle = '#555'
        ctx.fillRect(e.x - 12, e.y - 8, 24, 16)
        ctx.fillStyle = '#888'
        ctx.fillRect(e.x - 10, e.y - 6, 20, 12)
        // Tracks
        ctx.fillStyle = '#333'
        ctx.fillRect(e.x - 13, e.y + 6, 26, 3)
      } else {
        // Ornithopter — diamond shape
        ctx.fillStyle = '#666'
        ctx.beginPath()
        ctx.moveTo(e.x, e.y - 10)
        ctx.lineTo(e.x + 14, e.y)
        ctx.lineTo(e.x, e.y + 6)
        ctx.lineTo(e.x - 14, e.y)
        ctx.closePath()
        ctx.fill()
        // Wings
        ctx.fillStyle = '#999'
        ctx.fillRect(e.x - 16, e.y - 2, 32, 4)
      }
    }

    // Worm body (draw from tail to head)
    for (let i = worm.segments.length - 1; i >= 0; i--) {
      const seg = worm.segments[i]
      const radius = L2.wormSegmentSize / 2 - i * 0.3
      ctx.fillStyle = i === 0 ? COLORS.deepBrown : COLORS.burntOrange
      ctx.beginPath()
      ctx.arc(seg.x, seg.y, Math.max(radius, 5), 0, Math.PI * 2)
      ctx.fill()
    }

    // Worm mouth (head)
    const head = worm.segments[0]
    ctx.fillStyle = COLORS.deepBrown
    ctx.beginPath()
    ctx.arc(head.x + Math.cos(worm.angle) * 8, head.y + Math.sin(worm.angle) * 8, 8, 0, Math.PI * 2)
    ctx.fill()
    // Teeth
    ctx.fillStyle = COLORS.bone
    for (let i = 0; i < 4; i++) {
      const a = worm.angle + (i - 1.5) * 0.5
      ctx.beginPath()
      ctx.arc(head.x + Math.cos(a) * 14, head.y + Math.sin(a) * 14, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Combo display
    if (comboCount > 1 && comboTimer > 0) {
      drawText(`${comboCount}x COMBO!`, GAME_WIDTH / 2, GAME_HEIGHT - 40, {
        color: '#ff4444',
        size: 20,
      })
    }

    // Wave counter
    drawText(`Wave ${Math.min(wave, totalWaves)}/${totalWaves}`, GAME_WIDTH / 2, 20, {
      color: COLORS.deepBrown,
      size: 14,
    })

    // Enemies remaining
    drawText(`Enemies: ${enemies.length}`, GAME_WIDTH / 2, 38, {
      color: COLORS.deepBrown,
      size: 12,
    })

    // Success
    if (phase === 'success') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText('ALL HARKONNENS DEVOURED!', GAME_WIDTH / 2, GAME_HEIGHT / 2, {
        color: '#44ff44',
        size: 24,
      })
    }
  },
}
