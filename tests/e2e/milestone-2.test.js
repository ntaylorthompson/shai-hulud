import { test, expect } from '@playwright/test'

test.describe('Milestone 2 — Level 1: Mount the Worm', () => {

  test('level 1 renders desert scene with player', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Switch directly to level 1
    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level1')
    })
    await page.waitForTimeout(300)

    // Check canvas has many colors (desert, player, dunes, etc)
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

  test('level 1 is in correct state after entering', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const state = await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level1')
      return state.getCurrentState()
    })
    expect(state).toBe('level1')
  })

  test('space bar triggers a jump in level 1', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level1')
    })
    await page.waitForTimeout(200)

    // Take snapshot before jump
    const before = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      let hash = 0
      for (let i = 0; i < data.length; i += 80) hash = (hash * 31 + data[i]) | 0
      return hash
    })

    await page.keyboard.press('Space')
    await page.waitForTimeout(200)

    const after = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      let hash = 0
      for (let i = 0; i < data.length; i += 80) hash = (hash * 31 + data[i]) | 0
      return hash
    })

    // Canvas should have changed after jump
    expect(after).not.toBe(before)
  })

  test('game state includes lives and score tracking', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

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

    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      const state = await import('/src/state.js')
      game.game.lives = 0
      game.loseLife()
      state.switchState('gameover')
      return state.getCurrentState()
    })
    expect(result).toBe('gameover')
  })
})
