import { useState } from 'react'
import { Button, Icon, Sheet, cx } from '../../components/ui'
import { useRestTimer } from '../../components/RestTimer'
import { useExerciseSets, useLastSets } from '../../db/hooks'
import { deleteSet, logSet, removeSessionExercise, setExerciseNote, swapSessionExercise, updateSet } from '../../db/repo'
import { swapPlanExercise } from '../../db/planEdit'
import { beatsRecord, bestScores, fmt, shouldIncreaseLoad } from '../../domain/calc'
import { formatClock } from '../../domain/dates'
import { BODYWEIGHT_EQUIPMENT, type SetLog, type WorkoutSession } from '../../domain/types'
import { describeTarget, isTimed } from '../../domain/plan'
import type { WorkoutItem } from '../../domain/session'
import { XP } from '../../domain/game'
import { playAnvil, playCoin } from '../../components/sfx'
import { ExercisePicker } from '../plan/ExercisePicker'

interface Props {
  item: WorkoutItem
  session: WorkoutSession
  plannedSets: number
  logged: SetLog[]
  /** Perguntar o esforço (RPE) depois de cada série de trabalho. */
  askRpe: boolean
  /** Exercícios já no treino (o seletor de troca avisa). */
  inWorkout: string[]
  /** Dica do aquecimento (só no primeiro exercício, para não repetir). */
  showWarmHint?: boolean
}

type Draft = { w: string; r: string; warm?: boolean }

const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

const RPE_OPTIONS = [
  { v: 6, hint: '4+ sobrando' },
  { v: 7, hint: '3 sobrando' },
  { v: 8, hint: '2 sobrando' },
  { v: 9, hint: '1 sobrando' },
  { v: 10, hint: 'no limite' },
]

export function ExerciseBlock({ item, session, plannedSets, logged, askRpe, inWorkout, showWarmHint }: Props) {
  const rest = useRestTimer()
  const sessionId = session.id
  const last = useLastSets(item.exerciseId, sessionId)
  const history = useExerciseSets(item.exerciseId)
  const [extraRows, setExtraRows] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [justDone, setJustDone] = useState<number>()
  const [rpeFor, setRpeFor] = useState<number>()
  const [float, setFloat] = useState<{ n: number; key: number; text: string; tone: 'gold' | 'ok' | 'dim' }>()
  const [menu, setMenu] = useState(false)
  const [picker, setPicker] = useState<'today' | 'plan' | null>(null)
  const [error, setError] = useState<string>()

  const byNumber = new Map(logged.map((s) => [s.setNumber, s]))
  const maxLogged = logged.reduce((m, s) => Math.max(m, s.setNumber), 0)

  // recordes anteriores (fora desta sessão), por trilha: carga (1RM) ou peso do corpo (reps/segundos)
  const prevBest = bestScores((history ?? []).filter((s) => s.sessionId !== sessionId))

  const timed = isTimed(item)
  const bodyweight = item.equipment === BODYWEIGHT_EQUIPMENT
  const suggestUp = !timed && !bodyweight && last && last.length > 0 && shouldIncreaseLoad(last, item.repMax, plannedSets)
  const workDone = logged.filter((s) => !s.isWarmup).length
  const allDone = workDone >= plannedSets

  function defaults(n: number): Draft {
    const own = byNumber.get(n)
    if (own) return { w: fmt(own.weightKg, 2), r: String(own.reps), warm: own.isWarmup }
    // a série n da última vez, inclusive se era aquecimento
    const prev = last?.[n - 1]
    if (prev) return { w: fmt(prev.weightKg, 2), r: String(prev.reps), warm: prev.isWarmup }
    const tail = last?.[last.length - 1]
    if (tail) return { w: fmt(tail.weightKg, 2), r: String(tail.reps) }
    const above = drafts[n - 1] ?? (byNumber.get(n - 1) && { w: fmt(byNumber.get(n - 1)!.weightKg, 2), r: String(byNumber.get(n - 1)!.reps) })
    return above ? { w: above.w, r: above.r } : { w: '', r: '' }
  }
  const draftOf = (n: number) => drafts[n] ?? defaults(n)
  // série registrada: o banco manda; senão, o rascunho (que pode vir da última vez)
  const isWarm = (n: number) => byNumber.get(n)?.isWarmup ?? !!draftOf(n).warm

  // aquecimentos não contam como série de trabalho: cada um abre uma linha a mais
  const base = plannedSets + extraRows
  let rows = Math.max(base, maxLogged)
  for (let k = 0; k < 3; k++) {
    let warm = 0
    for (let n = 1; n <= rows; n++) if (isWarm(n)) warm++
    rows = Math.max(base + warm, maxLogged)
  }
  // número mostrado: aquecimento = "A"; séries de trabalho contadas 1, 2, 3…
  const labels: string[] = []
  for (let n = 1, work = 0; n <= rows; n++) labels.push(isWarm(n) ? 'A' : String(++work))

  function setDraft(n: number, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [n]: { ...draftOf(n), ...patch } }))
  }

  async function toggleWarm(n: number) {
    const existing = byNumber.get(n)
    if (existing) await updateSet(existing.id, { isWarmup: !existing.isWarmup })
    else setDraft(n, { warm: !isWarm(n) })
  }

  async function toggle(n: number) {
    const existing = byNumber.get(n)
    if (existing) {
      await deleteSet(existing.id)
      return
    }
    const d = draftOf(n)
    // campo vazio: leva o foco até ele em vez de ignorar o toque (peso do corpo e tempo aceitam carga vazia)
    if (!d.w && !timed && !bodyweight) return document.getElementById(`w-${item.key}-${n}`)?.focus()
    if (!d.r) return document.getElementById(`r-${item.key}-${n}`)?.focus()
    const w = parseNum(d.w || '0')
    const r = parseNum(d.r)
    if (!(r > 0) || !(w >= 0)) return
    const reps = Math.round(r)
    const warm = isWarm(n)
    await logSet({ sessionId, exerciseId: item.exerciseId, setNumber: n, weightKg: w, reps, isWarmup: warm })
    setJustDone(n)
    rest.start(item.restSeconds)
    if (warm) {
      setFloat({ n, key: Date.now(), text: 'Aquecimento', tone: 'dim' })
      return
    }
    // recompensa imediata (o XP real é calculado do histórico ao concluir)
    const isRecord = beatsRecord(bestScores([{ weightKg: w, reps, isWarmup: false }]), prevBest)
    if (isRecord) playAnvil()
    else playCoin()
    setFloat({ n, key: Date.now(), text: isRecord ? `Recorde! +${XP.pr} XP` : `+${XP.perSet} XP`, tone: isRecord ? 'gold' : 'ok' })
    if (askRpe) setRpeFor(n)
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

  async function run(fn: () => Promise<unknown>) {
    setError(undefined)
    try {
      await fn()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível.')
      setMenu(true)
      return false
    }
  }

  async function onPicked(exId: string) {
    const pe = item.planExerciseId
    if (!pe) return
    if (picker === 'plan') {
      // troca no plano e desfaz a troca de hoje (o plano já tem o exercício novo)
      await run(async () => {
        await swapPlanExercise(pe, exId)
        await swapSessionExercise(sessionId, pe)
      })
    } else await run(() => swapSessionExercise(sessionId, pe, exId))
  }

  return (
    <article className={cx('rounded-2xl bg-iron-850 p-4 transition', allDone ? 'frame-gold' : 'frame')}>
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[22px] leading-tight font-bold">{item.exerciseName}</h3>
          <p className="mt-0.5 text-[13px] text-iron-400">
            {describeTarget(plannedSets, item)}, descanso {formatClock(item.restSeconds)}
          </p>
          {item.origin === 'swap' && <p className="text-[13px] text-iron-400">Só hoje, no lugar de {item.replaces}.</p>}
          {item.origin === 'extra' && <p className="text-[13px] text-iron-400">Acrescentado só hoje.</p>}
          {item.setupNote && (
            <button type="button" onClick={() => setMenu(true)} className="mt-1 flex items-start gap-1.5 text-left text-[13px] text-pr">
              <Icon name="edit" className="mt-0.5 size-3.5 shrink-0" />
              {item.setupNote}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {allDone && (
            <span className="flex size-7 items-center justify-center rounded-full bg-ok/20 text-ok" aria-label="Exercício completo">
              <Icon name="check" className="size-4" />
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label={`Opções de ${item.exerciseName}`}
            className="-mr-2 -mt-1 flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800"
          >
            <Icon name="more" className="size-6" />
          </button>
        </div>
      </header>

      {suggestUp && !allDone && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-rubber-dim px-3 py-2 text-[13px] text-chalk">
          <Icon name="up" className="size-4 shrink-0 text-rubber" />
          Você bateu {item.repMax} reps em todas as séries na última vez. Tente subir a carga.
        </p>
      )}

      <div className="grid grid-cols-[36px_1fr_76px_60px_48px] items-center gap-x-2 text-[11px] text-iron-500">
        <span className="text-center">Série</span>
        <span>Anterior</span>
        <span className="text-center">{bodyweight ? '+kg' : 'kg'}</span>
        <span className="text-center">{timed ? 'seg' : 'reps'}</span>
        <span />
      </div>

      <ol className="mt-1 space-y-1.5">
        {Array.from({ length: rows }, (_, i) => i + 1).map((n) => {
          const done = byNumber.get(n)
          const d = draftOf(n)
          const prev = last?.[n - 1]
          const warm = isWarm(n)
          const isPR = done && !warm && beatsRecord(bestScores([done]), prevBest)
          return (
            <li key={n}>
              <div className={cx('relative grid grid-cols-[36px_1fr_76px_60px_48px] items-center gap-x-2 rounded-xl py-1', done && (warm ? 'bg-iron-800/60' : 'bg-ok/8'))}>
                {float?.n === n && done && (
                  <span
                    key={float.key}
                    className={cx(
                      'anim-float-xp num pointer-events-none absolute -top-3 right-0 z-10 text-lg font-bold whitespace-nowrap',
                      float.tone === 'gold' ? 'text-xp' : float.tone === 'ok' ? 'text-ok' : 'text-iron-300',
                    )}
                    aria-live="polite"
                  >
                    {float.text}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleWarm(n)}
                  aria-pressed={warm}
                  aria-label={warm ? `Série ${n}: aquecimento. Tocar para virar série de trabalho` : `Série ${labels[n - 1]}. Tocar para marcar como aquecimento`}
                  className={cx(
                    'num flex h-12 items-center justify-center rounded-lg text-lg',
                    warm ? 'bg-pr/15 text-pr' : n > plannedSets ? 'text-iron-500' : 'text-iron-300',
                  )}
                >
                  {labels[n - 1]}
                </button>
                <span className="num truncate text-[15px] text-iron-500">
                  {isPR ? (
                    <span className="inline-flex items-center gap-1 text-pr">
                      <Icon name="trophy" className="size-4" /> PR
                    </span>
                  ) : prev ? (
                    `${timed && prev.weightKg === 0 ? `${prev.reps} s` : bodyweight && prev.weightKg === 0 ? `${prev.reps} reps` : `${fmt(prev.weightKg, 2)} × ${prev.reps}`}${prev.rpe ? ` @${prev.rpe}` : ''}`
                  ) : (
                    '—'
                  )}
                </span>
                <input
                  id={`w-${item.key}-${n}`}
                  aria-label={bodyweight ? `Carga extra da série ${n} em kg` : `Carga da série ${n} em kg`}
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
                  id={`r-${item.key}-${n}`}
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
                  aria-label={done ? `Desmarcar série ${labels[n - 1]}` : `Concluir série ${labels[n - 1]}`}
                  aria-pressed={!!done}
                  className={cx(
                    'flex h-12 w-12 items-center justify-center rounded-xl transition',
                    done ? (warm ? 'bg-iron-600 text-chalk' : 'bg-ok text-iron-950') : 'bg-iron-700 text-iron-400 active:bg-iron-600',
                    justDone === n && done && 'anim-done',
                  )}
                >
                  <Icon name="check" className="size-6" />
                </button>
              </div>

              {/* esforço da série que acabou de ser feita */}
              {askRpe && rpeFor === n && done && !done.isWarmup && done.rpe === undefined && (
                <div className="mt-1 rounded-xl bg-iron-800 p-2">
                  <p className="px-1 text-xs text-iron-300">Esforço (RPE): quantas repetições ainda sairiam?</p>
                  <div className="mt-1.5 grid grid-cols-6 gap-1">
                    {RPE_OPTIONS.map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => {
                          setRpeFor(undefined)
                          void updateSet(done.id, { rpe: o.v })
                        }}
                        aria-label={`RPE ${o.v}, ${o.hint}`}
                        className="flex min-h-11 flex-col items-center justify-center rounded-lg bg-iron-700 active:bg-iron-600"
                      >
                        <span className="num text-lg leading-none">{o.v}</span>
                        <span className="mt-0.5 text-[10px] leading-none text-iron-400">{o.hint}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setRpeFor(undefined)} className="min-h-11 rounded-lg text-xs text-iron-400 active:bg-iron-700">
                      Pular
                    </button>
                  </div>
                </div>
              )}
              {done?.rpe !== undefined && <p className="mt-0.5 pr-14 text-right text-[11px] text-iron-500">RPE {done.rpe}</p>}
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
        {extraRows > 0 && rows > maxLogged && (
          <button
            type="button"
            onClick={() => setExtraRows((x) => Math.max(0, x - 1))}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm text-iron-400 active:bg-iron-800"
          >
            <Icon name="minus" className="size-4" /> Remover
          </button>
        )}
      </div>
      {showWarmHint && <p className="mt-1 text-center text-[11px] text-iron-500">Toque no número da série para marcar aquecimento (não conta XP).</p>}

      <Sheet open={menu} onClose={() => (setMenu(false), setError(undefined))} title={item.exerciseName}>
        <label className="block">
          <span className="text-xs text-iron-400">Anotação do exercício (aparece em todo treino)</span>
          <textarea
            key={item.setupNote ?? ''}
            defaultValue={item.setupNote ?? ''}
            rows={2}
            maxLength={140}
            placeholder="ex.: banco no furo 4, polia na altura 7"
            onBlur={(e) => e.target.value.trim() !== (item.setupNote ?? '') && void setExerciseNote(item.exerciseId, e.target.value)}
            className="mt-1 w-full rounded-xl bg-iron-800 p-3 text-[15px] placeholder:text-iron-500"
          />
        </label>

        <div className="mt-4 space-y-2">
          {item.planExerciseId && (
            <>
              <Button className="w-full justify-start" onClick={() => (setMenu(false), setPicker('today'))}>
                <Icon name="swap" className="size-4" /> Trocar só hoje (máquina ocupada)
              </Button>
              <Button className="w-full justify-start" onClick={() => (setMenu(false), setPicker('plan'))}>
                <Icon name="edit" className="size-4" /> Trocar também no plano
              </Button>
            </>
          )}
          {item.origin === 'swap' && item.planExerciseId && (
            <Button
              className="w-full justify-start"
              onClick={() => run(() => swapSessionExercise(sessionId, item.planExerciseId!)).then((ok) => ok && setMenu(false))}
            >
              <Icon name="back" className="size-4" /> Voltar para {item.replaces}
            </Button>
          )}
          {item.origin === 'extra' && session.extraExercises?.includes(item.exerciseId) && (
            <Button
              variant="danger"
              className="w-full justify-start"
              onClick={() => run(() => removeSessionExercise(sessionId, item.exerciseId)).then((ok) => ok && setMenu(false))}
            >
              <Icon name="trash" className="size-4" /> Tirar do treino de hoje
            </Button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <p className="mt-4 text-xs text-iron-500">
          Trocar só hoje mantém séries, repetições e descanso do plano. As séries já feitas continuam no treino.
        </p>
      </Sheet>

      <ExercisePicker
        open={picker !== null}
        title={picker === 'plan' ? 'Trocar no plano' : 'Trocar só hoje'}
        alreadyIn={inWorkout}
        onClose={() => setPicker(null)}
        onPick={(exId) => void onPicked(exId)}
      />
    </article>
  )
}
