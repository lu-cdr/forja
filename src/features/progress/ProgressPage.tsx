import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Icon, PageHeader, Section, Segmented, Stat, cx } from '../../components/ui'
import { Legend, SimpleLine, TrendChart, VolumeBars } from '../../components/charts'
import { useAllSets, useExercises, useFinishedSessions, useMeasurements, usePlanDays, useProfile } from '../../db/hooks'
import { bmi, deltas, fmt, fmtVolume, leanMassKg, movingAverageByDays } from '../../domain/calc'
import { formatDateBR, startOfWeek, toISODate } from '../../domain/dates'
import { adherence, exerciseProgress, muscleVolumeForWeek, periodStart, personalRecords, weekStreak, weeklyVolume } from '../../domain/stats'
import { MUSCLE_LABEL } from '../../domain/types'

type Period = '4w' | '12w' | '6m' | 'all'

export function ProgressPage() {
  const sessions = useFinishedSessions()
  const sets = useAllSets()
  const exercises = useExercises()
  const measurements = useMeasurements()
  const profile = useProfile()
  const planDays = usePlanDays()
  const [period, setPeriod] = useState<Period>('12w')
  const [exId, setExId] = useState<string>()
  const today = toISODate()

  const from = periodStart(period, today)
  const inPeriod = useMemo(() => (sessions ?? []).filter((s) => s.date >= from), [sessions, from])

  const weightData = useMemo(() => {
    const pts = (measurements ?? []).filter((m) => m.weightKg != null).map((m) => ({ date: m.date, value: m.weightKg! }))
    return movingAverageByDays(pts, 7)
      .filter((p) => p.date >= from)
      .map((p) => ({ date: p.date, peso: p.value, media: Math.round(p.avg * 10) / 10 }))
  }, [measurements, from])

  const prs = useMemo(() => personalRecords(sessions ?? [], sets ?? []), [sessions, sets])
  const trainedIds = new Set(prs.map((p) => p.exerciseId))
  const selectableEx = (exercises ?? []).filter((e) => trainedIds.has(e.id))
  const currentEx = exId ?? selectableEx.find((e) => e.isCompound)?.id ?? selectableEx[0]?.id
  const exData = useMemo(
    () => (currentEx ? exerciseProgress(currentEx, inPeriod, sets ?? []) : []),
    [currentEx, inPeriod, sets],
  )

  if (!sessions || !sets || !exercises || !measurements || !profile || !planDays) return null

  const vol = weeklyVolume(inPeriod, sets)
  const thisWeek = muscleVolumeForWeek(startOfWeek(today), sessions, sets, exercises)
  const streak = weekStreak(sessions, today)
  const adh = adherence(sessions, planDays.length, today, 4)
  const lastWeight = weightData.at(-1)
  const firstWeight = weightData[0]
  const weeksSpan = lastWeight && firstWeight ? (Date.parse(lastWeight.date) - Date.parse(firstWeight.date)) / (7 * 86_400_000) : 0
  const ratePerWeek = weeksSpan >= 1 && lastWeight && firstWeight ? (lastWeight.media - firstWeight.media) / weeksSpan : undefined
  const ratePct = ratePerWeek != null && lastWeight ? (ratePerWeek / lastWeight.media) * 100 : undefined
  const lastBf = [...measurements].reverse().find((m) => m.bodyFatPct != null && m.weightKg != null)
  const exDelta = deltas(exData.map((d) => d.e1rm))

  if (sessions.length === 0 && measurements.length === 0) {
    return (
      <div>
        <PageHeader title="Progresso" />
        <Section>
          <Empty title="Ainda sem dados para mostrar">
            Registre treinos e medidas para ver gráficos aqui. Quer ver como fica antes? Em{' '}
            <Link to="/ajustes" className="text-rubber underline">
              Ajustes
            </Link>{' '}
            dá para carregar dados de exemplo.
          </Empty>
        </Section>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Progresso" />
      <Section className="mb-5">
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: '4w', label: '4 sem' },
            { value: '12w', label: '12 sem' },
            { value: '6m', label: '6 meses' },
            { value: 'all', label: 'Tudo' },
          ]}
        />
      </Section>

      <Section className="mb-6">
        <div className="grid grid-cols-3 gap-3 frame rounded-2xl bg-iron-850 p-4">
          <Stat label="treinos no período" value={inPeriod.length} />
          <Stat label={streak === 1 ? 'semana seguida' : 'semanas seguidas'} value={streak} />
          <Stat label="aderência 4 sem" value={Math.round(adh * 100)} unit="%" />
        </div>
      </Section>

      {/* Peso */}
      <Section className="mb-6" title="Peso corporal">
        <div className="frame rounded-2xl bg-iron-850 p-4">
          {weightData.length === 0 ? (
            <p className="text-sm text-iron-400">
              Sem pesagens no período.{' '}
              <Link to="/medidas" className="text-rubber">
                Registrar peso
              </Link>
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-end justify-between gap-3">
                <Stat label="média de 7 dias" value={fmt(lastWeight!.media)} unit="kg" />
                {ratePerWeek != null && (
                  <div className="text-right">
                    <div className={cx('num text-xl', ratePerWeek >= 0 ? 'text-chalk' : 'text-iron-300')}>
                      {ratePerWeek >= 0 ? '+' : ''}
                      {fmt(ratePerWeek, 2)} kg/sem
                    </div>
                    <div className="text-xs text-iron-400">
                      {fmt(ratePct!, 2)}% por semana
                    </div>
                  </div>
                )}
              </div>
              <TrendChart data={weightData} yKey="media" rawKey="peso" unit="kg" labels={{ peso: 'Pesagem', media: 'Média 7 dias' }} />
              <Legend
                items={[
                  { label: 'Média de 7 dias', color: 'accent', shape: 'line' },
                  { label: 'Pesagens', color: 'raw', shape: 'dot' },
                ]}
              />
              {ratePct != null && (
                <p className="mt-3 text-xs leading-relaxed text-iron-400">
                  Referência para ganho de massa magra: 0,25% a 0,5% do peso por semana.
                  {ratePct > 0.5 && ' Você está acima: parte pode ser gordura.'}
                  {ratePct >= 0.25 && ratePct <= 0.5 && ' Você está dentro da faixa.'}
                  {ratePct < 0.25 && ratePct >= 0 && ' Você está abaixo: talvez falte comer um pouco mais.'}
                </p>
              )}
              {(profile.heightCm || lastBf) && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-iron-700 pt-4">
                  {profile.heightCm && <Stat label="IMC" value={fmt(bmi(lastWeight!.media, profile.heightCm))} />}
                  {lastBf && (
                    <Stat
                      label={`massa magra estimada (${formatDateBR(lastBf.date)})`}
                      value={fmt(leanMassKg(lastBf.weightKg!, lastBf.bodyFatPct!))}
                      unit="kg"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* Carga por exercício */}
      {selectableEx.length > 0 && (
        <Section className="mb-6" title="Força por exercício">
          <div className="frame rounded-2xl bg-iron-850 p-4">
            <select
              value={currentEx}
              onChange={(e) => setExId(e.target.value)}
              className="mb-3 min-h-11 w-full rounded-xl bg-iron-800 px-3 text-[15px]"
              aria-label="Exercício"
            >
              {selectableEx.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {exData.length === 0 ? (
              <p className="text-sm text-iron-400">Sem registros deste exercício no período.</p>
            ) : (
              <>
                <div className="mb-2 flex items-end justify-between">
                  <Stat label="1RM estimado, última sessão" value={fmt(exData.at(-1)!.e1rm)} unit="kg" />
                  {exDelta && (
                    <div className={cx('num text-xl', exDelta.fromFirst >= 0 ? 'text-ok' : 'text-danger')}>
                      {exDelta.fromFirst >= 0 ? '+' : ''}
                      {fmt(exDelta.fromFirst)} kg
                    </div>
                  )}
                </div>
                <SimpleLine data={exData} yKey="e1rm" unit="kg" label="1RM estimado" />
                <p className="mt-2 text-xs text-iron-400">Melhor série de cada treino convertida em 1RM (fórmula de Epley).</p>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Volume */}
      {vol.length > 0 && (
        <Section className="mb-6" title="Volume semanal">
          <div className="frame rounded-2xl bg-iron-850 p-4">
            <VolumeBars data={vol} />
            {thisWeek.length > 0 && (
              <>
                <h3 className="mt-4 mb-2 text-sm text-iron-300">Esta semana, por grupo</h3>
                <ul className="space-y-2">
                  {thisWeek.map((g) => (
                    <li key={g.group} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
                      <span className="text-iron-300">{MUSCLE_LABEL[g.group]}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-iron-800">
                        <span className="block h-full rounded-full bg-rubber" style={{ width: `${(g.volume / thisWeek[0].volume) * 100}%` }} />
                      </span>
                      <span className="num w-20 text-right text-base">
                        {g.sets} <span className="text-xs text-iron-400">séries</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Recordes */}
      {prs.length > 0 && (
        <Section className="mb-6" title="Recordes pessoais">
          <ul className="divide-y divide-iron-800 frame rounded-2xl bg-iron-850">
            {prs
              .sort((a, b) => b.bestE1RM - a.bestE1RM)
              .map((p) => (
                <li key={p.exerciseId} className="flex items-center gap-3 px-4 py-3">
                  <Icon name="trophy" className="size-4 shrink-0 text-pr" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{exercises.find((e) => e.id === p.exerciseId)?.name}</p>
                    <p className="text-xs text-iron-400">
                      {fmt(p.bestSet.weightKg, 2)} kg × {p.bestSet.reps} em {formatDateBR(p.bestSet.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="num text-xl">{fmt(p.bestE1RM, 0)}</div>
                    <div className="text-[11px] text-iron-500">1RM est.</div>
                  </div>
                </li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-iron-500">Volume total no período: {fmtVolume(vol.reduce((a, v) => a + v.volume, 0))}.</p>
        </Section>
      )}
    </div>
  )
}
