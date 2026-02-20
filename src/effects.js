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

// --- Atmospheric Effects ---

// Ambient dust particles (persistent, slow-moving)
const dustMotes = []
for (let i = 0; i < 25; i++) {
  dustMotes.push({
    x: Math.random() * GAME_WIDTH,
    y: Math.random() * GAME_HEIGHT,
    vx: 5 + Math.random() * 10,
    vy: -2 + Math.random() * 4,
    size: 1 + Math.random() * 1.5,
    alpha: 0.08 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
  })
}

export function updateDust(dt) {
  for (const d of dustMotes) {
    d.x += d.vx * dt
    d.y += d.vy * dt + Math.sin(d.phase + d.x * 0.01) * 0.3 * dt
    if (d.x > GAME_WIDTH + 5) { d.x = -5; d.y = Math.random() * GAME_HEIGHT }
    if (d.y < -5) d.y = GAME_HEIGHT + 5
    if (d.y > GAME_HEIGHT + 5) d.y = -5
  }
}

export function renderAtmosphere(time) {
  const ctx = getCtx()

  // Warm color grade overlay
  ctx.fillStyle = 'rgba(180, 120, 60, 0.06)'
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  // Vignette — dark radial gradient at edges
  const cx = GAME_WIDTH / 2
  const cy = GAME_HEIGHT / 2
  const maxR = Math.sqrt(cx * cx + cy * cy)
  const vig = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(0.7, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  // Ambient dust motes
  for (const d of dustMotes) {
    ctx.globalAlpha = d.alpha
    ctx.fillStyle = COLORS.bone
    ctx.fillRect(d.x, d.y, d.size, d.size)
  }
  ctx.globalAlpha = 1

  // Heat haze — subtle scanline distortion (only on lower half)
  // We shift narrow horizontal strips using drawImage source slicing
  const hazeStrength = 0.6
  const hazeFreq = 0.08
  const hazeSpeed = time * 0.001
  const startY = Math.floor(GAME_HEIGHT * 0.55)
  for (let y = startY; y < GAME_HEIGHT; y += 2) {
    const offset = Math.sin(y * hazeFreq + hazeSpeed) * hazeStrength
    const intensity = (y - startY) / (GAME_HEIGHT - startY)
    const shift = offset * intensity
    if (Math.abs(shift) < 0.1) continue
    ctx.drawImage(
      ctx.canvas,
      0, y, GAME_WIDTH, 2,
      shift, y, GAME_WIDTH, 2
    )
  }
}
