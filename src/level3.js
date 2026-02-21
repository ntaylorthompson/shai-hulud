// Level 3 — Dismount the Worm (top-down view)
// Move along the worm body. Walk onto an adjacent rock, or hold SPACE to
// charge a jump in any direction — farther from the worm = more points.

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L3 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { isDown, wasPressed } from './input.js'
import { switchState } from './state.js'
import { game, loseLife, addLife, addScore, nextLoop } from './game.js'
import { renderHUD } from './hud.js'
import { playMusic, sfxJump, sfxDeath, sfxSuccess, sfxWormRumble, setMusicIntensity } from './audio.js'
import { triggerShake, triggerFlash, spawnParticles, clearParticles } from './effects.js'

const PHASE = { RIDE: 0, CHARGING: 1, JUMPING: 2, WALKING: 3, DEATH: 4, SUCCESS: 5 }

const W = GAME_WIDTH
const H = GAME_HEIGHT
const NUM_SEGS = 8
const SEG_GAP = 25
const ROCK_HIT = 24
const WALK_RANGE = 50
const MOVE_SPEED = 4
const CHARGE_RATE = 0.5
const WALK_SPEED = 2.5
const MAX_JUMP_POINTS = 500
const AIM_ROTATE_SPEED = 3.0

let phase, phaseTimer, animTimer, deathMessage
let wAngle, wSpeed, wDiveProgress, wDiveDelay
let wSegs  // [{x, y}]

let rocks
let sandTiles
let playerSegPos
let playerPos
let jumpArc
let chargeAmount, chargeTime
let aimAngle
let walkStart, walkTarget, walkProgress
let landScore
let prevSpaceDown

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function generateRocks() {
  const r = []
  const count = Math.min(L3.rockCountBase + L3.rockCountPerLoop * (game.loop - 1), 7)

  // First rock: guaranteed within walk range of a mid-body worm segment
  const segIdx = Math.min(4, NUM_SEGS - 1)
  const tailAngle = wAngle + Math.PI
  const segX = W / 2 + Math.cos(tailAngle) * segIdx * SEG_GAP
  const segY = H / 2 + Math.sin(tailAngle) * segIdx * SEG_GAP
  const perpAngle = wAngle + Math.PI / 2 + (Math.random() > 0.5 ? 0 : Math.PI)
  const closeDist = WALK_RANGE * (0.4 + Math.random() * 0.3)
  r.push({
    x: clamp(segX + Math.cos(perpAngle) * closeDist, 40, W - 40),
    y: clamp(segY + Math.sin(perpAngle) * closeDist, 40, H - 40),
    radius: 12 + Math.random() * 8,
  })

  // Remaining rocks: scatter within jump range, away from worm center
  const maxDist = L3.jumpMaxPower * 0.85
  for (let i = 1; i < count; i++) {
    let rx, ry, attempts = 0
    do {
      const angle = Math.random() * Math.PI * 2
      const dist = 50 + Math.random() * maxDist
      rx = W / 2 + Math.cos(angle) * dist
      ry = H / 2 + Math.sin(angle) * dist
      attempts++
    } while ((rx < 40 || rx > W - 40 || ry < 40 || ry > H - 40) && attempts < 50)
    rx = clamp(rx, 40, W - 40)
    ry = clamp(ry, 40, H - 40)
    r.push({ x: rx, y: ry, radius: 12 + Math.random() * 8 })
  }
  return r
}

function generateSandTiles() {
  const tiles = []
  for (let i = 0; i < 50; i++) {
    tiles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 2 + Math.random() * 3,
    })
  }
  return tiles
}

// Worm segment scale — starts full, shrinks as dive progresses (sinking into sand)
function segScale(segIdx) {
  const segDelay = segIdx * 0.08
  const segDive = clamp(wDiveProgress - segDelay, 0, 1)
  return Math.max(1 - segDive * segDive, 0)
}

function refreshWormSegs() {
  wSegs = []
  // Head position moves forward along wAngle
  const headX = W / 2 + Math.cos(wAngle) * wSpeed * animTimer * 0.3
  const headY = H / 2 + Math.sin(wAngle) * wSpeed * animTimer * 0.3
  // Gentle curve: angle drifts slightly for visual interest
  const drift = Math.sin(animTimer * 0.4) * 0.3
  for (let i = 0; i < NUM_SEGS; i++) {
    const a = wAngle + Math.PI + drift * (i / NUM_SEGS)
    const x = headX + Math.cos(a) * i * SEG_GAP
    const y = headY + Math.sin(a) * i * SEG_GAP
    wSegs.push({ x, y, scale: segScale(i) })
  }
}

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

function getWormPerpAngle() {
  const idx = Math.floor(playerSegPos)
  const nextIdx = Math.min(idx + 1, NUM_SEGS - 1)
  if (!wSegs || !wSegs[idx] || !wSegs[nextIdx]) return -Math.PI / 2
  const bodyAngle = Math.atan2(
    wSegs[nextIdx].y - wSegs[idx].y,
    wSegs[nextIdx].x - wSegs[idx].x,
  )
  return bodyAngle + Math.PI / 2
}

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

// Top-down player: small hooded figure
function drawPlayerTopDown(ctx, x, y) {
  // Body
  ctx.fillStyle = COLORS.spiceBlue
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fill()
  // Hood/head
  ctx.fillStyle = '#4a6a7a'
  ctx.beginPath()
  ctx.arc(x, y - 2, 3, 0, Math.PI * 2)
  ctx.fill()
  // Blue eyes
  ctx.fillStyle = '#88bbff'
  ctx.fillRect(x - 1, y - 3, 1, 1)
  ctx.fillRect(x + 1, y - 3, 1, 1)
}

// Draw textured worm segment (same style as other levels)
function drawWormSeg(ctx, x, y, radius, isHead) {
  ctx.fillStyle = COLORS.wormSkin
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  // Inner shadow
  ctx.fillStyle = '#6a5a48'
  ctx.beginPath()
  ctx.arc(x + 0.5, y + 1, radius * 0.6, 0, Math.PI * 2)
  ctx.fill()
  // Highlight
  ctx.fillStyle = 'rgba(200, 185, 155, 0.3)'
  ctx.beginPath()
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.35, 0, Math.PI * 2)
  ctx.fill()
}

function drawWormMouth(ctx, x, y, radius) {
  const mouthR = radius * 0.8
  ctx.fillStyle = COLORS.wormMouth
  ctx.beginPath()
  ctx.arc(x, y, mouthR, 0, Math.PI * 2)
  ctx.fill()
  // Baleen teeth
  ctx.fillStyle = COLORS.wormTooth
  const teethCount = 12
  for (let t = 0; t < teethCount; t++) {
    const a = (t / teethCount) * Math.PI * 2
    const ox = x + Math.cos(a) * mouthR * 0.95
    const oy = y + Math.sin(a) * mouthR * 0.95
    const ix = x + Math.cos(a) * mouthR * 0.3
    const iy = y + Math.sin(a) * mouthR * 0.3
    const px = Math.cos(a + Math.PI / 2) * 1.5
    const py = Math.sin(a + Math.PI / 2) * 1.5
    ctx.beginPath()
    ctx.moveTo(ox - px, oy - py)
    ctx.lineTo(ox + px, oy + py)
    ctx.lineTo(ix, iy)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = COLORS.deepBrown
  ctx.beginPath()
  ctx.arc(x, y, mouthR * 0.2, 0, Math.PI * 2)
  ctx.fill()
}

export const level3 = {
  enter() {
    phase = PHASE.RIDE
    phaseTimer = 0
    animTimer = 0
    deathMessage = ''

    // Worm starts moving across center in a random direction
    wAngle = Math.random() * Math.PI * 2
    wSpeed = 60 + 6 * (game.loop - 1)
    wDiveProgress = 0
    wDiveDelay = 1.5

    playerSegPos = 3
    playerPos = null
    jumpArc = null
    chargeAmount = 0
    chargeTime = 0
    aimAngle = -Math.PI / 2
    walkStart = null
    walkTarget = null
    walkProgress = 0
    landScore = 0
    prevSpaceDown = false

    rocks = generateRocks()
    sandTiles = generateSandTiles()

    playMusic('level3')
    sfxWormRumble()
    clearParticles()
  },

  update(dt) {
    animTimer += dt

    // Worm physics for active phases
    const wormActive = phase <= PHASE.WALKING
    if (wormActive) {
      if (wDiveDelay > 0) {
        wDiveDelay -= dt
      } else {
        const diveRate = L3.wormDiveDuration > 0 ? dt / L3.wormDiveDuration : dt
        wDiveProgress = clamp(wDiveProgress + diveRate, 0, 1.5)
      }
      refreshWormSegs()

      // Dynamic music intensity tied to dive progress
      setMusicIntensity(Math.min(wDiveProgress, 1))

      // Sand particles from diving segments
      for (const seg of wSegs) {
        if (seg.scale < 0.9 && seg.scale > 0.05 && Math.random() < 0.08) {
          spawnParticles(seg.x, seg.y, 1, {
            color: '#d4a030', speedMin: 5, speedMax: 20, life: 0.3, sizeMax: 3,
          })
        }
      }
    }

    // === RIDE ===
    if (phase === PHASE.RIDE) {
      // Move along worm body with ←→
      let moveDir = 0
      if (isDown('ArrowLeft') || isDown('KeyA')) moveDir += 1
      if (isDown('ArrowRight') || isDown('KeyD')) moveDir -= 1
      playerSegPos = clamp(playerSegPos + moveDir * MOVE_SPEED * dt, 1, NUM_SEGS - 1)

      const pos = getPlayerWorldPos()

      // Walk to adjacent rock with ↑↓ or any arrow toward a rock
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
        chargeTime = 0
        aimAngle = getWormPerpAngle()
        phase = PHASE.CHARGING
      }
      prevSpaceDown = isDown('Space')

      // Dragged under — segment the player is on has fully sunk
      const segIdx = Math.floor(playerSegPos)
      if (wSegs[segIdx] && wSegs[segIdx].scale < 0.1) {
        deathMessage = 'DRAGGED UNDER!'
        playerPos = pos
        die()
      }
    }

    // === CHARGING ===
    if (phase === PHASE.CHARGING) {
      chargeTime = clamp(chargeTime + CHARGE_RATE * dt, 0, 1)
      chargeAmount = chargeTime * chargeTime  // ease-in: slow start, fast finish

      // Rotate aim with left/right
      if (isDown('ArrowLeft') || isDown('KeyA')) aimAngle -= AIM_ROTATE_SPEED * dt
      if (isDown('ArrowRight') || isDown('KeyD')) aimAngle += AIM_ROTATE_SPEED * dt

      const aimDX = Math.cos(aimAngle)
      const aimDY = Math.sin(aimAngle)

      // Release space → jump
      if (!isDown('Space')) {
        const pos = getPlayerWorldPos()
        const jumpDist = chargeAmount * L3.jumpMaxPower
        const targetX = clamp(pos.x + aimDX * jumpDist, 20, W - 20)
        const targetY = clamp(pos.y + aimDY * jumpDist, 20, H - 20)

        jumpArc = {
          startX: pos.x, startY: pos.y,
          targetX, targetY,
          progress: 0, distance: jumpDist,
        }
        landScore = Math.floor(chargeAmount * MAX_JUMP_POINTS * game.loop)
        sfxJump()
        phase = PHASE.JUMPING
      }

      // Dragged under while charging
      const segIdx = Math.floor(playerSegPos)
      if (wSegs[segIdx] && wSegs[segIdx].scale < 0.1) {
        deathMessage = 'DRAGGED UNDER!'
        playerPos = getPlayerWorldPos()
        die()
      }
    }

    // === JUMPING ===
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

    // === WALKING ===
    if (phase === PHASE.WALKING) {
      walkProgress += WALK_SPEED * dt
      if (walkProgress >= 1) {
        walkProgress = 1
        playerPos = { x: walkTarget.x, y: walkTarget.y }
        phase = PHASE.SUCCESS
        phaseTimer = 0
        addLife()
        nextLoop()
        sfxSuccess()
        spawnParticles(playerPos.x, playerPos.y, 15, { color: '#44ff44', speedMax: 80 })
      }
    }

    // === DEATH ===
    if (phase === PHASE.DEATH) {
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

    // Desert floor — top-down muted sand
    clear(COLORS.ochre)

    // Sand ripple texture
    for (const t of sandTiles) {
      ctx.fillStyle = 'rgba(140, 110, 60, 0.2)'
      ctx.beginPath()
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Rocks — highlight walkable ones
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
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(rock.x + 2, rock.y + 2, rock.radius, rock.radius * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
      // Body
      ctx.fillStyle = walkable ? '#7a9a5a' : '#6a6a60'
      ctx.beginPath()
      ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2)
      ctx.fill()
      // Highlight
      ctx.fillStyle = walkable ? '#9abc7a' : '#8a8a80'
      ctx.beginPath()
      ctx.arc(rock.x - rock.radius * 0.2, rock.y - rock.radius * 0.2,
        rock.radius * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Sand disturbance around sinking worm
    if (wSegs && wSegs.length) {
      for (const seg of wSegs) {
        if (seg.scale < 0.95 && seg.scale > 0.05) {
          const r = 18 * seg.scale + 6
          ctx.strokeStyle = `rgba(160, 128, 80, ${0.2 * (1 - seg.scale)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, r + 8, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // Worm body (tail to head) — segments shrink as they dive
    if (wSegs && wSegs.length) {
      for (let i = wSegs.length - 1; i >= 0; i--) {
        const seg = wSegs[i]
        if (seg.scale < 0.05) continue
        const baseR = Math.max(14 - i * 0.8, 6)
        const radius = baseR * seg.scale

        // Fade alpha as segment sinks
        ctx.globalAlpha = 0.3 + seg.scale * 0.7
        drawWormSeg(ctx, seg.x, seg.y, radius, i === 0)

        // Ring ridges
        if (i > 0 && i < wSegs.length) {
          const prev = wSegs[i - 1]
          if (prev.scale > 0.05) {
            const midX = (seg.x + prev.x) / 2
            const midY = (seg.y + prev.y) / 2
            ctx.strokeStyle = '#5a4a38'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(midX, midY, radius * 0.7, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
      }

      // Head mouth
      const head = wSegs[0]
      if (head.scale > 0.1) {
        const headR = Math.max(14, 6) * head.scale
        // Mouth direction: toward next segment (away from body)
        const mAngle = wAngle
        const mouthX = head.x + Math.cos(mAngle) * headR * 0.8
        const mouthY = head.y + Math.sin(mAngle) * headR * 0.8
        ctx.globalAlpha = 0.3 + head.scale * 0.7
        drawWormMouth(ctx, mouthX, mouthY, headR)
        ctx.globalAlpha = 1
      }
    }

    // Player on worm (RIDE or CHARGING)
    if ((phase === PHASE.RIDE || phase === PHASE.CHARGING) && wSegs) {
      const pos = getPlayerWorldPos()
      drawPlayerTopDown(ctx, pos.x, pos.y)

      // Charge indicator
      if (phase === PHASE.CHARGING) {
        const barW = 36, barH = 3
        const bx = pos.x - barW / 2
        const by = pos.y - 18

        // Bar background
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
        // Bar fill
        const r = Math.floor(255 * chargeAmount)
        const g = Math.floor(255 * (1 - chargeAmount * 0.5))
        ctx.fillStyle = `rgb(${r},${g},50)`
        ctx.fillRect(bx, by, barW * chargeAmount, barH)

        // Points preview
        const pts = Math.floor(chargeAmount * MAX_JUMP_POINTS * game.loop)
        ctx.fillStyle = 'rgba(232,220,200,0.8)'
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`+${pts}pts`, pos.x, by - 7)

        // Compute aim direction from angle
        const adx = Math.cos(aimAngle)
        const ady = Math.sin(aimAngle)
        const jumpDist = chargeAmount * L3.jumpMaxPower
        const landX = clamp(pos.x + adx * jumpDist, 20, W - 20)
        const landY = clamp(pos.y + ady * jumpDist, 20, H - 20)

        // Aim line from player to landing zone
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(landX, landY)
        ctx.stroke()
        ctx.setLineDash([])

        // Landing zone circle
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(landX, landY, 5 + chargeAmount * 6, 0, Math.PI * 2)
        ctx.stroke()
        // Aim dot
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        ctx.arc(landX, landY, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Walking animation
    if (phase === PHASE.WALKING && walkStart && walkTarget) {
      const t = walkProgress
      const wx = walkStart.x + (walkTarget.x - walkStart.x) * t
      const wy = walkStart.y + (walkTarget.y - walkStart.y) * t
      drawPlayerTopDown(ctx, wx, wy)
    }

    // Jumping
    if (phase === PHASE.JUMPING && jumpArc) {
      const t = jumpArc.progress
      const px = jumpArc.startX + (jumpArc.targetX - jumpArc.startX) * t
      const py = jumpArc.startY + (jumpArc.targetY - jumpArc.startY) * t
      // Shadow grows then shrinks (parabolic arc)
      const arcHeight = Math.sin(t * Math.PI)
      const shadowScale = 1 + arcHeight * 0.5
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(px, py + 4 * shadowScale, 6 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2)
      ctx.fill()
      // Player drawn offset upward to show height
      drawPlayerTopDown(ctx, px, py - arcHeight * 30)
    }

    // Landed player
    if (playerPos && (phase === PHASE.SUCCESS || phase === PHASE.DEATH)) {
      drawPlayerTopDown(ctx, playerPos.x, playerPos.y)
    }

    // Prompts
    if (phase === PHASE.RIDE) {
      drawText('←→ move on worm  |  ↑↓ walk to rock  |  hold SPACE + ←→ aim & jump',
        W / 2, 20, { color: COLORS.bone, size: 10 })
      if (wDiveDelay <= 0 && wDiveProgress > 0.3) {
        const urgency = Math.sin(animTimer * 8) > 0 ? '#ff4444' : '#ff8800'
        drawText('WORM IS DIVING!', W / 2, 36, { color: urgency, size: 14 })
      }
    }
    if (phase === PHASE.CHARGING) {
      drawText('←→ aim direction  —  release SPACE to jump',
        W / 2, 20, { color: COLORS.bone, size: 11 })
    }

    // Death overlay
    if (phase === PHASE.DEATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, W, H)
      drawText(deathMessage, W / 2, H / 2 - 20, { color: '#ff4444', size: 28 })
      drawText(`Lives: ${game.lives}`, W / 2, H / 2 + 15, { color: COLORS.bone, size: 16 })
    }

    // Success overlay
    if (phase === PHASE.SUCCESS) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, W, H)
      const isJump = landScore > 0
      const title = isJump ? 'GREAT JUMP!' : 'SAFE LANDING!'
      drawText(title, W / 2, H / 2 - 30, { color: '#44ff44', size: 32 })
      const scoreMsg = isJump ? `+${landScore} pts — ` : ''
      drawText(scoreMsg + '+1 Life — Starting Loop ' + game.loop,
        W / 2, H / 2 + 10, { color: COLORS.bone, size: 16 })
    }

    renderHUD()
  },
}
