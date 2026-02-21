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

// Build a display list that merges existing scores with the current run
function getDisplayList() {
  if (enteringInitials) {
    const list = game.highScores.map(h => ({ ...h, isNew: false }))
    list.splice(rank, 0, {
      score: game.score, loop: game.loop,
      initials: initials.join('') || null, isNew: true,
    })
    return list.slice(0, 5)
  }
  return game.highScores.map((h, i) => ({
    ...h, isNew: i === rank && game.score > 0 && h.score === game.score,
  }))
}

export const gameover = {
  enter() {
    timer = 0
    fadeIn = 0
    displayScore = 0

    if (scoreQualifies()) {
      enteringInitials = true
      initials = ['', '', '']
      initialPos = 0
      rank = game.highScores.filter(h => h.score > game.score).length
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

    // Initials entry
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
        saveHighScores(tag)
        enteringInitials = false
        rank = game.highScores.findIndex(h => h.score === game.score && h.initials === tag)
      }
    }

    // Return to title
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

    ctx.globalAlpha = fadeIn

    // "GAME OVER"
    drawText('G A M E   O V E R', GAME_WIDTH / 2, 40, {
      color: COLORS.bone,
      size: 28,
    })

    // Score with count-up
    const showScore = Math.floor(displayScore)
    if (timer > 0.5) {
      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1)
      drawText(`${showScore}`, GAME_WIDTH / 2, 85, {
        color: COLORS.bone,
        size: 36,
      })

      ctx.globalAlpha = fadeIn * Math.min((timer - 0.5) * 2, 1) * 0.5
      drawText(`loop ${game.loop}`, GAME_WIDTH / 2, 112, {
        color: COLORS.ochre,
        size: 11,
      })
    }

    // Leaderboard — always shown (with inline initials entry for new entries)
    if (timer > 1.3) {
      const tableAlpha = fadeIn * Math.min((timer - 1.3) * 2, 1)
      const list = getDisplayList()

      // Header
      ctx.globalAlpha = tableAlpha * 0.5
      if (enteringInitials) {
        drawText('Y O U  M A D E  T H E  B O A R D !', GAME_WIDTH / 2, 140, {
          color: COLORS.bone,
          size: 12,
        })
      } else {
        drawText('H I G H  S C O R E S', GAME_WIDTH / 2, 140, {
          color: COLORS.ochre,
          size: 10,
        })
      }

      // Table rows
      const rowH = 30
      const tableY = 162
      const colRank = GAME_WIDTH * 0.18
      const colName = GAME_WIDTH * 0.32
      const colScore = GAME_WIDTH * 0.58
      const colLoop = GAME_WIDTH * 0.78

      for (let i = 0; i < list.length; i++) {
        const h = list[i]
        const y = tableY + i * rowH
        const isHighlighted = h.isNew

        // Row background highlight
        if (isHighlighted) {
          ctx.globalAlpha = tableAlpha * 0.08
          ctx.fillStyle = COLORS.spiceBlue
          ctx.fillRect(GAME_WIDTH * 0.1, y - 10, GAME_WIDTH * 0.8, rowH - 2)
        }

        const rowAlpha = tableAlpha * (isHighlighted ? 0.95 : 0.5)
        const color = isHighlighted ? COLORS.bone : COLORS.ochre
        ctx.globalAlpha = rowAlpha

        // Rank
        drawText(`${i + 1}.`, colRank, y, { color, size: 14 })

        // Initials column
        if (isHighlighted && enteringInitials) {
          // Editable slots inline
          const slotW = 18, slotGap = 4
          const slotsX = colName - (slotW * 1.5 + slotGap)

          for (let s = 0; s < 3; s++) {
            const sx = slotsX + s * (slotW + slotGap)

            // Slot bg
            ctx.globalAlpha = rowAlpha * 0.4
            ctx.fillStyle = COLORS.spiceBlue
            ctx.fillRect(sx, y - 9, slotW, 20)

            ctx.globalAlpha = rowAlpha
            if (initials[s]) {
              drawText(initials[s], sx + slotW / 2, y + 1, {
                color: COLORS.bone,
                size: 16,
              })
            } else if (s === initialPos) {
              // Blinking cursor
              if (Math.sin(timer * 5) > 0) {
                ctx.fillStyle = COLORS.bone
                ctx.fillRect(sx + 3, y + 7, slotW - 6, 2)
              }
            }
          }
        } else {
          const tag = h.initials || '---'
          drawText(tag, colName, y, { color, size: 14 })
        }

        // Score
        ctx.globalAlpha = rowAlpha
        drawText(`${h.score}`, colScore, y, { color, size: 14 })

        // Loop
        const loopStr = h.loop === '?' ? '' : `loop ${h.loop}`
        if (loopStr) {
          ctx.globalAlpha = rowAlpha * 0.7
          drawText(loopStr, colLoop, y, { color: COLORS.ochre, size: 10 })
        }
      }

      // Empty table message
      if (list.length === 0) {
        ctx.globalAlpha = tableAlpha * 0.4
        drawText('no scores yet', GAME_WIDTH / 2, tableY + 30, {
          color: COLORS.ochre, size: 12,
        })
      }

      // Prompt below table
      ctx.globalAlpha = tableAlpha * 0.7
      const promptY = tableY + Math.max(list.length, 1) * rowH + 16

      if (enteringInitials) {
        if (initialPos < 3) {
          drawText('T Y P E  Y O U R  I N I T I A L S', GAME_WIDTH / 2, promptY, {
            color: COLORS.spiceBlue,
            size: 11,
          })
          ctx.globalAlpha = tableAlpha * 0.4
          drawText('claim your place in history', GAME_WIDTH / 2, promptY + 16, {
            color: COLORS.ochre,
            size: 9,
          })
        } else {
          const blink = Math.sin(timer * 3) > 0
          if (blink) {
            drawText('P R E S S  E N T E R  T O  S A V E', GAME_WIDTH / 2, promptY, {
              color: COLORS.bone,
              size: 12,
            })
          }
          ctx.globalAlpha = tableAlpha * 0.4
          drawText('immortalize your legacy', GAME_WIDTH / 2, promptY + 16, {
            color: COLORS.ochre,
            size: 9,
          })
        }
      }
    }

    ctx.globalAlpha = 1

    // Restart prompt
    if (!enteringInitials && timer > 2.0) {
      const blink = Math.sin(timer * 2) > 0
      if (blink) {
        ctx.globalAlpha = 0.5
        drawText('press any key', GAME_WIDTH / 2, GAME_HEIGHT - 24, {
          color: COLORS.bone,
          size: 10,
        })
        ctx.globalAlpha = 1
      }
    }
  },
}
