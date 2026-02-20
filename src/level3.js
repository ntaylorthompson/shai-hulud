// Level 3 — Dismount the Worm (top-down)
// Worm is diving — player must jump to a safe zone, avoiding hazards

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L3 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { isDown, wasPressed } from './input.js'
import { switchState } from './state.js'
import { game, loseLife, addLife, addScore, nextLoop } from './game.js'

const PHASE = { AIM: 0, JUMPING: 1, DEATH: 2, SUCCESS: 3 }

let phase, timer
let wormRadius, wormDiveTimer
let safeZone       // {x, y, radius}
let hazards        // [{x, y, type, timer}]
let cursor         // {x, y} — aiming reticle
let jumpCharge     // 0..1
let jumpTrajectory // {startX, startY, targetX, targetY, progress}
let playerPos      // {x, y} — final landing position
let deathMessage

function randomInRing(cx, cy, minR, maxR) {
  const angle = Math.random() * Math.PI * 2
  const r = minR + Math.random() * (maxR - minR)
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function generateHazards() {
  const h = []
  const loop = game.loop - 1
  const cx = safeZone.x
  const cy = safeZone.y

  // Rocks
  const rocks = L3.rockCountBase + L3.rockCountPerLoop * loop
  for (let i = 0; i < rocks; i++) {
    const pos = randomInRing(cx, cy, safeZone.radius + 10, 140)
    h.push({ x: clamp(pos.x, 30, GAME_WIDTH - 30), y: clamp(pos.y, 30, GAME_HEIGHT - 30), type: 'rock', radius: 12 + Math.random() * 8 })
  }

  // Quicksand
  const qs = L3.quicksandCountBase + L3.quicksandCountPerLoop * loop
  for (let i = 0; i < qs; i++) {
    const pos = randomInRing(cx, cy, safeZone.radius + 20, 160)
    h.push({ x: clamp(pos.x, 30, GAME_WIDTH - 30), y: clamp(pos.y, 30, GAME_HEIGHT - 30), type: 'quicksand', radius: 20 + Math.random() * 15 })
  }

  // Geysers
  const gs = L3.geyserCountBase + L3.geyserCountPerLoop * loop
  for (let i = 0; i < gs; i++) {
    const pos = randomInRing(cx, cy, safeZone.radius + 15, 150)
    h.push({
      x: clamp(pos.x, 30, GAME_WIDTH - 30),
      y: clamp(pos.y, 30, GAME_HEIGHT - 30),
      type: 'geyser',
      radius: 16,
      timer: Math.random() * L3.geyserInterval,
      active: false,
    })
  }

  return h
}

export const level3 = {
  enter() {
    phase = PHASE.AIM
    timer = 0
    wormDiveTimer = 0
    wormRadius = L3.wormStartRadius
    deathMessage = ''

    // Safe zone — randomly placed but not too close to edges
    const margin = 80
    safeZone = {
      x: margin + Math.random() * (GAME_WIDTH - margin * 2),
      y: margin + Math.random() * (GAME_HEIGHT - margin * 2),
      radius: Math.max(L3.safeZoneBaseRadius - L3.safeZoneShrinkPerLoop * (game.loop - 1), L3.safeZoneMinRadius),
    }

    hazards = generateHazards()

    // Player starts at center (on the worm)
    cursor = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }
    jumpCharge = 0
    jumpTrajectory = null
    playerPos = null
  },

  update(dt) {
    // Worm sinking animation
    wormDiveTimer += dt
    wormRadius = Math.max(L3.wormStartRadius - L3.wormShrinkRate * wormDiveTimer, 0)

    // Update geysers
    for (const h of hazards) {
      if (h.type === 'geyser') {
        h.timer += dt
        h.active = (h.timer % L3.geyserInterval) < L3.geyserDangerDuration
      }
    }

    if (phase === PHASE.AIM) {
      // Move cursor with arrow keys
      if (isDown('ArrowLeft') || isDown('KeyA')) cursor.x -= L3.playerSpeed * dt
      if (isDown('ArrowRight') || isDown('KeyD')) cursor.x += L3.playerSpeed * dt
      if (isDown('ArrowUp') || isDown('KeyW')) cursor.y -= L3.playerSpeed * dt
      if (isDown('ArrowDown') || isDown('KeyS')) cursor.y += L3.playerSpeed * dt
      cursor.x = clamp(cursor.x, 20, GAME_WIDTH - 20)
      cursor.y = clamp(cursor.y, 20, GAME_HEIGHT - 20)

      // Charge jump with space
      if (isDown('Space')) {
        jumpCharge = Math.min(jumpCharge + L3.jumpChargeRate * dt, 1)
      }

      // Release to jump
      if (!isDown('Space') && jumpCharge > 0) {
        jumpTrajectory = {
          startX: GAME_WIDTH / 2,
          startY: GAME_HEIGHT / 2,
          targetX: cursor.x,
          targetY: cursor.y,
          progress: 0,
        }
        phase = PHASE.JUMPING
      }

      // Forced jump if worm fully submerged
      if (wormRadius <= 0 && jumpCharge === 0) {
        deathMessage = 'SWALLOWED BY SAND!'
        die()
      }
    }

    if (phase === PHASE.JUMPING) {
      jumpTrajectory.progress += dt * 2.5
      if (jumpTrajectory.progress >= 1) {
        jumpTrajectory.progress = 1
        playerPos = { x: jumpTrajectory.targetX, y: jumpTrajectory.targetY }

        // Check landing
        const dx = playerPos.x - safeZone.x
        const dy = playerPos.y - safeZone.y
        const distToSafe = Math.sqrt(dx * dx + dy * dy)

        if (distToSafe <= safeZone.radius) {
          // Check hazards in safe zone (shouldn't be any, but just in case)
          phase = PHASE.SUCCESS
          timer = 0
          addLife()
          addScore(200 * game.loop)
          nextLoop()
          return
        }

        // Check hazard collisions
        for (const h of hazards) {
          const hx = playerPos.x - h.x
          const hy = playerPos.y - h.y
          const hDist = Math.sqrt(hx * hx + hy * hy)
          if (hDist < h.radius + 8) {
            if (h.type === 'rock') { deathMessage = 'CRUSHED ON ROCKS!'; die(); return }
            if (h.type === 'quicksand') { deathMessage = 'SINKING IN QUICKSAND!'; die(); return }
            if (h.type === 'geyser' && h.active) { deathMessage = 'SPICE BLOW!'; die(); return }
          }
        }

        // Missed safe zone, no hazard hit — still failed
        deathMessage = 'MISSED THE LANDING!'
        die()
      }
    }

    if (phase === PHASE.DEATH) {
      timer += dt
      if (timer >= L3.deathPause) {
        if (game.lives >= 0) {
          level3.enter()  // Retry level 3
        } else {
          switchState('gameover')
        }
      }
    }

    if (phase === PHASE.SUCCESS) {
      timer += dt
      if (timer >= L3.successPause) {
        switchState('level1')  // New loop!
      }
    }
  },

  render() {
    const ctx = getCtx()

    // Desert background
    clear(COLORS.sand)

    // Worm (sinking circle in center)
    if (wormRadius > 0) {
      ctx.fillStyle = COLORS.burntOrange
      ctx.beginPath()
      ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, wormRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.deepBrown
      ctx.beginPath()
      ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, wormRadius * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Safe zone
    ctx.strokeStyle = '#44ff44'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // Safe zone fill
    ctx.fillStyle = 'rgba(68, 255, 68, 0.15)'
    ctx.beginPath()
    ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2)
    ctx.fill()

    // Hazards
    for (const h of hazards) {
      if (h.type === 'rock') {
        ctx.fillStyle = '#666'
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#888'
        ctx.beginPath()
        ctx.arc(h.x - 2, h.y - 2, h.radius * 0.6, 0, Math.PI * 2)
        ctx.fill()
      } else if (h.type === 'quicksand') {
        ctx.fillStyle = '#c4a035'
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2)
        ctx.fill()
        // Spiral pattern
        ctx.strokeStyle = '#a08020'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let a = 0; a < Math.PI * 4; a += 0.3) {
          const r = (a / (Math.PI * 4)) * h.radius * 0.8
          const px = h.x + Math.cos(a + timer) * r
          const py = h.y + Math.sin(a + timer) * r
          if (a === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      } else if (h.type === 'geyser') {
        ctx.fillStyle = h.active ? '#ff6600' : '#8b4513'
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.active ? h.radius * 1.5 : h.radius * 0.7, 0, Math.PI * 2)
        ctx.fill()
        if (h.active) {
          // Eruption particles
          ctx.fillStyle = COLORS.spiceBlue
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2
            const r = h.radius + Math.random() * 10
            ctx.beginPath()
            ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // Cursor / aiming reticle (during AIM phase)
    if (phase === PHASE.AIM) {
      // Dashed line from center to cursor
      ctx.strokeStyle = COLORS.bone
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      ctx.lineTo(cursor.x, cursor.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Crosshair
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(cursor.x - 14, cursor.y)
      ctx.lineTo(cursor.x + 14, cursor.y)
      ctx.moveTo(cursor.x, cursor.y - 14)
      ctx.lineTo(cursor.x, cursor.y + 14)
      ctx.stroke()

      // Charge bar
      if (jumpCharge > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(GAME_WIDTH / 2 - 50, GAME_HEIGHT - 40, 100, 14)
        ctx.fillStyle = jumpCharge > 0.8 ? '#44ff44' : COLORS.sand
        ctx.fillRect(GAME_WIDTH / 2 - 48, GAME_HEIGHT - 38, 96 * jumpCharge, 10)
      }

      drawText('Aim with arrows, hold SPACE to charge, release to jump', GAME_WIDTH / 2, 20, {
        color: COLORS.deepBrown, size: 12,
      })
    }

    // Jumping arc
    if (phase === PHASE.JUMPING && jumpTrajectory) {
      const t = jumpTrajectory.progress
      const px = jumpTrajectory.startX + (jumpTrajectory.targetX - jumpTrajectory.startX) * t
      const py = jumpTrajectory.startY + (jumpTrajectory.targetY - jumpTrajectory.startY) * t - Math.sin(t * Math.PI) * 80
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(px, jumpTrajectory.startY + (jumpTrajectory.targetY - jumpTrajectory.startY) * t, 8, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      // Player in air
      ctx.fillStyle = COLORS.spiceBlue
      ctx.fillRect(px - 8, py - 24, 16, 20)
      ctx.fillStyle = COLORS.bone
      ctx.beginPath()
      ctx.arc(px, py - 30, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    // Landed player
    if (playerPos && (phase === PHASE.SUCCESS || phase === PHASE.DEATH)) {
      ctx.fillStyle = COLORS.spiceBlue
      ctx.fillRect(playerPos.x - 8, playerPos.y - 24, 16, 20)
      ctx.fillStyle = COLORS.bone
      ctx.beginPath()
      ctx.arc(playerPos.x, playerPos.y - 30, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    // Player on worm (center, during AIM)
    if (phase === PHASE.AIM && wormRadius > 0) {
      ctx.fillStyle = COLORS.spiceBlue
      ctx.fillRect(GAME_WIDTH / 2 - 8, GAME_HEIGHT / 2 - 24, 16, 20)
      ctx.fillStyle = COLORS.bone
      ctx.beginPath()
      ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    // Death overlay
    if (phase === PHASE.DEATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText(deathMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, { color: '#ff4444', size: 28 })
      drawText(`Lives: ${game.lives}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, { color: COLORS.bone, size: 16 })
    }

    // Success overlay
    if (phase === PHASE.SUCCESS) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText('SAFE LANDING!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, { color: '#44ff44', size: 32 })
      drawText('+1 Life — Starting Loop ' + game.loop, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, {
        color: COLORS.bone, size: 16,
      })
    }
  },
}

function die() {
  phase = PHASE.DEATH
  timer = 0
  loseLife()
}
