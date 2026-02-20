import { test, expect } from '@playwright/test'

test.describe('Milestone 1 — Scaffold & Game Loop', () => {

  test('canvas is rendered at correct dimensions', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('#game')
    await expect(canvas).toBeVisible()
    const width = await canvas.getAttribute('width')
    const height = await canvas.getAttribute('height')
    expect(Number(width)).toBe(640)
    expect(Number(height)).toBe(360)
  })

  test('title screen renders on load', async ({ page }) => {
    await page.goto('/')
    // Give the game loop a frame to render
    await page.waitForTimeout(200)
    // Check canvas has non-zero pixel data (something was drawn)
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('game')
      const ctx = canvas.getContext('2d')
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      // Check that not all pixels are black/empty
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) return true
      }
      return false
    })
    expect(hasContent).toBe(true)
  })

  test('pressing a key transitions from title to level 1', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Capture the title screen pixels
    const titlePixel = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const d = ctx.getImageData(1, 1, 1, 1).data
      return [d[0], d[1], d[2]]
    })

    // Press a key to advance
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)

    // Capture level 1 pixels — should be different color
    const level1Pixel = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const d = ctx.getImageData(1, 1, 1, 1).data
      return [d[0], d[1], d[2]]
    })

    // Background colors differ between title (deepBrown) and level1 (ochre)
    expect(level1Pixel).not.toEqual(titlePixel)
  })

  test('state machine supports full cycle via direct transitions', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Use the state machine directly to verify all states are registered and transitions work
    const result = await page.evaluate(async () => {
      const state = await import('/src/state.js')
      const visited = []

      const states = ['title', 'level1', 'level2', 'level3', 'gameover', 'title']
      for (const s of states) {
        state.switchState(s)
        visited.push(state.getCurrentState())
      }
      return visited
    })

    expect(result).toEqual(['title', 'level1', 'level2', 'level3', 'gameover', 'title'])
  })

  test('game loop runs continuously (multiple frames rendered)', async ({ page }) => {
    await page.goto('/')

    const frameCount = await page.evaluate(() => {
      return new Promise(resolve => {
        let count = 0
        const orig = window.requestAnimationFrame
        window.requestAnimationFrame = function(cb) {
          count++
          if (count >= 10) {
            window.requestAnimationFrame = orig
            resolve(count)
          }
          return orig.call(window, cb)
        }
      })
    })

    expect(frameCount).toBeGreaterThanOrEqual(10)
  })
})
