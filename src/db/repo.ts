import { CATALOG, DEFAULT_TEMPLATE_ID, SEED_VERSION, getTemplate } from '../seed/plan'
import { toISODate } from '../domain/dates'
import { planSnapshot } from '../domain/plan'
import type { BodyMeasurement, PlanExercise, Profile, SetLog, WorkoutSession } from '../domain/types'
import { db as defaultDb, newId, type FitDB } from './db'

/** Permite injetar outro banco nos testes. */
let db: FitDB = defaultDb
export function setDatabase(other: FitDB) {
  db = other
}
export function currentDb(): FitDB {
  return db
}

// ---------- seed / perfil ----------

/**
 * Roda a cada abertura. Pessoa nova (sem perfil): não faz nada — a tela de boas-vindas cria tudo.
 * Quem já usa: garante o catálogo de exercícios e aplica versões novas da planilha a quem está no
 * modelo "Hipertrofia 5 dias" sem ter editado o plano. Treinos e medidas nunca são tocados.
 */
export async function ensureSeeded(): Promise<void> {
  const tables = [db.profile, db.exercises, db.planDays, db.planExercises]
  await db.transaction('rw', tables, async () => {
    const profile = await db.profile.get('me')
    if (!profile) return
    await addMissingCatalog()
    const template = profile.planTemplate ?? DEFAULT_TEMPLATE_ID // instalações antigas usavam a planilha
    const outdated = template === DEFAULT_TEMPLATE_ID && !profile.planCustomized && (profile.seedVersion ?? 1) < SEED_VERSION
    if (outdated) await applyTemplateInTx(DEFAULT_TEMPLATE_ID)
  })
}

async function addMissingCatalog() {
  const existing = new Set((await db.exercises.toArray()).map((e) => e.id))
  const missing = CATALOG.filter((e) => !existing.has(e.id))
  if (missing.length) await db.exercises.bulkAdd(structuredClone(missing))
}

/** Troca o plano pelo de um modelo. Dias que saem ficam arquivados (histórico mantém o nome). */
async function applyTemplateInTx(templateId: string) {
  const t = getTemplate(templateId)
  const { planDays, planExercises } = t.build()
  await addMissingCatalog()
  const keep = new Set(planDays.map((d) => d.id))
  for (const d of await db.planDays.toArray()) if (!keep.has(d.id) && !d.archived) await db.planDays.update(d.id, { archived: true })
  await db.planDays.bulkPut(planDays)
  await db.planExercises.clear()
  await db.planExercises.bulkAdd(planExercises)
  await db.profile.update('me', {
    planTemplate: t.id,
    planCustomized: false,
    seedVersion: t.id === DEFAULT_TEMPLATE_ID ? SEED_VERSION : undefined,
  })
}

export async function applyTemplate(templateId: string): Promise<void> {
  await db.transaction('rw', [db.profile, db.exercises, db.planDays, db.planExercises], () => applyTemplateInTx(templateId))
}

export interface NewUserInput {
  templateId: string
  planStartDate: string
  heightCm?: number
  weightKg?: number
}

/** Primeira abertura: cria perfil, plano do modelo escolhido e a primeira pesagem. */
export async function setupNewUser(input: NewUserInput): Promise<void> {
  await db.transaction('rw', [db.profile, db.exercises, db.planDays, db.planExercises, db.measurements], async () => {
    await db.profile.put({
      id: 'me',
      planStartDate: input.planStartDate,
      heightCm: input.heightCm,
      startWeightKg: input.weightKg,
      onboardedAt: new Date().toISOString(),
    })
    await applyTemplateInTx(input.templateId)
    if (input.weightKg) await db.measurements.add({ id: newId(), date: toISODate(), weightKg: input.weightKg })
  })
}

/** Já passou pela primeira abertura (ou importou um backup)? */
export async function hasProfile(): Promise<boolean> {
  return (await db.profile.get('me')) !== undefined
}

export async function getProfile(): Promise<Profile> {
  return (await db.profile.get('me')) ?? { id: 'me', planStartDate: toISODate() }
}

export async function updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<void> {
  const current = await getProfile()
  await db.profile.put({ ...current, ...patch, id: 'me' })
}

// ---------- plano ----------

/** Dias ativos do plano. */
export async function getPlanDays() {
  return (await db.planDays.orderBy('weekday').toArray()).filter((d) => !d.archived)
}

/** Inclui dias removidos — para nomear treinos antigos no histórico. */
export async function getAllPlanDays() {
  return db.planDays.orderBy('weekday').toArray()
}

export async function getPlanDayByWeekday(weekday: number) {
  return db.planDays.where('weekday').equals(weekday).filter((d) => !d.archived).first()
}

export type PlanItem = PlanExercise & { exerciseName: string; muscleGroup: string; equipment: string }

export async function getPlanItems(planDayId: string): Promise<PlanItem[]> {
  const items = await db.planExercises.where('planDayId').equals(planDayId).sortBy('order')
  const exs = await db.exercises.bulkGet(items.map((i) => i.exerciseId))
  return items.map((i, idx) => ({
    ...i,
    exerciseName: exs[idx]?.name ?? '?',
    muscleGroup: exs[idx]?.muscleGroup ?? '',
    equipment: exs[idx]?.equipment ?? '',
  }))
}

export async function getAllPlanExercises(): Promise<PlanExercise[]> {
  return db.planExercises.toArray()
}

export async function getExercises() {
  return db.exercises.orderBy('id').toArray()
}

// ---------- sessões ----------

export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  const all = await db.sessions.orderBy('startedAt').reverse().toArray()
  return all.find((s) => !s.finishedAt)
}

export async function startSession(planDayId: string, now = new Date()): Promise<string> {
  const active = await getActiveSession()
  if (active) return active.id
  const id = newId()
  const date = toISODate(now)
  const [plan, days, profile] = await Promise.all([db.planExercises.toArray(), db.planDays.toArray(), getProfile()])
  await db.sessions.add({
    id,
    planDayId,
    date,
    startedAt: now.toISOString(),
    ...planSnapshot({ planDayId, date }, plan, days, profile.planStartDate),
  })
  return id
}

export async function finishSession(id: string, notes?: string): Promise<void> {
  const count = await db.sets.where('sessionId').equals(id).count()
  if (count === 0) {
    // Sessão sem séries não vira histórico.
    await db.sessions.delete(id)
    return
  }
  await db.sessions.update(id, { finishedAt: new Date().toISOString(), notes: notes?.trim() || undefined })
}

export async function discardSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}

export async function deleteSession(id: string): Promise<void> {
  return discardSession(id)
}

export async function logSet(s: Omit<SetLog, 'id' | 'loggedAt'>): Promise<string> {
  const id = newId()
  await db.sets.add({ ...s, id, loggedAt: new Date().toISOString() })
  return id
}

export async function updateSet(id: string, patch: Partial<Pick<SetLog, 'weightKg' | 'reps' | 'isWarmup'>>) {
  await db.sets.update(id, patch)
}

export async function deleteSet(id: string) {
  await db.sets.delete(id)
}

export async function getSessionSets(sessionId: string): Promise<SetLog[]> {
  const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
  return sets.sort((a, b) => a.exerciseId.localeCompare(b.exerciseId) || a.setNumber - b.setNumber)
}

/** Séries da última sessão FINALIZADA que teve esse exercício (para pré-preencher). */
export async function getLastSetsForExercise(exerciseId: string, excludeSessionId?: string): Promise<SetLog[]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return []
  const sessionIds = [...new Set(sets.map((s) => s.sessionId))].filter((id) => id !== excludeSessionId)
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter(
    (s): s is WorkoutSession => !!s && !!s.finishedAt,
  )
  if (sessions.length === 0) return []
  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const lastId = sessions[0].id
  return sets.filter((s) => s.sessionId === lastId).sort((a, b) => a.setNumber - b.setNumber)
}

export async function getFinishedSessions(): Promise<WorkoutSession[]> {
  const all = await db.sessions.orderBy('startedAt').reverse().toArray()
  return all.filter((s) => !!s.finishedAt)
}

export async function getExerciseSets(exerciseId: string): Promise<SetLog[]> {
  return db.sets.where('exerciseId').equals(exerciseId).toArray()
}

export async function getSession(id: string) {
  return db.sessions.get(id)
}

export async function getAllSets(): Promise<SetLog[]> {
  return db.sets.toArray()
}

// ---------- medidas ----------

export async function getMeasurements(): Promise<BodyMeasurement[]> {
  return db.measurements.orderBy('date').toArray()
}

export async function saveMeasurement(m: Omit<BodyMeasurement, 'id'> & { id?: string }): Promise<string> {
  const id = m.id ?? newId()
  await db.measurements.put({ ...m, id })
  return id
}

export async function deleteMeasurement(id: string) {
  await db.measurements.delete(id)
}

// ---------- armazenamento ----------

export async function requestPersistentStorage(): Promise<boolean | undefined> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return undefined
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function isStoragePersisted(): Promise<boolean | undefined> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return undefined
  return navigator.storage.persisted()
}
