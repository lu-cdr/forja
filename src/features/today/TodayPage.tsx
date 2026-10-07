import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon, PageHeader, Section, cx } from '../../components/ui'
import { useActiveSession, useFinishedSessions, useAllPlanDays, useGame, usePlanDays, usePlanItems, useProfile, useSessionSets } from '../../db/hooks'
import { discardSession, finishAbandonedSession, startSession } from '../../db/repo'
import { isAbandoned, lastActivityAt } from '../../domain/session'
import { BACKUP_REMINDER_DAYS, daysSinceExport } from '../../db/backup'
import { WEEKDAY_LONG, WEEKDAY_SHORT, fromISODate, planPhase, planWeek, startOfWeek, toISODate } from '../../domain/dates'
import { MUSCLE_LABEL, type MuscleGroup } from '../../domain/types'
import { formatDateBR } from '../../domain/dates'
import { daysPerWeek, formatTarget, nextInRotation, sequenceOrder } from '../../domain/plan'
import { levelProgress, questsFor } from '../../domain/game'
import { fmt, fmtVolume } from '../../domain/calc'
import { Smith } from '../../components/Smith'
import { useSceneClass } from '../../components/scene'
import { LevelBadge, XpBar } from '../../components/game'

export function TodayPage() {
  const navigate = useNavigate()
  const scene = useSceneClass()
  const today = toISODate()
  const weekday = new Date().getDay()
  const planDays = usePlanDays()
  const allDays = useAllPlanDays()
  const profile = useProfile()
  const active = useActiveSession()
  const activeSets = useSessionSets(active?.id)
  const sessions = useFinishedSessions()
  const gameData = useGame()
  // "rotation": treinos em sequência (A, B, C…) em qualquer dia; o de hoje é o próximo depois do último feito
  const rotation = profile?.schedule === 'rotation'
  const sequence = useMemo(() => sequenceOrder(planDays ?? []), [planDays])
  const quests = gameData && planDays ? questsFor(gameData.input, today, planDays.map((p) => p.weekday), rotation) : undefined

  const todayPlan = rotation ? nextInRotation(sequence, sessions?.[0]?.planDayId) : planDays?.find((d) => d.weekday === weekday)
  const position = (id: string) => sequence.findIndex((d) => d.id === id) + 1
  const [pickedId, setPickedId] = useState<string>()
  const selected = planDays?.find((d) => d.id === (pickedId ?? todayPlan?.id))
  const items = usePlanItems(selected?.id)

  const week = profile ? planWeek(profile.planStartDate, today) : 1
  const phase = planPhase(week, profile?.rampUpWeeks)

  const weekStart = startOfWeek(today)
  const weekDays = useMemo(() => {
    const start = fromISODate(weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return toISODate(d)
    })
  }, [weekStart])
  const doneDates = new Set((sessions ?? []).map((s) => s.date))
  const planned = daysPerWeek(profile, planDays?.length ?? 0)
  const doneThisWeek = (sessions ?? []).filter((s) => s.date >= weekStart && s.date <= weekDays[6]).length

  const sinceExport = daysSinceExport(profile?.lastExportAt)
  const hasData = (sessions?.length ?? 0) > 0
  const needsBackup = hasData && (sinceExport === undefined || sinceExport > BACKUP_REMINDER_DAYS)

  const totalSets = (items ?? []).reduce((a, i) => a + (phase === 1 ? i.setsPhase1 : i.setsPhase2), 0)
  const groups = [...new Set((items ?? []).map((i) => i.muscleGroup))] as MuscleGroup[]

  async function onStart() {
    if (!selected) return
    await startSession(selected.id)
    navigate('/treino')
  }

  async function onFinishAbandoned() {
    if (!active) return
    if (await finishAbandonedSession(active.id)) navigate(`/recompensa/${active.id}`)
  }

  async function onDiscardAbandoned() {
    if (!active) return
    if (!window.confirm('Descartar este treino? As séries registradas serão apagadas.')) return
    await discardSession(active.id)
  }

  if (!planDays || !profile) return null

  return (
    <div>
      <PageHeader
        sub={formatDateBR(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={todayPlan && !pickedId ? (rotation ? 'Próximo treino' : 'Treino de hoje') : selected ? 'Treino escolhido' : 'Dia de descanso'}
        right={
          <div className="flex items-center">
            <Link to="/plano" className="flex min-h-11 items-center rounded-xl px-3 text-sm text-iron-300 active:bg-iron-800">
              Plano
            </Link>
            <Link to="/ajustes" aria-label="Ajustes" className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800">
              <Icon name="settings" className="size-6" />
            </Link>
          </div>
        }
      />

      {/* o ferreiro */}
      {gameData && (
        <Section className="mb-5">
          <Link to="/forja" className={cx('frame flex items-end gap-3 overflow-hidden rounded-2xl pr-4 active:brightness-110', scene)}>
            <div className="-mb-1 shrink-0">
              <Smith tier={gameData.game.rank.tier} size={84} />
            </div>
            <div className="min-w-0 flex-1 py-3">
              <div className="flex items-center gap-2">
                <LevelBadge level={gameData.game.level} size="sm" />
                <div className="min-w-0">
                  <p className="num truncate text-xl leading-none">{gameData.game.rank.title}</p>
                  <p className="mt-0.5 text-[11px] text-iron-400">
                    {fmt(gameData.game.nextLevelXp - gameData.game.totalXp, 0)} XP para o nível {gameData.game.level + 1}
                  </p>
                </div>
              </div>
              <XpBar value={levelProgress(gameData.game)} height={12} className="mt-2" />
            </div>
          </Link>
        </Section>
      )}

      {/* semana */}
      <Section className="mb-5">
        <div className="flex justify-between frame rounded-2xl bg-iron-850 px-2 py-3">
          {weekDays.map((d) => {
            const wd = fromISODate(d).getDay()
            const isPlanned = !rotation && planDays.some((p) => p.weekday === wd)
            const done = doneDates.has(d)
            const isToday = d === today
            return (
              <div key={d} className="flex w-10 flex-col items-center gap-1.5">
                <span className={cx('text-[11px]', isToday ? 'text-chalk font-semibold' : 'text-iron-500')}>{WEEKDAY_SHORT[wd]}</span>
                <span
                  className={cx(
                    'num flex size-8 items-center justify-center rounded-full text-base',
                    done && 'bg-rubber text-iron-950 font-semibold',
                    !done && isToday && 'ring-2 ring-rubber',
                    !done && !isToday && isPlanned && 'bg-iron-700 text-iron-300',
                    !done && !isToday && !isPlanned && 'text-iron-500',
                  )}
                  aria-label={done ? 'treino feito' : isPlanned ? 'treino planejado' : 'descanso'}
                >
                  {done ? <Icon name="check" className="size-4" /> : fromISODate(d).getDate()}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-iron-400">
          <span className="num text-base text-chalk">{doneThisWeek}</span> de {planned} treinos nesta semana. Semana {week} do plano
          {phase === 1 ? ', fase de readaptação' : ''}.
        </p>
      </Section>

      {needsBackup && (
        <Section className="mb-5">
          <Link to="/ajustes" className="flex items-center gap-3 rounded-2xl border border-pr/40 bg-pr/10 px-4 py-3 text-sm">
            <Icon name="download" className="size-5 shrink-0 text-pr" />
            <span>
              {sinceExport === undefined ? 'Você ainda não fez backup.' : `Último backup há ${sinceExport} dias.`} Os dados só existem neste aparelho —
              exporte agora.
            </span>
          </Link>
        </Section>
      )}

      {active && activeSets && isAbandoned(active, activeSets) ? (
        <Section className="mb-5">
          <div className="frame-gold rounded-3xl bg-iron-850 p-5">
            <p className="text-sm text-pr">Treino esquecido aberto</p>
            <h2 className="font-display text-3xl leading-tight font-bold">{allDays?.find((p) => p.id === active.planDayId)?.name ?? 'Treino'}</h2>
            <p className="mt-1 text-sm text-iron-300">
              Começou {active.date === today ? 'hoje' : `em ${formatDateBR(active.date, { weekday: 'long', day: 'numeric', month: 'long' })}`}
              {activeSets.length > 0
                ? `, com ${activeSets.length} ${activeSets.length === 1 ? 'série' : 'séries'}. A última foi às ${new Date(lastActivityAt(active, activeSets)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
                : ' e não tem nenhuma série registrada.'}
            </p>
            {activeSets.length > 0 && (
              <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={onFinishAbandoned}>
                Concluir com o que foi feito
              </Button>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button onClick={() => navigate('/treino')}>Continuar</Button>
              <Button variant="danger" onClick={onDiscardAbandoned}>
                Descartar
              </Button>
            </div>
          </div>
        </Section>
      ) : active ? (
        <Section className="mb-5">
          <button
            type="button"
            onClick={() => navigate('/treino')}
            className="flex w-full items-center justify-between rounded-2xl bg-rubber px-5 py-4 text-left text-iron-950"
          >
            <span>
              <span className="block text-sm opacity-80">Treino em andamento</span>
              <span className="font-display text-2xl font-bold">{allDays?.find((p) => p.id === active.planDayId)?.name ?? 'Treino'}</span>
            </span>
            <Icon name="chevron" className="size-6" />
          </button>
        </Section>
      ) : selected ? (
        <Section className="mb-5">
          <div className="frame rounded-3xl bg-iron-850 p-5">
            <p className="text-sm text-iron-400">{rotation ? `Treino ${position(selected.id)} de ${sequence.length} da sequência` : WEEKDAY_LONG[selected.weekday]}</p>
            <h2 className="font-display text-[40px] leading-[0.95] font-bold">{selected.name}</h2>
            <p className="mt-2 text-sm text-iron-300">
              {items?.length ?? 0} exercícios, {totalSets} séries. {groups.map((g) => MUSCLE_LABEL[g] ?? g).join(', ')}.
            </p>
            <ol className="mt-4 space-y-2.5">
              {(items ?? []).map((it) => (
                <li key={it.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{it.exerciseName}</span>
                  <span className="num shrink-0 text-lg text-iron-300">
                    {phase === 1 ? it.setsPhase1 : it.setsPhase2}×{formatTarget(it)}
                  </span>
                </li>
              ))}
            </ol>
            <Button variant="primary" className="mt-5 min-h-14 w-full text-lg" onClick={onStart}>
              Iniciar treino
            </Button>
          </div>
        </Section>
      ) : planDays.length === 0 ? (
        <Section className="mb-5">
          <div className="frame rounded-3xl bg-iron-850 p-5">
            <h2 className="font-display text-3xl font-bold">Monte seu plano</h2>
            <p className="mt-1 text-sm text-iron-400">Seu plano ainda está vazio. Crie os dias de treino e escolha os exercícios.</p>
            <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={() => navigate('/plano')}>
              Montar plano
            </Button>
          </div>
        </Section>
      ) : (
        <Section className="mb-5">
          <div className="frame rounded-3xl bg-iron-850 p-5">
            <h2 className="font-display text-3xl font-bold">Hoje é descanso</h2>
            <p className="mt-1 text-sm text-iron-400">Recuperar também faz crescer. Se quiser treinar mesmo assim, escolha um treino abaixo.</p>
          </div>
        </Section>
      )}

      {quests && (
        <Section className="mb-5" title="Missões">
          <ul className="frame divide-y divide-iron-800 rounded-2xl bg-iron-850">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cx(
                    'flex size-7 shrink-0 items-center justify-center border-2',
                    q.done ? 'border-xp-deep bg-xp text-iron-950' : 'border-iron-600 bg-iron-950',
                  )}
                  aria-label={q.done ? 'Missão cumprida' : 'Missão pendente'}
                >
                  {q.done && <Icon name="check" className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('num text-[17px] leading-tight', q.done ? 'text-iron-400 line-through' : 'text-chalk')}>{q.title}</p>
                  <p className="text-xs text-iron-400">
                    {q.detail}
                    {q.progress && !q.done && !q.boss && (
                      <span className="num ml-1 text-sm text-iron-300">
                        {q.progress[0]}/{q.progress[1]}
                      </span>
                    )}
                  </p>
                  {/* chefe: barra de vida que cai com o volume da semana */}
                  {q.boss && q.progress && !q.done && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div
                        className="h-2.5 flex-1 border border-iron-950 bg-iron-950"
                        role="progressbar"
                        aria-label="Vida do chefe"
                        aria-valuenow={Math.round((1 - q.progress[0] / q.progress[1]) * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="h-full bg-danger" style={{ width: `${(1 - q.progress[0] / q.progress[1]) * 100}%` }} />
                      </div>
                      <span className="num shrink-0 text-xs text-iron-300">faltam {fmtVolume(q.progress[1] - q.progress[0])}</span>
                    </div>
                  )}
                </div>
                <span className={cx('num shrink-0 text-base', q.done ? 'text-iron-500' : 'text-xp')}>+{q.xp} XP</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!active && (
        <Section title="Outros treinos do plano">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {sequence.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPickedId(p.id === todayPlan?.id ? undefined : p.id)}
                className={cx(
                  'min-h-11 shrink-0 rounded-xl px-3.5 py-2 text-left text-sm transition',
                  p.id === selected?.id ? 'bg-iron-700 text-chalk' : 'bg-iron-850 text-iron-300',
                )}
              >
                <span className="block text-[11px] text-iron-400">{rotation ? `Treino ${position(p.id)}` : WEEKDAY_SHORT[p.weekday]}</span>
                {p.name}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
