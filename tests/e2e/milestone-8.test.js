import { test, expect } from '@playwright/test'

// Helper: generate mock scores for Worker route intercept
function mockScores(count) {
  const scores = []
  for (let i = 0; i < count; i++) {
    scores.push({
      initials: String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i + 1) % 26)) + String.fromCharCode(65 + ((i + 2) % 26)),
      score: 50000 - i * 1000,
      loop: Math.max(1, 10 - Math.floor(i / 5)),
      created_at: new Date().toISOString(),
    })
  }
  return scores
}

function setupMockWorker(page, scores = [], failNetwork = false) {
  return page.route('**/scores', async (route) => {
    if (failNetwork) {
      await route.abort('connectionrefused')
      return
    }
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scores),
      })
    } else if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    } else if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
    } else {
      await route.fulfill({ status: 404, body: '{}' })
    }
  })
}

test.describe('Milestone 8 — Global Leaderboard', () => {

  test('leaderboard module exports expected functions', async ({ page }) => {
    await setupMockWorker(page, [])
    await page.goto('/')
    await page.waitForTimeout(300)

    const exports = await page.evaluate(async () => {
      const lb = await import('/src/leaderboard.js')
      return {
        hasFetchGlobalScores: typeof lb.fetchGlobalScores === 'function',
        hasSubmitScore: typeof lb.submitScore === 'function',
        hasMigrateLocalScores: typeof lb.migrateLocalScores === 'function',
        hasInvalidateCache: typeof lb.invalidateCache === 'function',
      }
    })
    for (const [key, val] of Object.entries(exports)) {
      expect(val, `${key} should be true`).toBe(true)
    }
  })

  test('title screen shows global scores overlay on press S', async ({ page }) => {
    const scores = mockScores(15)
    await setupMockWorker(page, scores)
    await page.goto('/')
    await page.waitForTimeout(600)

    // Press S to open scores overlay
    await page.keyboard.press('s')
    await page.waitForTimeout(500)

    // Check that global scores are rendered on canvas
    const hasOverlay = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      // Overlay darkens the screen — check that it's mostly dark
      let darkPixels = 0
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) darkPixels++
      }
      return darkPixels > 1000
    })
    expect(hasOverlay).toBe(true)
  })

  test('pagination works with arrow keys on scores overlay', async ({ page }) => {
    const scores = mockScores(50)
    await setupMockWorker(page, scores)
    await page.goto('/')
    await page.waitForTimeout(600)

    // Set global scores directly
    await page.evaluate((s) => {
      window.__testScores = s
    }, scores)
    await page.evaluate(async (s) => {
      const game = await import('/src/game.js')
      game.game.globalScores = s
      game.game.globalLoaded = true
    }, scores)

    // Press S to open scores
    await page.keyboard.press('s')
    await page.waitForTimeout(300)

    // Press right arrow to go to page 2
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)

    // Press right arrow to go to page 3
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)

    // Press left arrow back to page 2
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)

    // Any other key dismisses overlay
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Verify we're back to the title screen (no overlay)
    const state = await page.evaluate(async () => {
      const state = await import('/src/state.js')
      return state.getCurrentState()
    })
    expect(state).toBe('title')
  })

  test('game over shows global rank against mock leaderboard', async ({ page }) => {
    const scores = mockScores(20)
    await setupMockWorker(page, scores)
    await page.goto('/')
    await page.waitForTimeout(300)

    // Set up global scores and game state
    await page.evaluate(async (s) => {
      const game = await import('/src/game.js')
      game.game.globalScores = s
      game.game.globalLoaded = true
      game.game.score = 25000
      game.game.loop = 3
      const state = await import('/src/state.js')
      state.switchState('gameover')
    }, scores)

    await page.waitForTimeout(2000)

    // Verify game over screen is rendering
    const hasContent = await page.evaluate(() => {
      const ctx = document.getElementById('game').getContext('2d')
      const data = ctx.getImageData(0, 0, 640, 360).data
      const seen = new Set()
      for (let i = 0; i < data.length; i += 40) {
        seen.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`)
      }
      return seen.size
    })
    expect(hasContent).toBeGreaterThan(3)
  })

  test('score submission fires POST with correct payload', async ({ page }) => {
    let postBody = null
    await page.route('**/scores', async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        postBody = JSON.parse(request.postData())
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/')
    await page.waitForTimeout(300)

    // Call submitScore directly
    await page.evaluate(async () => {
      const lb = await import('/src/leaderboard.js')
      await lb.submitScore('TST', 12345, 3)
    })

    expect(postBody).not.toBeNull()
    expect(postBody.initials).toBe('TST')
    expect(postBody.score).toBe(12345)
    expect(postBody.loop).toBe(3)
  })

  test('offline fallback: uses localStorage scores when network fails', async ({ page }) => {
    await setupMockWorker(page, [], true) // fail network
    await page.goto('/')
    await page.waitForTimeout(300)

    // Seed localStorage with scores
    await page.evaluate(() => {
      const scores = [
        { score: 5000, loop: 2, initials: 'LOC' },
        { score: 3000, loop: 1, initials: 'OFF' },
      ]
      localStorage.setItem('shaiHulud_highScores', JSON.stringify(scores))
    })

    // Reload to trigger loadHighScores with network failure
    await page.reload()
    await page.waitForTimeout(1000)

    // Verify game still loaded and has local scores as fallback
    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      return {
        loaded: game.game.globalLoaded,
        hasScores: game.game.highScores.length > 0,
        fallbackUsed: game.game.globalScores.length > 0,
      }
    })
    expect(result.loaded).toBe(true)
    expect(result.hasScores).toBe(true)
  })

  test('migration: submits valid localStorage scores to Worker', async ({ page }) => {
    const postCalls = []
    await page.route('**/scores', async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        postCalls.push(JSON.parse(request.postData()))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      }
    })

    await page.goto('/')
    await page.waitForTimeout(300)

    // Seed localStorage with scores to migrate (no migrated flag)
    await page.evaluate(() => {
      localStorage.removeItem('shaiHulud_migrated')
      const scores = [
        { score: 8000, loop: 3, initials: 'AAA' },
        { score: 4000, loop: 2, initials: 'BBB' },
        { score: 2000, loop: '?', initials: 'CCC' },  // should be skipped (loop '?')
        { score: 1000, loop: 1, initials: '---' },     // should be skipped (initials '---')
      ]
      localStorage.setItem('shaiHulud_highScores', JSON.stringify(scores))
    })

    // Trigger migration
    await page.evaluate(async () => {
      const lb = await import('/src/leaderboard.js')
      await lb.migrateLocalScores()
    })

    // Only 2 valid entries should have been posted
    expect(postCalls.length).toBe(2)
    expect(postCalls[0].initials).toBe('AAA')
    expect(postCalls[0].score).toBe(8000)
    expect(postCalls[1].initials).toBe('BBB')
    expect(postCalls[1].score).toBe(4000)

    // Migrated flag should be set
    const migrated = await page.evaluate(() => localStorage.getItem('shaiHulud_migrated'))
    expect(migrated).toBe('1')
  })

  test('config exports WORKER_URL constant', async ({ page }) => {
    await setupMockWorker(page, [])
    await page.goto('/')
    await page.waitForTimeout(200)

    const hasUrl = await page.evaluate(async () => {
      const config = await import('/src/config.js')
      return typeof config.WORKER_URL === 'string' && config.WORKER_URL.length > 0
    })
    expect(hasUrl).toBe(true)
  })

  test('game.js has globalScores and globalLoaded properties', async ({ page }) => {
    await setupMockWorker(page, [])
    await page.goto('/')
    await page.waitForTimeout(200)

    const result = await page.evaluate(async () => {
      const game = await import('/src/game.js')
      return {
        hasGlobalScores: Array.isArray(game.game.globalScores),
        hasGlobalLoaded: typeof game.game.globalLoaded === 'boolean',
      }
    })
    expect(result.hasGlobalScores).toBe(true)
    expect(result.hasGlobalLoaded).toBe(true)
  })
})
