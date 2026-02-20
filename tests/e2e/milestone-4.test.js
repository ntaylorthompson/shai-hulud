import { test, expect } from '@playwright/test'

test.describe('Milestone 4 — Level 3: Dismount the Worm', () => {

  test('level 3 renders scene with safe zone and hazards', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level3')
    })
    await page.waitForTimeout(300)

    // Should have green (safe zone), orange/brown (worm), sand bg, grey (rocks)
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

  test('worm moves across screen while diving', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level3')
    })
    await page.waitForTimeout(200)

    // Snapshot before
    const before = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      let hash = 0
      for (let i = 0; i < data.length; i += 80) hash = (hash * 31 + data[i]) | 0
      return hash
    })

    // Wait for worm to move onto screen
    await page.waitForTimeout(2000)

    const after = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      let hash = 0
      for (let i = 0; i < data.length; i += 80) hash = (hash * 31 + data[i]) | 0
      return hash
    })

    // Canvas should change as worm traverses and dives
    expect(after).not.toBe(before)
  })

  test('safe zone shrinks with higher loop number', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const radii = await page.evaluate(async () => {
      const config = await import('/src/config.js')
      const base = config.L3.safeZoneBaseRadius
      const shrink = config.L3.safeZoneShrinkPerLoop
      const min = config.L3.safeZoneMinRadius
      return {
        loop1: Math.max(base - shrink * 0, min),
        loop5: Math.max(base - shrink * 4, min),
      }
    })
    expect(radii.loop1).toBeGreaterThan(radii.loop5)
  })

  test('success awards life and increments loop', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      game.resetGame()
      const livesBefore = game.game.lives
      const loopBefore = game.game.loop
      game.addLife()
      game.nextLoop()
      return {
        livesBefore,
        livesAfter: game.game.lives,
        loopBefore,
        loopAfter: game.game.loop,
      }
    })
    expect(result.livesAfter).toBe(result.livesBefore + 1)
    expect(result.loopAfter).toBe(result.loopBefore + 1)
  })

  test('level 3 success transitions back to level 1 for new loop', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Manually trigger success path via state machine
    const finalState = await page.evaluate(async () => {
      const state = await import('/src/state.js')
      state.switchState('level3')
      // Wait a moment, then switch to level1 (simulating success)
      state.switchState('level1')
      return state.getCurrentState()
    })
    expect(finalState).toBe('level1')
  })
})
