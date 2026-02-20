// Game over screen

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'
import { game } from './game.js'

export const gameover = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    clear('#1a0500')
    drawText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, {
      color: COLORS.burntOrange,
      size: 48,
    })
    drawText(`Score: ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2, {
      color: COLORS.bone,
      size: 20,
    })
    drawText(`High Score: ${game.highScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
      color: COLORS.sand,
      size: 16,
    })
    drawText('Press any key to restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65, {
      color: COLORS.bone,
      size: 14,
    })
  },
}
