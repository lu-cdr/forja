import { useState } from 'react'
import { Icon, cx } from '../../components/ui'
import { useRestTimer } from '../../components/RestTimer'
import { useExerciseSets, useLastSets } from '../../db/hooks'
import { deleteSet, logSet, updateSet, type PlanItem } from '../../db/repo'
import { epley1RM, fmt, shouldIncreaseLoad } from '../../domain/calc'
import { formatClock } from '../../domain/dates'
import type { SetLog } from '../../domain/types'
import { describeTarget, isTimed } from '../../domain/plan'
import { XP } from '../../domain/game'
import { playAnvil, playCoin } from '../../components/sfx'

interface Props {
  item: PlanItem
  sessionId: string
  plannedSets: number
  logged: SetLog[]
}

type Draft = { w: string; r: string }

const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function ExerciseBlock({ item, sessionId, plannedSets, logged }: Props) {
  const rest = useRestTimer()
  const last = useLastSets(item.exerciseId, sessionId)
  const history = useExerciseSets(item.exerciseId)
  const [extraRows, setExtraRows] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [justDone, setJustDone] = useState<number>()
  const [float, setFloat] = useState<{ n: number; key: number; text: string; gold: boolean }>()

  const byNumber = new Map(logged.map((s) => [s.setNumber, s]))
  const maxLogged = logged.reduce((m, s) => Math.max(m, s.setNumber), 0)
  const rows = Math.max(plannedSets + extraRows, maxLogged)

  // recorde anterior (fora desta sessão)
  const prevBest = (history ?? [])
    .filter((s) => s.sessionId !== sessionId && !s.isWarmup)
    .reduce((m, s) => Math.max(m, epley1RM(s.weightKg, s.reps)), 0)

  const timed = isTimed(item)
  const suggestUp = !timed && last && last.length > 0 && shouldIncreaseLoad(last, item.repMax, plannedSets)
  const allDone = logged.filter((s) => !s.isWarmup).length >= plannedSets

  function defaults(n: number): Draft {
    const own = byNumber.get(n)
    if (own) return { w: fmt(own.weightKg, 2), r: String(own.reps) }
    const prev = last?.[n - 1] ?? last?.[last.length - 1]
    if (prev) return { w: fmt(prev.weightKg, 2), r: String(prev.reps) }
    const above = drafts[n - 1] ?? (byNumber.get(n - 1) && { w: fmt(byNumber.get(n - 1)!.weightKg, 2), r: String(byNumber.get(n - 1)!.reps) })
    return above ? { ...above } : { w: '', r: '' }
  }
  const draftOf = (n: number) => drafts[n] ?? defaults(n)

  function setDraft(n: number, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [n]: { ...draftOf(n), ...patch } }))
  }

  async function toggle(n: number) {
    const existing = byNumber.get(n)
    if (existing) {
      await deleteSet(existing.id)
      return
    }
    const d = draftOf(n)
    // campo vazio: leva o foco até ele em vez de ignorar o toque
    if (!d.w && !timed) return document.getElementById(`w-${item.id}-${n}`)?.focus()
    if (!d.r) return document.getElementById(`r-${item.id}-${n}`)?.focus()
    const w = parseNum(d.w || '0')
    const r = parseNum(d.r)
    if (!(r > 0) || !(w >= 0)) return
    await logSet({ sessionId, exerciseId: item.exerciseId, setNumber: n, weightKg: w, reps: Math.round(r), isWarmup: false })
    setJustDone(n)
    // recompensa imediata (o XP real é calculado do histórico ao concluir)
    const isRecord = prevBest > 0 && epley1RM(w, Math.round(r)) > prevBest + 0.01
    if (isRecord) playAnvil()
    else playCoin()
    setFloat({ n, key: Date.now(), text: isRecord ? `Recorde! +${XP.pr} XP` : `+${XP.perSet} XP`, gold: isRecord })
    rest.start(item.restSeconds)
  }

  async function commitEdit(n: number) {
    const existing = byNumber.get(n)
    if (!existing) return
    const d = draftOf(n)
    const w = parseNum(d.w || '0')
    const r = parseNum(d.r)
    if (r > 0 && w >= 0 && (w !== existing.weightKg || r !== existing.reps)) {
      await updateSet(existing.id, { weightKg: w, reps: Math.round(r) })
    }
  }

  return (
    <article className={cx('rounded-2xl bg-iron-850 p-4 transition', allDone ? 'frame-gold' : 'frame')}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[22px] leading-tight font-bold">{item.exerciseName}</h3>
          <p className="mt-0.5 text-[13px] text-iron-400">
            {describeTarget(plannedSets, item)}, descanso {formatClock(item.restSeconds)}
          </p>
        </div>
        {allDone && (
          <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-ok/20 text-ok" aria-label="Exercício completo">
            <Icon name="check" className="size-4" />
          </span>
        )}
      </header>

      {suggestUp && !allDone && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-rubber-dim px-3 py-2 text-[13px] text-chalk">
          <Icon name="up" className="size-4 shrink-0 text-rubber" />
          Você bateu {item.repMax} reps em todas as séries na última vez. Tente subir a carga.
        </p>
      )}

      <div className="grid grid-cols-[28px_1fr_76px_60px_48px] items-center gap-x-2 text-[11px] text-iron-500">
        <span className="text-center">Série</span>
        <span>Anterior</span>
        <span className="text-center">kg</span>
        <span className="text-center">{timed ? 'seg' : 'reps'}</span>
        <span />
      </div>

      <ol className="mt-1 space-y-1.5">
        {Array.from({ length: rows }, (_, i) => i + 1).map((n) => {
          const done = byNumber.get(n)
          const d = draftOf(n)
          const prev = last?.[n - 1]
          const isPR = done && prevBest > 0 && epley1RM(done.weightKg, done.reps) > prevBest + 0.01
          return (
            <li
              key={n}
              className={cx(
                'relative grid grid-cols-[28px_1fr_76px_60px_48px] items-center gap-x-2 rounded-xl py-1',
                done && 'bg-ok/8',
              )}
            >
              {float?.n === n && done && (
                <span
                  key={float.key}
                  className={cx(
                    'anim-float-xp num pointer-events-none absolute -top-3 right-0 z-10 text-lg font-bold whitespace-nowrap',
                    float.gold ? 'text-xp' : 'text-ok',
                  )}
                  aria-live="polite"
                >
                  {float.text}
                </span>
              )}
              <span className={cx('num text-center text-lg', n > plannedSets ? 'text-iron-500' : 'text-iron-300')}>{n}</span>
              <span className="num truncate text-[15px] text-iron-500">
                {isPR ? (
                  <span className="inline-flex items-center gap-1 text-pr">
                    <Icon name="trophy" className="size-4" /> PR
                  </span>
                ) : prev ? (
                  timed && prev.weightKg === 0 ? `${prev.reps} s` : `${fmt(prev.weightKg, 2)} × ${prev.reps}`
                ) : (
                  '—'
                )}
              </span>
              <input
                id={`w-${item.id}-${n}`}
                aria-label={`Carga da série ${n} em kg`}
                inputMode="decimal"
                enterKeyHint="next"
                value={d.w}
                placeholder="0"
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setDraft(n, { w: e.target.value.replace(/[^0-9.,]/g, '') })}
                onBlur={() => commitEdit(n)}
                className={cx(
                  'num h-12 w-full rounded-xl text-center text-[26px] font-semibold placeholder:text-iron-600',
                  done ? 'bg-transparent text-chalk' : 'bg-iron-800 text-chalk',
                )}
              />
              <input
                id={`r-${item.id}-${n}`}
                aria-label={timed ? `Segundos da série ${n}` : `Repetições da série ${n}`}
                inputMode="numeric"
                enterKeyHint="done"
                value={d.r}
                placeholder={String(item.repMax)}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setDraft(n, { r: e.target.value.replace(/\D/g, '') })}
                onBlur={() => commitEdit(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !done) {
                    e.currentTarget.blur()
                    void toggle(n)
                  }
                }}
                className={cx(
                  'num h-12 w-full rounded-xl text-center text-[26px] font-semibold placeholder:text-iron-600',
                  done ? 'bg-transparent text-chalk' : 'bg-iron-800 text-chalk',
                )}
              />
              <button
                type="button"
                onClick={() => toggle(n)}
                aria-label={done ? `Desmarcar série ${n}` : `Concluir série ${n}`}
                aria-pressed={!!done}
                className={cx(
                  'flex h-12 w-12 items-center justify-center rounded-xl transition',
                  done ? 'bg-ok text-iron-950' : 'bg-iron-700 text-iron-400 active:bg-iron-600',
                  justDone === n && done && 'anim-done',
                )}
              >
                <Icon name="check" className="size-6" />
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setExtraRows((x) => x + 1)}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm text-iron-300 active:bg-iron-800"
        >
          <Icon name="plus" className="size-4" /> Adicionar série
        </button>
        {rows > Math.max(plannedSets, maxLogged) && (
          <button
            type="button"
            onClick={() => setExtraRows((x) => Math.max(0, x - 1))}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm text-iron-400 active:bg-iron-800"
          >
            <Icon name="minus" className="size-4" /> Remover
          </button>
        )}
      </div>
    </article>
  )
}
