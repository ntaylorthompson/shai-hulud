// Shared game session state — lives, score, loop number

import { INITIAL_LIVES } from './config.js'

export const game = {
  lives: INITIAL_LIVES,
  score: 0,
  loop: 1,
  highScore: 0,
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
