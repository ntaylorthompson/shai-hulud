// Shared game session state — lives, score, loop number

import { INITIAL_LIVES } from './config.js'

export const game = {
  lives: INITIAL_LIVES,
  score: 0,
  loop: 1,
  highScore: 0,
  highScores: [],  // [{score, loop}] top 5
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
}

export function scoreQualifies() {
  if (game.score <= 0) return false
  if (game.highScores.length < 5) return true
  return game.score > game.highScores[game.highScores.length - 1].score
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
}
