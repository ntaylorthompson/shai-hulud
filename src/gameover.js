// Game over screen — score display, high score persistence

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'
import { game } from './game.js'

let timer, fadeIn

function saveHighScore() {
  try {
    localStorage.setItem('shaiHulud_highScore', String(game.highScore))
  } catch (e) { /* localStorage unavailable */ }
}

export const gameover = {
  enter() {
    timer = 0
    fadeIn = 0
    saveHighScore()
  },

  update(dt) {
    timer += dt
    fadeIn = Math.min(fadeIn + dt * 2, 1)

    if (timer > 1.0 && anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    const ctx = getCtx()

    // Near-black with subtle warm gradient — somber
    clear('#0a0704')
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#050302')
    grad.addColorStop(0.5, '#0f0a05')
    grad.addColorStop(1, '#1a1008')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.globalAlpha = fadeIn

    drawText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, {
      color: COLORS.sand,
      size: 48,
    })

    drawText(`Score: ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 5, {
      color: COLORS.bone,
      size: 24,
    })

    drawText(`Loop ${game.loop}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, {
      color: COLORS.ochre,
      size: 14,
    })

    const isNew = game.score >= game.highScore && game.score > 0
    drawText(
      isNew ? `NEW HIGH SCORE: ${game.highScore}` : `High Score: ${game.highScore}`,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 55,
      { color: isNew ? COLORS.sand : COLORS.ochre, size: 16 }
    )

    ctx.globalAlpha = 1

    const blink = Math.sin(timer * 3) > 0
    if (blink && timer > 1.0) {
      drawText('Press any key to restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, {
        color: COLORS.bone,
        size: 14,
      })
    }
  },
}
