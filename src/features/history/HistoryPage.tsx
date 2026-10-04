import { Link } from 'react-router-dom'
import { Empty, Icon, PageHeader, Section } from '../../components/ui'
import { useAllSets, useFinishedSessions, useAllPlanDays } from '../../db/hooks'
import { fmtVolume, totalVolume } from '../../domain/calc'
import { formatDateBR, formatDuration } from '../../domain/dates'
import type { SetLog } from '../../domain/types'

export function HistoryPage() {
  const sessions = useFinishedSessions()
  const planDays = useAllPlanDays()
  const sets = useAllSets()
  if (!sessions || !planDays || !sets) return null

  const bySession = new Map<string, SetLog[]>()
  for (const s of sets) {
    const arr = bySession.get(s.sessionId) ?? []
    arr.push(s)
    bySession.set(s.sessionId, arr)
  }

  const months = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const key = s.date.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), s])
  }

  return (
    <div>
      <PageHeader title="Histórico" sub={`${sessions.length} ${sessions.length === 1 ? 'treino registrado' : 'treinos registrados'}`} />
      {sessions.length === 0 ? (
        <Section>
          <Empty title="Nenhum treino ainda">Comece o treino de hoje na aba Hoje. Cada treino concluído aparece aqui.</Empty>
        </Section>
      ) : (
        [...months.entries()].map(([month, list]) => (
          <Section key={month} className="mb-5" title={formatDateBR(`${month}-01`, { month: 'long', year: 'numeric' })}>
            <ul className="space-y-2">
              {list.map((s) => {
                const ss = bySession.get(s.id) ?? []
                const exercises = new Set(ss.map((x) => x.exerciseId)).size
                const dur = s.finishedAt ? Date.parse(s.finishedAt) - Date.parse(s.startedAt) : 0
                return (
                  <li key={s.id}>
                    <Link to={`/historico/${s.id}`} className="flex items-center gap-4 frame rounded-2xl bg-iron-850 p-4 active:bg-iron-800">
                      <div className="w-11 shrink-0 text-center">
                        <div className="num text-[28px] leading-none font-semibold">{Number(s.date.slice(8, 10))}</div>
                        <div className="text-[11px] text-iron-400">{formatDateBR(s.date, { weekday: 'short' })}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{planDays.find((p) => p.id === s.planDayId)?.name ?? 'Treino'}</p>
                        <p className="text-[13px] text-iron-400">
                          {formatDuration(dur)}, {exercises} exercícios, {ss.length} séries, {fmtVolume(totalVolume(ss))}
                        </p>
                      </div>
                      <Icon name="chevron" className="size-4 shrink-0 text-iron-600" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Section>
        ))
      )}
    </div>
  )
}
