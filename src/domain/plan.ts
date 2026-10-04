import { planPhase, planWeek } from './dates'
import type { PlanDay, PlanExercise, WorkoutSession } from './types'

/** Séries planejadas de um dia de treino numa data (fase 1 nas semanas 1–3, fase 2 depois). */
export function plannedSetsFor(
  planDayId: string,
  date: string,
  plan: Pick<PlanExercise, 'planDayId' | 'setsPhase1' | 'setsPhase2'>[],
  planStartDate: string,
): number {
  const phase = planPhase(planWeek(planStartDate, date))
  return plan.filter((p) => p.planDayId === planDayId).reduce((a, p) => a + (phase === 1 ? p.setsPhase1 : p.setsPhase2), 0)
}

/** Retrato do plano para gravar na sessão. */
export function planSnapshot(
  session: Pick<WorkoutSession, 'planDayId' | 'date'>,
  plan: Pick<PlanExercise, 'planDayId' | 'setsPhase1' | 'setsPhase2'>[],
  days: Pick<PlanDay, 'archived'>[],
  planStartDate: string,
): Pick<WorkoutSession, 'plannedSets' | 'plannedDaysPerWeek'> {
  return {
    plannedSets: plannedSetsFor(session.planDayId, session.date, plan, planStartDate),
    plannedDaysPerWeek: days.filter((d) => !d.archived).length,
  }
}

type Target = Pick<PlanExercise, 'repMin' | 'repMax' | 'targetUnit' | 'note'>

export const isTimed = (t: Pick<PlanExercise, 'targetUnit'>) => t.targetUnit === 'seconds'

/** "8–12", "12", "30–45 s", "10 por perna". */
export function formatTarget(t: Target): string {
  const range = t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`
  if (isTimed(t)) return `${range} s`
  return t.note ? `${range} ${t.note}` : range
}

/** "3 séries de 8–12 reps", "2 séries de 30–45 s", "2 séries de 10 reps por perna". */
export function describeTarget(sets: number, t: Target): string {
  const range = t.repMin === t.repMax ? `${t.repMin}` : `${t.repMin}–${t.repMax}`
  const what = isTimed(t) ? `${range} s` : `${range} reps${t.note ? ` ${t.note}` : ''}`
  return `${sets} ${sets === 1 ? 'série' : 'séries'} de ${what}`
}
