// Level 3 — Dismount the Worm (side-scrolling)
// Move ←→ along the worm body. Walk onto an adjacent rock with ↑↓ (0 pts).
// Hold SPACE to charge a jump, aim with ←→↑↓, release to leap. Farther = more points.

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L3 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { isDown, wasPressed } from './input.js'
import { switchState } from './state.js'
import { game, loseLife, addLife, addScore, nextLoop } from './game.js'
import { renderHUD } from './hud.js'
import { playMusic, sfxJump, sfxDeath, sfxSuccess, sfxWormRumble, setMusicIntensity } from './audio.js'
import { triggerShake, triggerFlash, spawnParticles, clearParticles } from './effects.js'

const PHASE = { RIDE: 0, CHARGING: 1, JUMPING: 2, WALKING: 3, DEATH: 4, SUCCESS: 5 }

const GROUND_Y = 280
const NUM_SEGS = 8
const SEG_GAP = 35
const ROCK_HIT = 24        // landing radius on a rock
const WALK_RANGE = 55       // max distance to walk off onto a rock
const MOVE_SPEED = 4        // segments per second along worm
const CHARGE_RATE = 0.8     // charge per second (full in ~1.25s)
const WALK_SPEED = 2.5      // walk animation speed
const MAX_JUMP_POINTS = 500 // max points for a full-power jump (×loop)

let phase, phaseTimer, animTimer, deathMessage
let wDir, wHeadX, wSpeed, wDiveProgress, wDiveDelay
let wSegs

let rocks
let playerSegPos      // float position along worm (1 → NUM_SEGS-1)
let playerPos         // {x, y} final landing spot
let jumpArc           // {startX, startY, targetX, targetY, progress, distance}
let chargeAmount      // 0→1
let aimDX, aimDY      // aim direction while charging
let walkStart, walkTarget, walkProgress
let landScore
let prevSpaceDown

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// Generate rocks scattered on the ground
function generateRocks() {
  const r = []
  const count = L3.rockCountBase + L3.rockCountPerLoop * (game.loop - 1)
  for (let i = 0; i < count; i++) {
    r.push({
      x: 60 + Math.random() * (GAME_WIDTH - 120),
      y: GROUND_Y - 5 + Math.random() * 10,
      radius: 14 + Math.random() * 10,
    })
  }
  return r
}

// Worm segment Y — starts above ground, gradually sinks as diveProgress increases
function wormSegY(segIdx) {
  const segDelay = segIdx * 0.08
  const segDive = clamp(wDiveProgress - segDelay, 0, 1)
  const diveAmount = segDive * segDive
  const baseY = GROUND_Y - 20
  return baseY + diveAmount * 80
}

function refreshWormSegs() {
  wSegs = []
  for (let i = 0; i < NUM_SEGS; i++) {
    const x = wHeadX - wDir * i * SEG_GAP
    wSegs.push({ x, y: wormSegY(i) })
  }
}

// Interpolate player world position from segment position
function getPlayerWorldPos() {
  const idx = Math.floor(playerSegPos)
  const frac = playerSegPos - idx
  const nextIdx = Math.min(idx + 1, NUM_SEGS - 1)
  const a = wSegs[idx]
  const b = wSegs[nextIdx]
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
  }
}

// Find closest rock within range
function findNearestRock(px, py, maxDist) {
  let best = null, bestDist = Infinity
  for (const rock of rocks) {
    const dx = px - rock.x
    const dy = py - rock.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist && dist < maxDist) {
      best = rock
      bestDist = dist
    }
  }
  return best ? { rock: best, dist: bestDist } : null
}

function die() {
  phase = PHASE.DEATH
  phaseTimer = 0
  loseLife()
  sfxDeath()
  triggerShake(10, 0.5)
  triggerFlash('#ff0000', 0.25)
  if (playerPos) {
    spawnParticles(playerPos.x, playerPos.y, 20, { color: COLORS.sand, speedMax: 100 })
  }
}

function drawPlayer(ctx, x, y) {
  ctx.fillStyle = COLORS.spiceBlue
  ctx.fillRect(x - 6, y - 32, 12, 14)
  ctx.fillStyle = COLORS.bone
  ctx.beginPath()
  ctx.arc(x, y - 36, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COLORS.deepBrown
  ctx.fillRect(x - 4, y - 18, 3, 6)
  ctx.fillRect(x + 1, y - 18, 3, 6)
}

export const level3 = {
  enter() {
    phase = PHASE.RIDE
    phaseTimer = 0
    animTimer = 0
    deathMessage = ''

    wDir = Math.random() < 0.5 ? 1 : -1
    wHeadX = wDir === 1 ? 80 : GAME_WIDTH - 80
    wSpeed = 80 + 8 * (game.loop - 1)
    wDiveProgress = 0
    wDiveDelay = 1.5

    playerSegPos = 3
    playerPos = null
    jumpArc = null
    chargeAmount = 0
    aimDX = 0
    aimDY = -1
    walkStart = null
    walkTarget = null
    walkProgress = 0
    landScore = 0
    prevSpaceDown = false

    rocks = generateRocks()

    playMusic('level3')
    sfxWormRumble()
    clearParticles()
  },

  update(dt) {
    animTimer += dt

    // Worm physics for active phases
    const wormActive = phase <= PHASE.WALKING
    if (wormActive) {
      wHeadX += wDir * wSpeed * dt
      if (wDiveDelay > 0) {
        wDiveDelay -= dt
      } else {
        const diveRate = L3.wormDiveDuration > 0 ? dt / L3.wormDiveDuration : dt
        wDiveProgress = clamp(wDiveProgress + diveRate, 0, 1.5)
      }
      refreshWormSegs()

      // Dynamic music intensity tied to dive progress
      setMusicIntensity(Math.min(wDiveProgress, 1))

      // Sand trail particles
      for (const seg of wSegs) {
        if (seg.y > GROUND_Y && seg.x > 0 && seg.x < GAME_WIDTH && Math.random() < 0.1) {
          spawnParticles(seg.x, GROUND_Y, 1, {
            color: '#d4a030', speedMin: 5, speedMax: 20, life: 0.3, sizeMax: 3,
          })
        }
      }
    }

    // === RIDE: move along worm, walk off, or start charging ===
    if (phase === PHASE.RIDE) {
      // Move along worm with ←→
      // Left key moves toward screen-left, right toward screen-right
      let moveDir = 0
      if (isDown('ArrowLeft') || isDown('KeyA')) moveDir += wDir
      if (isDown('ArrowRight') || isDown('KeyD')) moveDir -= wDir
      playerSegPos = clamp(playerSegPos + moveDir * MOVE_SPEED * dt, 1, NUM_SEGS - 1)

      const pos = getPlayerWorldPos()

      // Walk off onto adjacent rock with ↑↓
      if (wasPressed('ArrowUp') || wasPressed('KeyW') || wasPressed('ArrowDown') || wasPressed('KeyS')) {
        const nearby = findNearestRock(pos.x, pos.y, WALK_RANGE)
        if (nearby) {
          walkStart = { x: pos.x, y: pos.y }
          walkTarget = { x: nearby.rock.x, y: nearby.rock.y }
          walkProgress = 0
          landScore = 0
          phase = PHASE.WALKING
        }
      }

      // Start charging jump with SPACE
      if (isDown('Space') && !prevSpaceDown) {
        chargeAmount = 0
        aimDX = 0
        aimDY = -1
        phase = PHASE.CHARGING
      }
      prevSpaceDown = isDown('Space')

      // Dragged under
      if (pos.y > GROUND_Y + 40) {
        deathMessage = 'DRAGGED UNDER!'
        playerPos = pos
        die()
      }
    }

    // === CHARGING: hold space, aim with arrows, release to jump ===
    if (phase === PHASE.CHARGING) {
      chargeAmount = clamp(chargeAmount + CHARGE_RATE * dt, 0, 1)

      // Aim direction
      let dx = 0, dy = 0
      if (isDown('ArrowLeft') || isDown('KeyA')) dx -= 1
      if (isDown('ArrowRight') || isDown('KeyD')) dx += 1
      if (isDown('ArrowUp') || isDown('KeyW')) dy -= 1
      if (isDown('ArrowDown') || isDown('KeyS')) dy += 1
      if (dx !== 0 || dy !== 0) {
        const mag = Math.sqrt(dx * dx + dy * dy)
        aimDX = dx / mag
        aimDY = dy / mag
      }

      // Release space → jump
      if (!isDown('Space')) {
        const pos = getPlayerWorldPos()
        const jumpDist = chargeAmount * L3.jumpMaxPower
        const targetX = clamp(pos.x + aimDX * jumpDist, 20, GAME_WIDTH - 20)
        const targetY = clamp(pos.y + aimDY * jumpDist, 20, GROUND_Y)

        jumpArc = {
          startX: pos.x,
          startY: Math.min(pos.y, GROUND_Y - 10),
          targetX,
          targetY,
          progress: 0,
          distance: jumpDist,
        }
        landScore = Math.floor(chargeAmount * MAX_JUMP_POINTS * game.loop)
        sfxJump()
        phase = PHASE.JUMPING
      }

      // Dragged under while charging
      const pos = getPlayerWorldPos()
      if (pos.y > GROUND_Y + 40) {
        deathMessage = 'DRAGGED UNDER!'
        playerPos = pos
        die()
      }
    }

    // === JUMPING: arc through air ===
    if (phase === PHASE.JUMPING) {
      jumpArc.progress += dt * 2.5
      if (jumpArc.progress >= 1) {
        jumpArc.progress = 1
        playerPos = { x: jumpArc.targetX, y: jumpArc.targetY }

        let landed = false
        for (const rock of rocks) {
          const rdx = playerPos.x - rock.x
          const rdy = playerPos.y - rock.y
          const dist = Math.sqrt(rdx * rdx + rdy * rdy)
          if (dist < ROCK_HIT + rock.radius * 0.5) {
            landed = true
            break
          }
        }

        if (landed) {
          phase = PHASE.SUCCESS
          phaseTimer = 0
          addLife()
          addScore(landScore)
          nextLoop()
          sfxSuccess()
          spawnParticles(playerPos.x, playerPos.y, 25, { color: '#44ff44', speedMax: 120 })
        } else {
          deathMessage = 'SWALLOWED BY SAND!'
          die()
        }
      }
    }

    // === WALKING: smooth walk to rock ===
    if (phase === PHASE.WALKING) {
      walkProgress += WALK_SPEED * dt
      if (walkProgress >= 1) {
        walkProgress = 1
        playerPos = { x: walkTarget.x, y: walkTarget.y }
        phase = PHASE.SUCCESS
        phaseTimer = 0
        addLife()
        // landScore = 0 for walking — no addScore call
        nextLoop()
        sfxSuccess()
        spawnParticles(playerPos.x, playerPos.y, 15, { color: '#44ff44', speedMax: 80 })
      }
    }

    // === DEATH ===
    if (phase === PHASE.DEATH) {
      wHeadX += wDir * wSpeed * dt
      if (wDiveDelay <= 0) {
        wDiveProgress = clamp(wDiveProgress + dt / L3.wormDiveDuration, 0, 1.5)
      }
      refreshWormSegs()

      phaseTimer += dt
      if (phaseTimer >= L3.deathPause) {
        if (game.lives >= 0) level3.enter()
        else switchState('gameover')
      }
    }

    // === SUCCESS ===
    if (phase === PHASE.SUCCESS) {
      phaseTimer += dt
      if (phaseTimer >= L3.successPause) {
        switchState('level1')
      }
    }
  },

  render() {
    const ctx = getCtx()

    // Sky — darker dusk tone (worm diving at dusk)
    clear(COLORS.black)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    skyGrad.addColorStop(0, '#150e04')
    skyGrad.addColorStop(0.4, '#2a1c0c')
    skyGrad.addColorStop(0.7, '#7a6040')
    skyGrad.addColorStop(0.85, COLORS.ochre)
    skyGrad.addColorStop(1, '#6a5030')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Ground line + below-ground
    ctx.fillStyle = COLORS.sand
    ctx.fillRect(0, GROUND_Y + 10, GAME_WIDTH, 2)
    ctx.fillStyle = COLORS.ochre
    ctx.fillRect(0, GROUND_Y + 12, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 12)

    // Rocks — highlight walkable ones green
    const ppos = (phase === PHASE.RIDE || phase === PHASE.CHARGING) && wSegs
      ? getPlayerWorldPos() : null
    for (const rock of rocks) {
      let walkable = false
      if (ppos) {
        const dx = ppos.x - rock.x
        const dy = ppos.y - rock.y
        if (Math.sqrt(dx * dx + dy * dy) < WALK_RANGE) walkable = true
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(rock.x + 3, rock.y + rock.radius * 0.3,
        rock.radius, rock.radius * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      // Body
      ctx.fillStyle = walkable ? '#88bb66' : '#777'
      ctx.beginPath()
      ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2)
      ctx.fill()
      // Highlight
      ctx.fillStyle = walkable ? '#aadd88' : '#999'
      ctx.beginPath()
      ctx.arc(rock.x - rock.radius * 0.2, rock.y - rock.radius * 0.2,
        rock.radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      // Top edge
      ctx.fillStyle = walkable ? '#ccffaa' : '#aaa'
      ctx.beginPath()
      ctx.arc(rock.x - rock.radius * 0.15, rock.y - rock.radius * 0.4,
        rock.radius * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Worm body (tail to head)
    if (wSegs && wSegs.length) {
      for (let i = wSegs.length - 1; i >= 0; i--) {
        const seg = wSegs[i]
        const radius = Math.max(20 - i * 1.5, 8)
        if (seg.y > GROUND_Y + radius + 10) continue

        // Sand splash at ground line
        if (seg.y > GROUND_Y - radius && seg.y < GROUND_Y + radius + 5) {
          ctx.fillStyle = 'rgba(160, 128, 80, 0.4)'
          ctx.beginPath()
          ctx.ellipse(seg.x, GROUND_Y + 10, radius + 5, 6, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // Textured segment body
        ctx.fillStyle = COLORS.wormSkin
        ctx.beginPath()
        ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
        ctx.fill()
        // Inner shadow
        ctx.fillStyle = '#6a5a48'
        ctx.beginPath()
        ctx.arc(seg.x + 1, seg.y + 2, radius * 0.65, 0, Math.PI * 2)
        ctx.fill()
        // Highlight top-left
        ctx.fillStyle = 'rgba(200, 185, 155, 0.3)'
        ctx.beginPath()
        ctx.arc(seg.x - radius * 0.2, seg.y - radius * 0.2, radius * 0.4, 0, Math.PI * 2)
        ctx.fill()

        // Ring ridges between segments
        if (i < wSegs.length - 1) {
          const next = wSegs[i + 1]
          if (next.y <= GROUND_Y + radius + 10) {
            const midX = (seg.x + next.x) / 2
            const midY = (seg.y + next.y) / 2
            ctx.strokeStyle = '#5a4a38'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(midX, midY, radius * 0.7, 0, Math.PI)
            ctx.stroke()
          }
        }
      }

      // Head baleen mouth (side view, same as Level 1)
      const head = wSegs[0]
      if (head.y < GROUND_Y + 15) {
        const mouthX = head.x + wDir * 14
        const mouthR = 10
        // Outer ring
        ctx.fillStyle = COLORS.wormMouth
        ctx.beginPath()
        ctx.arc(mouthX, head.y, mouthR, 0, Math.PI * 2)
        ctx.fill()
        // Baleen teeth
        ctx.fillStyle = COLORS.wormTooth
        const teethCount = 10
        for (let t = 0; t < teethCount; t++) {
          const a = (t / teethCount) * Math.PI * 2
          const outerX = mouthX + Math.cos(a) * mouthR * 0.95
          const outerY = head.y + Math.sin(a) * mouthR * 0.95
          const innerX = mouthX + Math.cos(a) * mouthR * 0.3
          const innerY = head.y + Math.sin(a) * mouthR * 0.3
          const perpX = Math.cos(a + Math.PI / 2) * 1.8
          const perpY = Math.sin(a + Math.PI / 2) * 1.8
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
        ctx.arc(mouthX, head.y, mouthR * 0.25, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Player on worm (RIDE or CHARGING)
    if ((phase === PHASE.RIDE || phase === PHASE.CHARGING) && wSegs) {
      const pos = getPlayerWorldPos()
      if (pos.y < GROUND_Y + 10) {
        drawPlayer(ctx, pos.x, pos.y)
      }

      // Charge indicator
      if (phase === PHASE.CHARGING) {
        const barW = 30, barH = 4
        const bx = pos.x - barW / 2
        const by = pos.y - 52

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
        // Bar fill — green→yellow→red as charge increases
        const r = Math.floor(255 * chargeAmount)
        const g = Math.floor(255 * (1 - chargeAmount * 0.5))
        ctx.fillStyle = `rgb(${r},${g},50)`
        ctx.fillRect(bx, by, barW * chargeAmount, barH)

        // Aim direction line
        const aimLen = 20 + chargeAmount * 40
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y - 26)
        ctx.lineTo(pos.x + aimDX * aimLen, pos.y - 26 + aimDY * aimLen)
        ctx.stroke()
        ctx.setLineDash([])

        // Aim dot
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(pos.x + aimDX * aimLen, pos.y - 26 + aimDY * aimLen, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Walking animation
    if (phase === PHASE.WALKING && walkStart && walkTarget) {
      const t = walkProgress
      const wx = walkStart.x + (walkTarget.x - walkStart.x) * t
      const wy = walkStart.y + (walkTarget.y - walkStart.y) * t
      drawPlayer(ctx, wx, wy)
    }

    // Jumping arc
    if (phase === PHASE.JUMPING && jumpArc) {
      const t = jumpArc.progress
      const px = jumpArc.startX + (jumpArc.targetX - jumpArc.startX) * t
      const py = jumpArc.startY + (jumpArc.targetY - jumpArc.startY) * t
        - Math.sin(t * Math.PI) * 80
      // Shadow on ground
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(px, GROUND_Y + 5, 8, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      // Player
      drawPlayer(ctx, px, py + 12) // offset to match arc center
    }

    // Landed player
    if (playerPos && (phase === PHASE.SUCCESS || phase === PHASE.DEATH)) {
      drawPlayer(ctx, playerPos.x, playerPos.y)
    }

    // HUD prompts
    if (phase === PHASE.RIDE) {
      drawText('←→ move on worm | ↑↓ step onto rock | Hold SPACE to charge jump',
        GAME_WIDTH / 2, 20, { color: COLORS.deepBrown, size: 11 })
      if (wDiveDelay <= 0 && wDiveProgress > 0.3) {
        const urgency = Math.sin(animTimer * 8) > 0 ? '#ff4444' : '#ff8800'
        drawText('WORM IS DIVING!', GAME_WIDTH / 2, 40, { color: urgency, size: 14 })
      }
    }
    if (phase === PHASE.CHARGING) {
      drawText('AIM with ←→↑↓ — Release SPACE to jump!',
        GAME_WIDTH / 2, 20, { color: '#ff8800', size: 13 })
    }

    // Death overlay
    if (phase === PHASE.DEATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText(deathMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
        { color: '#ff4444', size: 28 })
      drawText(`Lives: ${game.lives}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15,
        { color: COLORS.bone, size: 16 })
    }

    // Success overlay
    if (phase === PHASE.SUCCESS) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      const isJump = landScore > 0
      const title = isJump ? 'GREAT JUMP!' : 'SAFE LANDING!'
      drawText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30,
        { color: '#44ff44', size: 32 })
      const scoreMsg = isJump ? `+${landScore} pts — ` : ''
      drawText(scoreMsg + '+1 Life — Starting Loop ' + game.loop,
        GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, { color: COLORS.bone, size: 16 })
    }

    renderHUD()
  },
}
