// Efeitos sonoros 8-bit gerados na hora (sem arquivos de áudio).

const KEY = 'fitapp.sfx'
let ctx: AudioContext | null = null

export function sfxEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSfxEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** Série concluída: "plim" de moeda. */
export function playCoin() {
  if (!sfxEnabled()) return
  tone(988, 0, 0.07)
  tone(1319, 0.07, 0.16)
}

/** Recorde: martelada na bigorna. */
export function playAnvil() {
  if (!sfxEnabled()) return
  tone(1568, 0, 0.25, 'triangle', 0.12)
  tone(2093, 0, 0.35, 'square', 0.04)
  tone(784, 0.02, 0.2, 'square', 0.05)
}

/** Subiu de nível: fanfarra curta. */
export function playLevelUp() {
  if (!sfxEnabled()) return
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]
  notes.forEach((f, i) => tone(f, i * 0.09, i === notes.length - 1 ? 0.45 : 0.1, 'square', 0.07))
}

/** XP entrando na barra. */
export function playTick() {
  if (!sfxEnabled()) return
  tone(1760, 0, 0.03, 'square', 0.03)
}
