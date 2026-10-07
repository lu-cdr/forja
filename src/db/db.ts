import Dexie, { type EntityTable, type Table } from 'dexie'
import { planSnapshot } from '../domain/plan'
import type {
  BodyMeasurement,
  Exercise,
  PlanDay,
  PlanExercise,
  Profile,
  ProgressPhoto,
  SetLog,
  WorkoutSession,
} from '../domain/types'

export class FitDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  planDays!: EntityTable<PlanDay, 'id'>
  planExercises!: EntityTable<PlanExercise, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  sets!: EntityTable<SetLog, 'id'>
  measurements!: EntityTable<BodyMeasurement, 'id'>
  photos!: EntityTable<ProgressPhoto, 'id'>

  constructor(name = 'fitapp') {
    super(name)
    // Migrações: NUNCA editar uma versão já publicada; criar this.version(N+1).
    const schemaV1 = {
      profile: 'id',
      exercises: 'id, muscleGroup',
      planDays: 'id, weekday',
      planExercises: 'id, planDayId, exerciseId',
      sessions: 'id, planDayId, date, startedAt, finishedAt',
      sets: 'id, sessionId, exerciseId, [sessionId+exerciseId]',
      measurements: 'id, date',
    }
    this.version(1).stores(schemaV1)
    // v2: sessões guardam o retrato do plano (séries planejadas, dias/semana) para o XP não mudar com edições.
    // Sem mudança de índices; só preenche as sessões que já existiam.
    this.version(2)
      .stores(schemaV1)
      .upgrade((tx) =>
        freezePlanSnapshots(tx.table('sessions'), tx.table('planExercises'), tx.table('planDays'), tx.table('profile')),
      )
    // v3: fotos de progresso (tabela nova; nada muda nas outras)
    this.version(3).stores({ ...schemaV1, photos: 'id, date' })
  }
}

/** Grava o retrato do plano nas sessões que ainda não têm. Idempotente; nunca altera retratos existentes. */
export async function freezePlanSnapshots(
  sessions: Table<WorkoutSession, string>,
  planExercises: Table<PlanExercise, string>,
  planDays: Table<PlanDay, string>,
  profile: Table<Profile, string>,
): Promise<number> {
  const pending = (await sessions.toArray()).filter((s) => s.plannedSets === undefined)
  if (pending.length === 0) return 0
  const [plan, days, me] = await Promise.all([planExercises.toArray(), planDays.toArray(), profile.get('me')])
  const start = me?.planStartDate ?? pending[0].date
  for (const s of pending) await sessions.update(s.id, planSnapshot(s, plan, days, start, me))
  return pending.length
}

export const db = new FitDB()

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
