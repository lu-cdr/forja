import { planPhase, toISODate } from '../domain/dates'
import { planSnapshot } from '../domain/plan'
import type { BodyMeasurement, SetLog, WorkoutSession } from '../domain/types'
import { newId } from './db'
import { currentDb, getPlanItems, updateProfile } from './repo'

/**
 * Gera ~8 semanas de histórico fictício para visualizar os gráficos.
 * Só roda com o banco sem treinos e sem medidas — nunca mistura com dados reais.
 */
export async function loadSampleData(weeks = 8): Promise<void> {
  const db = currentDb()
  if ((await db.sessions.count()) > 0 || (await db.measurements.count()) > 1) {
    throw new Error('Já existem dados registrados. Exemplo só pode ser carregado num app vazio.')
  }

  const start = new Date()
  start.setDate(start.getDate() - weeks * 7)
  start.setHours(0, 0, 0, 0)
  const planDays = await db.planDays.toArray()
  const allPlan = await db.planExercises.toArray()
  const baseWeight = (await db.profile.get('me'))?.startWeightKg ?? 78
  const sessions: WorkoutSession[] = []
  const sets: SetLog[] = []
  const measurements: BodyMeasurement[] = []
  const baseLoad = new Map<string, number>()
  let rand = 42
  const rnd = () => ((rand = (rand * 16807) % 2147483647) / 2147483647)

  for (let d = 0; d < weeks * 7; d++) {
    const day = new Date(start)
    day.setDate(start.getDate() + d)
    const week = Math.floor(d / 7) + 1
    const iso = toISODate(day)

    // peso: tendência de +0,1 kg/semana com ruído diário
    if (rnd() < 0.7) {
      const weight = baseWeight - 1 + (d / 7) * 0.12 + (rnd() - 0.5) * 1.2
      const m: BodyMeasurement = { id: newId(), date: iso, weightKg: Math.round(weight * 10) / 10 }
      if (d % 14 === 0) {
        Object.assign(m, {
          bodyFatPct: Math.round((17 - d / 30 + (rnd() - 0.5)) * 10) / 10,
          waistCm: Math.round((84 - d / 40) * 10) / 10,
          abdomenCm: Math.round((87 - d / 35) * 10) / 10,
          chestCm: Math.round((100 + d / 30) * 10) / 10,
          armRCm: Math.round((36 + d / 60) * 10) / 10,
          armLCm: Math.round((35.6 + d / 60) * 10) / 10,
          thighRCm: Math.round((57 + d / 50) * 10) / 10,
          thighLCm: Math.round((56.7 + d / 50) * 10) / 10,
          calfCm: Math.round((37.5 + d / 120) * 10) / 10,
          hipCm: 98,
        })
      }
      measurements.push(m)
    }

    const pd = planDays.find((p) => p.weekday === day.getDay())
    if (!pd || rnd() < 0.12) continue
    const startedAt = new Date(day)
    startedAt.setHours(18, Math.floor(rnd() * 40), 0, 0)
    const sessionId = newId()
    const items = await getPlanItems(pd.id)
    let t = startedAt.getTime()
    for (const it of items) {
      if (!baseLoad.has(it.exerciseId)) baseLoad.set(it.exerciseId, it.restSeconds >= 120 ? 50 : 18)
      const load = baseLoad.get(it.exerciseId)! * (1 + (week - 1) * 0.025)
      const nSets = planPhase(week) === 1 ? it.setsPhase1 : it.setsPhase2
      for (let n = 1; n <= nSets; n++) {
        t += (it.restSeconds + 40) * 1000
        sets.push({
          id: newId(),
          sessionId,
          exerciseId: it.exerciseId,
          setNumber: n,
          weightKg: Math.round(load / 2.5) * 2.5,
          reps: Math.max(it.repMin, it.repMax - n + 1 - Math.floor(rnd() * 2)),
          isWarmup: false,
          loggedAt: new Date(t).toISOString(),
        })
      }
    }
    sessions.push({
      id: sessionId,
      planDayId: pd.id,
      date: iso,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date(t + 60_000).toISOString(),
      ...planSnapshot({ planDayId: pd.id, date: iso }, allPlan, planDays, toISODate(start)),
    })
  }

  await db.transaction('rw', db.sessions, db.sets, db.measurements, async () => {
    await db.sessions.bulkAdd(sessions)
    await db.sets.bulkAdd(sets)
    await db.measurements.bulkAdd(measurements)
  })
  await updateProfile({ planStartDate: toISODate(start) })
}

/** Apaga treinos e medidas (mantém plano e perfil). */
export async function clearHistory(): Promise<void> {
  const db = currentDb()
  await db.transaction('rw', db.sessions, db.sets, db.measurements, async () => {
    await db.sessions.clear()
    await db.sets.clear()
    await db.measurements.clear()
  })
}
