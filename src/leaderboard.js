// Global leaderboard — all Worker communication lives here

import { WORKER_URL } from './config.js'

let cachedScores = null
let cacheTime = 0
const CACHE_TTL = 30000 // 30 seconds

export function invalidateCache() {
  cachedScores = null
  cacheTime = 0
}

export async function fetchGlobalScores() {
  // Return cache if fresh
  if (cachedScores && Date.now() - cacheTime < CACHE_TTL) {
    return cachedScores
  }

  try {
    const res = await fetch(`${WORKER_URL}/scores`)
    if (!res.ok) throw new Error('fetch failed')
    const scores = await res.json()
    cachedScores = scores
    cacheTime = Date.now()
    return scores
  } catch (e) {
    // Return stale cache if available, else empty
    return cachedScores || []
  }
}

export async function submitScore(initials, score, loop) {
  try {
    const res = await fetch(`${WORKER_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initials, score, loop }),
    })
    if (!res.ok) return false
    invalidateCache()
    return true
  } catch (e) {
    return false
  }
}

export async function migrateLocalScores() {
  try {
    if (localStorage.getItem('shaiHulud_migrated')) return
    const stored = localStorage.getItem('shaiHulud_highScores')
    if (!stored) {
      localStorage.setItem('shaiHulud_migrated', '1')
      return
    }

    const scores = JSON.parse(stored)
    let allOk = true

    for (const entry of scores) {
      // Skip invalid entries
      if (!entry.initials || entry.initials === '---') continue
      if (entry.loop === '?') continue
      if (!entry.score || entry.score <= 0) continue

      const ok = await submitScore(
        entry.initials.toUpperCase().slice(0, 3),
        Math.floor(entry.score),
        Math.floor(entry.loop) || 1
      )
      if (!ok) allOk = false
    }

    if (allOk) {
      localStorage.setItem('shaiHulud_migrated', '1')
    }
    // If not all succeeded, will retry next load
  } catch (e) {
    // Will retry next load
  }
}
