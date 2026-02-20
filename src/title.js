// Title screen

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'

export const title = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('level1')
    }
  },

  render() {
    clear(COLORS.deepBrown)
    drawText('SHAI-HULUD', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, {
      color: COLORS.sand,
      size: 48,
    })
    drawText('Press any key to start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
      color: COLORS.bone,
      size: 16,
    })
  },
}
