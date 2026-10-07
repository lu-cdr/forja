import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Section, Stat, cx } from '../../components/ui'
import { useAllPlanExercises, useAllSets, useExercises, useGame, useAllPlanDays, useSession } from '../../db/hooks'
import { deleteSession } from '../../db/repo'
import { beatsRecord, bestScores, bestSet, epley1RM, fmt, fmtVolume, totalVolume } from '../../domain/calc'
import { formatDateBR, formatDuration } from '../../domain/dates'

export function SessionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useSession(id)
  const planDays = useAllPlanDays()
  const exercises = useExercises()
  const allSets = useAllSets()
  const planItems = useAllPlanExercises()
  // exercícios com meta em segundos (prancha): o número registrado é tempo
  const timedIds = new Set((planItems ?? []).filter((i) => i.targetUnit === 'seconds').map((i) => i.exerciseId))
  const gameData = useGame()
  const sessionXp = gameData?.game.events.filter((e) => e.sessionId === id).reduce((a, e) => a + e.xp, 0)

  if (!planDays || !exercises || !allSets) return null
  if (!session) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate('/historico')}>
          <Icon name="back" /> Histórico
        </Button>
        <p className="mt-4 text-iron-400">Treino não encontrado.</p>
      </div>
    )
  }

  const sets = allSets.filter((s) => s.sessionId === session.id)
  const exIds = [...new Set(sets.map((s) => s.exerciseId))]
  const dur = session.finishedAt ? Date.parse(session.finishedAt) - Date.parse(session.startedAt) : 0

  // recorde = melhor marca desta sessão acima de tudo antes dela, na mesma trilha (carga ou peso do corpo)
  const earlierSessionIds = new Set(
    allSets.filter((s) => s.loggedAt < session.startedAt).map((s) => s.sessionId),
  )
  const prs = new Set(
    exIds.filter((ex) =>
      beatsRecord(
        bestScores(sets.filter((s) => s.exerciseId === ex)),
        bestScores(allSets.filter((s) => s.exerciseId === ex && earlierSessionIds.has(s.sessionId))),
      ),
    ),
  )

  async function onDelete() {
    if (!session) return
    if (!window.confirm('Apagar este treino do histórico? Não dá para desfazer (a não ser por um backup).')) return
    await deleteSession(session.id)
    navigate('/historico', { replace: true })
  }

  return (
    <div>
      <div className="pt-safe px-2 pt-2">
        <Button variant="ghost" className="px-2" onClick={() => navigate(-1)}>
          <Icon name="back" /> Voltar
        </Button>
      </div>
      <PageHeader
        title={planDays.find((p) => p.id === session.planDayId)?.name ?? 'Treino'}
        sub={formatDateBR(session.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />
      <Section className="mb-5">
        <div className="grid grid-cols-3 gap-3 frame rounded-2xl bg-iron-850 p-4">
          <Stat label="duração" value={formatDuration(dur)} />
          <Stat label="séries" value={sets.filter((s) => !s.isWarmup).length} />
          <Stat label="volume" value={fmtVolume(totalVolume(sets))} />
        </div>
        {sessionXp ? (
          <p className="mt-2 text-sm text-iron-400">
            Este treino rendeu <span className="num text-base text-xp">+{sessionXp} XP</span> ao seu ferreiro.
          </p>
        ) : null}
        {session.notes && <p className="mt-3 frame rounded-2xl bg-iron-850 p-4 text-[15px] text-iron-300">{session.notes}</p>}
      </Section>

      <Section className="space-y-3">
        {exIds.map((ex) => {
          const list = sets.filter((s) => s.exerciseId === ex).sort((a, b) => a.setNumber - b.setNumber)
          const best = bestSet(list)
          let work = 0
          return (
            <article key={ex} className="frame rounded-2xl bg-iron-850 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl font-bold">{exercises.find((e) => e.id === ex)?.name}</h3>
                {prs.has(ex) && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-pr/15 px-2.5 py-1 text-xs text-pr">
                    <Icon name="trophy" className="size-3.5" /> Recorde
                  </span>
                )}
              </div>
              <ol className="mt-2 space-y-1">
                {list.map((s) => (
                  <li key={s.id} className={cx('flex items-baseline gap-3', s.isWarmup && 'text-iron-400')}>
                    <span className={cx('num w-5', s.isWarmup ? 'text-pr' : 'text-iron-500')}>{s.isWarmup ? 'A' : ++work}</span>
                    <span className="num text-xl">
                      {s.weightKg > 0 ? (
                        <>
                          {fmt(s.weightKg, 2)} <span className="text-sm text-iron-400">kg</span> × {s.reps}
                        </>
                      ) : (
                        <>
                          {s.reps} <span className="text-sm text-iron-400">{timedIds.has(ex) ? 's' : 'reps'}</span>
                        </>
                      )}
                    </span>
                    {s.isWarmup && <span className="text-xs">aquecimento</span>}
                    {s.rpe !== undefined && <span className="text-xs text-iron-400">RPE {s.rpe}</span>}
                  </li>
                ))}
              </ol>
              {best && best.weightKg > 0 && (
                <p className="mt-2 text-xs text-iron-400">
                  1RM estimado: <span className="num text-sm text-iron-300">{fmt(epley1RM(best.weightKg, best.reps))} kg</span>
                </p>
              )}
            </article>
          )
        })}
        <Button variant="danger" className="w-full" onClick={onDelete}>
          <Icon name="trash" className="size-4" /> Apagar treino
        </Button>
      </Section>
    </div>
  )
}
