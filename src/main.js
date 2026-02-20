// Entry point — game loop and initialization

import { STATES } from './config.js'
import { initRenderer } from './renderer.js'
import { initInput, clearFrame } from './input.js'
import { initAudio } from './audio.js'
import { registerState, switchState, updateState, renderState } from './state.js'
import { title } from './title.js'
import { level1 } from './level1.js'
import { level2 } from './level2.js'
import { level3 } from './level3.js'
import { gameover } from './gameover.js'
import { updateHUD } from './hud.js'
import { updateShake, applyShake, resetShake, updateFlash, renderFlash, updateParticles, renderParticles, updateDust, renderAtmosphere } from './effects.js'

initRenderer()
initInput()
initAudio()

registerState(STATES.TITLE, title)
registerState(STATES.LEVEL1, level1)
registerState(STATES.LEVEL2, level2)
registerState(STATES.LEVEL3, level3)
registerState(STATES.GAMEOVER, gameover)

switchState(STATES.TITLE)

let lastTime = 0

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05) // cap dt to avoid spiral
  lastTime = time

  updateHUD()
  updateShake(dt)
  updateFlash(dt)
  updateParticles(dt)
  updateDust(dt)

  applyShake()
  updateState(dt)
  renderState()
  renderParticles()
  renderFlash()
  renderAtmosphere(time)
  resetShake()

  clearFrame()

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
