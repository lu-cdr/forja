import { toISODate } from './dates'
import { DEFAULT_TARGET, defaultRest } from './plan'
import type { Exercise, PlanExercise, SetLog, WorkoutSession } from './types'

// ---------- lista de exercícios do treino de hoje ----------

type PlanItemLike = PlanExercise & { exerciseName: string; muscleGroup: string; equipment: string }

export interface WorkoutItem
  extends Pick<PlanExercise, 'exerciseId' | 'setsPhase1' | 'setsPhase2' | 'repMin' | 'repMax' | 'restSeconds' | 'targetUnit' | 'note'> {
  /** Chave estável na tela. */
  key: string
  /** Item do plano de onde veio (ausente nos acrescentados). */
  planExerciseId?: string
  exerciseName: string
  muscleGroup: string
  equipment: string
  setupNote?: string
  /** "plan": como no plano; "swap": trocado só hoje; "extra": acrescentado hoje. */
  origin: 'plan' | 'swap' | 'extra'
  /** Na troca: o exercício do plano que saiu. */
  replaces?: string
}

/**
 * Exercícios do treino: os do plano (com as trocas de hoje, mantendo séries/reps/descanso),
 * depois os acrescentados hoje e, por último, qualquer exercício com séries registradas que não
 * esteja na lista (ex.: trocou depois de já ter feito séries) — nenhuma série some da tela.
 */
export function buildWorkout(
  planItems: PlanItemLike[],
  session: Pick<WorkoutSession, 'swaps' | 'extraExercises'>,
  exercises: Map<string, Exercise>,
  loggedExerciseIds: string[] = [],
): WorkoutItem[] {
  const out: WorkoutItem[] = []
  const seen = new Set<string>()
  for (const it of planItems) {
    const swapId = session.swaps?.[it.id]
    const sub = swapId && swapId !== it.exerciseId ? exercises.get(swapId) : undefined
    const exerciseId = sub?.id ?? it.exerciseId
    if (seen.has(exerciseId)) continue
    seen.add(exerciseId)
    out.push({
      key: it.id,
      planExerciseId: it.id,
      exerciseId,
      exerciseName: sub?.name ?? it.exerciseName,
      muscleGroup: sub?.muscleGroup ?? it.muscleGroup,
      equipment: sub?.equipment ?? it.equipment,
      setupNote: exercises.get(exerciseId)?.setupNote,
      setsPhase1: it.setsPhase1,
      setsPhase2: it.setsPhase2,
      repMin: it.repMin,
      repMax: it.repMax,
      restSeconds: it.restSeconds,
      // "por perna" e meta em segundos são do exercício do plano; na troca, voltam ao padrão
      targetUnit: sub ? undefined : it.targetUnit,
      note: sub ? undefined : it.note,
      origin: sub ? 'swap' : 'plan',
      replaces: sub ? it.exerciseName : undefined,
    })
  }
  for (const id of [...(session.extraExercises ?? []), ...loggedExerciseIds]) {
    const ex = exercises.get(id)
    if (!ex || seen.has(id)) continue
    seen.add(id)
    out.push({
      key: `extra-${id}`,
      exerciseId: id,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      setupNote: ex.setupNote,
      ...DEFAULT_TARGET,
      restSeconds: defaultRest(ex.isCompound),
      origin: 'extra',
    })
  }
  return out
}

/** Horas sem registrar série para um treino em andamento ser considerado esquecido. */
export const ABANDONED_AFTER_HOURS = 3

/** Último sinal de vida do treino: a última série registrada, ou o início se não há séries. */
export function lastActivityAt(session: Pick<WorkoutSession, 'startedAt'>, sets: Pick<SetLog, 'loggedAt'>[]): string {
  return sets.reduce((latest, s) => (s.loggedAt > latest ? s.loggedAt : latest), session.startedAt)
}

/**
 * Treino aberto que a pessoa esqueceu de concluir: começou em outro dia ou está parado há horas.
 * (Começar o treino de hoje sem concluir o de ontem reabriria o de ontem.)
 */
export function isAbandoned(
  session: Pick<WorkoutSession, 'date' | 'startedAt' | 'finishedAt'>,
  sets: Pick<SetLog, 'loggedAt'>[],
  now = new Date(),
): boolean {
  if (session.finishedAt) return false
  if (session.date < toISODate(now)) return true
  return now.getTime() - Date.parse(lastActivityAt(session, sets)) > ABANDONED_AFTER_HOURS * 3_600_000
}
