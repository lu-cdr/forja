import { toISODate } from './dates'
import type { SetLog, WorkoutSession } from './types'

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
