import { planPhase, planWeek } from './dates'
import type { PlanDay, PlanExercise, Profile, WorkoutSession } from './types'

/** Metas de um exercício novo (no plano ou acrescentado num treino). */
export const DEFAULT_TARGET = { setsPhase1: 2, setsPhase2: 3, repMin: 8, repMax: 12 } as const
/** Compostos pedem mais descanso. */
export const defaultRest = (isCompound: boolean) => (isCompound ? 120 : 60)

// ---------- agenda: dias fixos ou sequência ----------

const mondayFirst = (weekday: number) => (weekday + 6) % 7

/** Ordem dos treinos (segunda primeiro). Na sequência, é a ordem A → B → C; reordenar troca os dias da semana entre eles. */
export function sequenceOrder<T extends Pick<PlanDay, 'weekday'>>(days: T[]): T[] {
  return [...days].sort((a, b) => mondayFirst(a.weekday) - mondayFirst(b.weekday))
}

/**
 * Próximo treino da sequência: o que vem depois do último concluído (volta ao primeiro no fim).
 * Último treino de um dia que saiu do plano, ou nenhum treino ainda: começa pelo primeiro.
 */
export function nextInRotation<T extends Pick<PlanDay, 'id' | 'weekday'>>(days: T[], lastPlanDayId?: string): T | undefined {
  const seq = sequenceOrder(days)
  const i = seq.findIndex((d) => d.id === lastPlanDayId)
  return seq[i < 0 ? 0 : (i + 1) % seq.length]
}

/** Treinos por semana que fecham a semana: dias do plano, ou a meta escolhida na sequência. */
export function daysPerWeek(profile: Pick<Profile, 'schedule' | 'rotationDaysPerWeek'> | undefined, activeDays: number): number {
  if (profile?.schedule === 'rotation' && profile.rotationDaysPerWeek) return Math.min(7, Math.max(1, profile.rotationDaysPerWeek))
  return activeDays
}

/** Séries planejadas de um dia de treino numa data (fase 1 na readaptação, fase 2 depois). */
export function plannedSetsFor(
  planDayId: string,
  date: string,
  plan: Pick<PlanExercise, 'planDayId' | 'setsPhase1' | 'setsPhase2'>[],
  planStartDate: string,
  rampUpWeeks?: number,
): number {
  const phase = planPhase(planWeek(planStartDate, date), rampUpWeeks)
  return plan.filter((p) => p.planDayId === planDayId).reduce((a, p) => a + (phase === 1 ? p.setsPhase1 : p.setsPhase2), 0)
}

/** Retrato do plano para gravar na sessão. */
export function planSnapshot(
  session: Pick<WorkoutSession, 'planDayId' | 'date'>,
  plan: Pick<PlanExercise, 'planDayId' | 'setsPhase1' | 'setsPhase2'>[],
  days: Pick<PlanDay, 'archived'>[],
  planStartDate: string,
  profile?: Pick<Profile, 'rampUpWeeks' | 'schedule' | 'rotationDaysPerWeek'>,
): Pick<WorkoutSession, 'plannedSets' | 'plannedDaysPerWeek'> {
  return {
    plannedSets: plannedSetsFor(session.planDayId, session.date, plan, planStartDate, profile?.rampUpWeeks),
    plannedDaysPerWeek: daysPerWeek(profile, days.filter((d) => !d.archived).length),
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
