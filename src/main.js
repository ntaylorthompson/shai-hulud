// Entry point — game loop and initialization

import { STATES } from './config.js'
import { initRenderer } from './renderer.js'
import { initInput, clearFrame } from './input.js'
import { registerState, switchState, updateState, renderState } from './state.js'
import { title } from './title.js'
import { level1 } from './level1.js'
import { level2 } from './level2.js'
import { level3 } from './level3.js'
import { gameover } from './gameover.js'

initRenderer()
initInput()

registerState(STATES.TITLE, title)
registerState(STATES.LEVEL1, level1)
registerState(STATES.LEVEL2, level2)
registerState(STATES.LEVEL3, level3)
registerState(STATES.GAMEOVER, gameover)

switchState(STATES.TITLE)

let lastTime = 0

function loop(time) {
  const dt = (time - lastTime) / 1000
  lastTime = time

  updateState(dt)
  renderState()
  clearFrame()

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
