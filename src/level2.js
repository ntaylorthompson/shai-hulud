// Level 2 — Ride the Worm (placeholder)

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText } from './renderer.js'
import { anyKeyPressed } from './input.js'
import { switchState } from './state.js'

export const level2 = {
  enter() {},

  update(dt) {
    if (anyKeyPressed()) {
      switchState('level3')
    }
  },

  render() {
    clear(COLORS.burntOrange)
    drawText('LEVEL 2 — RIDE THE WORM', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, {
      color: COLORS.bone,
      size: 24,
    })
    drawText('[press any key to advance]', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, {
      color: COLORS.bone,
      size: 12,
    })
  },
}
