// State machine — manages current game state and transitions

let currentState = null
const states = {}

export function registerState(name, handlers) {
  states[name] = handlers
}

export function switchState(name) {
  if (currentState && states[currentState] && states[currentState].exit) {
    states[currentState].exit()
  }
  currentState = name
  if (states[currentState] && states[currentState].enter) {
    states[currentState].enter()
  }
}

export function updateState(dt) {
  if (states[currentState] && states[currentState].update) {
    states[currentState].update(dt)
  }
}

export function renderState() {
  if (states[currentState] && states[currentState].render) {
    states[currentState].render()
  }
}

export function getCurrentState() {
  return currentState
}
