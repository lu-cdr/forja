import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { FitDB } from './db'
import * as repo from './repo'
import * as edit from './planEdit'
import { exportAll, importAll, parseBackup } from './backup'
import { computeGame } from '../domain/game'

const toDelete: string[] = []
let n = 0
const fresh = async () => {
  const name = `snap-${++n}`
  toDelete.push(name)
  const db = new FitDB(name)
  repo.setDatabase(db)
  await repo.setupNewUser({ templateId: 'hipertrofia-5x', planStartDate: '2026-10-03' })
  return db
}

afterEach(async () => {
  while (toDelete.length) await Dexie.delete(toDelete.pop()!)
})

async function gameNow() {
  const [sessions, sets, plan, days, profile, ms] = await Promise.all([
    repo.getFinishedSessions(),
    repo.getAllSets(),
    repo.getAllPlanExercises(),
    repo.getPlanDays(),
    repo.getProfile(),
    repo.getMeasurements(),
  ])
  return computeGame({
    sessions,
    sets,
    plan,
    plannedDaysPerWeek: days.length,
    planStartDate: profile.planStartDate,
    measurementDates: ms.map((m) => m.date),
  })
}

describe('retrato do plano', () => {
  it('startSession grava séries planejadas e dias/semana', async () => {
    await fresh()
    const [day] = await repo.getPlanDays()
    const items = await repo.getPlanItems(day.id)
    const id = await repo.startSession(day.id, new Date(2026, 9, 6))
    const s = (await repo.getActiveSession())!
    expect(s.id).toBe(id)
    expect(s.plannedSets).toBe(items.reduce((a, i) => a + i.setsPhase1, 0))
    expect(s.plannedDaysPerWeek).toBe(5)
  })

  it('editar o plano depois do treino não muda o XP', async () => {
    await fresh()
    const [day] = await repo.getPlanDays()
    const items = await repo.getPlanItems(day.id)
    const sid = await repo.startSession(day.id)
    let k = 0
    for (const it of items)
      for (let i = 1; i <= it.setsPhase1; i++)
        await repo.logSet({ sessionId: sid, exerciseId: it.exerciseId, setNumber: i, weightKg: 20 + k++, reps: 10, isWarmup: false })
    await repo.finishSession(sid)
    const before = await gameNow()
    expect(before.events.some((e) => e.kind === 'fullWorkout')).toBe(true)

    // mais séries e mais dias no plano
    await edit.updatePlanExercise(items[0].id, { setsPhase1: 10 })
    await edit.addPlanDay()
    const after = await gameNow()
    expect(after.totalXp).toBe(before.totalXp)
  })

  it('migração v1 → v2 congela as sessões que já existiam', async () => {
    const name = `snap-mig-${++n}`
    toDelete.push(name)
    // banco no formato da versão 1, com um treino sem retrato
    const v1 = new Dexie(name)
    v1.version(1).stores({
      profile: 'id',
      exercises: 'id, muscleGroup',
      planDays: 'id, weekday',
      planExercises: 'id, planDayId, exerciseId',
      sessions: 'id, planDayId, date, startedAt, finishedAt',
      sets: 'id, sessionId, exerciseId, [sessionId+exerciseId]',
      measurements: 'id, date',
    })
    await v1.table('profile').add({ id: 'me', planStartDate: '2026-10-03' })
    await v1.table('planDays').bulkAdd([
      { id: 'd2', weekday: 2, name: 'A' },
      { id: 'd3', weekday: 3, name: 'B' },
    ])
    await v1.table('planExercises').bulkAdd([
      { id: 'p1', planDayId: 'd2', exerciseId: 'x', order: 1, setsPhase1: 3, setsPhase2: 4, repMin: 8, repMax: 12, restSeconds: 60 },
      { id: 'p2', planDayId: 'd2', exerciseId: 'y', order: 2, setsPhase1: 2, setsPhase2: 3, repMin: 8, repMax: 12, restSeconds: 60 },
    ])
    await v1.table('sessions').add({ id: 's1', planDayId: 'd2', date: '2026-10-06', startedAt: '2026-10-06T18:00:00Z', finishedAt: '2026-10-06T19:00:00Z' })
    v1.close()

    const db = new FitDB(name)
    await db.open()
    expect(db.verno).toBe(3)
    const s = await db.sessions.get('s1')
    expect(s).toMatchObject({ plannedSets: 5, plannedDaysPerWeek: 2 }) // semana 1 → fase 1: 3 + 2
    db.close()
  })

  it('migração v2 → v3 cria a tabela de fotos sem tocar nos dados', async () => {
    const name = `snap-mig3-${++n}`
    toDelete.push(name)
    const schema = {
      profile: 'id',
      exercises: 'id, muscleGroup',
      planDays: 'id, weekday',
      planExercises: 'id, planDayId, exerciseId',
      sessions: 'id, planDayId, date, startedAt, finishedAt',
      sets: 'id, sessionId, exerciseId, [sessionId+exerciseId]',
      measurements: 'id, date',
    }
    const v2 = new Dexie(name)
    v2.version(1).stores(schema)
    v2.version(2).stores(schema)
    await v2.table('profile').add({ id: 'me', planStartDate: '2026-10-03' })
    await v2.table('sessions').add({ id: 's1', planDayId: 'd', date: '2026-10-06', startedAt: '2026-10-06T18:00:00Z', finishedAt: '2026-10-06T19:00:00Z', plannedSets: 3, plannedDaysPerWeek: 2 })
    await v2.table('measurements').add({ id: 'm1', date: '2026-10-06', weightKg: 80 })
    v2.close()

    const db = new FitDB(name)
    await db.open()
    expect(db.verno).toBe(3)
    expect(await db.sessions.get('s1')).toMatchObject({ plannedSets: 3, plannedDaysPerWeek: 2 })
    expect(await db.measurements.get('m1')).toMatchObject({ weightKg: 80 })
    expect(await db.photos.count()).toBe(0)
    db.close()
  })

  it('importar backup antigo (sem retrato) preenche as sessões', async () => {
    await fresh()
    const [day] = await repo.getPlanDays()
    const sid = await repo.startSession(day.id)
    const [it] = await repo.getPlanItems(day.id)
    await repo.logSet({ sessionId: sid, exerciseId: it.exerciseId, setNumber: 1, weightKg: 30, reps: 10, isWarmup: false })
    await repo.finishSession(sid)
    const backup = await exportAll()
    for (const s of backup.data.sessions as Record<string, unknown>[]) {
      delete s.plannedSets
      delete s.plannedDaysPerWeek
    }
    await fresh()
    await importAll(parseBackup(JSON.stringify(backup)))
    const [s] = await repo.getFinishedSessions()
    expect(s.plannedSets).toBeGreaterThan(0)
    expect(s.plannedDaysPerWeek).toBe(5)
  })
})
