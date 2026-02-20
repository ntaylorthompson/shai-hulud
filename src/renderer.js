// Canvas rendering utilities

import { GAME_WIDTH, GAME_HEIGHT } from './config.js'

let canvas, ctx

export function initRenderer() {
  canvas = document.getElementById('game')
  ctx = canvas.getContext('2d')
  canvas.width = GAME_WIDTH
  canvas.height = GAME_HEIGHT
  resize()
  window.addEventListener('resize', resize)
  return ctx
}

function resize() {
  const scaleX = window.innerWidth / GAME_WIDTH
  const scaleY = window.innerHeight / GAME_HEIGHT
  const scale = Math.floor(Math.min(scaleX, scaleY)) || 1
  canvas.style.width = GAME_WIDTH * scale + 'px'
  canvas.style.height = GAME_HEIGHT * scale + 'px'
}

export function clear(color) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
}

export function drawText(text, x, y, { color = '#fff', size = 16, align = 'center' } = {}) {
  ctx.fillStyle = color
  ctx.font = `${size}px monospace`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

export function getCtx() {
  return ctx
}
