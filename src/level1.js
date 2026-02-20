// Level 1 — Mount the Worm (side-scrolling)
// Worm travels underground showing wormsign. The head rises above the sand —
// avoid it! Land on the safe body segments trailing behind the head.

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L1 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { wasPressed, isDown } from './input.js'
import { switchState } from './state.js'
import { game, loseLife, addScore } from './game.js'
import { renderHUD } from './hud.js'
import { playMusic, sfxJump, sfxHookPlant, sfxDeath, sfxSuccess } from './audio.js'
import { triggerShake, triggerFlash, spawnParticles, clearParticles } from './effects.js'

const PHASE = { WAIT: 0, JUMP: 1, QTE: 2, DEATH: 3, SUCCESS: 4 }

const GROUND_Y = L1.playerGroundY      // 280
const UNDERGROUND_Y = GROUND_Y + 30    // 310
const NUM_SEGS = L1.wormSegments        // 8
const SEG_GAP = L1.wormSegmentSize - 5  // 35
const HEAD_DANGER_X = 22   // horizontal range around head that kills
const MOUNT_DIST = 22      // collision distance for landing on body
const TAIL_UNDERGROUND = 2 // last N segments stay underground

let phase, timer, deathMessage
let playerX, playerY, playerVY, playerOnGround
let scrollOffset

// Worm state
let wSegs          // [{x, y}]
let wDir           // 1 (L→R) or -1 (R→L)
let wHeadX         // head x position (drives all segments)
let wSurfX         // center of the surfaced zone
let wSurfW         // half-width of surfaced zone
let wArcH          // how high the head rises above ground
let wSpeed         // horizontal traversal speed
let wActive        // currently traversing?
let wPauseTimer    // pause between cycles
let mountSegIdx    // which segment the player mounted

// QTE
let qteSeq, qteIdx, qteTimeLeft, qteTime

// Dunes
let dunesFar, dunesNear

function makeDunes(n, minH, maxH) {
  const d = []
  for (let i = 0; i < n; i++) {
    d.push({
      x: (GAME_WIDTH / n) * i + Math.random() * 60 - 30,
      w: 80 + Math.random() * 100,
      h: minH + Math.random() * (maxH - minH),
    })
  }
  return d
}

function buildQTE() {
  const count = Math.min(L1.qteKeysBase + L1.qteKeysPerLoop * (game.loop - 1), L1.qteKeysMax)
  const time = Math.max(L1.qteTimeBase - L1.qteTimeDecay * (game.loop - 1), L1.qteTimeMin)
  const seq = []
  for (let i = 0; i < count; i++) {
    seq.push(L1.qtePool[Math.floor(Math.random() * L1.qtePool.length)])
  }
  return { seq, time }
}

function keyLabel(code) {
  if (code === 'ArrowUp') return '↑'
  if (code === 'ArrowDown') return '↓'
  if (code === 'ArrowLeft') return '←'
  if (code === 'ArrowRight') return '→'
  return code.replace('Key', '')
}

// Compute Y for segment at given x and index.
// Head rises above ground; body sits at ground level; tail stays underground.
function segY(x, idx) {
  const dist = Math.abs(x - wSurfX)

  // Outside surfaced zone — everything underground
  if (dist > wSurfW) return UNDERGROUND_Y

  // Tail segments always underground
  if (idx >= NUM_SEGS - TAIL_UNDERGROUND) return UNDERGROUND_Y

  // Smooth transition at zone edges (40px ramp)
  const t = Math.min((wSurfW - dist) / 40, 1)

  if (idx === 0) {
    // Head rises above ground
    return GROUND_Y - wArcH * t
  }

  // Body: at ground level, slightly above so it's visible
  return GROUND_Y - 6 * t
}

function refreshSegs() {
  for (let i = 0; i < NUM_SEGS; i++) {
    const x = wHeadX - wDir * i * SEG_GAP
    wSegs[i] = { x, y: segY(x, i) }
  }
}

function beginCycle() {
  wDir = Math.random() < 0.5 ? 1 : -1
  const totalLen = NUM_SEGS * SEG_GAP + 60
  wHeadX = wDir === 1 ? -totalLen : GAME_WIDTH + totalLen
  wSurfX = 100 + Math.random() * (GAME_WIDTH - 200)
  // Difficulty: narrower zone + faster at higher loops
  wSurfW = Math.max(180 - 12 * (game.loop - 1), 90)
  wArcH = 18 + Math.random() * 15
  wSpeed = 160 + 15 * (game.loop - 1)
  wActive = true
  wSegs = new Array(NUM_SEGS)
  refreshSegs()
}

function cycleFinished() {
  const tail = wSegs[NUM_SEGS - 1]
  return (wDir === 1 && tail.x > GAME_WIDTH + 40) ||
         (wDir === -1 && tail.x < -40)
}

function isSurfaced(seg) { return seg.y < GROUND_Y }

function die(msg) {
  deathMessage = msg
  phase = PHASE.DEATH
  timer = 0
  loseLife()
  sfxDeath()
  triggerShake(8, 0.4)
  triggerFlash('#ff0000', 0.2)
  spawnParticles(playerX, playerY, 15, { color: COLORS.sand, speedMax: 100 })
}

export const level1 = {
  enter() {
    phase = PHASE.WAIT
    timer = 0
    playerX = L1.playerStartX
    playerY = GROUND_Y
    playerVY = 0
    playerOnGround = true
    scrollOffset = 0
    deathMessage = ''
    mountSegIdx = 2

    dunesFar = makeDunes(10, 20, 50)
    dunesNear = makeDunes(8, 30, 70)

    const q = buildQTE()
    qteSeq = q.seq
    qteTime = q.time
    qteIdx = 0
    qteTimeLeft = q.time

    wPauseTimer = 0.5
    wActive = false
    wSegs = []

    playMusic('level1')
    clearParticles()
  },

  update(dt) {
    scrollOffset = playerX * 0.5

    // Player movement (WAIT and JUMP)
    if (phase === PHASE.WAIT || phase === PHASE.JUMP) {
      let moveDir = 0
      if (isDown('ArrowLeft') || isDown('KeyA')) moveDir -= 1
      if (isDown('ArrowRight') || isDown('KeyD')) moveDir += 1
      playerX += moveDir * L1.playerSpeed * dt
      playerX = Math.max(16, Math.min(GAME_WIDTH - 16, playerX))
    }

    // Worm cycle management
    if (!wActive && phase !== PHASE.QTE && phase !== PHASE.SUCCESS) {
      wPauseTimer -= dt
      if (wPauseTimer <= 0) beginCycle()
    } else if (wActive && phase !== PHASE.QTE && phase !== PHASE.SUCCESS) {
      wHeadX += wDir * wSpeed * dt
      refreshSegs()

      // Wormsign particles for underground segments
      for (const seg of wSegs) {
        if (!isSurfaced(seg) && seg.x > 0 && seg.x < GAME_WIDTH && Math.random() < 0.06) {
          spawnParticles(seg.x, GROUND_Y + 15, 1, {
            color: '#c49010', speedMin: 5, speedMax: 15, life: 0.3, sizeMin: 1, sizeMax: 2,
          })
        }
      }

      if (cycleFinished()) {
        wActive = false
        wPauseTimer = 0.8 + Math.random() * 0.5
      }
    }

    // Jump
    if (phase === PHASE.WAIT && wasPressed('Space') && playerOnGround) {
      phase = PHASE.JUMP
      playerVY = L1.jumpVelocity
      playerOnGround = false
      sfxJump()
    }

    if (phase === PHASE.JUMP) {
      playerVY += L1.gravity * dt
      playerY += playerVY * dt
      if (playerY >= GROUND_Y) {
        playerY = GROUND_Y
        playerVY = 0
        playerOnGround = true
        phase = PHASE.WAIT
      }
    }

    // Collision with worm
    if ((phase === PHASE.WAIT || phase === PHASE.JUMP) && wActive && wSegs.length) {
      const head = wSegs[0]

      // Head danger zone — only kills if player actually touches the head circle
      // Player can jump OVER the head if they time it right
      if (isSurfaced(head)) {
        const hdx = Math.abs(playerX - head.x)
        const headRadius = Math.max(L1.wormSegmentSize / 2, 9) // matches render
        if (hdx < headRadius + 6) { // 6 = half player width
          const headTop = head.y - headRadius
          const headBottom = head.y + headRadius
          const playerTop = playerY - 22  // torso top (tighter than visual)
          const playerBottom = playerY     // feet
          // Check vertical overlap — must actually touch the red zone
          if (playerBottom > headTop && playerTop < headBottom) {
            die('EATEN!')
            return
          }
        }
      }

      // Body segments — mount if falling onto them
      if (phase === PHASE.JUMP && playerVY > 0) {
        for (let i = 1; i < NUM_SEGS - TAIL_UNDERGROUND; i++) {
          const seg = wSegs[i]
          if (!isSurfaced(seg)) continue
          const dx = playerX - seg.x
          const dy = playerY - seg.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MOUNT_DIST) {
            phase = PHASE.QTE
            mountSegIdx = i
            playerY = seg.y - 14
            playerVY = 0
            const q = buildQTE()
            qteSeq = q.seq
            qteTime = q.time
            qteIdx = 0
            qteTimeLeft = q.time
            return
          }
        }
      }
    }

    // QTE
    if (phase === PHASE.QTE) {
      qteTimeLeft -= dt
      if (qteTimeLeft <= 0) { die('TOO SLOW!'); return }

      const expected = qteSeq[qteIdx]
      for (const key of L1.qtePool) {
        if (wasPressed(key)) {
          if (key === expected) {
            qteIdx++
            sfxHookPlant()
            if (qteIdx >= qteSeq.length) {
              phase = PHASE.SUCCESS
              timer = 0
              addScore(100 * game.loop)
              sfxSuccess()
              spawnParticles(playerX, playerY, 20, { color: '#44ff44', speedMax: 120 })
              return
            }
          } else {
            die('WRONG KEY!')
            return
          }
        }
      }
    }

    if (phase === PHASE.DEATH) {
      timer += dt
      if (timer >= L1.deathPause) {
        if (game.lives >= 0) level1.enter()
        else switchState('gameover')
      }
    }

    if (phase === PHASE.SUCCESS) {
      timer += dt
      if (timer >= L1.successPause) switchState('level2')
    }
  },

  render() {
    const ctx = getCtx()

    // Sky gradient — dark top to hazy bright horizon
    clear(COLORS.black)
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, COLORS.skyTop)
    grad.addColorStop(0.45, '#3a2810')
    grad.addColorStop(0.7, COLORS.skyHorizon)
    grad.addColorStop(0.85, COLORS.sand)
    grad.addColorStop(1, COLORS.ochre)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Far dune silhouettes — dark against bright horizon
    ctx.fillStyle = '#5a4028'
    for (const d of dunesFar) {
      const x = ((d.x - scrollOffset * 0.3) % (GAME_WIDTH + d.w) + GAME_WIDTH + d.w) % (GAME_WIDTH + d.w) - d.w / 2
      ctx.beginPath()
      ctx.ellipse(x, GAME_HEIGHT - 100, d.w / 2, d.h, 0, Math.PI, 0)
      ctx.fill()
    }

    // Near dune silhouettes
    ctx.fillStyle = '#6a5038'
    for (const d of dunesNear) {
      const x = ((d.x - scrollOffset * 0.6) % (GAME_WIDTH + d.w) + GAME_WIDTH + d.w) % (GAME_WIDTH + d.w) - d.w / 2
      ctx.beginPath()
      ctx.ellipse(x, GAME_HEIGHT - 60, d.w / 2, d.h, 0, Math.PI, 0)
      ctx.fill()
    }

    // Ground — subtle texture
    ctx.fillStyle = COLORS.ochre
    ctx.fillRect(0, GROUND_Y + 15, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 15)
    // Ground highlight line at horizon
    ctx.fillStyle = COLORS.sand
    ctx.fillRect(0, GROUND_Y + 14, GAME_WIDTH, 2)

    const showWorm = (wActive || phase === PHASE.QTE || phase === PHASE.SUCCESS) && wSegs.length

    // Wormsign — cinematic treatment for underground segments
    if (showWorm) {
      for (let i = 0; i < wSegs.length; i++) {
        const seg = wSegs[i]
        if (isSurfaced(seg) || seg.x < -10 || seg.x > GAME_WIDTH + 10) continue
        // Subtle raised sand ridge
        ctx.fillStyle = 'rgba(200, 170, 120, 0.35)'
        ctx.beginPath()
        ctx.ellipse(seg.x, GROUND_Y + 16, 16, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        // Thin highlight line
        ctx.strokeStyle = 'rgba(232, 220, 200, 0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(seg.x - 14, GROUND_Y + 15)
        ctx.lineTo(seg.x + 14, GROUND_Y + 15)
        ctx.stroke()
        // Vibration rings — concentric arcs radiating outward
        for (let r = 0; r < 3; r++) {
          const ringR = 20 + r * 12
          const alpha = 0.08 - r * 0.025
          if (alpha <= 0) continue
          ctx.strokeStyle = `rgba(200, 170, 120, ${alpha})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.arc(seg.x, GROUND_Y + 18, ringR, Math.PI * 0.8, Math.PI * 0.2)
          ctx.stroke()
        }
      }
    }

    // Surfaced worm segments (tail to head so head draws on top)
    if (showWorm) {
      for (let i = wSegs.length - 1; i >= 0; i--) {
        const seg = wSegs[i]
        if (!isSurfaced(seg)) continue
        const isHead = i === 0
        const radius = Math.max(L1.wormSegmentSize / 2 - i * 1.2, 9)

        if (isHead) {
          // Neck connecting head to ground
          ctx.fillStyle = COLORS.wormSkin
          ctx.fillRect(seg.x - 7, seg.y, 14, GROUND_Y - seg.y + 5)
          ctx.fillStyle = '#6a5a48'
          ctx.fillRect(seg.x - 3, seg.y, 6, GROUND_Y - seg.y + 5)

          // Head body
          ctx.fillStyle = COLORS.wormSkin
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
          ctx.fill()
          // Inner shadow
          ctx.fillStyle = '#6a5a48'
          ctx.beginPath()
          ctx.arc(seg.x + 1, seg.y + 2, radius * 0.7, 0, Math.PI * 2)
          ctx.fill()
          // Highlight top-left
          ctx.fillStyle = 'rgba(200, 185, 155, 0.3)'
          ctx.beginPath()
          ctx.arc(seg.x - radius * 0.25, seg.y - radius * 0.25, radius * 0.4, 0, Math.PI * 2)
          ctx.fill()

          // Baleen mouth — half-circle facing movement direction (side view)
          const mouthX = seg.x + wDir * (radius + 4)
          const mouthR = radius * 0.9
          // Outer ring
          ctx.fillStyle = COLORS.wormMouth
          ctx.beginPath()
          ctx.arc(mouthX, seg.y, mouthR, 0, Math.PI * 2)
          ctx.fill()
          // Baleen teeth — radiating triangles
          ctx.fillStyle = COLORS.wormTooth
          const teethCount = 10
          for (let t = 0; t < teethCount; t++) {
            const a = (t / teethCount) * Math.PI * 2
            const outerX = mouthX + Math.cos(a) * mouthR * 0.95
            const outerY = seg.y + Math.sin(a) * mouthR * 0.95
            const innerX = mouthX + Math.cos(a) * mouthR * 0.3
            const innerY = seg.y + Math.sin(a) * mouthR * 0.3
            const perpX = Math.cos(a + Math.PI / 2) * 2
            const perpY = Math.sin(a + Math.PI / 2) * 2
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
          ctx.arc(mouthX, seg.y, mouthR * 0.25, 0, Math.PI * 2)
          ctx.fill()
          // Subtle tooth edge highlight
          ctx.strokeStyle = 'rgba(200, 185, 155, 0.2)'
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.arc(mouthX, seg.y, mouthR * 0.9, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          // Body: textured segmented worm
          // Base circle
          ctx.fillStyle = COLORS.wormSkin
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
          ctx.fill()
          // Inner shadow (depth)
          ctx.fillStyle = '#6a5a48'
          ctx.beginPath()
          ctx.arc(seg.x + 1, seg.y + 2, radius * 0.65, 0, Math.PI * 2)
          ctx.fill()
          // Highlight top-left (light source above-left)
          ctx.fillStyle = 'rgba(200, 185, 155, 0.35)'
          ctx.beginPath()
          ctx.arc(seg.x - radius * 0.2, seg.y - radius * 0.2, radius * 0.45, 0, Math.PI * 2)
          ctx.fill()
          // Ring ridge between segments
          if (i < wSegs.length - 1) {
            const next = wSegs[i + 1]
            if (isSurfaced(next)) {
              const midX = (seg.x + next.x) / 2
              const midY = (seg.y + next.y) / 2
              ctx.strokeStyle = '#5a4a38'
              ctx.lineWidth = 1.5
              ctx.beginPath()
              ctx.arc(midX, midY, radius * 0.8, 0, Math.PI)
              ctx.stroke()
            }
          }
        }
      }
    }

    // Player — Fremen stilsuit silhouette
    const px = playerX
    const py = (phase === PHASE.QTE || phase === PHASE.SUCCESS) && showWorm && wSegs[mountSegIdx]
      ? wSegs[mountSegIdx].y - 14
      : playerY
    const onWorm = phase === PHASE.QTE || phase === PHASE.SUCCESS
    drawFremen(ctx, px, py, onWorm, playerOnGround && !onWorm ? scrollOffset : 0)

    // QTE overlay
    if (phase === PHASE.QTE) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(GAME_WIDTH / 2 - 150, 40, 300, 60)
      const pct = qteTimeLeft / qteTime
      ctx.fillStyle = pct > 0.3 ? '#4a4' : '#a44'
      ctx.fillRect(GAME_WIDTH / 2 - 140, 80, 280 * pct, 10)
      const startX = GAME_WIDTH / 2 - (qteSeq.length * 30) / 2
      for (let i = 0; i < qteSeq.length; i++) {
        const kx = startX + i * 30 + 15
        const done = i < qteIdx
        const cur = i === qteIdx
        ctx.fillStyle = done ? '#4a4' : cur ? COLORS.sand : '#666'
        ctx.fillRect(kx - 12, 48, 24, 24)
        ctx.fillStyle = done ? '#fff' : cur ? COLORS.deepBrown : '#aaa'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(keyLabel(qteSeq[i]), kx, 60)
      }
    }

    // Prompts
    if (phase === PHASE.WAIT && playerOnGround) {
      drawText('← → move, SPACE jump onto worm body', GAME_WIDTH / 2, 25, { color: COLORS.bone, size: 12 })
      if (showWorm && wSegs[0] && isSurfaced(wSegs[0])) {
        drawText('Avoid the HEAD!', GAME_WIDTH / 2, 42, { color: '#ff6666', size: 11 })
      }
    }

    if (phase === PHASE.DEATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText(deathMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, { color: '#ff4444', size: 32 })
      drawText(`Lives: ${game.lives}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, { color: COLORS.bone, size: 16 })
    }

    if (phase === PHASE.SUCCESS) {
      drawText('MOUNTED!', GAME_WIDTH / 2, 25, { color: '#44ff44', size: 28 })
    }

    renderHUD()
  },
}

// Fremen stilsuit silhouette
function drawFremen(ctx, x, y, crouched, walkOffset) {
  const crouch = crouched ? 4 : 0
  // Stilsuit body
  ctx.fillStyle = COLORS.spiceBlue
  ctx.fillRect(x - 6, y - 22 + crouch, 12, 16 - crouch)
  // Hood with peak
  ctx.beginPath()
  ctx.moveTo(x - 7, y - 22 + crouch)
  ctx.lineTo(x, y - 30 + crouch)
  ctx.lineTo(x + 7, y - 22 + crouch)
  ctx.closePath()
  ctx.fill()
  // Head under hood
  ctx.fillStyle = '#4a6a7a'
  ctx.beginPath()
  ctx.arc(x, y - 24 + crouch, 5, 0, Math.PI * 2)
  ctx.fill()
  // Blue-within-blue eyes
  ctx.fillStyle = '#4488cc'
  ctx.fillRect(x - 3, y - 25 + crouch, 2, 1)
  ctx.fillRect(x + 1, y - 25 + crouch, 2, 1)
  ctx.fillStyle = '#88bbff'
  ctx.fillRect(x - 2, y - 25 + crouch, 1, 1)
  ctx.fillRect(x + 2, y - 25 + crouch, 1, 1)
  // Legs
  ctx.fillStyle = COLORS.spiceBlue
  if (walkOffset && !crouched) {
    const legAnim = Math.sin(walkOffset * 0.2) * 4
    ctx.fillRect(x - 4, y - 6, 3, 10 + legAnim)
    ctx.fillRect(x + 1, y - 6, 3, 10 - legAnim)
  } else {
    ctx.fillRect(x - 4, y - 6, 3, crouched ? 6 : 10)
    ctx.fillRect(x + 1, y - 6, 3, crouched ? 6 : 10)
  }
}
