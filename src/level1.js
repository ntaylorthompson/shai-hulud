// Level 1 — Mount the Worm (side-scrolling)
// Phase 1: Time a jump to land on the worm
// Phase 2: QTE key sequence to plant hooks and mount

import { GAME_WIDTH, GAME_HEIGHT, COLORS, L1 } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { wasPressed, anyKeyPressed } from './input.js'
import { switchState } from './state.js'
import { game, loseLife, addScore } from './game.js'

// Sub-phases
const PHASE = { WAIT: 0, JUMP: 1, QTE: 2, DEATH: 3, SUCCESS: 4 }

let phase, timer
let playerY, playerVY, playerOnGround
let wormTimer, wormVisible, wormX
let safeWindow, safeStart, safeEnd
let qteSequence, qteIndex, qteTimeLeft, qteKeys, qteTime
let scrollOffset
let deathMessage

// Parallax dune layers (generated once)
let dunesFar, dunesNear

function generateDunes(count, minH, maxH) {
  const dunes = []
  for (let i = 0; i < count; i++) {
    dunes.push({
      x: (GAME_WIDTH / count) * i + Math.random() * 60 - 30,
      w: 80 + Math.random() * 100,
      h: minH + Math.random() * (maxH - minH),
    })
  }
  return dunes
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
  return code.replace('Key', '')
}

export const level1 = {
  enter() {
    phase = PHASE.WAIT
    timer = 0
    playerY = L1.playerGroundY
    playerVY = 0
    playerOnGround = true
    scrollOffset = 0
    deathMessage = ''

    // Worm cycle
    safeWindow = Math.max(L1.wormSafeWindowBase - L1.wormSafeWindowDecay * (game.loop - 1), L1.wormSafeWindowMin)
    wormTimer = 0
    wormVisible = false
    wormX = GAME_WIDTH + 100

    // Dunes
    dunesFar = generateDunes(10, 20, 50)
    dunesNear = generateDunes(8, 30, 70)

    // QTE (prebuilt, used in phase 2)
    const q = buildQTE()
    qteSequence = q.seq
    qteKeys = q.seq.length
    qteTime = q.time
    qteIndex = 0
    qteTimeLeft = q.time
  },

  update(dt) {
    scrollOffset += L1.groundSpeed * dt

    // Worm cycle — repeating surface/dive
    wormTimer += dt
    const cycle = L1.wormCycleDuration
    const cyclePos = wormTimer % cycle
    const surfaceStart = (cycle - safeWindow) / 2
    const surfaceEnd = surfaceStart + safeWindow
    wormVisible = cyclePos >= surfaceStart && cyclePos < surfaceEnd

    if (wormVisible) {
      // Worm slides in from right, pauses, then continues
      const t = (cyclePos - surfaceStart) / safeWindow
      wormX = GAME_WIDTH - 80 - Math.sin(t * Math.PI) * 60
    } else {
      wormX = GAME_WIDTH + 200
    }

    if (phase === PHASE.WAIT) {
      // Player can jump with spacebar
      if (wasPressed('Space') && playerOnGround) {
        phase = PHASE.JUMP
        playerVY = L1.jumpVelocity
        playerOnGround = false
      }
    }

    if (phase === PHASE.JUMP) {
      playerVY += L1.gravity * dt
      playerY += playerVY * dt

      // Check if player lands on worm
      if (playerVY > 0 && wormVisible) {
        const wormTop = L1.wormY - L1.wormSegmentSize / 2
        if (playerY >= wormTop && playerY <= wormTop + 30 &&
            L1.playerX > wormX - 40 && L1.playerX < wormX + L1.wormSegments * L1.wormSegmentSize) {
          // Landed on worm — start QTE
          phase = PHASE.QTE
          playerY = wormTop - 10
          playerVY = 0
          qteIndex = 0
          qteTimeLeft = qteTime
          return
        }
      }

      // Hit the ground — missed
      if (playerY >= L1.playerGroundY) {
        playerY = L1.playerGroundY
        playerVY = 0
        playerOnGround = true

        if (wormVisible) {
          // Worm was there but player landed on ground — missed it
          phase = PHASE.WAIT
        } else {
          // Worm wasn't even showing — just reset
          phase = PHASE.WAIT
        }
      }

      // Fell into worm mouth (jumped but worm caught player below)
      if (playerVY > 0 && !wormVisible && playerY >= L1.playerGroundY) {
        playerY = L1.playerGroundY
        playerOnGround = true
        phase = PHASE.WAIT
      }
    }

    if (phase === PHASE.QTE) {
      qteTimeLeft -= dt
      if (qteTimeLeft <= 0) {
        deathMessage = 'TOO SLOW!'
        die()
        return
      }

      // Check for correct key press
      const expected = qteSequence[qteIndex]
      // Check all pool keys
      for (const key of L1.qtePool) {
        if (wasPressed(key)) {
          if (key === expected) {
            qteIndex++
            if (qteIndex >= qteSequence.length) {
              // QTE complete — success!
              phase = PHASE.SUCCESS
              timer = 0
              addScore(100 * game.loop)
              return
            }
          } else {
            deathMessage = 'WRONG KEY!'
            die()
            return
          }
        }
      }
    }

    if (phase === PHASE.DEATH) {
      timer += dt
      if (timer >= L1.deathPause) {
        if (game.lives >= 0) {
          // Retry level 1
          level1.enter()
        } else {
          switchState('gameover')
        }
      }
    }

    if (phase === PHASE.SUCCESS) {
      timer += dt
      if (timer >= L1.successPause) {
        switchState('level2')
      }
    }
  },

  render() {
    const ctx = getCtx()

    // Sky gradient
    clear(COLORS.deepBrown)
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#2a1800')
    grad.addColorStop(0.6, COLORS.ochre)
    grad.addColorStop(1, COLORS.sand)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Far dunes (parallax)
    ctx.fillStyle = '#9a6020'
    for (const d of dunesFar) {
      const x = ((d.x - scrollOffset * 0.3) % (GAME_WIDTH + d.w) + GAME_WIDTH + d.w) % (GAME_WIDTH + d.w) - d.w / 2
      ctx.beginPath()
      ctx.ellipse(x, GAME_HEIGHT - 100, d.w / 2, d.h, 0, Math.PI, 0)
      ctx.fill()
    }

    // Near dunes
    ctx.fillStyle = COLORS.ochre
    for (const d of dunesNear) {
      const x = ((d.x - scrollOffset * 0.6) % (GAME_WIDTH + d.w) + GAME_WIDTH + d.w) % (GAME_WIDTH + d.w) - d.w / 2
      ctx.beginPath()
      ctx.ellipse(x, GAME_HEIGHT - 60, d.w / 2, d.h, 0, Math.PI, 0)
      ctx.fill()
    }

    // Ground
    ctx.fillStyle = COLORS.sand
    ctx.fillRect(0, L1.playerGroundY + 20, GAME_WIDTH, GAME_HEIGHT - L1.playerGroundY - 20)

    // Worm
    if (wormVisible || phase === PHASE.QTE || phase === PHASE.SUCCESS) {
      const wx = (phase === PHASE.QTE || phase === PHASE.SUCCESS) ? GAME_WIDTH - 80 - 60 : wormX
      ctx.fillStyle = COLORS.burntOrange
      for (let i = 0; i < L1.wormSegments; i++) {
        const sx = wx + i * (L1.wormSegmentSize - 5)
        const sy = L1.wormY + Math.sin((i + scrollOffset * 0.02) * 0.8) * 12
        const radius = L1.wormSegmentSize / 2 - i * 1.5
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(radius, 8), 0, Math.PI * 2)
        ctx.fill()
      }
      // Worm mouth
      ctx.fillStyle = COLORS.deepBrown
      ctx.beginPath()
      ctx.arc(wx - 5, L1.wormY, 18, 0, Math.PI * 2)
      ctx.fill()
      // Teeth
      ctx.fillStyle = COLORS.bone
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(wx - 5 + Math.cos(angle) * 14, L1.wormY + Math.sin(angle) * 14, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Player
    const px = L1.playerX
    const py = (phase === PHASE.QTE || phase === PHASE.SUCCESS) ? playerY : playerY
    // Body
    ctx.fillStyle = COLORS.spiceBlue
    ctx.fillRect(px - 8, py - 24, 16, 20)
    // Head
    ctx.fillStyle = COLORS.bone
    ctx.beginPath()
    ctx.arc(px, py - 30, 8, 0, Math.PI * 2)
    ctx.fill()
    // Legs
    ctx.fillStyle = COLORS.deepBrown
    if (playerOnGround && phase !== PHASE.QTE && phase !== PHASE.SUCCESS) {
      // Running animation
      const legAnim = Math.sin(scrollOffset * 0.2) * 4
      ctx.fillRect(px - 6, py - 4, 5, 12 + legAnim)
      ctx.fillRect(px + 1, py - 4, 5, 12 - legAnim)
    } else {
      // Jumping / on worm
      ctx.fillRect(px - 6, py - 4, 5, 10)
      ctx.fillRect(px + 1, py - 4, 5, 10)
    }

    // QTE overlay
    if (phase === PHASE.QTE) {
      // Background bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(GAME_WIDTH / 2 - 150, 40, 300, 60)

      // Timer bar
      const pct = qteTimeLeft / qteTime
      ctx.fillStyle = pct > 0.3 ? '#4a4' : '#a44'
      ctx.fillRect(GAME_WIDTH / 2 - 140, 80, 280 * pct, 10)

      // Key sequence
      const startX = GAME_WIDTH / 2 - (qteSequence.length * 30) / 2
      for (let i = 0; i < qteSequence.length; i++) {
        const kx = startX + i * 30 + 15
        const completed = i < qteIndex
        const current = i === qteIndex
        ctx.fillStyle = completed ? '#4a4' : current ? COLORS.sand : '#666'
        ctx.fillRect(kx - 12, 48, 24, 24)
        ctx.fillStyle = completed ? '#fff' : current ? COLORS.deepBrown : '#aaa'
        ctx.font = '14px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(keyLabel(qteSequence[i]), kx, 60)
      }
    }

    // Phase prompts
    if (phase === PHASE.WAIT && playerOnGround) {
      drawText('Press SPACE to jump!', GAME_WIDTH / 2, 30, { color: COLORS.bone, size: 14 })
    }

    // Death message
    if (phase === PHASE.DEATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      drawText(deathMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, { color: '#ff4444', size: 32 })
      drawText(`Lives: ${game.lives}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, { color: COLORS.bone, size: 16 })
    }

    // Success message
    if (phase === PHASE.SUCCESS) {
      drawText('MOUNTED!', GAME_WIDTH / 2, 30, { color: '#44ff44', size: 28 })
    }
  },
}

function die() {
  phase = PHASE.DEATH
  timer = 0
  loseLife()
}
