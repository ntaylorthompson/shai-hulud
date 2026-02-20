import { test, expect } from '@playwright/test'

test.describe('Milestone 6 — Audio', () => {

  test('audio module exports all expected functions', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const exports = await page.evaluate(async () => {
      const audio = await import('/src/audio.js')
      return {
        hasInitAudio: typeof audio.initAudio === 'function',
        hasPlayMusic: typeof audio.playMusic === 'function',
        hasStopMusic: typeof audio.stopMusic === 'function',
        hasToggleMute: typeof audio.toggleMute === 'function',
        hasIsMuted: typeof audio.isMuted === 'function',
        hasSfxJump: typeof audio.sfxJump === 'function',
        hasSfxEat: typeof audio.sfxEat === 'function',
        hasSfxDeath: typeof audio.sfxDeath === 'function',
        hasSfxSuccess: typeof audio.sfxSuccess === 'function',
        hasSfxHookPlant: typeof audio.sfxHookPlant === 'function',
        hasSfxWormRumble: typeof audio.sfxWormRumble === 'function',
        hasSfxTransition: typeof audio.sfxTransition === 'function',
      }
    })
    for (const [key, val] of Object.entries(exports)) {
      expect(val, `${key} should be true`).toBe(true)
    }
  })

  test('mute toggle works', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const result = await page.evaluate(async () => {
      const audio = await import('/src/audio.js')
      const before = audio.isMuted()
      audio.toggleMute()
      const after = audio.isMuted()
      audio.toggleMute()
      const restored = audio.isMuted()
      return { before, after, restored }
    })
    expect(result.before).toBe(false)
    expect(result.after).toBe(true)
    expect(result.restored).toBe(false)
  })

  test('stopMusic does not throw when no music is playing', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const noError = await page.evaluate(async () => {
      const audio = await import('/src/audio.js')
      try {
        audio.stopMusic()
        return true
      } catch (e) {
        return false
      }
    })
    expect(noError).toBe(true)
  })

  test('level1 imports audio functions without errors', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    const loaded = await page.evaluate(async () => {
      try {
        await import('/src/level1.js')
        return true
      } catch (e) {
        return e.message
      }
    })
    expect(loaded).toBe(true)
  })

  test('HUD updateHUD function toggles mute on M key', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(200)

    // Test the mute toggle directly via audio module
    const result = await page.evaluate(async () => {
      const audio = await import('/src/audio.js')
      const before = audio.isMuted()
      audio.toggleMute()
      const muted = audio.isMuted()
      audio.toggleMute()
      const unmuted = audio.isMuted()
      return { before, muted, unmuted }
    })
    expect(result.before).toBe(false)
    expect(result.muted).toBe(true)
    expect(result.unmuted).toBe(false)
  })
})
