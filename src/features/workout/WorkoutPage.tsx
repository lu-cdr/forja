import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Icon, Sheet } from '../../components/ui'
import { useRestTimer } from '../../components/RestTimer'
import { useActiveSession, useAllPlanDays, useExercises, usePlanItems, useProfile, useSessionSets } from '../../db/hooks'
import { addSessionExercise, discardSession, finishSession } from '../../db/repo'
import { fmtVolume, totalVolume } from '../../domain/calc'
import { formatDuration, planPhase, planWeek, toISODate } from '../../domain/dates'
import { buildWorkout } from '../../domain/session'
import { ExercisePicker } from '../plan/ExercisePicker'
import { ExerciseBlock } from './ExerciseBlock'

/** Aviso de tela apagada mostrado uma vez (preferência local do aparelho). */
const SCREEN_TIP_KEY = 'fitapp.tip.tela'

export function WorkoutPage() {
  const navigate = useNavigate()
  const session = useActiveSession()
  const planDays = useAllPlanDays()
  const profile = useProfile()
  const items = usePlanItems(session?.planDayId)
  const sets = useSessionSets(session?.id)
  const rest = useRestTimer()
  const [finishOpen, setFinishOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [now, setNow] = useState(() => Date.now())
  // evita o redirecionamento automático para Hoje enquanto saímos de propósito
  const [leaving, setLeaving] = useState(false)
  const exercises = useExercises()
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string>()
  const [showScreenTip, setShowScreenTip] = useState(() => {
    try {
      return localStorage.getItem(SCREEN_TIP_KEY) === null
    } catch {
      return true
    }
  })
  function dismissScreenTip() {
    setShowScreenTip(false)
    try {
      localStorage.setItem(SCREEN_TIP_KEY, '1')
    } catch {
      /* sem storage: volta a aparecer no próximo treino */
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  // Mantém a tela acesa durante o treino (o timer de descanso precisa da página ativa).
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    const acquire = async () => {
      try {
        if (document.visibilityState === 'visible') lock = await navigator.wakeLock?.request('screen')
      } catch {
        /* sem suporte ou sem contexto seguro */
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [])

  const phase = profile ? planPhase(planWeek(profile.planStartDate, toISODate()), profile.rampUpWeeks) : 1
  // lista de hoje: plano + trocas + acrescentados + exercícios com séries fora da lista
  const workout = useMemo(() => {
    if (!items || !exercises || !session) return []
    const logged = [...new Set((sets ?? []).map((s) => s.exerciseId))]
    return buildWorkout(items, session, new Map(exercises.map((e) => [e.id, e])), logged)
  }, [items, exercises, session, sets])
  const planned = workout.reduce((a, i) => a + (phase === 1 ? i.setsPhase1 : i.setsPhase2), 0)

  if (session === undefined || !planDays || !profile) return null
  if (session === null) return leaving ? null : <Navigate to="/" replace />

  const day = planDays.find((d) => d.id === session.planDayId)
  const elapsed = now - Date.parse(session.startedAt)
  const done = sets?.filter((s) => !s.isWarmup).length ?? 0
  const volume = totalVolume(sets ?? [])

  async function onFinish() {
    if (!session) return
    const hasSets = (sets?.length ?? 0) > 0
    setLeaving(true)
    await finishSession(session.id, notes)
    rest.stop()
    navigate(hasSets ? `/recompensa/${session.id}` : '/', { replace: true })
  }

  async function onDiscard() {
    if (!session) return
    if (!window.confirm('Descartar este treino? As séries registradas serão apagadas.')) return
    setLeaving(true)
    await discardSession(session.id)
    rest.stop()
    navigate('/', { replace: true })
  }

  return (
    <div>
      <header className="pt-safe sticky top-0 z-30 border-b border-iron-800 bg-iron-900/95 backdrop-blur">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button variant="ghost" className="px-3" onClick={() => navigate('/')} aria-label="Voltar para Hoje">
            <Icon name="back" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl leading-tight font-bold">{day?.name ?? 'Treino'}</p>
            <p className="text-xs text-iron-400">
              {formatDuration(elapsed)}, {done} de {planned} séries, {fmtVolume(volume)}
            </p>
          </div>
          <Button variant="primary" onClick={() => setFinishOpen(true)}>
            Concluir
          </Button>
        </div>
        <div className="h-0.5 bg-iron-800">
          <div className="h-full bg-rubber transition-[width]" style={{ width: `${planned ? Math.min(100, (done / planned) * 100) : 0}%` }} />
        </div>
      </header>

      <div className="space-y-4 px-3 pt-4">
        {showScreenTip && (
          <div className="frame flex items-start gap-3 rounded-2xl bg-iron-850 p-4 text-sm text-iron-300">
            <Icon name="timer" className="mt-0.5 size-5 shrink-0 text-rubber" />
            <div className="min-w-0 flex-1">
              <p>
                <strong className="text-chalk">Deixe a tela ligada durante o treino.</strong> Com a tela apagada, o celular pausa o app e o aviso
                do fim do descanso só toca quando você voltar.
                {'wakeLock' in navigator ? ' A Forja tenta manter a tela acesa sozinha.' : ''}
              </p>
              <Button variant="ghost" className="-ml-3 mt-1 text-rubber" onClick={dismissScreenTip}>
                Entendi
              </Button>
            </div>
          </div>
        )}
        {workout.map((it, i) => (
          <ExerciseBlock
            key={it.key}
            item={it}
            session={session}
            askRpe={!!profile.askRpe}
            plannedSets={phase === 1 ? it.setsPhase1 : it.setsPhase2}
            logged={(sets ?? []).filter((s) => s.exerciseId === it.exerciseId)}
            inWorkout={workout.map((w) => w.exerciseId)}
            showWarmHint={i === 0}
          />
        ))}
        <Button className="w-full" onClick={() => setAdding(true)}>
          <Icon name="plus" className="size-4" /> Adicionar exercício só hoje
        </Button>
        {addError && <p className="text-sm text-danger">{addError}</p>}
        <Button variant="danger" className="mt-4 w-full" onClick={onDiscard}>
          Descartar treino
        </Button>
      </div>

      <ExercisePicker
        open={adding}
        title="Adicionar só hoje"
        alreadyIn={workout.map((w) => w.exerciseId)}
        onClose={() => setAdding(false)}
        onPick={(exId) => {
          setAddError(undefined)
          addSessionExercise(session.id, exId).catch((e: unknown) => setAddError(e instanceof Error ? e.message : String(e)))
        }}
      />

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Concluir treino">
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-iron-800 p-4">
          <div>
            <div className="num text-3xl font-semibold">{formatDuration(elapsed)}</div>
            <div className="text-xs text-iron-400">duração</div>
          </div>
          <div>
            <div className="num text-3xl font-semibold">
              {done}
              <span className="text-lg text-iron-400">/{planned}</span>
            </div>
            <div className="text-xs text-iron-400">séries</div>
          </div>
          <div>
            <div className="num text-3xl font-semibold whitespace-nowrap">{fmtVolume(volume).replace(' kg', '')}<span className="text-lg text-iron-400">{volume >= 10_000 ? '' : ' kg'}</span></div>
            <div className="text-xs text-iron-400">volume</div>
          </div>
        </div>
        {done === 0 && <p className="mt-3 text-sm text-pr">Nenhuma série registrada: o treino não vai para o histórico.</p>}
        <label className="mt-4 block text-sm text-iron-300" htmlFor="notes">
          Anotações (opcional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como foi? Dor, energia, ajustes de máquina…"
          className="mt-1 w-full rounded-xl bg-iron-800 p-3 text-[15px] placeholder:text-iron-500"
        />
        <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={onFinish}>
          Concluir treino
        </Button>
      </Sheet>
    </div>
  )
}
