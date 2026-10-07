import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon, PageHeader, Section, Segmented, Sheet, Stepper } from '../../components/ui'
import { usePlanDays, usePlanItems, useProfile } from '../../db/hooks'
import { addPlanDay, moveDayInSequence, resetPlanToTemplate, switchTemplate } from '../../db/planEdit'
import { updateProfile } from '../../db/repo'
import { getTemplate } from '../../seed/plan'
import { TemplateList } from '../../components/TemplateList'
import { WEEKDAY_LONG, formatClock, planPhase, planWeek, toISODate } from '../../domain/dates'
import type { PlanDay, Schedule } from '../../domain/types'
import { daysPerWeek, formatTarget, sequenceOrder } from '../../domain/plan'

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
  // segunda primeiro, domingo no fim; na sequência, é a ordem A → B → C
  const sorted = sequenceOrder(days)
  const rotation = profile.schedule === 'rotation'

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
      <Section className="mb-4">
        <p className="mb-1 text-xs text-iron-400">Como você treina?</p>
        <Segmented<Schedule>
          value={rotation ? 'rotation' : 'weekly'}
          onChange={(v) => void updateProfile({ schedule: v === 'rotation' ? 'rotation' : undefined })}
          options={[
            { value: 'weekly', label: 'Dias fixos' },
            { value: 'rotation', label: 'Em sequência' },
          ]}
        />
        <p className="mt-2 text-xs text-iron-400">
          {rotation
            ? 'Treinos em ordem, em qualquer dia: a tela Hoje mostra o próximo depois do último que você fez.'
            : 'Cada treino tem seu dia da semana. Faltou um dia? Dá para escolher outro treino na tela Hoje.'}
        </p>
        {rotation && days.length > 0 && (
          <div className="mt-3">
            <Stepper
              label="Treinos por semana (para a semana completa)"
              value={daysPerWeek(profile, days.length)}
              min={1}
              max={7}
              onChange={(v) => void updateProfile({ rotationDaysPerWeek: v })}
            />
          </div>
        )}
      </Section>
      <Section className="space-y-3">
        {sorted.map((d, i) => (
          <DayCard key={d.id} day={d} phase={phase} position={rotation ? i + 1 : undefined} count={sorted.length} />
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

function DayCard({ day, phase, position, count }: { day: PlanDay; phase: 1 | 2; /** na sequência: 1, 2, 3… */ position?: number; count: number }) {
  const items = usePlanItems(day.id)
  return (
    <div className="frame rounded-2xl bg-iron-850">
      {position !== undefined && (
        <div className="flex items-center justify-between border-b-2 border-iron-800 py-1 pr-1 pl-4">
          <span className="text-sm text-iron-300">
            Treino <span className="num text-base text-chalk">{position}</span> da sequência
          </span>
          <span className="flex">
            <button
              type="button"
              onClick={() => void moveDayInSequence(day.id, -1)}
              disabled={position === 1}
              aria-label={`Mover ${day.name} para antes`}
              className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800 disabled:opacity-25"
            >
              <Icon name="up" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void moveDayInSequence(day.id, 1)}
              disabled={position === count}
              aria-label={`Mover ${day.name} para depois`}
              className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800 disabled:opacity-25"
            >
              <Icon name="down" className="size-5" />
            </button>
          </span>
        </div>
      )}
      <Link to={`/plano/${day.id}`} className="block rounded-2xl p-4 active:bg-iron-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {position === undefined && <p className="text-sm text-iron-400">{WEEKDAY_LONG[day.weekday]}</p>}
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
    </div>
  )
}
