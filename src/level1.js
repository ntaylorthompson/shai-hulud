// Level 1 — Mount the Worm (placeholder)

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'

export const level1 = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('level2')
    }
  },

  render() {
    clear(COLORS.ochre)
    drawText('LEVEL 1 — MOUNT THE WORM', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, {
      color: COLORS.deepBrown,
      size: 24,
    })
    drawText('[press any key to advance]', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, {
      color: COLORS.deepBrown,
      size: 12,
    })
  },
}
