import { test, expect } from '@playwright/test'

test.describe('Milestone 5 — Screens & HUD', () => {

  test('title screen renders pixel art title with multiple colors', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)

    const colorCount = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(100, 80, 440, 120).data
      const seen = new Set()
      for (let i = 0; i < data.length; i += 16) {
        seen.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`)
      }
      return seen.size
    })
    // Pixel art title should produce varied colors in the title region
    expect(colorCount).toBeGreaterThan(3)
  })

  test('title screen has blinking text', async ({ page }) => {
    await page.goto('/')

    // Wait for blink cycle
    await page.waitForTimeout(600)
    const snap1 = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(200, 190, 240, 30).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i+1] + data[i+2]
      return sum
    })

    await page.waitForTimeout(500)
    const snap2 = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(200, 190, 240, 30).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i+1] + data[i+2]
      return sum
    })

    // The pixel sums should differ due to blinking text
    expect(snap1).not.toBe(snap2)
  })

  test('HUD renders on level screens (lives, score, loop)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      const game = await import('/src/game.js')
      game.resetGame()
      state.switchState('level1')
    })
    await page.waitForTimeout(300)

    // Check top bar area — should have dark semi-transparent background with light text
    const hasHUD = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      // Sample the HUD bar at top
      const data = ctx.getImageData(0, 0, 640, 18).data
      let darkPixels = 0
      let lightPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        const brightness = data[i] + data[i+1] + data[i+2]
        if (brightness < 200) darkPixels++
        if (brightness > 500) lightPixels++
      }
      return darkPixels > 100 && lightPixels > 5
    })
    expect(hasHUD).toBe(true)
  })

  test('game over screen shows score and high score', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const game = await import('/src/game.js')
      const state = await import('/src/state.js')
      game.game.score = 1234
      game.game.highScore = 1234
      game.game.loop = 3
      state.switchState('gameover')
    })
    await page.waitForTimeout(500)

    // Game over screen should have varied content (title, score, high score text)
    const colorCount = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(100, 80, 440, 200).data
      const seen = new Set()
      for (let i = 0; i < data.length; i += 40) {
        seen.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`)
      }
      return seen.size
    })
    expect(colorCount).toBeGreaterThan(3)
  })

  test('high score persists to localStorage', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Set a high score and trigger save via game over screen
    const stored = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      const state = await import('/src/state.js')
      game.game.score = 9999
      game.game.highScore = 9999
      state.switchState('gameover')
      // Wait for enter() to fire which saves high score
      await new Promise(r => setTimeout(r, 100))
      return localStorage.getItem('shaiHulud_highScore')
    })
    expect(stored).toBe('9999')
  })
})
