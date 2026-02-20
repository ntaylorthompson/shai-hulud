// Web Audio API — Zimmer-inspired cinematic synthesis
// Polyphonic layers, filter chain, procedural reverb, proper scheduling

let audioCtx = null
let masterGain = null
let musicGain = null
let sfxGain = null
let reverbSend = null
let reverbGain = null
let musicFilter = null
let muted = false
let currentMusic = null
let musicVoices = []     // active oscillator/gain nodes for music layers
let schedulerInterval = null
export let musicIntensity = 0  // 0–1, for dynamic music

function ensureCtx() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = 0.3
      masterGain.connect(audioCtx.destination)

      musicGain = audioCtx.createGain()
      musicGain.gain.value = 0.5
      musicFilter = audioCtx.createBiquadFilter()
      musicFilter.type = 'lowpass'
      musicFilter.frequency.value = 800
      musicFilter.Q.value = 0.7
      musicGain.connect(musicFilter)
      musicFilter.connect(masterGain)

      sfxGain = audioCtx.createGain()
      sfxGain.gain.value = 0.6
      sfxGain.connect(masterGain)

      // Procedural reverb via convolver
      reverbGain = audioCtx.createGain()
      reverbGain.gain.value = 0.3
      try {
        const convolver = audioCtx.createConvolver()
        const irLength = audioCtx.sampleRate * 2
        const irBuffer = audioCtx.createBuffer(2, irLength, audioCtx.sampleRate)
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuffer.getChannelData(ch)
          for (let i = 0; i < irLength; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.6))
          }
        }
        convolver.buffer = irBuffer
        reverbSend = audioCtx.createGain()
        reverbSend.gain.value = 0.35
        reverbSend.connect(convolver)
        convolver.connect(reverbGain)
        reverbGain.connect(masterGain)
      } catch (e) {
        // Fallback — no reverb
        reverbSend = audioCtx.createGain()
        reverbSend.gain.value = 0
        reverbSend.connect(masterGain)
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch (e) {
    return null
  }
}

// --- Utility: play a tone with optional reverb send ---

function playTone(freq, duration, type = 'sawtooth', target = 'sfx', detune = 0, volume = 0.2) {
  const ctx = ensureCtx()
  if (!ctx || !sfxGain) return
  const node = target === 'music' ? musicFilter : sfxGain
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune
  env.gain.setValueAtTime(volume, ctx.currentTime)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(env)
  env.connect(node)
  if (reverbSend) {
    const revEnv = ctx.createGain()
    revEnv.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
    revEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(revEnv)
    revEnv.connect(reverbSend)
  }
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration, volume = 0.1, filterFreq = 4000) {
  const ctx = ensureCtx()
  if (!ctx || !sfxGain) return
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq
  const env = ctx.createGain()
  env.gain.setValueAtTime(volume, ctx.currentTime)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter)
  filter.connect(env)
  env.connect(sfxGain)
  if (reverbSend) {
    const revEnv = ctx.createGain()
    revEnv.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
    revEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    filter.connect(revEnv)
    revEnv.connect(reverbSend)
  }
  source.start()
}

function playFilteredNoise(duration, volume, startFreq, endFreq) {
  const ctx = ensureCtx()
  if (!ctx || !sfxGain) return
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(startFreq, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), ctx.currentTime + duration)
  filter.Q.value = 2
  const env = ctx.createGain()
  env.gain.setValueAtTime(volume, ctx.currentTime)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter)
  filter.connect(env)
  env.connect(sfxGain)
  if (reverbSend) {
    const revEnv = ctx.createGain()
    revEnv.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
    revEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    filter.connect(revEnv)
    revEnv.connect(reverbSend)
  }
  source.start()
}

// --- SFX (cinematic redesign) ---

export function sfxJump() {
  // Whoosh: filtered noise sweep high→low + cloth rustle
  playFilteredNoise(0.25, 0.15, 3000, 200)
  playNoise(0.08, 0.06, 6000)
}

export function sfxHookPlant() {
  // Metallic ping: high sine with fast decay + detuned copy
  playTone(1200, 0.12, 'sine', 'sfx', 0, 0.15)
  playTone(1210, 0.1, 'sine', 'sfx', 15, 0.08)
}

export function sfxEat() {
  // Crunchy impact + brief orchestral stab
  playNoise(0.15, 0.15, 1500)
  playTone(80, 0.2, 'sine', 'sfx', 0, 0.2)
  // Fast chord stab (root+fifth+octave)
  playTone(220, 0.12, 'sawtooth', 'sfx', 0, 0.08)
  playTone(330, 0.1, 'sawtooth', 'sfx', 0, 0.06)
  playTone(440, 0.08, 'sawtooth', 'sfx', 0, 0.05)
}

export function sfxDeath() {
  // Deep reverberant boom: low sine + noise, long tail
  playTone(50, 1.2, 'sine', 'sfx', 0, 0.3)
  playTone(75, 0.8, 'sine', 'sfx', -10, 0.15)
  playNoise(0.6, 0.12, 400)
}

export function sfxSuccess() {
  // Ascending sine harmony (root+third+fifth, staggered entry) through reverb
  const ctx = ensureCtx()
  if (!ctx) return
  const t = ctx.currentTime
  const notes = [220, 277, 330]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, t + i * 0.15)
    env.gain.linearRampToValueAtTime(0.12, t + i * 0.15 + 0.1)
    env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 1.2)
    osc.connect(env)
    env.connect(sfxGain)
    if (reverbSend) {
      const revEnv = ctx.createGain()
      revEnv.gain.setValueAtTime(0, t + i * 0.15)
      revEnv.gain.linearRampToValueAtTime(0.08, t + i * 0.15 + 0.1)
      revEnv.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 1.2)
      osc.connect(revEnv)
      revEnv.connect(reverbSend)
    }
    osc.start(t + i * 0.15)
    osc.stop(t + i * 0.15 + 1.5)
  })
}

export function sfxWormRumble() {
  // Layered sub-bass + grinding noise, heavy reverb
  playTone(30, 1.0, 'sawtooth', 'sfx', 0, 0.2)
  playTone(45, 0.8, 'sawtooth', 'sfx', -5, 0.15)
  playTone(60, 0.6, 'sawtooth', 'sfx', 7, 0.1)
  playNoise(0.8, 0.08, 300)
}

export function sfxTransition() {
  // Low drone swell
  playTone(110, 0.4, 'sine', 'sfx', 0, 0.1)
  playTone(165, 0.3, 'sine', 'sfx', 0, 0.06)
  playFilteredNoise(0.3, 0.05, 800, 2000)
}

// --- Music: Cinematic Layered Drones ---

function stopAllVoices() {
  for (const v of musicVoices) {
    try {
      if (v.osc) v.osc.stop()
      if (v.source) v.source.stop()
    } catch (e) { /* already stopped */ }
  }
  musicVoices = []
}

// Create a persistent oscillator voice connected to musicFilter
function createVoice(freq, type, detune = 0, vol = 0.1) {
  const ctx = audioCtx
  if (!ctx) return null
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune
  gain.gain.value = vol
  osc.connect(gain)
  gain.connect(musicFilter)
  if (reverbSend) {
    const revGain = ctx.createGain()
    revGain.gain.value = vol * 0.3
    osc.connect(revGain)
    revGain.connect(reverbSend)
  }
  osc.start()
  const voice = { osc, gain, baseVol: vol }
  musicVoices.push(voice)
  return voice
}

// Create a noise voice for percussive layers
function createNoiseLoop(interval, duration, vol, filterFreq = 800) {
  const ctx = audioCtx
  if (!ctx) return null
  let active = true
  const voice = { active: true, gain: { gain: { value: vol } }, baseVol: vol }

  function tick() {
    if (!active || currentMusic === null) return
    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const env = ctx.createGain()
    const t = ctx.currentTime
    env.gain.setValueAtTime(voice.gain.gain.value, t)
    env.gain.exponentialRampToValueAtTime(0.001, t + duration)
    source.connect(filter)
    filter.connect(env)
    env.connect(musicFilter)
    if (reverbSend) {
      const revEnv = ctx.createGain()
      revEnv.gain.setValueAtTime(voice.gain.gain.value * 0.4, t)
      revEnv.gain.exponentialRampToValueAtTime(0.001, t + duration)
      filter.connect(revEnv)
      revEnv.connect(reverbSend)
    }
    source.start()
    setTimeout(tick, interval * 1000)
  }

  tick()
  voice.osc = { stop() { active = false } }
  musicVoices.push(voice)
  return voice
}

// Melody scheduler: plays a note sequence with proper timing
function createMelody(notes, type, vol, loopDelay = 0) {
  const ctx = audioCtx
  if (!ctx) return null
  let noteIdx = 0
  let active = true
  const voice = { active: true, gain: { gain: { value: vol } }, baseVol: vol }

  function scheduleNext() {
    if (!active || currentMusic === null) return
    const [freq, dur] = notes[noteIdx]
    if (freq > 0) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      const v = voice.gain.gain.value
      env.gain.setValueAtTime(v, ctx.currentTime)
      env.gain.setValueAtTime(v, ctx.currentTime + dur * 0.7)
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.connect(env)
      env.connect(musicFilter)
      if (reverbSend) {
        const revEnv = ctx.createGain()
        revEnv.gain.setValueAtTime(v * 0.4, ctx.currentTime)
        revEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
        osc.connect(revEnv)
        revEnv.connect(reverbSend)
      }
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + dur + 0.05)
    }
    noteIdx = (noteIdx + 1) % notes.length
    const delay = dur * 1000 + (noteIdx === 0 ? loopDelay * 1000 : 0)
    setTimeout(scheduleNext, delay)
  }

  scheduleNext()
  voice.osc = { stop() { active = false } }
  musicVoices.push(voice)
  return voice
}

// --- Music Tracks ---

function playTitle() {
  // Deep bass drone: 2 detuned saws at 55Hz
  createVoice(55, 'sawtooth', 0, 0.08)
  createVoice(55, 'sawtooth', 5, 0.07)
  // Warm sub
  createVoice(55, 'sine', 0, 0.06)
  // Sparse high melody: A3→G3→F3 with long sustains
  createMelody([
    [220, 2.0], [196, 2.0], [175, 2.5], [0, 1.0],
    [196, 1.5], [220, 2.5], [0, 1.5],
  ], 'sine', 0.06, 2.0)
}

function playLevel1() {
  // Rhythmic low pulse (kick-like: 80Hz sine with fast pitch drop)
  createNoiseLoop(1.5, 0.15, 0.06, 200)
  // Sustained pad: 3 detuned triangles forming open fifth A2+E3
  createVoice(110, 'triangle', 0, 0.06)
  createVoice(110, 'triangle', 8, 0.04)
  createVoice(165, 'triangle', -5, 0.05)
  // Sub bass
  createVoice(55, 'sine', 0, 0.05)
  // Occasional high piercing tone (bagpipe-like narrow saw through bandpass)
  createMelody([
    [440, 1.2], [0, 3.0], [392, 0.8], [0, 4.0],
    [440, 1.5], [0, 2.0],
  ], 'sawtooth', 0.03, 1.0)
}

function playLevel2() {
  // Driving percussion: noise burst every 0.5s
  createNoiseLoop(0.5, 0.08, 0.06, 600)
  // Bass ostinato: A2-B2-A2-G2
  createMelody([
    [110, 0.4], [123, 0.4], [110, 0.4], [98, 0.4],
  ], 'sawtooth', 0.08, 0)
  // Pad layer
  createVoice(110, 'triangle', 0, 0.04)
  createVoice(165, 'triangle', 5, 0.03)
  // Power chord stabs (short bursts, spaced)
  createMelody([
    [220, 0.15], [0, 1.8], [220, 0.15], [0, 0.4],
    [330, 0.12], [0, 2.0],
  ], 'sawtooth', 0.05, 0.5)
}

function playLevel3() {
  // Ascending drone that rises in pitch (driven by musicIntensity externally)
  const droneVoice = createVoice(80, 'sawtooth', 0, 0.06)
  const droneVoice2 = createVoice(80, 'sawtooth', 7, 0.04)
  // Heartbeat pulse: sub-bass AM at 2Hz
  createVoice(40, 'sine', 0, 0.08)
  // Dissonant high harmonics
  createVoice(660, 'sine', 0, 0.01)
  createVoice(770, 'sine', 10, 0.008)
  // Tension pad
  createVoice(110, 'triangle', -5, 0.03)
  createVoice(147, 'triangle', 3, 0.025)
  // Store drone voices for intensity modulation
  if (droneVoice) droneVoice._isDrone = true
  if (droneVoice2) droneVoice2._isDrone = true
}

export function setMusicIntensity(value) {
  musicIntensity = Math.max(0, Math.min(1, value))
  // Modulate drone voices for level3
  for (const v of musicVoices) {
    if (v._isDrone && v.osc && v.osc.frequency) {
      // Rise pitch from 80Hz to 200Hz based on intensity
      v.osc.frequency.value = 80 + musicIntensity * 120
    }
    // Scale dissonant harmonics with intensity
    if (v.baseVol <= 0.01 && v.gain) {
      v.gain.gain.value = v.baseVol * (0.3 + musicIntensity * 3)
    }
  }
}

export function playMusic(name) {
  stopMusic()
  if (muted) return
  const ctx = ensureCtx()
  if (!ctx) return

  currentMusic = name
  musicIntensity = 0

  if (name === 'title') playTitle()
  else if (name === 'level1') playLevel1()
  else if (name === 'level2') playLevel2()
  else if (name === 'level3') playLevel3()
}

export function stopMusic() {
  currentMusic = null
  stopAllVoices()
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
  document.addEventListener('click', ensureCtx, { once: true })
  document.addEventListener('keydown', ensureCtx, { once: true })
}
