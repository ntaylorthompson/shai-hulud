// HUD — ultra-minimal cinematic overlay

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

  // Thin semi-transparent bar
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, 0, GAME_WIDTH, 16)

  ctx.font = '10px monospace'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = 0.85

  // Lives (left) — thin pip marks
  ctx.fillStyle = COLORS.bone
  ctx.textAlign = 'left'
  let livesStr = ''
  for (let i = 0; i < game.lives; i++) livesStr += '| '
  ctx.fillText(livesStr || '0', 8, 9)

  // Loop (center)
  ctx.textAlign = 'center'
  ctx.fillText(`loop ${game.loop}`, GAME_WIDTH / 2, 9)

  // Score (right)
  ctx.textAlign = 'right'
  const muteIcon = isMuted() ? ' [M]' : ''
  ctx.fillText(`${game.score}${muteIcon}`, GAME_WIDTH - 8, 9)

  ctx.globalAlpha = 1
}
