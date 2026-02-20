// Game over screen

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'

export const gameover = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    clear('#1a0500')
    drawText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, {
      color: COLORS.burntOrange,
      size: 48,
    })
    drawText('Press any key to restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
      color: COLORS.bone,
      size: 16,
    })
  },
}
