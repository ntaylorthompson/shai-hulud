// HUD — minimal in-game overlay (lives, score, loop counter)

import { GAME_WIDTH, COLORS } from './config.js'
import { getCtx } from './renderer.js'
import { game } from './game.js'
import { isMuted, toggleMute } from './audio.js'
import { wasPressed } from './input.js'

export function updateHUD() {
  if (wasPressed('KeyM')) toggleMute()
}

export function renderHUD() {
  const ctx = getCtx()

  // Semi-transparent bar at top
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(0, 0, GAME_WIDTH, 18)

  ctx.font = '12px monospace'
  ctx.textBaseline = 'middle'

  // Lives (left)
  ctx.fillStyle = COLORS.bone
  ctx.textAlign = 'left'
  let livesStr = ''
  for (let i = 0; i < game.lives; i++) livesStr += '\u2665 '
  ctx.fillText(livesStr || '\u2665 0', 8, 10)

  // Loop (center)
  ctx.fillStyle = COLORS.sand
  ctx.textAlign = 'center'
  ctx.fillText(`Loop ${game.loop}`, GAME_WIDTH / 2, 10)

  // Score (right)
  ctx.fillStyle = COLORS.bone
  ctx.textAlign = 'right'
  const muteIcon = isMuted() ? ' [M]' : ''
  ctx.fillText(`${game.score}${muteIcon}`, GAME_WIDTH - 8, 10)
}
