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

    // Wormsign — sand bumps for underground segments
    if (showWorm) {
      for (let i = 0; i < wSegs.length; i++) {
        const seg = wSegs[i]
        if (isSurfaced(seg) || seg.x < -10 || seg.x > GAME_WIDTH + 10) continue
        ctx.fillStyle = '#d4a020'
        ctx.beginPath()
        ctx.ellipse(seg.x, GROUND_Y + 18, 14, 5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#b88a10'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(seg.x, GROUND_Y + 22, 18, 0, Math.PI)
        ctx.stroke()
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
          // Head: red danger glow + dark body
          ctx.fillStyle = 'rgba(255,50,50,0.25)'
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius + 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#8b2200'
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
          ctx.fill()
          // Mouth
          ctx.fillStyle = COLORS.deepBrown
          ctx.beginPath()
          ctx.arc(seg.x + wDir * 10, seg.y, 10, 0, Math.PI * 2)
          ctx.fill()
          // Teeth
          ctx.fillStyle = COLORS.bone
          for (let t = 0; t < 5; t++) {
            const a = (t / 5) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(seg.x + wDir * 10 + Math.cos(a) * 8, seg.y + Math.sin(a) * 8, 2, 0, Math.PI * 2)
            ctx.fill()
          }
          // "Neck" connecting head to ground
          ctx.fillStyle = '#8b2200'
          ctx.fillRect(seg.x - 6, seg.y, 12, GROUND_Y - seg.y + 5)
        } else {
          // Body: safe orange segments, partially in sand
          ctx.fillStyle = COLORS.burntOrange
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2)
          ctx.fill()
          // Lighter top half to suggest "land here"
          ctx.fillStyle = '#dd8822'
          ctx.beginPath()
          ctx.arc(seg.x, seg.y, radius, Math.PI, 0)
          ctx.fill()
        }
      }
    }

    // Player
    const px = playerX
    const py = (phase === PHASE.QTE || phase === PHASE.SUCCESS) && showWorm && wSegs[mountSegIdx]
      ? wSegs[mountSegIdx].y - 14
      : playerY
    ctx.fillStyle = COLORS.spiceBlue
    ctx.fillRect(px - 8, py - 24, 16, 20)
    ctx.fillStyle = COLORS.bone
    ctx.beginPath()
    ctx.arc(px, py - 30, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.deepBrown
    if (playerOnGround && phase !== PHASE.QTE && phase !== PHASE.SUCCESS) {
      const legAnim = Math.sin(scrollOffset * 0.2) * 4
      ctx.fillRect(px - 6, py - 4, 5, 12 + legAnim)
      ctx.fillRect(px + 1, py - 4, 5, 12 - legAnim)
    } else {
      ctx.fillRect(px - 6, py - 4, 5, 10)
      ctx.fillRect(px + 1, py - 4, 5, 10)
    }

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
