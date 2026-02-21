// Game over screen — cinematic fade, score count-up, initials entry, rank titles + animations

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed, wasPressed } from './input.js'
import { switchState } from './state.js'
import { game, scoreQualifies, saveHighScores } from './game.js'

const W = GAME_WIDTH, H = GAME_HEIGHT

let timer, fadeIn, displayScore, rank
let enteringInitials, initials, initialPos
let titleParticles
let animT // character animation timer
let previewMode = false
let previewIndex = -1

const PREVIEW_SCENARIOS = [
  { label: '#1 — Kwisatz Haderach', score: 50000, loop: 8, rank: 0 },
  { label: '#2 — Grandfather Worm', score: 30000, loop: 5, rank: 1 },
  { label: '#3 — Bene Gesserit Mother', score: 20000, loop: 4, rank: 2 },
  { label: '10000+ — Great Worm', score: 10000, loop: 3, rank: -1 },
  { label: '7000+ — Fremen Warrior', score: 7000, loop: 2, rank: -1 },
  { label: '5000+ — Bene Gesserit Apprentice', score: 5000, loop: 2, rank: -1 },
  { label: '3000+ — Atreides Footsoldier', score: 3000, loop: 1, rank: -1 },
  { label: '1000+ — Baby Worm', score: 1000, loop: 1, rank: -1 },
  { label: 'No title (score 500)', score: 500, loop: 1, rank: -1 },
]

export function startPreview() {
  previewMode = true
  previewIndex = -1
}

function enterPreviewScenario(idx) {
  const s = PREVIEW_SCENARIOS[idx]
  game.score = s.score
  game.loop = s.loop
  if (s.rank >= 0) {
    game.highScores = []
    for (let i = 0; i < s.rank; i++) {
      game.highScores.push({ score: s.score + (s.rank - i) * 10000, loop: 10, initials: 'AAA' })
    }
    rank = s.rank
  } else {
    game.highScores = [
      { score: 99999, loop: 10, initials: 'GOD' },
      { score: 88888, loop: 9, initials: 'WRM' },
      { score: 77777, loop: 8, initials: 'DUN' },
      { score: 66666, loop: 7, initials: 'SPR' },
      { score: 55555, loop: 6, initials: 'FRM' },
    ]
    rank = -1
  }
  enteringInitials = false
  timer = 0
  fadeIn = 0
  displayScore = 0
  titleParticles = null
  animT = 0
}

function getPressedLetter() {
  for (let i = 0; i < 26; i++) {
    const code = 'Key' + String.fromCharCode(65 + i)
    if (wasPressed(code)) return String.fromCharCode(65 + i)
  }
  return null
}

// ============ TITLE DETERMINATION ============

function getPlayerTitle() {
  if (rank === 0 && game.score > 0) return {
    name: 'KWISATZ HADERACH', subtitle: 'you see all games and chose to play this one',
    color: '#88ccff', glowColor: 'rgba(100, 180, 255, 0.4)',
    particleColor: '#aaddff', tier: 'legendary',
  }
  if (rank === 1 && game.score > 0) return {
    name: 'GRANDFATHER WORM', subtitle: 'been doing this since before the spice flowed',
    color: '#d4b483', glowColor: 'rgba(200, 160, 100, 0.3)',
    particleColor: '#e8c88c', tier: 'epic',
  }
  if (rank === 2 && game.score > 0) return {
    name: 'BENE GESSERIT MOTHER', subtitle: 'you will tell your friends to play this game',
    color: '#b090c0', glowColor: 'rgba(160, 120, 180, 0.3)',
    particleColor: '#c8a8d8', tier: 'epic',
  }
  if (game.score >= 10000) return {
    name: 'GREAT WORM', subtitle: 'the spice must flow and so must your thumbs',
    color: '#c4a060', glowColor: 'rgba(180, 140, 70, 0.25)',
    particleColor: '#d4b483', tier: 'rare',
  }
  if (game.score >= 7000) return {
    name: 'FREMEN WARRIOR', subtitle: 'walks without rhythm but plays with purpose',
    color: '#5a7a8a', glowColor: 'rgba(90, 122, 138, 0.25)',
    particleColor: '#7a9aaa', tier: 'rare',
  }
  if (game.score >= 5000) return {
    name: 'BENE GESSERIT APPRENTICE', subtitle: 'fear is the mind-killer and so are these controls',
    color: '#9080a0', glowColor: 'rgba(140, 120, 160, 0.2)',
    particleColor: '#a898b8', tier: 'uncommon',
  }
  if (game.score >= 3000) return {
    name: 'ATREIDES FOOTSOLDIER', subtitle: 'fights for the duke but mostly for high scores',
    color: '#70a070', glowColor: 'rgba(90, 140, 90, 0.2)',
    particleColor: '#90c090', tier: 'uncommon',
  }
  if (game.score >= 1000) return {
    name: 'BABY WORM', subtitle: 'you gotta start somewhere',
    color: '#c8b898', glowColor: 'rgba(180, 160, 130, 0.15)',
    particleColor: '#d8c8a8', tier: 'common',
  }
  return null
}

// ============ TITLE PARTICLES ============

function spawnTitleParticles(titleInfo) {
  titleParticles = []
  const count = titleInfo.tier === 'legendary' ? 40 : titleInfo.tier === 'epic' ? 28 : titleInfo.tier === 'rare' ? 18 : 10
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const speed = 20 + Math.random() * 60
    titleParticles.push({
      x: W / 2, y: 60,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 15,
      life: 1.0, decay: 0.3 + Math.random() * 0.4, size: 1 + Math.random() * 2,
    })
  }
}

function updateTitleParticles(dt) {
  if (!titleParticles) return
  for (const p of titleParticles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 20 * dt
    p.life -= p.decay * dt
  }
  titleParticles = titleParticles.filter(p => p.life > 0)
}

// ============ CHARACTER ANIMATION HELPERS ============

function drawHoodedFig(ctx, x, y, color, s, walking, t) {
  ctx.fillStyle = color
  // Hood point
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y - 10 * s)
  ctx.lineTo(x, y - 20 * s)
  ctx.lineTo(x + 5 * s, y - 10 * s)
  ctx.closePath()
  ctx.fill()
  // Face
  ctx.fillRect(x - 4 * s, y - 12 * s, 8 * s, 5 * s)
  // Robe
  ctx.beginPath()
  ctx.moveTo(x - 5 * s, y - 7 * s)
  ctx.lineTo(x - 7 * s, y + 8 * s)
  ctx.lineTo(x + 7 * s, y + 8 * s)
  ctx.lineTo(x + 5 * s, y - 7 * s)
  ctx.closePath()
  ctx.fill()
  if (walking) {
    const sw = Math.sin(t * 10) * 3 * s
    ctx.fillRect(x - 2 * s + sw, y + 8 * s, 3 * s, 5 * s)
    ctx.fillRect(x - 1 * s - sw, y + 8 * s, 3 * s, 5 * s)
  }
}

function drawWarriorFig(ctx, x, y, color, s, walking, t) {
  ctx.fillStyle = color
  // Head
  ctx.beginPath()
  ctx.arc(x, y - 16 * s, 4.5 * s, 0, Math.PI * 2)
  ctx.fill()
  // Shoulders + body
  ctx.fillRect(x - 6 * s, y - 11 * s, 12 * s, 6 * s)
  ctx.fillRect(x - 5 * s, y - 5 * s, 10 * s, 6 * s)
  // Arms
  if (!walking) {
    ctx.fillRect(x - 8 * s, y - 10 * s, 3 * s, 9 * s)
    ctx.fillRect(x + 5 * s, y - 10 * s, 3 * s, 9 * s)
  } else {
    const armSw = Math.sin(t * 8) * 3 * s
    ctx.fillRect(x - 8 * s, y - 10 * s + armSw, 3 * s, 9 * s)
    ctx.fillRect(x + 5 * s, y - 10 * s - armSw, 3 * s, 9 * s)
  }
  // Legs
  if (walking) {
    const sw = Math.sin(t * 8) * 4 * s
    ctx.fillRect(x - 3 * s + sw, y + 1 * s, 4 * s, 8 * s)
    ctx.fillRect(x - 1 * s - sw, y + 1 * s, 4 * s, 8 * s)
  } else {
    ctx.fillRect(x - 3 * s, y + 1 * s, 4 * s, 8 * s)
    ctx.fillRect(x + 0 * s, y + 1 * s, 4 * s, 8 * s)
  }
}

function drawEyes(ctx, x, y, s, color) {
  ctx.fillStyle = color
  ctx.fillRect(x - 3 * s, y - 14 * s, 2 * s, 2 * s)
  ctx.fillRect(x + 1 * s, y - 14 * s, 2 * s, 2 * s)
}

function drawWormSegments(ctx, cx, cy, count, segR, riseAmt) {
  for (let i = 0; i < count; i++) {
    const along = (i - count * 0.3) * segR * 1.5
    const rise = riseAmt * Math.max(0, 1 - Math.abs(i / count - 0.3) * 2.5)
    const sx = cx + along
    const sy = cy - rise * 20
    const r = segR * (1 - Math.abs(i - count * 0.3) / count * 0.7)
    ctx.fillStyle = COLORS.wormSkin
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(1, r), 0, Math.PI * 2)
    ctx.fill()
    if (i > 0 && r > 2) {
      ctx.strokeStyle = COLORS.wormMouth
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(sx, sy, r * 0.85, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

function drawWormMouth(ctx, x, y, r, openAmt) {
  ctx.fillStyle = COLORS.wormMouth
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  const teeth = 10
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    const inner = r * (0.35 + openAmt * 0.15)
    ctx.fillStyle = COLORS.wormTooth
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88)
    ctx.lineTo(x + Math.cos(a - 0.15) * inner, y + Math.sin(a - 0.15) * inner)
    ctx.lineTo(x + Math.cos(a + 0.15) * inner, y + Math.sin(a + 0.15) * inner)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#0a0604'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawSandLine(ctx, y, alpha) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = COLORS.ochre
  ctx.fillRect(0, y, W, 1)
  ctx.fillStyle = COLORS.sand
  ctx.globalAlpha = alpha * 0.3
  for (let i = 0; i < 40; i++) {
    const gx = (i * 17 + timer * 20) % W
    ctx.fillRect(gx, y - 1 + Math.sin(i) * 0.5, 2, 1)
  }
}

// ============ CHARACTER ANIMATIONS ============

const ENTER_DUR = 1.3
const ANIM_Y = 128

function getAnimX(fromLeft, t) {
  const startX = fromLeft ? -30 : W + 30
  if (t < ENTER_DUR) {
    const p = 1 - Math.pow(1 - t / ENTER_DUR, 2.5)
    return startX + (W / 2 - startX) * p
  }
  return W / 2
}

function drawCharacterAnim(ctx, titleInfo) {
  if (!titleInfo || animT <= 0) return
  const name = titleInfo.name
  const t = animT
  const at = Math.max(0, t - ENTER_DUR) // action time
  const moving = t < ENTER_DUR

  ctx.save()

  if (name === 'KWISATZ HADERACH') {
    const x = getAnimX(true, t)
    drawHoodedFig(ctx, x, ANIM_Y, COLORS.spiceBlue, 1.3, moving, t)
    drawEyes(ctx, x, ANIM_Y, 1.3, '#88ccff')
    if (at > 0) {
      // Prescience: glowing eyes intensify
      const eyeGlow = 0.5 + Math.sin(at * 4) * 0.3
      ctx.globalAlpha = eyeGlow
      ctx.fillStyle = '#88ccff'
      ctx.beginPath()
      ctx.arc(x - 2, ANIM_Y - 18, 4 + Math.sin(at * 3) * 1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + 2, ANIM_Y - 18, 4 + Math.sin(at * 3) * 1, 0, Math.PI * 2)
      ctx.fill()
      // Expanding aura rings
      ctx.globalAlpha = 1
      for (let i = 0; i < 3; i++) {
        const ringT = (at * 0.7 + i * 0.7) % 2.2
        const r = ringT * 45
        const alpha = Math.max(0, 0.35 - ringT * 0.16)
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, ANIM_Y - 5, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Ghost copies (seeing all futures)
      for (let i = 0; i < 4; i++) {
        const gx = x + Math.sin(at * 1.8 + i * 1.6) * 35
        const gy = ANIM_Y + Math.cos(at * 1.3 + i * 2.1) * 10
        ctx.globalAlpha = 0.12 + Math.sin(at * 3 + i * 1.5) * 0.04
        drawHoodedFig(ctx, gx, gy, '#88ccff', 1.0, false, 0)
        drawEyes(ctx, gx, gy, 1.0, '#88ccff')
      }
    }

  } else if (name === 'GRANDFATHER WORM') {
    const x = getAnimX(false, t)
    const sandY = ANIM_Y + 12
    if (moving) {
      // Underground rumble: sand bumps traveling
      ctx.globalAlpha = 0.6
      for (let i = 0; i < 5; i++) {
        const bx = x + (i - 2) * 18
        const by = sandY - 3 - Math.sin(t * 6 + i * 0.8) * 3
        ctx.fillStyle = COLORS.sand
        ctx.beginPath()
        ctx.ellipse(bx, by, 8, 3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    drawSandLine(ctx, sandY, 0.4)
    if (at > 0) {
      // Worm erupts from sand
      const rise = Math.min(at * 1.5, 1)
      ctx.globalAlpha = 1
      drawWormSegments(ctx, x, sandY, 8, 10, rise)
      // Sand spray particles
      if (at < 0.8) {
        ctx.fillStyle = COLORS.sand
        for (let i = 0; i < 12; i++) {
          const px = x + (Math.random() - 0.5) * 50
          const py = sandY - at * 40 * Math.random() - Math.random() * 10
          ctx.globalAlpha = Math.max(0, 0.5 - at * 0.6)
          ctx.fillRect(px, py, 2, 2)
        }
      }
      // Mouth opens at head
      if (rise > 0.5) {
        const mouthOpen = Math.min((rise - 0.5) * 2, 1)
        const headX = x - 8 * 10 * 0.3 * 1.5
        const headY = sandY - rise * 20
        drawWormMouth(ctx, headX - 8, headY, 12 * mouthOpen + 4, mouthOpen)
      }
    } else if (moving) {
      ctx.globalAlpha = 0.6
      drawWormSegments(ctx, x, sandY + 5, 6, 7, 0)
    }

  } else if (name === 'BENE GESSERIT MOTHER') {
    const x = getAnimX(false, t)
    // Glides smoothly, no walking animation
    drawHoodedFig(ctx, x, ANIM_Y, '#6a5080', 1.2, false, 0)
    if (moving) {
      // Robe trails
      ctx.globalAlpha = 0.15
      for (let i = 1; i < 4; i++) {
        drawHoodedFig(ctx, x + i * 12, ANIM_Y, '#6a5080', 1.2 - i * 0.1, false, 0)
      }
    }
    if (at > 0) {
      // Turn and use THE VOICE
      // Shockwave rings emanating forward (to the left)
      for (let i = 0; i < 4; i++) {
        const ringT = (at * 1.2 + i * 0.35) % 2.0
        const dist = ringT * 80
        const alpha = Math.max(0, 0.4 - ringT * 0.2)
        const spread = 0.5 + ringT * 0.3
        ctx.strokeStyle = `rgba(180, 140, 220, ${alpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x - dist, ANIM_Y - 8, 10 + ringT * 20, -spread, spread)
        ctx.stroke()
      }
      // "THE VOICE" text pulses
      if (at > 0.5) {
        const vAlpha = 0.3 + Math.sin(at * 4) * 0.15
        ctx.globalAlpha = vAlpha
        drawText('T H E  V O I C E', x - 60, ANIM_Y - 30, {
          color: '#c8a0e0', size: 10,
        })
      }
      // Eyes glow
      drawEyes(ctx, x, ANIM_Y, 1.2, '#c8a0e0')
    }

  } else if (name === 'GREAT WORM') {
    const x = getAnimX(true, t)
    const sandY = ANIM_Y + 12
    drawSandLine(ctx, sandY, 0.3)
    if (moving) {
      // Sand bumps traveling underground
      ctx.globalAlpha = 0.5
      for (let i = 0; i < 4; i++) {
        const bx = x + (i - 1.5) * 14
        const by = sandY - 2 - Math.sin(t * 5 + i) * 2
        ctx.fillStyle = COLORS.sand
        ctx.beginPath()
        ctx.ellipse(bx, by, 6, 2.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (at > 0) {
      // Worm leaps out of sand in a full arc
      const arcDur = 2.5
      const arcT = (at % arcDur) / arcDur // 0→1 repeating arc cycle
      const arcHeight = Math.sin(arcT * Math.PI) * 40
      const arcX = x - 60 + arcT * 120
      ctx.globalAlpha = 1
      // Draw worm body along arc path as a chain of segments
      const segCount = 8
      for (let i = 0; i < segCount; i++) {
        const segT = Math.max(0, Math.min(1, arcT - i * 0.04))
        const sh = Math.sin(segT * Math.PI) * 40
        const sx = x - 60 + segT * 120
        const sy = sandY - sh
        const r = 7 - Math.abs(i - 1) * 0.5
        // Only draw segments above sand line
        if (sy < sandY + 2) {
          ctx.fillStyle = COLORS.wormSkin
          ctx.beginPath()
          ctx.arc(sx, sy, Math.max(2, r), 0, Math.PI * 2)
          ctx.fill()
          if (i > 0 && r > 3) {
            ctx.strokeStyle = COLORS.wormMouth
            ctx.lineWidth = 0.7
            ctx.beginPath()
            ctx.arc(sx, sy, r * 0.8, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      }
      // Mouth on lead segment
      const headH = Math.sin(arcT * Math.PI) * 40
      const headY = sandY - headH
      if (headY < sandY - 5) {
        drawWormMouth(ctx, arcX, headY, 8, 0.8)
      }
      // Sand splash at entry/exit points
      if (arcT < 0.15 || arcT > 0.85) {
        ctx.fillStyle = COLORS.sand
        ctx.globalAlpha = 0.5
        for (let i = 0; i < 6; i++) {
          const px = (arcT < 0.5 ? x - 60 : x + 60) + (Math.random() - 0.5) * 20
          const py = sandY - Math.random() * 12
          ctx.fillRect(px, py, 2, 2)
        }
      }
    } else if (moving) {
      ctx.globalAlpha = 0.4
      // Faint underground body
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = COLORS.wormSkin
        ctx.beginPath()
        ctx.arc(x + (i - 1.5) * 12, sandY + 4, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

  } else if (name === 'FREMEN WARRIOR') {
    const x = getAnimX(true, t)
    drawWarriorFig(ctx, x, ANIM_Y, COLORS.spiceBlue, 1.2, moving, t)
    drawEyes(ctx, x, ANIM_Y, 1.2, '#4488cc')
    if (at > 0) {
      // Raise crysknife overhead
      const raiseAmt = Math.min(at * 3, 1)
      const knifeY = ANIM_Y - 22 - raiseAmt * 16
      ctx.strokeStyle = COLORS.wormTooth
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 6, ANIM_Y - 10)
      ctx.lineTo(x + 6, knifeY)
      ctx.stroke()
      // Blade
      ctx.fillStyle = COLORS.wormTooth
      ctx.beginPath()
      ctx.moveTo(x + 6, knifeY)
      ctx.lineTo(x + 3, knifeY - 8 * raiseAmt)
      ctx.lineTo(x + 9, knifeY - 8 * raiseAmt)
      ctx.closePath()
      ctx.fill()
      // Eyes flash bright blue on raise
      if (raiseAmt >= 1) {
        const flash = 0.6 + Math.sin(at * 5) * 0.3
        ctx.globalAlpha = flash
        ctx.fillStyle = '#66aaff'
        ctx.beginPath()
        ctx.arc(x - 2, ANIM_Y - 19, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x + 3, ANIM_Y - 19, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      // Flex: shoulders widen
      ctx.globalAlpha = 1
      ctx.fillStyle = COLORS.spiceBlue
      ctx.fillRect(x - 10, ANIM_Y - 13, 3, 6)
      ctx.fillRect(x + 7, ANIM_Y - 13, 3, 6)
    }

  } else if (name === 'BENE GESSERIT APPRENTICE') {
    const x = getAnimX(false, t)
    if (moving) {
      drawHoodedFig(ctx, x, ANIM_Y, '#7a6890', 1.0, true, t)
    } else {
      // Sitting cross-legged meditation pose
      const s = 1.0
      ctx.fillStyle = '#7a6890'
      // Hood
      ctx.beginPath()
      ctx.moveTo(x - 4 * s, ANIM_Y - 4 * s)
      ctx.lineTo(x, ANIM_Y - 14 * s)
      ctx.lineTo(x + 4 * s, ANIM_Y - 4 * s)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(x - 3 * s, ANIM_Y - 6 * s, 6 * s, 4 * s)
      // Sitting body
      ctx.fillRect(x - 5 * s, ANIM_Y - 1 * s, 10 * s, 6 * s)
      // Crossed legs
      ctx.fillRect(x - 7 * s, ANIM_Y + 5 * s, 14 * s, 4 * s)
      // Meditation glow
      const glowR = 22 + Math.sin(at * 2) * 5
      const glowA = 0.12 + Math.sin(at * 2.5) * 0.06
      ctx.globalAlpha = glowA
      const glow = ctx.createRadialGradient(x, ANIM_Y - 2, 0, x, ANIM_Y - 2, glowR)
      glow.addColorStop(0, 'rgba(160, 130, 200, 0.5)')
      glow.addColorStop(1, 'rgba(160, 130, 200, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(x - glowR, ANIM_Y - 2 - glowR, glowR * 2, glowR * 2)
      // Floating slightly
      const float = Math.sin(at * 1.5) * 2
      if (at > 0.8) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = '#7a6890'
        ctx.fillRect(x - 5, ANIM_Y + 9 + float, 10, 2)
      }
    }

  } else if (name === 'ATREIDES FOOTSOLDIER') {
    const x = getAnimX(true, t)
    drawWarriorFig(ctx, x, ANIM_Y, '#3a5a3a', 1.1, moving, t)
    // Green accent on armor
    ctx.fillStyle = '#5a8a5a'
    ctx.fillRect(x - 4 * 1.1, ANIM_Y - 10 * 1.1, 8 * 1.1, 2 * 1.1)
    if (at > 0) {
      // Draw sword up
      const raiseAmt = Math.min(at * 2.5, 1)
      const swordY = ANIM_Y - 12 - raiseAmt * 20
      ctx.strokeStyle = '#aaaaaa'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 7, ANIM_Y - 8)
      ctx.lineTo(x + 7, swordY)
      ctx.stroke()
      // Sword tip
      ctx.fillStyle = '#cccccc'
      ctx.beginPath()
      ctx.moveTo(x + 7, swordY)
      ctx.lineTo(x + 5, swordY - 5 * raiseAmt)
      ctx.lineTo(x + 9, swordY - 5 * raiseAmt)
      ctx.closePath()
      ctx.fill()
      // Hawk emblem flash
      if (raiseAmt >= 1 && at > 0.8) {
        const hawkA = 0.3 + Math.sin(at * 3) * 0.15
        ctx.globalAlpha = hawkA
        ctx.strokeStyle = '#5aaa5a'
        ctx.lineWidth = 1.5
        // Simple hawk: V shape with spread wings
        const hx = x, hy = ANIM_Y - 42
        ctx.beginPath()
        ctx.moveTo(hx - 12, hy - 4)
        ctx.lineTo(hx - 5, hy + 2)
        ctx.lineTo(hx, hy - 2)
        ctx.lineTo(hx + 5, hy + 2)
        ctx.lineTo(hx + 12, hy - 4)
        ctx.stroke()
        // Body
        ctx.beginPath()
        ctx.moveTo(hx, hy - 2)
        ctx.lineTo(hx, hy + 6)
        ctx.stroke()
      }
    }

  } else if (name === 'BABY WORM') {
    const x = getAnimX(false, t)
    const sandY = ANIM_Y + 8
    drawSandLine(ctx, sandY, 0.25)
    if (moving) {
      // Tiny sand bumps wiggling
      ctx.globalAlpha = 0.5
      for (let i = 0; i < 3; i++) {
        const bx = x + (i - 1) * 10
        const by = sandY - 2 - Math.sin(t * 8 + i * 1.2) * 2
        ctx.fillStyle = COLORS.sand
        ctx.beginPath()
        ctx.ellipse(bx, by, 4, 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (at > 0) {
      // Pop up! Tiny worm
      const pop = Math.min(at * 3, 1)
      ctx.globalAlpha = 1
      // Small body segments
      for (let i = 0; i < 4; i++) {
        const sy = sandY - pop * 12 + i * 5
        const r = 4 - i * 0.5
        ctx.fillStyle = COLORS.wormSkin
        ctx.beginPath()
        ctx.arc(x + Math.sin(at * 6 + i) * 2, sy, Math.max(1, r), 0, Math.PI * 2)
        ctx.fill()
      }
      // Tiny mouth
      if (pop >= 1) {
        const mouthOpen = 0.5 + Math.sin(at * 5) * 0.3
        ctx.fillStyle = COLORS.wormMouth
        ctx.beginPath()
        ctx.arc(x, sandY - 14, 5, 0, Math.PI * 2)
        ctx.fill()
        // Tiny teeth
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          ctx.fillStyle = COLORS.wormTooth
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(a) * 4.5, sandY - 14 + Math.sin(a) * 4.5)
          ctx.lineTo(x + Math.cos(a) * 2 * mouthOpen, sandY - 14 + Math.sin(a) * 2 * mouthOpen)
          ctx.lineTo(x + Math.cos(a + 0.3) * 2 * mouthOpen, sandY - 14 + Math.sin(a + 0.3) * 2 * mouthOpen)
          ctx.closePath()
          ctx.fill()
        }
      }
      // Wiggle side to side
      if (at > 0.5) {
        // Just the body sway is handled by the sin in segments above
      }
    } else if (moving) {
      ctx.globalAlpha = 0.4
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = COLORS.wormSkin
        ctx.beginPath()
        ctx.arc(x + (i - 1) * 7, sandY + 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.restore()
}

// ============ TITLE TEXT ANIMATION ============

function drawTitleAnimation(ctx, titleInfo, t) {
  if (t <= 0) return

  const revealDuration = titleInfo.tier === 'legendary' ? 1.5 : titleInfo.tier === 'epic' ? 1.2 : 0.8
  const revealProgress = Math.min(t / revealDuration, 1)
  const fullText = titleInfo.name
  const charsToShow = Math.floor(revealProgress * fullText.length)
  const visibleText = fullText.substring(0, charsToShow)

  // Glow
  const glowAlpha = titleInfo.tier === 'legendary'
    ? 0.5 + Math.sin(t * 3) * 0.2
    : titleInfo.tier === 'epic'
      ? 0.35 + Math.sin(t * 2.5) * 0.1
      : 0.2

  if (revealProgress > 0.1) {
    const gr = titleInfo.tier === 'legendary' ? 130 : titleInfo.tier === 'epic' ? 100 : 70
    const glow = ctx.createRadialGradient(W / 2, 58, 0, W / 2, 58, gr)
    glow.addColorStop(0, titleInfo.glowColor)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = glowAlpha * Math.min(t * 2, 1)
    ctx.fillStyle = glow
    ctx.fillRect(W / 2 - gr, 58 - gr, gr * 2, gr * 2)
  }

  // Title text — BIGGER
  const spaced = visibleText.split('').join(' ')
  const size = titleInfo.tier === 'legendary' ? 24 : titleInfo.tier === 'epic' ? 22 : titleInfo.tier === 'rare' ? 20 : titleInfo.tier === 'uncommon' ? 18 : 16
  ctx.globalAlpha = Math.min(t * 2, 1)

  // White outline pulse for legendary
  if (titleInfo.tier === 'legendary' && revealProgress > 0.5) {
    ctx.globalAlpha = 0.15 + Math.sin(t * 4) * 0.05
    drawText(spaced, W / 2, 58, { color: '#ffffff', size: size + 3 })
  }

  ctx.globalAlpha = Math.min(t * 2, 1)
  drawText(spaced, W / 2, 58, { color: titleInfo.color, size })

  // Subtitle — BRIGHTER
  if (revealProgress >= 1) {
    const subAlpha = Math.min((t - revealDuration) * 1.5, 0.75)
    if (subAlpha > 0) {
      ctx.globalAlpha = subAlpha
      drawText(titleInfo.subtitle, W / 2, 58 + size * 0.8 + 6, {
        color: COLORS.bone,
        size: 10,
      })
    }
  }

  // Title particles
  if (titleParticles) {
    for (const p of titleParticles) {
      ctx.globalAlpha = p.life * 0.7
      ctx.fillStyle = titleInfo.particleColor
      ctx.fillRect(p.x, p.y, p.size, p.size)
    }
  }

  ctx.globalAlpha = 1
}

// ============ DISPLAY LIST ============

function getDisplayList() {
  if (enteringInitials) {
    const list = game.highScores.map(h => ({ ...h, isNew: false }))
    list.splice(rank, 0, {
      score: game.score, loop: game.loop,
      initials: initials.join('') || null, isNew: true,
    })
    return list.slice(0, 5)
  }
  return game.highScores.map((h, i) => ({
    ...h, isNew: i === rank && game.score > 0 && h.score === game.score,
  }))
}

// ============ STATE ============

export const gameover = {
  enter() {
    timer = 0
    fadeIn = 0
    displayScore = 0
    titleParticles = null
    animT = 0

    if (previewMode) {
      previewIndex = 0
      enterPreviewScenario(0)
      return
    }

    if (scoreQualifies()) {
      enteringInitials = true
      initials = ['', '', '']
      initialPos = 0
      rank = game.highScores.filter(h => h.score > game.score).length
    } else {
      enteringInitials = false
      saveHighScores()
      rank = game.highScores.findIndex(h => h.score === game.score)
    }
  },

  update(dt) {
    timer += dt
    fadeIn = Math.min(fadeIn + dt * 1.0, 1)

    // Score count-up
    if (displayScore < game.score) {
      const rate = Math.max(game.score * 0.8, 50)
      displayScore = Math.min(displayScore + rate * dt, game.score)
    }

    // Title + character animation
    const titleInfo = getPlayerTitle()
    if (titleInfo && timer > 0.8) {
      if (!titleParticles) spawnTitleParticles(titleInfo)
      animT += dt
    }
    updateTitleParticles(dt)

    // Initials entry
    if (enteringInitials && timer > 1.5) {
      const letter = getPressedLetter()
      if (letter && initialPos < 3) {
        initials[initialPos] = letter
        initialPos++
      }
      if (wasPressed('Backspace') && initialPos > 0) {
        initialPos--
        initials[initialPos] = ''
      }
      if (wasPressed('Enter') && initialPos === 3) {
        const tag = initials.join('')
        saveHighScores(tag)
        enteringInitials = false
        rank = game.highScores.findIndex(h => h.score === game.score && h.initials === tag)
      }
    }

    // Preview mode cycling
    if (previewMode && timer > 2.0 && anyKeyPressed()) {
      previewIndex++
      if (previewIndex >= PREVIEW_SCENARIOS.length) {
        previewMode = false
        previewIndex = -1
        switchState('title')
      } else {
        enterPreviewScenario(previewIndex)
      }
      return
    }

    // Return to title
    if (!previewMode && !enteringInitials && timer > 2.0 && anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    const ctx = getCtx()

    // Background
    clear('#050302')
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#030201')
    grad.addColorStop(0.5, '#0a0704')
    grad.addColorStop(1, '#0f0a05')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.globalAlpha = fadeIn

    // "GAME OVER"
    drawText('G A M E   O V E R', W / 2, 28, { color: COLORS.bone, size: 24 })

    // Title + character animation
    const titleInfo = getPlayerTitle()
    if (titleInfo && timer > 0.8) {
      drawTitleAnimation(ctx, titleInfo, timer - 0.8)
      drawCharacterAnim(ctx, titleInfo)
    }

    // Layout shifts based on whether we have a title animation
    const hasTitle = !!titleInfo
    const scoreY = hasTitle ? 168 : 85
    const loopTextY = hasTitle ? 186 : 108
    const tableHeaderY = hasTitle ? 202 : 135
    const tableStartY = hasTitle ? 218 : 155
    const rowH = hasTitle ? 22 : 28

    // Score
    const showScore = Math.floor(displayScore)
    if (timer > 0.5) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1)
      drawText(`${showScore}`, W / 2, scoreY, { color: COLORS.bone, size: hasTitle ? 28 : 36 })

      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1) * 0.5
      drawText(`loop ${game.loop}`, W / 2, loopTextY, { color: COLORS.ochre, size: 11 })
    }

    // Leaderboard
    if (timer > 1.3) {
      const tableAlpha = fadeIn * Math.min((timer - 1.3) * 2, 1)
      const list = getDisplayList()

      ctx.globalAlpha = tableAlpha * 0.5
      if (enteringInitials) {
        drawText('Y O U  M A D E  T H E  B O A R D !', W / 2, tableHeaderY, { color: COLORS.bone, size: 11 })
      } else {
        drawText('H I G H  S C O R E S', W / 2, tableHeaderY, { color: COLORS.ochre, size: 10 })
      }

      const colRank = W * 0.18
      const colName = W * 0.32
      const colScore = W * 0.58
      const colLoop = W * 0.78

      for (let i = 0; i < list.length; i++) {
        const h = list[i]
        const y = tableStartY + i * rowH
        const isHighlighted = h.isNew

        if (isHighlighted) {
          ctx.globalAlpha = tableAlpha * 0.08
          ctx.fillStyle = COLORS.spiceBlue
          ctx.fillRect(W * 0.1, y - 8, W * 0.8, rowH - 2)
        }

        const rowAlpha = tableAlpha * (isHighlighted ? 0.95 : 0.5)
        const color = isHighlighted ? COLORS.bone : COLORS.ochre
        ctx.globalAlpha = rowAlpha
        const fs = hasTitle ? 12 : 13

        drawText(`${i + 1}.`, colRank, y, { color, size: fs })

        if (isHighlighted && enteringInitials) {
          const slotW = 16, slotGap = 3
          const slotsX = colName - (slotW * 1.5 + slotGap)
          for (let s = 0; s < 3; s++) {
            const sx = slotsX + s * (slotW + slotGap)
            ctx.globalAlpha = rowAlpha * 0.4
            ctx.fillStyle = COLORS.spiceBlue
            ctx.fillRect(sx, y - 8, slotW, 18)
            ctx.globalAlpha = rowAlpha
            if (initials[s]) {
              drawText(initials[s], sx + slotW / 2, y, { color: COLORS.bone, size: 14 })
            } else if (s === initialPos && Math.sin(timer * 5) > 0) {
              ctx.fillStyle = COLORS.bone
              ctx.fillRect(sx + 3, y + 5, slotW - 6, 2)
            }
          }
        } else {
          drawText(h.initials || '---', colName, y, { color, size: fs })
        }

        ctx.globalAlpha = rowAlpha
        drawText(`${h.score}`, colScore, y, { color, size: fs })

        const loopStr = h.loop === '?' ? '' : `loop ${h.loop}`
        if (loopStr) {
          ctx.globalAlpha = rowAlpha * 0.7
          drawText(loopStr, colLoop, y, { color: COLORS.ochre, size: 9 })
        }
      }

      if (list.length === 0) {
        ctx.globalAlpha = tableAlpha * 0.4
        drawText('no scores yet', W / 2, tableStartY + 20, { color: COLORS.ochre, size: 12 })
      }

      // Prompts below table
      ctx.globalAlpha = tableAlpha * 0.7
      const promptY = tableStartY + Math.max(list.length, 1) * rowH + 10

      if (enteringInitials) {
        if (initialPos < 3) {
          drawText('T Y P E  Y O U R  I N I T I A L S', W / 2, promptY, { color: COLORS.spiceBlue, size: 11 })
          ctx.globalAlpha = tableAlpha * 0.4
          drawText('claim your place in history', W / 2, promptY + 14, { color: COLORS.ochre, size: 9 })
        } else {
          if (Math.sin(timer * 3) > 0) {
            drawText('P R E S S  E N T E R  T O  S A V E', W / 2, promptY, { color: COLORS.bone, size: 12 })
          }
          ctx.globalAlpha = tableAlpha * 0.4
          drawText('immortalize your legacy', W / 2, promptY + 14, { color: COLORS.ochre, size: 9 })
        }
      }
    }

    ctx.globalAlpha = 1

    // Preview label
    if (previewMode && previewIndex >= 0) {
      ctx.globalAlpha = 0.4
      drawText(`PREVIEW ${previewIndex + 1}/${PREVIEW_SCENARIOS.length}: ${PREVIEW_SCENARIOS[previewIndex].label}`,
        W / 2, H - 6, { color: '#ff8800', size: 9 })
      ctx.globalAlpha = 1
    }

    // Restart / next prompt
    if (timer > 2.0) {
      if (Math.sin(timer * 2) > 0) {
        ctx.globalAlpha = 0.5
        drawText(previewMode ? 'press any key for next' : (!enteringInitials ? 'press any key' : ''),
          W / 2, H - 18, { color: COLORS.bone, size: 10 })
        ctx.globalAlpha = 1
      }
    }
  },
}
