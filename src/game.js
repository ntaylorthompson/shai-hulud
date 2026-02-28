// Shared game session state — lives, score, loop number

import { INITIAL_LIVES } from './config.js'
import { fetchGlobalScores, submitScore, migrateLocalScores } from './leaderboard.js'

export const game = {
  lives: INITIAL_LIVES,
  score: 0,
  loop: 1,
  highScore: 0,
  highScores: [],  // [{score, loop}] top 5 (localStorage)
  globalScores: [], // remote top 50
  globalLoaded: false,
}

export function resetGame() {
  game.lives = INITIAL_LIVES
  game.score = 0
  game.loop = 1
}

export function loseLife() {
  game.lives--
  return game.lives >= 0
}

export function addLife() {
  game.lives++
}

export function addScore(points) {
  game.score += points
  if (game.score > game.highScore) {
    game.highScore = game.score
  }
}

export function nextLoop() {
  game.loop++
}

export function loadHighScores() {
  try {
    const stored = localStorage.getItem('shaiHulud_highScores')
    if (stored) {
      game.highScores = JSON.parse(stored)
    }
    // Migrate old single high score
    const oldHS = localStorage.getItem('shaiHulud_highScore')
    if (oldHS) {
      const val = parseInt(oldHS, 10) || 0
      if (val > 0 && !game.highScores.some(h => h.score === val)) {
        game.highScores.push({ score: val, loop: '?' })
        game.highScores.sort((a, b) => b.score - a.score)
        game.highScores = game.highScores.slice(0, 5)
      }
    }
    game.highScore = game.highScores.length > 0 ? game.highScores[0].score : 0
  } catch (e) { /* localStorage unavailable */ }

  // Fire-and-forget: migrate local scores then fetch global
  migrateLocalScores()
    .then(() => fetchGlobalScores())
    .then(scores => {
      game.globalScores = scores
      game.globalLoaded = true
    })
    .catch(() => {
      // Fallback to local scores
      game.globalScores = game.highScores.slice()
      game.globalLoaded = true
    })
}

export function scoreQualifies() {
  if (game.score <= 0) return false
  // Check against global scores if available
  const list = game.globalScores.length > 0 ? game.globalScores : game.highScores
  const limit = game.globalScores.length > 0 ? 50 : 5
  if (list.length < limit) return true
  return game.score > list[list.length - 1].score
}

export function saveHighScores(initials) {
  try {
    if (game.score > 0) {
      game.highScores.push({ score: game.score, loop: game.loop, initials: initials || '---' })
      game.highScores.sort((a, b) => b.score - a.score)
      game.highScores = game.highScores.slice(0, 5)
      game.highScore = game.highScores[0].score
    }
    localStorage.setItem('shaiHulud_highScores', JSON.stringify(game.highScores))
    localStorage.setItem('shaiHulud_highScore', String(game.highScore))
  } catch (e) { /* localStorage unavailable */ }

  // Fire-and-forget: submit to global leaderboard
  if (game.score > 0 && initials && initials !== '---') {
    submitScore(initials, game.score, game.loop).then(ok => {
      if (ok) {
        // Optimistic insert into globalScores
        game.globalScores.push({
          initials,
          score: game.score,
          loop: game.loop,
          created_at: new Date().toISOString(),
        })
        game.globalScores.sort((a, b) => b.score - a.score)
        game.globalScores = game.globalScores.slice(0, 50)
      }
    })
  }
}
