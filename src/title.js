// Title screen — cinematic Villeneuve-style desert horizon

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed, wasPressed } from './input.js'
import { switchState } from './state.js'
import { resetGame, game } from './game.js'
import { playMusic, sfxTransition } from './audio.js'

let timer, fadeIn

function loadHighScore() {
  try {
    const stored = localStorage.getItem('shaiHulud_highScore')
    if (stored) game.highScore = parseInt(stored, 10) || 0
  } catch (e) { /* localStorage unavailable */ }
}

function saveHighScore() {
  try {
    localStorage.setItem('shaiHulud_highScore', String(game.highScore))
  } catch (e) { /* localStorage unavailable */ }
}

// Thin pixel font — Villeneuve's Dune uses clean, thin, spaced-out typography
const TITLE_LETTERS = {
  S: [' ##','#  ','#  ',' # ','  #','  #','## '],
  H: ['# #','# #','# #','###','# #','# #','# #'],
  A: [' # ','# #','# #','###','# #','# #','# #'],
  I: ['#','#','#','#','#','#','#'],
  '-': ['   ','   ','   ','###','   ','   ','   '],
  U: ['# #','# #','# #','# #','# #','# #',' # '],
  L: ['#  ','#  ','#  ','#  ','#  ','#  ','###'],
  D: ['## ','# #','# #','# #','# #','# #','## '],
}

function drawPixelTitle(ctx, text, startX, startY, pixelSize) {
  const letters = text.split('')
  let offsetX = 0
  for (const ch of letters) {
    const grid = TITLE_LETTERS[ch]
    if (!grid) { offsetX += 4 * pixelSize; continue }
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === '#') {
          const px = startX + offsetX + col * pixelSize
          const py = startY + row * pixelSize
          ctx.fillStyle = COLORS.bone
          ctx.fillRect(px, py, pixelSize - 1, pixelSize - 1)
        }
      }
    }
    // Extra spacing between letters for that spaced-out Villeneuve look
    offsetX += (grid[0].length + 2) * pixelSize
  }
  return offsetX
}

export const title = {
  enter() {
    timer = 0
    fadeIn = 0
    loadHighScore()
    playMusic('title')
  },

  update(dt) {
    timer += dt
    fadeIn = Math.min(fadeIn + dt * 1.5, 1)

    if (timer > 0.5 && anyKeyPressed()) {
      resetGame()
      saveHighScore()
      sfxTransition()
      if (wasPressed('Digit3')) {
        switchState('level3')
      } else {
        switchState('level1')
      }
    }
  },

  render() {
    const ctx = getCtx()

    // Slow zoom/drift via subtle scale transform
    const zoom = 1 + timer * 0.002
    const driftX = Math.sin(timer * 0.05) * 3
    ctx.save()
    ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.75)
    ctx.scale(zoom, zoom)
    ctx.translate(-GAME_WIDTH / 2 + driftX, -GAME_HEIGHT * 0.75)

    // Deep gradient with distant horizon
    clear(COLORS.black)
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#0a0704')
    grad.addColorStop(0.55, '#1a1208')
    grad.addColorStop(0.72, '#3a2810')
    grad.addColorStop(0.78, '#7a6040')
    grad.addColorStop(0.82, '#3a2810')
    grad.addColorStop(1, '#1a1208')
    ctx.fillStyle = grad
    ctx.fillRect(-10, -10, GAME_WIDTH + 20, GAME_HEIGHT + 20)

    // Distant sun — single bright point on horizon
    const sunX = GAME_WIDTH * 0.5
    const sunY = GAME_HEIGHT * 0.74
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80)
    sunGrad.addColorStop(0, 'rgba(232, 200, 140, 0.7)')
    sunGrad.addColorStop(0.2, 'rgba(200, 160, 90, 0.3)')
    sunGrad.addColorStop(0.6, 'rgba(200, 160, 90, 0.05)')
    sunGrad.addColorStop(1, 'rgba(200, 160, 90, 0)')
    ctx.fillStyle = sunGrad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    ctx.fillStyle = '#e8c88c'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 3, 0, Math.PI * 2)
    ctx.fill()

    // Horizon line
    ctx.fillStyle = 'rgba(196, 160, 96, 0.15)'
    ctx.fillRect(0, GAME_HEIGHT * 0.765, GAME_WIDTH, 1)

    ctx.restore()

    // Sparse dust motes (outside zoom transform)
    ctx.fillStyle = 'rgba(232, 220, 200, 0.12)'
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + timer * 8) % GAME_WIDTH)
      const y = ((i * 53 + timer * 4 + Math.sin(i + timer * 0.3) * 20) % GAME_HEIGHT)
      ctx.fillRect(x, y, 1, 1)
    }

    // Title text — thin, spaced-out pixel font
    const titleText = 'SHAI-HULUD'
    const pixelSize = 3
    const titleWidth = drawPixelTitle(ctx, titleText, 0, -100, pixelSize)
    const titleX = (GAME_WIDTH - titleWidth) / 2
    const titleY = GAME_HEIGHT * 0.28

    ctx.globalAlpha = fadeIn
    drawPixelTitle(ctx, titleText, titleX, titleY, pixelSize)
    ctx.globalAlpha = 1

    // Subtitle — thin, fading in
    const subtitleAlpha = Math.max(0, (fadeIn - 0.5) * 2)
    if (subtitleAlpha > 0) {
      ctx.globalAlpha = subtitleAlpha * 0.6
      drawText('R I D E   T H E   W O R M', GAME_WIDTH / 2, titleY + 30, {
        color: COLORS.ochre,
        size: 9,
      })
      ctx.globalAlpha = 1
    }

    // Blinking prompt — bone/cream thin text
    const blink = Math.sin(timer * 2.5) > 0
    if (blink && timer > 1.0) {
      drawText('press any key to start', GAME_WIDTH / 2, GAME_HEIGHT * 0.58, {
        color: COLORS.bone,
        size: 12,
      })
    }

    // Practice prompt — always visible after fade-in
    if (timer > 1.0) {
      ctx.globalAlpha = 0.5
      drawText('press 3 to practice dismount', GAME_WIDTH / 2, GAME_HEIGHT * 0.64, {
        color: COLORS.ochre,
        size: 9,
      })
      ctx.globalAlpha = 1
    }

    // High score — minimal
    if (game.highScore > 0) {
      ctx.globalAlpha = 0.5
      drawText(`high score  ${game.highScore}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.7, {
        color: COLORS.ochre,
        size: 10,
      })
      ctx.globalAlpha = 1
    }

    // Credits — very subtle
    ctx.globalAlpha = 0.3
    drawText('A N  O L D  M A N  W O R M  G A M E', GAME_WIDTH / 2, GAME_HEIGHT - 20, {
      color: COLORS.ochre,
      size: 8,
    })
    ctx.globalAlpha = 1
  },
}
