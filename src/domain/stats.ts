import { setScore, setVolume, type ScoreKind } from './calc'
import { fromISODate, startOfWeek, toISODate } from './dates'
import type { Exercise, MuscleGroup, SetLog, WorkoutSession } from './types'

/** Volume (sem aquecimento) somado por semana (segunda-feira como chave). */
export function weeklyVolume(sessions: WorkoutSession[], sets: SetLog[]): { week: string; volume: number }[] {
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]))
  const acc = new Map<string, number>()
  for (const s of sets) {
    const d = dateOf.get(s.sessionId)
    if (!d || s.isWarmup) continue
    const w = startOfWeek(d)
    acc.set(w, (acc.get(w) ?? 0) + setVolume(s))
  }
  return [...acc.entries()].map(([week, volume]) => ({ week, volume })).sort((a, b) => a.week.localeCompare(b.week))
}

/** Volume semanal por grupo muscular para uma semana específica. */
export function muscleVolumeForWeek(
  week: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
  exercises: Exercise[],
): { group: MuscleGroup; volume: number; sets: number }[] {
  const ids = new Set(sessions.filter((s) => startOfWeek(s.date) === week).map((s) => s.id))
  const groupOf = new Map(exercises.map((e) => [e.id, e.muscleGroup]))
  const acc = new Map<MuscleGroup, { volume: number; sets: number }>()
  for (const s of sets) {
    if (!ids.has(s.sessionId) || s.isWarmup) continue
    const g = groupOf.get(s.exerciseId)
    if (!g) continue
    const cur = acc.get(g) ?? { volume: 0, sets: 0 }
    cur.volume += setVolume(s)
    cur.sets += 1
    acc.set(g, cur)
  }
  return [...acc.entries()].map(([group, v]) => ({ group, ...v })).sort((a, b) => b.volume - a.volume)
}

/**
 * Trilha que representa o exercício nos gráficos e recordes: com carga se alguma série teve carga;
 * senão, repetições/segundos (peso do corpo, prancha).
 */
export function exerciseKind(exerciseId: string, sets: Pick<SetLog, 'exerciseId' | 'weightKg' | 'isWarmup'>[]): ScoreKind {
  return sets.some((s) => s.exerciseId === exerciseId && !s.isWarmup && s.weightKg > 0) ? 'load' : 'reps'
}

/** Evolução de um exercício: melhor série por sessão, na trilha do exercício (1RM estimado ou repetições). */
export function exerciseProgress(
  exerciseId: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
): { date: string; value: number; kind: ScoreKind; topWeight: number; reps: number }[] {
  const kind = exerciseKind(exerciseId, sets)
  const out: { date: string; value: number; kind: ScoreKind; topWeight: number; reps: number }[] = []
  for (const sess of [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const mine = sets.filter((s) => s.sessionId === sess.id && s.exerciseId === exerciseId && !s.isWarmup && setScore(s).kind === kind)
    if (mine.length === 0) continue
    const best = mine.reduce((a, b) => (setScore(b).value > setScore(a).value ? b : a))
    out.push({
      date: sess.date,
      value: Math.round(setScore(best).value * 10) / 10,
      kind,
      topWeight: Math.max(...mine.map((s) => s.weightKg)),
      reps: best.reps,
    })
  }
  return out
}

export interface PersonalRecord {
  exerciseId: string
  /** "load": `best` é o 1RM estimado (kg); "reps": repetições ou segundos sem carga. */
  kind: ScoreKind
  best: number
  bestWeight: number
  bestSet: { weightKg: number; reps: number; date: string }
}

/** Recordes por exercício, na trilha do exercício (ver `exerciseKind`). */
export function personalRecords(sessions: WorkoutSession[], sets: SetLog[]): PersonalRecord[] {
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]))
  const done = sets.filter((s) => dateOf.has(s.sessionId) && !s.isWarmup && s.reps > 0)
  const loaded = new Set(done.filter((s) => s.weightKg > 0).map((s) => s.exerciseId)) // = exerciseKind 'load'
  const map = new Map<string, PersonalRecord>()
  for (const s of done) {
    const kind: ScoreKind = loaded.has(s.exerciseId) ? 'load' : 'reps'
    const score = setScore(s)
    let rec = map.get(s.exerciseId)
    if (!rec) {
      rec = { exerciseId: s.exerciseId, kind, best: -1, bestWeight: s.weightKg, bestSet: { weightKg: s.weightKg, reps: s.reps, date: dateOf.get(s.sessionId)! } }
      map.set(s.exerciseId, rec)
    }
    rec.bestWeight = Math.max(rec.bestWeight, s.weightKg)
    if (score.kind === kind && score.value > rec.best) {
      rec.best = score.value
      rec.bestSet = { weightKg: s.weightKg, reps: s.reps, date: dateOf.get(s.sessionId)! }
    }
  }
  return [...map.values()]
}

/** Semanas consecutivas (terminando na atual ou na anterior) com pelo menos 1 treino. */
export function weekStreak(sessions: WorkoutSession[], today: string): number {
  const weeks = new Set(sessions.map((s) => startOfWeek(s.date)))
  const cursor = fromISODate(startOfWeek(today))
  // semana atual ainda em andamento: se vazia, conta a partir da anterior
  if (!weeks.has(toISODate(cursor))) cursor.setDate(cursor.getDate() - 7)
  let n = 0
  while (weeks.has(toISODate(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 7)
  }
  return n
}

/** Aderência = treinos feitos ÷ planejados, nas últimas N semanas completas + a atual. */
export function adherence(sessions: WorkoutSession[], plannedPerWeek: number, today: string, weeks = 4): number {
  if (plannedPerWeek <= 0) return 0
  const start = fromISODate(startOfWeek(today))
  start.setDate(start.getDate() - (weeks - 1) * 7)
  const from = toISODate(start)
  const done = new Set(sessions.filter((s) => s.date >= from && s.date <= today).map((s) => s.date)).size
  return Math.min(1, done / (plannedPerWeek * weeks))
}

/** Data mínima para um período ("4s", "12s", "all"). */
export function periodStart(period: '4w' | '12w' | '6m' | 'all', today: string): string {
  if (period === 'all') return '0000-01-01'
  const d = fromISODate(today)
  if (period === '4w') d.setDate(d.getDate() - 28)
  if (period === '12w') d.setDate(d.getDate() - 84)
  if (period === '6m') d.setMonth(d.getMonth() - 6)
  return toISODate(d)
}
