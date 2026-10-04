import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon, PageHeader, Section, Sheet } from '../../components/ui'
import { usePlanDays, usePlanItems, useProfile } from '../../db/hooks'
import { addPlanDay, resetPlanToTemplate, switchTemplate } from '../../db/planEdit'
import { getTemplate } from '../../seed/plan'
import { TemplateList } from '../../components/TemplateList'
import { WEEKDAY_LONG, formatClock, planPhase, planWeek, toISODate } from '../../domain/dates'
import type { PlanDay } from '../../domain/types'
import { formatTarget } from '../../domain/plan'

export function PlanPage() {
  const navigate = useNavigate()
  const days = usePlanDays()
  const profile = useProfile()
  const [error, setError] = useState<string>()
  const [switching, setSwitching] = useState(false)
  const [picked, setPicked] = useState<string>()
  if (!days || !profile) return null
  const week = planWeek(profile.planStartDate, toISODate())
  const phase = planPhase(week, profile.rampUpWeeks)
  // segunda primeiro, domingo no fim
  const sorted = [...days].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))

  async function onAddDay() {
    setError(undefined)
    try {
      navigate(`/plano/${await addPlanDay()}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível adicionar.')
    }
  }

  const template = getTemplate(profile.planTemplate)

  async function onReset() {
    if (!window.confirm(`Voltar ao modelo "${template.name}"? Suas edições no plano se perdem; treinos e medidas continuam.`)) return
    await resetPlanToTemplate()
  }

  async function onSwitch() {
    if (!picked || picked === profile!.planTemplate) return setSwitching(false)
    const next = getTemplate(picked)
    if (!window.confirm(`Trocar para "${next.name}"? O plano atual sai (os treinos feitos continuam no histórico).`)) return
    await switchTemplate(picked)
    setSwitching(false)
  }

  return (
    <div>
      <div className="pt-safe px-2 pt-2">
        <Button variant="ghost" className="px-2" onClick={() => navigate('/')}>
          <Icon name="back" /> Hoje
        </Button>
      </div>
      <PageHeader title="Plano" sub={`Semana ${week}, ${phase === 1 ? `readaptação, até a semana ${profile.rampUpWeeks ?? 3}` : 'fase principal'}`} />
      <Section className="space-y-3">
        {sorted.map((d) => (
          <DayCard key={d.id} day={d} phase={phase} />
        ))}
        {days.length === 0 && <p className="text-sm text-iron-400">Nenhum treino no plano. Adicione um dia.</p>}

        <Button variant="primary" className="w-full" onClick={onAddDay} disabled={days.length >= 7}>
          <Icon name="plus" className="size-4" /> Adicionar dia de treino
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="pt-4">
          <p className="text-xs text-iron-500">
            Modelo: {template.name}
            {profile.planCustomized ? ', com edições suas.' : '.'} A data de início do plano fica em Ajustes.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button className="text-sm" onClick={() => (setPicked(profile.planTemplate), setSwitching(true))}>
              Trocar modelo
            </Button>
            <Button variant="ghost" className="text-sm" onClick={onReset} disabled={!profile.planCustomized}>
              Desfazer edições
            </Button>
          </div>
        </div>
      </Section>

      <Sheet open={switching} onClose={() => setSwitching(false)} title="Trocar modelo">
        <TemplateList value={picked} onChange={setPicked} />
        <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={onSwitch}>
          Usar este modelo
        </Button>
      </Sheet>
    </div>
  )
}

function DayCard({ day, phase }: { day: PlanDay; phase: 1 | 2 }) {
  const items = usePlanItems(day.id)
  return (
    <Link to={`/plano/${day.id}`} className="frame block rounded-2xl bg-iron-850 p-4 active:bg-iron-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-iron-400">{WEEKDAY_LONG[day.weekday]}</p>
          <h2 className="font-display text-2xl font-bold">{day.name}</h2>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-iron-800 px-2.5 py-1.5 text-sm text-iron-300">
          <Icon name="edit" className="size-4" /> Editar
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {(items ?? []).map((it) => (
          <li key={it.id} className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate">{it.exerciseName}</span>
            <span className="shrink-0 text-right">
              <span className="num text-lg">
                {phase === 1 ? it.setsPhase1 : it.setsPhase2}×{formatTarget(it)}
              </span>
              <span className="ml-2 text-xs text-iron-500">{formatClock(it.restSeconds)}</span>
            </span>
          </li>
        ))}
        {items?.length === 0 && <li className="text-sm text-iron-500">Sem exercícios ainda.</li>}
      </ul>
    </Link>
  )
}
