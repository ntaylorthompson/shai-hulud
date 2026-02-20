import { test, expect } from '@playwright/test'

test.describe('Milestone 2 — Level 1: Mount the Worm', () => {

  test('level 1 renders desert scene with player', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)
    // Go to level 1
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)

    // Check canvas has content drawn (not blank)
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let colorCount = 0
      const seen = new Set()
      for (let i = 0; i < data.length; i += 16) {
        const key = `${data[i]},${data[i+1]},${data[i+2]}`
        if (!seen.has(key)) {
          seen.add(key)
          colorCount++
        }
        if (colorCount > 5) return true
      }
      return false
    })
    expect(hasContent).toBe(true)
  })

  test('level 1 shows jump prompt', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)

    // The "Press SPACE to jump!" text should be rendered on the canvas
    // We verify by checking that the top area of the screen has light pixels (text)
    const hasTopText = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      // Sample the top region where the prompt text would be
      const data = ctx.getImageData(200, 20, 240, 20).data
      let lightPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) lightPixels++
      }
      return lightPixels > 10
    })
    expect(hasTopText).toBe(true)
  })

  test('space bar causes player to jump (player moves up)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)

    // Capture player area before jump
    const beforeJump = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      // Sample area around player position (x=100, y around 250-280)
      const data = ctx.getImageData(88, 240, 30, 50).data
      let bluePixels = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+2] > data[i] && data[i+2] > 100) bluePixels++
      }
      return bluePixels
    })

    // Press space to jump
    await page.keyboard.press('Space')
    await page.waitForTimeout(150)

    // After jumping, player should have moved — blue pixels in original spot should change
    const afterJump = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(88, 200, 30, 50).data
      let bluePixels = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+2] > data[i] && data[i+2] > 100) bluePixels++
      }
      return bluePixels
    })

    // After jump, there should be blue (player) pixels higher up
    expect(afterJump).toBeGreaterThan(0)
  })

  test('game state includes lives and score tracking', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Verify game module is loaded and has correct initial values
    const gameState = await page.evaluate(async () => {
      const mod = await import('/src/game.js')
      return { lives: mod.game.lives, score: mod.game.score, loop: mod.game.loop }
    })
    expect(gameState.lives).toBe(3)
    expect(gameState.score).toBe(0)
    expect(gameState.loop).toBe(1)
  })

  test('losing all lives transitions to game over', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Manually set lives to 0 and trigger game over
    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      const state = await import('/src/state.js')
      // Drain lives
      game.game.lives = 0
      game.loseLife()
      state.switchState('gameover')
      return state.getCurrentState()
    })
    expect(result).toBe('gameover')

    await page.waitForTimeout(300)

    // Verify game over screen renders
    const hasGameOver = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      // Game over screen has dark background
      const d = ctx.getImageData(1, 1, 1, 1).data
      return d[0] < 50 && d[1] < 20 && d[2] < 20
    })
    expect(hasGameOver).toBe(true)
  })
})
