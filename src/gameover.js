// Game over screen — cinematic fade, score count-up, minimal text

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'
import { game } from './game.js'

let timer, fadeIn, displayScore

function saveHighScore() {
  try {
    localStorage.setItem('shaiHulud_highScore', String(game.highScore))
  } catch (e) { /* localStorage unavailable */ }
}

export const gameover = {
  enter() {
    timer = 0
    fadeIn = 0
    displayScore = 0
    saveHighScore()
  },

  update(dt) {
    timer += dt
    // Slow fade to near-black
    fadeIn = Math.min(fadeIn + dt * 1.0, 1)

    // Score count-up animation
    if (displayScore < game.score) {
      const rate = Math.max(game.score * 0.8, 50)
      displayScore = Math.min(displayScore + rate * dt, game.score)
    }

    if (timer > 2.0 && anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    const ctx = getCtx()

    // Near-black with subtle warm gradient
    clear('#050302')
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#030201')
    grad.addColorStop(0.5, '#0a0704')
    grad.addColorStop(1, '#0f0a05')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Minimal white text, large spacing
    ctx.globalAlpha = fadeIn

    // "GAME OVER" — thin, spaced
    drawText('G A M E   O V E R', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, {
      color: COLORS.bone,
      size: 28,
    })

    // Score with count-up
    const showScore = Math.floor(displayScore)
    if (timer > 0.5) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1)
      drawText(`${showScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, {
        color: COLORS.bone,
        size: 36,
      })
    }

    // Loop info
    if (timer > 1.0) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 1.0) * 2, 1) * 0.5
      drawText(`loop ${game.loop}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25, {
        color: COLORS.ochre,
        size: 11,
      })
    }

    // High score
    if (timer > 1.5) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 1.5) * 2, 1) * 0.5
      const isNew = game.score >= game.highScore && game.score > 0
      drawText(
        isNew ? `new high score` : `high score  ${game.highScore}`,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 55,
        { color: isNew ? COLORS.bone : COLORS.ochre, size: 10 }
      )
    }

    ctx.globalAlpha = 1

    // Restart prompt — subtle blink
    if (timer > 2.0) {
      const blink = Math.sin(timer * 2) > 0
      if (blink) {
        ctx.globalAlpha = 0.5
        drawText('press any key', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, {
          color: COLORS.bone,
          size: 10,
        })
        ctx.globalAlpha = 1
      }
    }
  },
}
