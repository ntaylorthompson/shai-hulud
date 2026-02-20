// Keyboard input handler — tracks key states per frame

const keys = {}
const justPressedKeys = {}

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) {
      justPressedKeys[e.code] = true
    }
    keys[e.code] = true
  })

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
  })
}

export function isDown(code) {
  return !!keys[code]
}

export function wasPressed(code) {
  return !!justPressedKeys[code]
}

export function anyKeyPressed() {
  return Object.keys(justPressedKeys).length > 0
}

export function clearFrame() {
  for (const key in justPressedKeys) {
    delete justPressedKeys[key]
  }
}
