// Web Audio API chiptune synthesis — music and SFX

let audioCtx = null
let masterGain = null
let musicGain = null
let sfxGain = null
let muted = false
let currentMusic = null
let musicInterval = null

function ensureCtx() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = 0.3
      masterGain.connect(audioCtx.destination)

      musicGain = audioCtx.createGain()
      musicGain.gain.value = 0.4
      musicGain.connect(masterGain)

      sfxGain = audioCtx.createGain()
      sfxGain.gain.value = 0.6
      sfxGain.connect(masterGain)
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch (e) {
    return null
  }
}

// --- SFX ---

function playTone(freq, duration, type = 'square', target = 'sfx', detune = 0) {
  const ctx = ensureCtx()
  if (!ctx || !sfxGain) return
  const node = target === 'music' ? musicGain : sfxGain
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune
  env.gain.setValueAtTime(0.3, ctx.currentTime)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(env)
  env.connect(node)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration) {
  const ctx = ensureCtx()
  if (!ctx || !sfxGain) return
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.15, ctx.currentTime)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(env)
  env.connect(sfxGain)
  source.start()
}

export function sfxJump() {
  playTone(200, 0.15, 'square')
  setTimeout(() => playTone(400, 0.1, 'square'), 50)
}

export function sfxHookPlant() {
  playTone(600, 0.08, 'square')
  playTone(800, 0.06, 'sawtooth')
}

export function sfxEat() {
  playTone(150, 0.2, 'sawtooth')
  playNoise(0.1)
}

export function sfxDeath() {
  playTone(300, 0.3, 'sawtooth')
  setTimeout(() => playTone(200, 0.3, 'sawtooth'), 100)
  setTimeout(() => playTone(100, 0.5, 'sawtooth'), 200)
}

export function sfxSuccess() {
  playTone(400, 0.15, 'square')
  setTimeout(() => playTone(500, 0.15, 'square'), 100)
  setTimeout(() => playTone(600, 0.15, 'square'), 200)
  setTimeout(() => playTone(800, 0.3, 'square'), 300)
}

export function sfxWormRumble() {
  playTone(40, 0.6, 'sawtooth', 'sfx', 0)
  playTone(55, 0.4, 'triangle', 'sfx', -10)
}

export function sfxTransition() {
  playTone(300, 0.1, 'triangle')
  setTimeout(() => playTone(450, 0.1, 'triangle'), 80)
  setTimeout(() => playTone(600, 0.15, 'triangle'), 160)
}

// --- Music ---

// Simple note sequences (freq, duration pairs)
const MUSIC = {
  title: {
    notes: [
      [220, 0.4], [0, 0.1], [247, 0.4], [0, 0.1], [262, 0.6], [0, 0.2],
      [220, 0.3], [0, 0.1], [196, 0.4], [0, 0.1], [220, 0.8], [0, 0.4],
      [262, 0.4], [0, 0.1], [294, 0.4], [0, 0.1], [330, 0.6], [0, 0.2],
      [294, 0.3], [0, 0.1], [262, 0.4], [0, 0.1], [220, 0.8], [0, 0.6],
    ],
    type: 'triangle',
    tempo: 1.0,
  },
  level1: {
    notes: [
      [330, 0.2], [0, 0.05], [330, 0.2], [0, 0.05], [392, 0.3], [0, 0.1],
      [330, 0.2], [0, 0.05], [294, 0.3], [0, 0.1], [262, 0.4], [0, 0.2],
      [294, 0.2], [0, 0.05], [330, 0.2], [0, 0.05], [294, 0.2], [0, 0.05],
      [262, 0.3], [0, 0.1], [220, 0.4], [0, 0.3],
    ],
    type: 'square',
    tempo: 0.8,
  },
  level2: {
    notes: [
      [196, 0.15], [262, 0.15], [330, 0.15], [392, 0.15],
      [330, 0.15], [262, 0.15], [196, 0.3], [0, 0.1],
      [220, 0.15], [294, 0.15], [349, 0.15], [440, 0.15],
      [349, 0.15], [294, 0.15], [220, 0.3], [0, 0.1],
      [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.3],
      [0, 0.1], [392, 0.15], [330, 0.15], [262, 0.3], [0, 0.3],
    ],
    type: 'square',
    tempo: 0.7,
  },
  level3: {
    notes: [
      [440, 0.5], [0, 0.1], [392, 0.5], [0, 0.1],
      [349, 0.5], [0, 0.1], [330, 0.7], [0, 0.3],
      [349, 0.5], [0, 0.1], [392, 0.3], [0, 0.1],
      [349, 0.3], [0, 0.1], [330, 0.5], [0, 0.1],
      [294, 0.7], [0, 0.5],
    ],
    type: 'triangle',
    tempo: 1.2,
  },
}

export function playMusic(name) {
  stopMusic()
  if (muted) return
  const track = MUSIC[name]
  if (!track) return

  currentMusic = name
  let noteIndex = 0

  function playNext() {
    if (currentMusic !== name) return
    const [freq, dur] = track.notes[noteIndex]
    if (freq > 0) {
      playTone(freq, dur * track.tempo * 0.9, track.type, 'music')
    }
    noteIndex = (noteIndex + 1) % track.notes.length
    musicInterval = setTimeout(playNext, dur * track.tempo * 1000)
  }

  playNext()
}

export function stopMusic() {
  currentMusic = null
  if (musicInterval) {
    clearTimeout(musicInterval)
    musicInterval = null
  }
}

export function toggleMute() {
  muted = !muted
  if (muted) {
    stopMusic()
    if (masterGain) masterGain.gain.value = 0
  } else {
    if (masterGain) masterGain.gain.value = 0.3
  }
  return muted
}

export function isMuted() {
  return muted
}

export function initAudio() {
  // Defer context creation until first user interaction
  document.addEventListener('click', ensureCtx, { once: true })
  document.addEventListener('keydown', ensureCtx, { once: true })
}
