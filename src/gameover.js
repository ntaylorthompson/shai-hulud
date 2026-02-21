// Game over screen — cinematic fade, score count-up, initials entry

import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js'
import { clear, drawText, getCtx } from './renderer.js'
import { anyKeyPressed, wasPressed } from './input.js'
import { switchState } from './state.js'
import { game, scoreQualifies, saveHighScores } from './game.js'

let timer, fadeIn, displayScore, rank
let enteringInitials, initials, initialPos

function getPressedLetter() {
  for (let i = 0; i < 26; i++) {
    const code = 'Key' + String.fromCharCode(65 + i)
    if (wasPressed(code)) return String.fromCharCode(65 + i)
  }
  return null
}

export const gameover = {
  enter() {
    timer = 0
    fadeIn = 0
    displayScore = 0
    rank = -1

    if (scoreQualifies()) {
      enteringInitials = true
      initials = ['', '', '']
      initialPos = 0
    } else {
      enteringInitials = false
      saveHighScores()
      rank = game.highScores.findIndex(h => h.score === game.score)
    }
  },

  update(dt) {
    timer += dt
    fadeIn = Math.min(fadeIn + dt * 1.0, 1)

    // Score count-up animation
    if (displayScore < game.score) {
      const rate = Math.max(game.score * 0.8, 50)
      displayScore = Math.min(displayScore + rate * dt, game.score)
    }

    // Initials entry (after score is shown)
    if (enteringInitials && timer > 1.5) {
      const letter = getPressedLetter()
      if (letter && initialPos < 3) {
        initials[initialPos] = letter
        initialPos++
      }
      if (wasPressed('Backspace') && initialPos > 0) {
        initialPos--
        initials[initialPos] = ''
      }
      if (wasPressed('Enter') && initialPos === 3) {
        const tag = initials.join('')
        rank = game.highScores.filter(h => h.score > game.score).length
        saveHighScores(tag)
        enteringInitials = false
      }
    }

    // Return to title (only after initials are done)
    if (!enteringInitials && timer > 2.0 && anyKeyPressed()) {
      switchState('title')
    }
  },

  render() {
    const ctx = getCtx()

    // Near-black with subtle warm gradient
    clear('#050302')
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    grad.addColorStop(0, '#030201')
    grad.addColorStop(0.5, '#0a0704')
    grad.addColorStop(1, '#0f0a05')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Minimal white text, large spacing
    ctx.globalAlpha = fadeIn

    // "GAME OVER" — thin, spaced
    drawText('G A M E   O V E R', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, {
      color: COLORS.bone,
      size: 28,
    })

    // Score with count-up
    const showScore = Math.floor(displayScore)
    if (timer > 0.5) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1)
      drawText(`${showScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, {
        color: COLORS.bone,
        size: 36,
      })
    }

    // Loop info
    if (timer > 1.0) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 1.0) * 2, 1) * 0.5
      drawText(`loop ${game.loop}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5, {
        color: COLORS.ochre,
        size: 11,
      })
    }

    // Initials entry
    if (enteringInitials && timer > 1.5) {
      const entryAlpha = fadeIn * Math.min((timer - 1.5) * 2, 1)
      ctx.globalAlpha = entryAlpha * 0.8
      drawText('NEW HIGH SCORE!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
        color: COLORS.bone,
        size: 14,
      })
      ctx.globalAlpha = entryAlpha * 0.6
      drawText('enter your initials', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, {
        color: COLORS.ochre,
        size: 10,
      })

      // 3 letter slots
      const slotW = 28, slotGap = 8
      const totalW = slotW * 3 + slotGap * 2
      const sx = GAME_WIDTH / 2 - totalW / 2

      for (let i = 0; i < 3; i++) {
        const x = sx + i * (slotW + slotGap)
        const y = GAME_HEIGHT / 2 + 62

        // Slot background
        ctx.globalAlpha = entryAlpha * 0.3
        ctx.fillStyle = COLORS.ochre
        ctx.fillRect(x, y, slotW, 28)

        // Letter or cursor
        ctx.globalAlpha = entryAlpha * 0.9
        if (initials[i]) {
          drawText(initials[i], x + slotW / 2, y + 14, {
            color: COLORS.bone,
            size: 20,
          })
        } else if (i === initialPos) {
          // Blinking cursor
          const blink = Math.sin(timer * 5) > 0
          if (blink) {
            ctx.fillStyle = COLORS.bone
            ctx.fillRect(x + slotW / 2 - 6, y + 22, 12, 2)
          }
        }
      }

      // Confirm hint
      if (initialPos === 3) {
        ctx.globalAlpha = entryAlpha * 0.6
        const blink = Math.sin(timer * 3) > 0
        if (blink) {
          drawText('press ENTER to save', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, {
            color: COLORS.bone,
            size: 10,
          })
        }
      }
    }

    // High scores table (after initials done)
    if (!enteringInitials && timer > 1.5 && game.highScores.length > 0) {
      const tableAlpha = fadeIn * Math.min((timer - 1.5) * 2, 1)
      ctx.globalAlpha = tableAlpha * 0.4
      drawText('H I G H  S C O R E S', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, {
        color: COLORS.ochre,
        size: 9,
      })
      for (let i = 0; i < game.highScores.length; i++) {
        const h = game.highScores[i]
        const isCurrentRun = i === rank && game.score > 0
        const tag = h.initials || '---'
        const loopStr = h.loop === '?' ? '' : `  loop ${h.loop}`
        ctx.globalAlpha = tableAlpha * (isCurrentRun ? 0.9 : 0.5)
        drawText(
          `${i + 1}.  ${tag}  ${h.score}${loopStr}`,
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 44 + i * 14,
          { color: isCurrentRun ? COLORS.bone : COLORS.ochre, size: 10 }
        )
      }
    }

    ctx.globalAlpha = 1

    // Restart prompt — only after initials done
    if (!enteringInitials && timer > 2.0) {
      const blink = Math.sin(timer * 2) > 0
      if (blink) {
        ctx.globalAlpha = 0.5
        drawText('press any key', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, {
          color: COLORS.bone,
          size: 10,
        })
        ctx.globalAlpha = 1
      }
    }
  },
}
