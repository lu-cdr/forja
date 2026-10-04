import { bestSet, epley1RM, setVolume } from './calc'
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

/** Evolução de um exercício: melhor série por sessão. */
export function exerciseProgress(
  exerciseId: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
): { date: string; e1rm: number; topWeight: number; reps: number }[] {
  const out: { date: string; e1rm: number; topWeight: number; reps: number }[] = []
  for (const sess of [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const mine = sets.filter((s) => s.sessionId === sess.id && s.exerciseId === exerciseId && !s.isWarmup)
    const best = bestSet(mine)
    if (!best) continue
    out.push({
      date: sess.date,
      e1rm: Math.round(epley1RM(best.weightKg, best.reps) * 10) / 10,
      topWeight: Math.max(...mine.map((s) => s.weightKg)),
      reps: best.reps,
    })
  }
  return out
}

export interface PersonalRecord {
  exerciseId: string
  bestE1RM: number
  bestWeight: number
  bestSet: { weightKg: number; reps: number; date: string }
}

/** Recordes por exercício (maior 1RM estimado e maior carga). */
export function personalRecords(sessions: WorkoutSession[], sets: SetLog[]): PersonalRecord[] {
  const dateOf = new Map(sessions.map((s) => [s.id, s.date]))
  const map = new Map<string, PersonalRecord>()
  for (const s of sets) {
    const date = dateOf.get(s.sessionId)
    if (!date || s.isWarmup) continue
    const e = epley1RM(s.weightKg, s.reps)
    const cur = map.get(s.exerciseId)
    if (!cur) {
      map.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        bestE1RM: e,
        bestWeight: s.weightKg,
        bestSet: { weightKg: s.weightKg, reps: s.reps, date },
      })
      continue
    }
    cur.bestWeight = Math.max(cur.bestWeight, s.weightKg)
    if (e > cur.bestE1RM) {
      cur.bestE1RM = e
      cur.bestSet = { weightKg: s.weightKg, reps: s.reps, date }
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
