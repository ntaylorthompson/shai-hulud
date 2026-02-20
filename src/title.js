// Title screen — pixel art title, high score, press any key

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed } from './input.js'
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

// Simple blocky pixel font for title
const TITLE_LETTERS = {
  S: [' ###','#   ','#   ',' ## ','   #','   #','### '],
  H: ['#  #','#  #','#  #','####','#  #','#  #','#  #'],
  A: [' ## ','#  #','#  #','####','#  #','#  #','#  #'],
  I: ['###',' # ',' # ',' # ',' # ',' # ','###'],
  '-': ['    ','    ','    ','####','    ','    ','    '],
  U: ['#  #','#  #','#  #','#  #','#  #','#  #',' ## '],
  L: ['#   ','#   ','#   ','#   ','#   ','#   ','####'],
  D: ['### ','#  #','#  #','#  #','#  #','#  #','### '],
}

function drawPixelTitle(ctx, text, startX, startY, pixelSize) {
  const letters = text.split('')
  let offsetX = 0
  for (const ch of letters) {
    const grid = TITLE_LETTERS[ch]
    if (!grid) { offsetX += 3 * pixelSize; continue }
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === '#') {
          const px = startX + offsetX + col * pixelSize
          const py = startY + row * pixelSize
          // Shadow
          ctx.fillStyle = COLORS.deepBrown
          ctx.fillRect(px + 1, py + 1, pixelSize, pixelSize)
          // Main
          ctx.fillStyle = COLORS.sand
          ctx.fillRect(px, py, pixelSize, pixelSize)
        }
      }
    }
    offsetX += (grid[0].length + 1) * pixelSize
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
    fadeIn = Math.min(fadeIn + dt * 2, 1)

    if (timer > 0.5 && anyKeyPressed()) {
      resetGame()
      saveHighScore()
      sfxTransition()
      switchState('level1')
    }
  },

  render() {
    const ctx = getCtx()

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
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Distant sun/moon — single bright point on horizon
    const sunX = GAME_WIDTH * 0.5 + Math.sin(timer * 0.1) * 20
    const sunY = GAME_HEIGHT * 0.74
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60)
    sunGrad.addColorStop(0, 'rgba(232, 200, 140, 0.6)')
    sunGrad.addColorStop(0.3, 'rgba(200, 160, 90, 0.2)')
    sunGrad.addColorStop(1, 'rgba(200, 160, 90, 0)')
    ctx.fillStyle = sunGrad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    ctx.fillStyle = '#e8c88c'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 3, 0, Math.PI * 2)
    ctx.fill()

    // Sparse dust motes
    ctx.fillStyle = 'rgba(232, 220, 200, 0.15)'
    for (let i = 0; i < 15; i++) {
      const x = ((i * 97 + timer * 12) % GAME_WIDTH)
      const y = ((i * 53 + timer * 6 + Math.sin(i + timer * 0.5) * 20) % GAME_HEIGHT)
      ctx.fillRect(x, y, 1, 1)
    }

    // Pixel art title
    const titleText = 'SHAI-HULUD'
    // Measure width: each letter roughly 5 chars wide * pixelSize + spacing
    const pixelSize = 4
    const titleWidth = drawPixelTitle(ctx, titleText, 0, -100, pixelSize) // dry run off-screen
    const titleX = (GAME_WIDTH - titleWidth) / 2
    const titleY = GAME_HEIGHT / 2 - 70

    ctx.globalAlpha = fadeIn
    drawPixelTitle(ctx, titleText, titleX, titleY, pixelSize)
    ctx.globalAlpha = 1

    // Subtitle
    const blink = Math.sin(timer * 3) > 0
    if (blink && timer > 0.5) {
      drawText('Press any key to start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, {
        color: COLORS.bone,
        size: 16,
      })
    }

    // High score
    if (game.highScore > 0) {
      drawText(`High Score: ${game.highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 55, {
        color: COLORS.ochre,
        size: 14,
      })
    }

    // Credits
    drawText('A DUNE ARCADE GAME', GAME_WIDTH / 2, GAME_HEIGHT - 30, {
      color: '#5a4020',
      size: 10,
    })
  },
}
