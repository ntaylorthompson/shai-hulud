// Level 2 — Ride the Worm (top-down, open desert)
// Steer the worm to eat Harkonnen soldiers, harvesters, ornithopters

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L2 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { isDown } from './input.js'
import { switchState } from './state.js'
import { game, addScore, loseLife } from './game.js'
import { renderHUD } from './hud.js'
import { playMusic, sfxEat, sfxSuccess, sfxDeath, setMusicIntensity } from './audio.js'
import { triggerShake, triggerFlash, spawnParticles, clearParticles } from './effects.js'

const W = GAME_WIDTH
const H = GAME_HEIGHT
const DANGER_RADIUS = 80       // proximity range for danger bonus / close call
const CLOSE_CALL_MIN = 2       // minimum dangerous enemies nearby for close call
const CLOSE_CALL_ESCAPE = 120  // distance to escape to trigger close call

let worm          // { segments: [{x,y}], angle, speed }
let enemies       // [{x, y, type, size, vx, vy, alive}]
let wave, totalWaves, waveTimer, enemiesRemaining
let comboCount, comboTimer
let sandTiles     // background texture
let phase         // 'play' | 'success' | 'death'
let phaseTimer
let animTimer
let deathMessage
let closeCallTimer    // countdown to display "CLOSE CALL"
let closeCallTracking // true when near 2+ dangerous enemies
let savedWorm, savedEnemies, savedWave, savedWaveTimer  // persist state on death

// Shortest distance accounting for screen wrap
function wrapDist(ax, ay, bx, by) {
  let dx = Math.abs(ax - bx)
  let dy = Math.abs(ay - by)
  if (dx > W / 2) dx = W - dx
  if (dy > H / 2) dy = H - dy
  return Math.sqrt(dx * dx + dy * dy)
}

// Shortest delta accounting for wrap
function wrapDelta(a, b, size) {
  let d = a - b
  if (d > size / 2) d -= size
  if (d < -size / 2) d += size
  return d
}

function spawnEnemy(type, size) {
  const edge = Math.floor(Math.random() * 4)
  let x, y
  if (edge === 0) { x = Math.random() * W; y = -20 }
  else if (edge === 1) { x = W + 20; y = Math.random() * H }
  else if (edge === 2) { x = Math.random() * W; y = H + 20 }
  else { x = -20; y = Math.random() * H }

  const speedMult = 1 + L2.enemySpeedMultPerLoop * (game.loop - 1)
  let speed
  if (type === 'soldier') speed = L2.soldierSpeed * speedMult
  else if (type === 'harvester') speed = L2.harvesterSpeed * speedMult
  else speed = L2.ornithopterSpeed * speedMult
  if (size === 'large') speed *= 0.7

  const dx = W / 2 - x
  const dy = H / 2 - y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  enemies.push({ x, y, type, size, vx: (dx / dist) * speed, vy: (dy / dist) * speed, alive: true })
}

// Fixed wave compositions: [deadly, edible] per wave
// Loop 1: [2,3], [1,2], [1,2]
// Loop 2: [3,3], [2,2], [1,2], [1,2]
// Loop 3+: same as loop 2 + one extra [1,2] per additional loop
function getWaveCompositions() {
  if (game.loop === 1) return [[2,3], [1,2], [1,2]]
  const waves = [[3,3], [2,2], [1,2], [1,2]]
  for (let i = 2; i < game.loop; i++) waves.push([1,2])
  return waves
}

function spawnWave() {
  const compositions = getWaveCompositions()
  const comp = compositions[Math.min(wave, compositions.length - 1)]
  const deadly = comp[0]
  const edible = comp[1]
  const types = ['soldier', 'soldier', 'soldier', 'harvester', 'ornithopter']
  for (let i = 0; i < deadly; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    spawnEnemy(type, 'large')
  }
  for (let i = 0; i < edible; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    spawnEnemy(type, 'small')
  }
  enemiesRemaining += deadly + edible
}

function generateSandTiles() {
  const tiles = []
  for (let i = 0; i < 60; i++) {
    tiles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 2 + Math.random() * 4,
      c: Math.random() > 0.5 ? '#8a7050' : '#9a8060',
    })
  }
  return tiles
}

function initWorm() {
  const segCount = Math.min(L2.wormBaseLength + L2.wormGrowthPerLoop * (game.loop - 1), L2.wormMaxLength)
  const segments = []
  for (let i = 0; i < segCount; i++) {
    segments.push({ x: W / 2 - i * L2.wormSegmentSize, y: H / 2 })
  }
  return { segments, angle: 0, speed: L2.wormSpeed }
}

// Count large enemies within DANGER_RADIUS of a point
function countNearbyDanger(x, y) {
  let count = 0
  for (const e of enemies) {
    if (!e.alive || e.size !== 'large') continue
    if (wrapDist(x, y, e.x, e.y) < DANGER_RADIUS) count++
  }
  return count
}

export const level2 = {
  enter() {
    worm = initWorm()
    enemies = []
    wave = 0
    totalWaves = getWaveCompositions().length
    waveTimer = 0
    enemiesRemaining = 0
    comboCount = 0
    comboTimer = 0
    sandTiles = generateSandTiles()
    phase = 'play'
    phaseTimer = 0
    animTimer = 0
    deathMessage = ''
    closeCallTimer = 0
    closeCallTracking = false
    savedWorm = null
    savedEnemies = null

    spawnWave()
    wave = 1
    playMusic('level2')
    clearParticles()
  },

  update(dt) {
    animTimer += dt
    if (phase === 'success') {
      phaseTimer += dt
      if (phaseTimer >= L2.successPause) {
        switchState('level3')
      }
      return
    }

    if (phase === 'death') {
      phaseTimer += dt
      if (phaseTimer >= 1.5) {
        if (game.lives >= 0) {
          // Resume with saved state instead of full restart
          worm = savedWorm || initWorm()
          if (savedEnemies) enemies = savedEnemies
          wave = savedWave || wave
          waveTimer = savedWaveTimer || 0
          phase = 'play'
          closeCallTracking = false
          closeCallTimer = 0
        } else {
          switchState('gameover')
        }
      }
      return
    }

    // Close call timer display
    if (closeCallTimer > 0) closeCallTimer -= dt

    // Steering
    const segCount = worm.segments.length
    const turnPenalty = Math.max(0, (segCount - L2.wormBaseLength) * L2.wormTurnRadiusGrowth)
    const turnSpeed = Math.max(L2.wormTurnSpeed - turnPenalty, 0.8)

    if (isDown('ArrowLeft') || isDown('KeyA')) worm.angle -= turnSpeed * dt
    if (isDown('ArrowRight') || isDown('KeyD')) worm.angle += turnSpeed * dt

    // Speed control — up/down to accelerate/brake
    const speedAccel = L2.wormSpeed * 1.5  // rate of speed change per second
    if (isDown('ArrowUp') || isDown('KeyW')) worm.speed += speedAccel * dt
    if (isDown('ArrowDown') || isDown('KeyS')) worm.speed -= speedAccel * dt
    worm.speed = Math.max(L2.wormSpeed * 0.5, Math.min(worm.speed, L2.wormSpeed * 1.5))

    // Move head
    const head = worm.segments[0]
    head.x += Math.cos(worm.angle) * worm.speed * dt
    head.y += Math.sin(worm.angle) * worm.speed * dt

    // Sand trail particles from tail
    if (Math.random() < 0.3) {
      const tail = worm.segments[worm.segments.length - 1]
      spawnParticles(tail.x, tail.y, 1, { color: '#d4a030', speedMax: 20, life: 0.4, sizeMax: 3 })
    }

    // Wrap head around screen (seamless)
    if (head.x < 0) head.x += W
    if (head.x > W) head.x -= W
    if (head.y < 0) head.y += H
    if (head.y > H) head.y -= H

    // Body follows head using wrap-aware deltas
    for (let i = 1; i < worm.segments.length; i++) {
      const prev = worm.segments[i - 1]
      const seg = worm.segments[i]
      const dx = wrapDelta(prev.x, seg.x, W)
      const dy = wrapDelta(prev.y, seg.y, H)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > L2.wormSegmentSize) {
        const ratio = L2.wormSegmentSize / dist
        seg.x = prev.x - dx * ratio
        seg.y = prev.y - dy * ratio
        // Keep in bounds
        if (seg.x < 0) seg.x += W
        if (seg.x > W) seg.x -= W
        if (seg.y < 0) seg.y += H
        if (seg.y > H) seg.y -= H
      }
    }

    // Combo timer
    if (comboTimer > 0) {
      comboTimer -= dt
      if (comboTimer <= 0) comboCount = 0
    }

    // Dynamic music intensity — rises with combo + danger proximity
    const dangerNearHead = countNearbyDanger(head.x, head.y)
    const comboIntensity = Math.min(comboCount * 0.15, 0.6)
    const dangerIntensity = Math.min(dangerNearHead * 0.2, 0.4)
    setMusicIntensity(comboIntensity + dangerIntensity)

    // Close call tracking — are we near 2+ large enemies?
    const nearbyDanger = countNearbyDanger(head.x, head.y)
    if (nearbyDanger >= CLOSE_CALL_MIN) {
      closeCallTracking = true
    } else if (closeCallTracking) {
      // Just escaped — award close call bonus
      closeCallTracking = false
      const bonus = 50 * nearbyDanger  // small but satisfying
      addScore(bonus)
      closeCallTimer = 1.2
      triggerFlash('#ffff00', 0.15)
    }

    // Enemy movement + collision
    for (const e of enemies) {
      if (!e.alive) continue

      // Soldiers flee from worm head (wrap-aware)
      if (e.type === 'soldier') {
        const d = wrapDist(e.x, e.y, head.x, head.y)
        if (d < 120) {
          const dx = wrapDelta(e.x, head.x, W)
          const dy = wrapDelta(e.y, head.y, H)
          const speedMult = 1 + L2.enemySpeedMultPerLoop * (game.loop - 1)
          const fleeSpeed = L2.soldierSpeed * speedMult * 1.5
          e.vx = (dx / d) * fleeSpeed
          e.vy = (dy / d) * fleeSpeed
        }
      }

      e.x += e.vx * dt
      e.y += e.vy * dt

      // Wrap around screen edges
      if (e.x < 0) e.x += W
      if (e.x > W) e.x -= W
      if (e.y < 0) e.y += H
      if (e.y > H) e.y -= H

      // Collision with worm head (mouth) — wrap-aware
      const cdist = wrapDist(head.x, head.y, e.x, e.y)
      const hitRadius = e.size === 'large' ? L2.wormSegmentSize * 1.2 : L2.wormSegmentSize
      if (cdist < hitRadius) {
        if (e.size === 'large') {
          // Save state before death so we can resume
          savedWorm = { segments: worm.segments.map(s => ({ ...s })), angle: worm.angle, speed: worm.speed }
          // Respawn worm at center for saved state
          const sw = initWorm()
          savedWorm = sw
          savedEnemies = enemies.filter(en => en !== e && en.alive).map(en => ({ ...en }))
          savedWave = wave
          savedWaveTimer = waveTimer

          e.alive = false
          enemiesRemaining--
          loseLife()
          sfxDeath()
          triggerShake(10, 0.5)
          triggerFlash('#ff0000', 0.3)
          spawnParticles(head.x, head.y, 20, { color: '#ff4444', speedMax: 100 })
          deathMessage = e.type === 'harvester' ? 'CRUSHED BY HARVESTER!' :
                         e.type === 'ornithopter' ? 'SHOT DOWN!' : 'AMBUSHED!'
          phase = 'death'
          phaseTimer = 0
          return
        } else {
          // Small enemy — eat it
          e.alive = false
          enemiesRemaining--
          sfxEat()
          spawnParticles(e.x, e.y, 10, { color: COLORS.burntOrange, speedMax: 60 })

          // Score with combo
          comboCount++
          comboTimer = L2.comboWindow
          const basePoints = e.type === 'soldier' ? L2.soldierPoints :
                            e.type === 'harvester' ? L2.harvesterPoints : L2.ornithopterPoints
          const multiplier = 1 + (comboCount - 1) * L2.comboMultiplier

          // Danger proximity bonus: 4x per nearby large enemy
          const nearDanger = countNearbyDanger(e.x, e.y)
          const dangerMultiplier = nearDanger > 0 ? Math.pow(4, nearDanger) : 1

          const points = Math.round(basePoints * multiplier * dangerMultiplier)
          addScore(points)

          if (nearDanger > 0) {
            triggerFlash('#ff8800', 0.1)
          }
        }
      }
    }

    // Remove dead enemies
    enemies = enemies.filter(e => e.alive)

    // Wave spawning
    const smallRemaining = enemies.filter(e => e.alive && e.size === 'small').length
    waveTimer += dt
    // Spawn next wave on timer, or immediately if all small enemies are already eaten
    if (wave < totalWaves && (waveTimer >= L2.waveInterval || smallRemaining === 0)) {
      waveTimer = 0
      spawnWave()
      wave++
    }

    // Win condition: all waves spawned and all edible (small) enemies eaten
    const smallNow = enemies.filter(e => e.alive && e.size === 'small').length
    if (wave >= totalWaves && smallNow === 0) {
      phase = 'success'
      phaseTimer = 0
      sfxSuccess()
      triggerShake(4, 0.3)
    }
  },

  render() {
    const ctx = getCtx()

    // Desert background — muted tan
    clear(COLORS.ochre)

    // Sand ripple texture — low contrast offset circles
    for (const t of sandTiles) {
      ctx.fillStyle = 'rgba(160, 128, 80, 0.25)'
      ctx.beginPath()
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(140, 110, 60, 0.15)'
      ctx.beginPath()
      ctx.arc(t.x + 2, t.y + 1, t.r * 0.7, 0, Math.PI * 2)
      ctx.fill()
    }

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue
      drawEnemy(ctx, e)
    }

    // Worm body (draw from tail to head) — with wrap rendering
    for (let i = worm.segments.length - 1; i >= 0; i--) {
      const seg = worm.segments[i]
      const radius = L2.wormSegmentSize / 2 - i * 0.3
      const r = Math.max(radius, 5)
      drawWrapped(ctx, seg.x, seg.y, r + 2, (cx, cy) => {
        // Base segment
        ctx.fillStyle = COLORS.wormSkin
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        // Inner shadow
        ctx.fillStyle = '#6a5a48'
        ctx.beginPath()
        ctx.arc(cx + 0.5, cy + 1, r * 0.6, 0, Math.PI * 2)
        ctx.fill()
        // Highlight
        ctx.fillStyle = 'rgba(200, 185, 155, 0.3)'
        ctx.beginPath()
        ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.35, 0, Math.PI * 2)
        ctx.fill()
      })
      // Ring ridges between segments
      if (i > 0 && i < worm.segments.length) {
        const prev = worm.segments[i - 1]
        const midX = (seg.x + prev.x) / 2
        const midY = (seg.y + prev.y) / 2
        drawWrapped(ctx, midX, midY, r, (cx, cy) => {
          ctx.strokeStyle = '#5a4a38'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
          ctx.stroke()
        })
      }
    }

    // Worm mouth (head) — full circular baleen (top-down)
    const head = worm.segments[0]
    const mouthX = head.x + Math.cos(worm.angle) * 8
    const mouthY = head.y + Math.sin(worm.angle) * 8
    const mouthR = 10
    drawWrapped(ctx, mouthX, mouthY, mouthR + 2, (cx, cy) => {
      // Outer ring
      ctx.fillStyle = COLORS.wormMouth
      ctx.beginPath()
      ctx.arc(cx, cy, mouthR, 0, Math.PI * 2)
      ctx.fill()
      // Baleen teeth — radiating triangles
      ctx.fillStyle = COLORS.wormTooth
      const teethCount = 14
      for (let t = 0; t < teethCount; t++) {
        const a = (t / teethCount) * Math.PI * 2
        const outerX = cx + Math.cos(a) * mouthR * 0.95
        const outerY = cy + Math.sin(a) * mouthR * 0.95
        const innerX = cx + Math.cos(a) * mouthR * 0.3
        const innerY = cy + Math.sin(a) * mouthR * 0.3
        const perpX = Math.cos(a + Math.PI / 2) * 1.5
        const perpY = Math.sin(a + Math.PI / 2) * 1.5
        ctx.beginPath()
        ctx.moveTo(outerX - perpX, outerY - perpY)
        ctx.lineTo(outerX + perpX, outerY + perpY)
        ctx.lineTo(innerX, innerY)
        ctx.closePath()
        ctx.fill()
      }
      // Inner throat
      ctx.fillStyle = COLORS.deepBrown
      ctx.beginPath()
      ctx.arc(cx, cy, mouthR * 0.25, 0, Math.PI * 2)
      ctx.fill()
      // Tooth edge highlight
      ctx.strokeStyle = 'rgba(200, 185, 155, 0.15)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, mouthR * 0.9, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Rider — Fremen stilsuit (crouched on second segment)
    if (worm.segments.length > 1) {
      const rideSeg = worm.segments[1]
      drawWrapped(ctx, rideSeg.x, rideSeg.y, 15, (cx, cy) => {
        ctx.fillStyle = COLORS.spiceBlue
        ctx.fillRect(cx - 3, cy - 10, 6, 6)
        // Hood peak
        ctx.beginPath()
        ctx.moveTo(cx - 4, cy - 10)
        ctx.lineTo(cx, cy - 15)
        ctx.lineTo(cx + 4, cy - 10)
        ctx.closePath()
        ctx.fill()
        // Head
        ctx.fillStyle = '#4a6a7a'
        ctx.beginPath()
        ctx.arc(cx, cy - 11, 3, 0, Math.PI * 2)
        ctx.fill()
        // Blue eyes
        ctx.fillStyle = '#88bbff'
        ctx.fillRect(cx - 1, cy - 12, 1, 1)
        ctx.fillRect(cx + 1, cy - 12, 1, 1)
        // Crouched legs
        ctx.fillStyle = COLORS.spiceBlue
        ctx.fillRect(cx - 3, cy - 4, 2, 4)
        ctx.fillRect(cx + 1, cy - 4, 2, 4)
      })
    }

    // Combo display
    if (comboCount > 1 && comboTimer > 0) {
      drawText(`${comboCount}x COMBO!`, W / 2, H - 40, { color: '#ff4444', size: 20 })
    }

    // Close call display
    if (closeCallTimer > 0) {
      drawText('CLOSE CALL!', W / 2, H - 60, { color: '#ffff00', size: 18 })
    }

    // Wave counter
    drawText(`Wave ${Math.min(wave, totalWaves)}/${totalWaves}`, W / 2, 20, { color: COLORS.deepBrown, size: 14 })

    // Edible enemies remaining
    const edible = enemies.filter(e => e.alive && e.size === 'small').length
    drawText(`Prey: ${edible}`, W / 2, 38, { color: COLORS.deepBrown, size: 12 })

    // Success
    if (phase === 'success') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, W, H)
      drawText('ALL HARKONNENS DEVOURED!', W / 2, H / 2, { color: '#44ff44', size: 24 })
    }

    // Death overlay
    if (phase === 'death') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, W, H)
      drawText(deathMessage, W / 2, H / 2 - 20, { color: '#ff4444', size: 28 })
      drawText(`Lives: ${game.lives}`, W / 2, H / 2 + 20, { color: COLORS.bone, size: 16 })
    }

    renderHUD()
  },
}

// Draw something at position, and also at wrapped positions if near an edge
function drawWrapped(ctx, x, y, radius, drawFn) {
  drawFn(x, y)
  // If near an edge, draw ghost on opposite side
  if (x < radius) drawFn(x + W, y)
  if (x > W - radius) drawFn(x - W, y)
  if (y < radius) drawFn(x, y + H)
  if (y > H - radius) drawFn(x, y - H)
  // Corners
  if (x < radius && y < radius) drawFn(x + W, y + H)
  if (x > W - radius && y < radius) drawFn(x - W, y + H)
  if (x < radius && y > H - radius) drawFn(x + W, y - H)
  if (x > W - radius && y > H - radius) drawFn(x - W, y - H)
}

function drawEnemy(ctx, e) {
  const isLarge = e.size === 'large'

  if (e.type === 'soldier') {
    if (isLarge) {
      // Harkonnen heavy troop — 1.5x scale, shoulder pads, red glow
      // Red danger glow
      const glowGrad = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, 22)
      glowGrad.addColorStop(0, 'rgba(74,16,16,0.3)')
      glowGrad.addColorStop(1, 'rgba(74,16,16,0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(e.x - 22, e.y - 22, 44, 44)
      // Shoulder pads — wider silhouette
      ctx.fillStyle = COLORS.harkonnen
      ctx.fillRect(e.x - 12, e.y - 6, 24, 6)
      // Black armor body
      ctx.fillRect(e.x - 8, e.y - 12, 16, 24)
      // Bald round head
      ctx.beginPath()
      ctx.arc(e.x, e.y - 15, 6, 0, Math.PI * 2)
      ctx.fill()
      // Red visor
      ctx.fillStyle = COLORS.harkAccent
      ctx.fillRect(e.x - 5, e.y - 16, 10, 2)
      // Shield shimmer (occasional)
      if (Math.sin(animTimer * 4 + e.x) > 0.85) {
        ctx.strokeStyle = 'rgba(150,180,255,0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(e.x, e.y, 16, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else {
      // Harkonnen soldier — small/edible
      // Black armor body
      ctx.fillStyle = COLORS.harkonnen
      ctx.fillRect(e.x - 4, e.y - 6, 8, 12)
      // Bald round head
      ctx.beginPath()
      ctx.arc(e.x, e.y - 9, 4, 0, Math.PI * 2)
      ctx.fill()
      // Red visor
      ctx.fillStyle = COLORS.harkAccent
      ctx.fillRect(e.x - 3, e.y - 10, 6, 1)
    }
  } else if (e.type === 'harvester') {
    if (isLarge) {
      // Large harvester — industrial rectangular body
      // Main body
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(e.x - 16, e.y - 10, 32, 20)
      // Lighter inner panel
      ctx.fillStyle = '#505050'
      ctx.fillRect(e.x - 14, e.y - 8, 28, 16)
      // Intake scoop (triangular front)
      ctx.fillStyle = '#2a2a2a'
      ctx.beginPath()
      ctx.moveTo(e.x + 16, e.y - 6)
      ctx.lineTo(e.x + 22, e.y)
      ctx.lineTo(e.x + 16, e.y + 6)
      ctx.closePath()
      ctx.fill()
      // Tracks/treads
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(e.x - 18, e.y + 8, 36, 4)
      // Tread hatching
      for (let h = 0; h < 6; h++) {
        ctx.fillStyle = '#333'
        ctx.fillRect(e.x - 16 + h * 6, e.y + 8, 2, 4)
      }
      // Exhaust/spice dust trail
      if (Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(139, 96, 48, 0.3)'
        ctx.beginPath()
        ctx.arc(e.x - 18 + Math.random() * 4, e.y + Math.random() * 4, 2 + Math.random() * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      // Small harvester
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(e.x - 8, e.y - 5, 16, 10)
      ctx.fillStyle = '#505050'
      ctx.fillRect(e.x - 6, e.y - 3, 12, 6)
      // Tracks
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(e.x - 9, e.y + 4, 18, 2)
    }
  } else {
    // Ornithopter — dragonfly-wing silhouette
    const wingFlap = Math.sin(animTimer * 8 + e.x) * 0.4
    if (isLarge) {
      // Red danger glow
      const glowGrad = ctx.createRadialGradient(e.x, e.y, 5, e.x, e.y, 20)
      glowGrad.addColorStop(0, 'rgba(74,16,16,0.25)')
      glowGrad.addColorStop(1, 'rgba(74,16,16,0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(e.x - 20, e.y - 20, 40, 40)
      // Narrow fuselage
      ctx.fillStyle = '#2a2a2e'
      ctx.fillRect(e.x - 2, e.y - 8, 4, 16)
      // 4 wings — tapered ellipses with bezier curves, semi-transparent
      const savedAlpha = ctx.globalAlpha
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#5a5a60'
      // Top-left wing
      ctx.beginPath()
      ctx.moveTo(e.x, e.y - 2)
      ctx.bezierCurveTo(e.x - 10, e.y - 8 - wingFlap * 10, e.x - 22, e.y - 4 - wingFlap * 6, e.x - 18, e.y)
      ctx.closePath()
      ctx.fill()
      // Top-right wing
      ctx.beginPath()
      ctx.moveTo(e.x, e.y - 2)
      ctx.bezierCurveTo(e.x + 10, e.y - 8 - wingFlap * 10, e.x + 22, e.y - 4 - wingFlap * 6, e.x + 18, e.y)
      ctx.closePath()
      ctx.fill()
      // Bottom-left wing
      ctx.beginPath()
      ctx.moveTo(e.x, e.y + 2)
      ctx.bezierCurveTo(e.x - 10, e.y + 6 + wingFlap * 8, e.x - 20, e.y + 2 + wingFlap * 4, e.x - 16, e.y)
      ctx.closePath()
      ctx.fill()
      // Bottom-right wing
      ctx.beginPath()
      ctx.moveTo(e.x, e.y + 2)
      ctx.bezierCurveTo(e.x + 10, e.y + 6 + wingFlap * 8, e.x + 20, e.y + 2 + wingFlap * 4, e.x + 16, e.y)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = savedAlpha
    } else {
      // Small ornithopter
      ctx.fillStyle = '#2a2a2e'
      ctx.fillRect(e.x - 1, e.y - 5, 3, 10)
      // Wings
      const savedAlpha = ctx.globalAlpha
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#5a5a60'
      ctx.beginPath()
      ctx.moveTo(e.x, e.y - 1)
      ctx.bezierCurveTo(e.x - 6, e.y - 5 - wingFlap * 6, e.x - 14, e.y - 2 - wingFlap * 4, e.x - 10, e.y)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(e.x, e.y - 1)
      ctx.bezierCurveTo(e.x + 6, e.y - 5 - wingFlap * 6, e.x + 14, e.y - 2 - wingFlap * 4, e.x + 10, e.y)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = savedAlpha
    }
  }
}
