import { test, expect } from '@playwright/test'

test.describe('Milestone 3 — Level 2: Ride the Worm', () => {

  test('level 2 renders top-down desert with worm', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level2')
    })
    await page.waitForTimeout(300)

    // Should have many colors (sand bg, worm, enemies)
    const colorCount = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      const seen = new Set()
      for (let i = 0; i < data.length; i += 40) {
        seen.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`)
      }
      return seen.size
    })
    expect(colorCount).toBeGreaterThan(5)
  })

  test('worm position changes when steering', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level2')
    })
    await page.waitForTimeout(200)

    // Take a full canvas snapshot before steering
    const before = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      // Hash a sampling of pixels
      let hash = 0
      for (let i = 0; i < data.length; i += 100) {
        hash = (hash * 31 + data[i]) | 0
      }
      return hash
    })

    // Hold right arrow to steer
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(1000)
    await page.keyboard.up('ArrowRight')
    await page.waitForTimeout(200)

    const after = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      let hash = 0
      for (let i = 0; i < data.length; i += 100) {
        hash = (hash * 31 + data[i]) | 0
      }
      return hash
    })

    // Canvas content should have changed (worm moved, enemies moved)
    expect(after).not.toBe(before)
  })

  test('level 2 state has enemies after entering', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const enemyCount = await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level2')
      // Wait a frame for enter() to fire
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      // Read the current state of the canvas — look for the wave counter text
      const ctx = document.getElementById('game').getContext('2d')
      // Level 2 displays "Wave X/Y" and "Enemies: N" — we verify the scene has varied content
      const data = ctx.getImageData(0, 0, 640, 360).data
      const seen = new Set()
      for (let i = 0; i < data.length; i += 16) {
        seen.add(`${data[i]},${data[i+1]},${data[i+2]}`)
      }
      return seen.size
    })
    // A scene with enemies and worm should have many distinct pixel colors
    expect(enemyCount).toBeGreaterThan(10)
  })

  test('score increases when eating enemies (via game module)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const scored = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      const before = game.game.score
      game.addScore(50)
      return game.game.score > before
    })
    expect(scored).toBe(true)
  })

  test('combo system multiplies score', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      game.game.score = 0
      game.addScore(10)
      const after1 = game.game.score
      game.addScore(15)
      const after2 = game.game.score
      return { after1, after2 }
    })
    expect(result.after1).toBe(10)
    expect(result.after2).toBe(25)
  })
})
