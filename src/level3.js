// Level 3 — Dismount the Worm (placeholder)

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'

export const level3 = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('gameover')
    }
  },

  render() {
    clear(COLORS.sand)
    drawText('LEVEL 3 — DISMOUNT THE WORM', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, {
      color: COLORS.deepBrown,
      size: 24,
    })
    drawText('[press any key to advance]', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, {
      color: COLORS.deepBrown,
      size: 12,
    })
  },
}
