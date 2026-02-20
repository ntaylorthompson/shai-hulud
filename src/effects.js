// Visual effects — screen shake, flash, particles

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { getCtx } from './renderer.js'

// --- Screen Shake ---

let shakeIntensity = 0
let shakeDuration = 0
let shakeTimer = 0
let shakeOffsetX = 0
let shakeOffsetY = 0

export function triggerShake(intensity = 5, duration = 0.3) {
  shakeIntensity = intensity
  shakeDuration = duration
  shakeTimer = 0
}

export function updateShake(dt) {
  if (shakeTimer < shakeDuration) {
    shakeTimer += dt
    const t = 1 - shakeTimer / shakeDuration
    shakeOffsetX = (Math.random() * 2 - 1) * shakeIntensity * t
    shakeOffsetY = (Math.random() * 2 - 1) * shakeIntensity * t
  } else {
    shakeOffsetX = 0
    shakeOffsetY = 0
  }
}

export function applyShake() {
  const ctx = getCtx()
  ctx.save()
  ctx.translate(shakeOffsetX, shakeOffsetY)
}

export function resetShake() {
  const ctx = getCtx()
  ctx.restore()
}

// --- Flash ---

let flashColor = null
let flashDuration = 0
let flashTimer = 0

export function triggerFlash(color = '#fff', duration = 0.15) {
  flashColor = color
  flashDuration = duration
  flashTimer = 0
}

export function updateFlash(dt) {
  if (flashTimer < flashDuration) {
    flashTimer += dt
  }
}

export function renderFlash() {
  if (flashTimer < flashDuration) {
    const ctx = getCtx()
    const alpha = (1 - flashTimer / flashDuration) * 0.6
    ctx.fillStyle = flashColor
    ctx.globalAlpha = alpha
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    ctx.globalAlpha = 1
  }
}

// --- Particles ---

const particles = []

export function spawnParticles(x, y, count, { color = COLORS.sand, speedMin = 20, speedMax = 80, life = 0.8, sizeMin = 1, sizeMax = 4 } = {}) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = speedMin + Math.random() * (speedMax - speedMin)
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      color,
    })
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 50 * dt // slight gravity
    p.life -= dt
    if (p.life <= 0) particles.splice(i, 1)
  }
}

export function renderParticles() {
  const ctx = getCtx()
  for (const p of particles) {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1
}

export function clearParticles() {
  particles.length = 0
}
