import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, Section, Segmented, Stepper, cx } from '../../components/ui'
import { useAllPlanDays, usePlanDays, usePlanItems, useProfile } from '../../db/hooks'
import type { PlanItem } from '../../db/repo'
import {
  addPlanExercise,
  archivePlanDay,
  movePlanExercise,
  removePlanExercise,
  swapPlanExercise,
  updatePlanDay,
  updatePlanExercise,
} from '../../db/planEdit'
import { WEEKDAY_LONG, WEEKDAY_SHORT, formatClock, planPhase, planWeek, toISODate } from '../../domain/dates'
import { formatTarget, isTimed } from '../../domain/plan'
import { MUSCLE_LABEL, type MuscleGroup } from '../../domain/types'
import { ExercisePicker } from './ExercisePicker'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function DayEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const allDays = useAllPlanDays()
  const activeDays = usePlanDays()
  const items = usePlanItems(id)
  const profile = useProfile()
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; itemId: string } | null>(null)
  const [openItem, setOpenItem] = useState<string>()
  const [error, setError] = useState<string>()

  if (!allDays || !activeDays || !items || !profile) return null
  const day = allDays.find((d) => d.id === id)
  if (!day || day.archived) return <Navigate to="/plano" replace />
  const phase = planPhase(planWeek(profile.planStartDate, toISODate()), profile.rampUpWeeks)
  const taken = new Set(activeDays.filter((d) => d.id !== day.id).map((d) => d.weekday))

  async function run(fn: () => Promise<unknown>) {
    setError(undefined)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  async function onRemoveDay() {
    if (!window.confirm(`Remover "${day!.name}" do plano? Os treinos já feitos continuam no histórico.`)) return
    await archivePlanDay(day!.id)
    navigate('/plano', { replace: true })
  }

  return (
    <div>
      <div className="pt-safe px-2 pt-2">
        <Button variant="ghost" className="px-2" onClick={() => navigate('/plano')}>
          <Icon name="back" /> Plano
        </Button>
      </div>

      <Section className="mb-5">
        <label className="block">
          <span className="text-xs text-iron-400">Nome do treino</span>
          <input
            key={day.id + day.name}
            defaultValue={day.name}
            onBlur={(e) => e.target.value.trim() !== day.name && run(() => updatePlanDay(day.id, { name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="frame mt-1 h-14 w-full rounded-xl bg-iron-850 px-3 font-display text-2xl font-bold"
          />
        </label>

        <p className="mt-4 text-xs text-iron-400">Dia da semana</p>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {WEEK_ORDER.map((w) => {
            const isTaken = taken.has(w)
            const selected = w === day.weekday
            return (
              <button
                key={w}
                type="button"
                disabled={isTaken}
                onClick={() => run(() => updatePlanDay(day.id, { weekday: w }))}
                aria-pressed={selected}
                aria-label={`${WEEKDAY_LONG[w]}${isTaken ? ', já tem treino' : ''}`}
                className={cx(
                  'min-h-11 rounded-lg text-sm',
                  selected ? 'bg-rubber font-semibold text-iron-950' : isTaken ? 'bg-iron-900 text-iron-600 line-through' : 'bg-iron-800 text-iron-300',
                )}
              >
                {WEEKDAY_SHORT[w]}
              </button>
            )
          })}
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Section>

      <Section title={`Exercícios (${items.length})`} className="mb-5">
        <ol className="space-y-2">
          {items.map((it, i) => (
            <ItemEditor
              key={it.id}
              item={it}
              index={i}
              count={items.length}
              phase={phase}
              rampUp={(profile.rampUpWeeks ?? 3) > 0}
              open={openItem === it.id}
              onToggle={() => setOpenItem(openItem === it.id ? undefined : it.id)}
              onSwap={() => setPicker({ mode: 'swap', itemId: it.id })}
            />
          ))}
        </ol>
        {items.length === 0 && <p className="text-sm text-iron-400">Nenhum exercício ainda. Adicione o primeiro abaixo.</p>}
        <Button variant="primary" className="mt-3 w-full" onClick={() => setPicker({ mode: 'add' })}>
          <Icon name="plus" className="size-4" /> Adicionar exercício
        </Button>
        <p className="mt-2 text-xs text-iron-500">As mudanças são salvas na hora.</p>
      </Section>

      <Section className="mb-6">
        <Button variant="danger" className="w-full" onClick={onRemoveDay}>
          <Icon name="trash" className="size-4" /> Remover este dia do plano
        </Button>
      </Section>

      <ExercisePicker
        open={picker !== null}
        title={picker?.mode === 'swap' ? 'Trocar exercício' : 'Adicionar exercício'}
        alreadyIn={items.map((i) => i.exerciseId)}
        onClose={() => setPicker(null)}
        onPick={(exId) =>
          run(async () => {
            if (picker?.mode === 'swap') await swapPlanExercise(picker.itemId, exId)
            else setOpenItem(await addPlanExercise(day.id, exId))
          })
        }
      />
    </div>
  )
}

function ItemEditor({
  item,
  index,
  count,
  phase,
  rampUp,
  open,
  onToggle,
  onSwap,
}: {
  item: PlanItem
  index: number
  count: number
  phase: 1 | 2
  /** Perfil com readaptação: mostra as séries das duas fases. */
  rampUp: boolean
  open: boolean
  onToggle: () => void
  onSwap: () => void
}) {
  const timed = isTimed(item)
  const save = (patch: Parameters<typeof updatePlanExercise>[1]) => void updatePlanExercise(item.id, patch)

  return (
    <li className={cx('rounded-2xl bg-iron-850', open ? 'frame-gold' : 'frame')}>
      <div className="flex items-center gap-1 p-2 pl-3">
        <span className="num w-5 shrink-0 text-lg text-iron-500">{index + 1}</span>
        <button type="button" onClick={onToggle} className="min-h-11 min-w-0 flex-1 text-left" aria-expanded={open}>
          <p className="truncate text-[15px] font-medium">{item.exerciseName}</p>
          <p className="text-xs text-iron-400">
            <span className="num text-sm text-iron-300">
              {phase === 1 ? item.setsPhase1 : item.setsPhase2}×{formatTarget(item)}
            </span>
            , descanso {formatClock(item.restSeconds)}, {MUSCLE_LABEL[item.muscleGroup as MuscleGroup] ?? ''}
          </p>
        </button>
        <button
          type="button"
          onClick={() => movePlanExercise(item.id, -1)}
          disabled={index === 0}
          aria-label="Mover para cima"
          className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800 disabled:opacity-25"
        >
          <Icon name="up" className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => movePlanExercise(item.id, 1)}
          disabled={index === count - 1}
          aria-label="Mover para baixo"
          className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800 disabled:opacity-25"
        >
          <Icon name="down" className="size-5" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t-2 border-iron-800 p-3">
          {rampUp ? (
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Séries na readaptação" value={item.setsPhase1} min={1} max={10} onChange={(v) => save({ setsPhase1: v })} />
              <Stepper label="Séries normais" value={item.setsPhase2} min={1} max={10} onChange={(v) => save({ setsPhase2: v })} />
            </div>
          ) : (
            <Stepper label="Séries" value={item.setsPhase2} min={1} max={10} onChange={(v) => save({ setsPhase2: v })} />
          )}

          <Segmented<'reps' | 'seconds'>
            value={timed ? 'seconds' : 'reps'}
            onChange={(v) => save({ targetUnit: v === 'seconds' ? 'seconds' : undefined })}
            options={[
              { value: 'reps', label: 'Repetições' },
              { value: 'seconds', label: 'Tempo (seg)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Stepper
              label={timed ? 'Segundos, mínimo' : 'Reps, mínimo'}
              value={item.repMin}
              min={1}
              max={timed ? 600 : 100}
              step={timed ? 5 : 1}
              onChange={(v) => save({ repMin: v })}
            />
            <Stepper
              label={timed ? 'Segundos, máximo' : 'Reps, máximo'}
              value={item.repMax}
              min={1}
              max={timed ? 600 : 100}
              step={timed ? 5 : 1}
              onChange={(v) => save({ repMax: v })}
            />
          </div>

          <Stepper label="Descanso" value={item.restSeconds} min={0} max={600} step={15} format={formatClock} onChange={(v) => save({ restSeconds: v })} />

          <label className="block">
            <span className="text-xs text-iron-400">Observação (opcional)</span>
            <input
              key={item.note ?? ''}
              defaultValue={item.note ?? ''}
              placeholder="ex.: por perna, pegada aberta"
              onBlur={(e) => e.target.value.trim() !== (item.note ?? '') && save({ note: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="mt-1 h-11 w-full rounded-xl bg-iron-800 px-3 text-[15px] placeholder:text-iron-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onSwap}>
              <Icon name="swap" className="size-4" /> Trocar
            </Button>
            <Button
              variant="danger"
              onClick={() => window.confirm(`Tirar "${item.exerciseName}" deste treino?`) && void removePlanExercise(item.id)}
            >
              <Icon name="trash" className="size-4" /> Remover
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
