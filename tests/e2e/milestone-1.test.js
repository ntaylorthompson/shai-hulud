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

  test('full state cycle: title → L1 → L2 → L3 → gameover → title', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const getCornerColor = () => page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const d = ctx.getImageData(1, 1, 1, 1).data
      return [d[0], d[1], d[2]]
    })

    const colors = []

    // Title screen
    colors.push(await getCornerColor())

    // Title → Level 1
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    colors.push(await getCornerColor())

    // Level 1 → Level 2
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    colors.push(await getCornerColor())

    // Level 2 → Level 3
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    colors.push(await getCornerColor())

    // Level 3 → Game Over
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    colors.push(await getCornerColor())

    // Game Over → Title (back to start)
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)
    colors.push(await getCornerColor())

    // All 5 screens should have distinct background colors
    const unique = new Set(colors.map(c => c.join(',')))
    expect(unique.size).toBe(5)

    // Last color should match the first (back to title)
    expect(colors[5]).toEqual(colors[0])
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
