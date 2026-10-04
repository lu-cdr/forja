import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatClock } from '../domain/dates'
import { Icon } from './ui'

interface RestState {
  endAt: number
  total: number
}

interface RestCtx {
  start: (seconds: number) => void
  stop: () => void
  add: (seconds: number) => void
  state: RestState | null
}

const Ctx = createContext<RestCtx | null>(null)
const KEY = 'fitapp.rest'

function readStored(): RestState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as RestState
    return s.endAt > Date.now() ? s : null
  } catch {
    return null
  }
}

function writeStored(s: RestState | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* sem storage: timer só em memória */
  }
}

let audioCtx: AudioContext | null = null
function beep() {
  try {
    audioCtx ??= new AudioContext()
    const t = audioCtx.currentTime
    ;[0, 0.22, 0.44].forEach((offset, i) => {
      const o = audioCtx!.createOscillator()
      const g = audioCtx!.createGain()
      o.frequency.value = i === 2 ? 1320 : 880
      g.gain.setValueAtTime(0.0001, t + offset)
      g.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18)
      o.connect(g).connect(audioCtx!.destination)
      o.start(t + offset)
      o.stop(t + offset + 0.2)
    })
  } catch {
    /* sem áudio */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestState | null>(readStored)

  const set = useCallback((s: RestState | null) => {
    setState(s)
    writeStored(s)
  }, [])

  const start = useCallback(
    (seconds: number) => {
      // desbloqueia o áudio no iOS dentro do gesto do usuário
      try {
        audioCtx ??= new AudioContext()
        void audioCtx.resume()
      } catch {
        /* ignore */
      }
      set({ endAt: Date.now() + seconds * 1000, total: seconds })
    },
    [set],
  )
  const stop = useCallback(() => set(null), [set])
  const add = useCallback(
    (seconds: number) =>
      setState((s) => {
        if (!s) return s
        const next = { endAt: Math.max(Date.now() + 1000, s.endAt + seconds * 1000), total: Math.max(1, s.total + seconds) }
        writeStored(next)
        return next
      }),
    [],
  )

  const value = useMemo(() => ({ start, stop, add, state }), [start, stop, add, state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRestTimer() {
  const c = useContext(Ctx)
  if (!c) throw new Error('RestTimerProvider ausente')
  return c
}

/** Barra flutuante do descanso, acima do rodapé. */
export function RestTimerBar({ aboveNav = true }: { aboveNav?: boolean }) {
  const { state, stop, add } = useRestTimer()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!state) return
    const id = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= state.endAt) {
        window.clearInterval(id)
        beep()
        navigator.vibrate?.([200, 100, 200, 100, 400])
        stop()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [state, stop])

  if (!state) return null
  const left = Math.max(0, (state.endAt - now) / 1000)
  const pct = Math.min(100, (1 - left / state.total) * 100)

  return (
    <div className={`pointer-events-none fixed inset-x-0 z-40 px-3 ${aboveNav ? 'bottom-[calc(68px+env(safe-area-inset-bottom))]' : 'bottom-[calc(12px+env(safe-area-inset-bottom))]'}`}>
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 overflow-hidden rounded-2xl bg-iron-700 p-2 shadow-[0_10px_30px_rgba(0,0,0,.45)]" role="timer" aria-live="off">
        <div className="relative flex flex-1 items-center gap-2 pl-2">
          <Icon name="timer" className="size-5 text-rubber" />
          <span className="num text-3xl leading-none font-semibold">{formatClock(left)}</span>
          <span className="text-xs text-iron-300">descanso</span>
          <div className="absolute right-0 -bottom-2 left-0 h-0.5 bg-iron-600">
            <div className="h-full bg-rubber transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => add(-15)} className="num min-h-11 rounded-xl bg-iron-800 px-3 text-lg">
          −15
        </button>
        <button type="button" onClick={() => add(15)} className="num min-h-11 rounded-xl bg-iron-800 px-3 text-lg">
          +15
        </button>
        <button type="button" onClick={stop} className="min-h-11 rounded-xl bg-iron-800 px-3 text-sm">
          Pular
        </button>
      </div>
    </div>
  )
}
