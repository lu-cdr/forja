import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FitDB } from './db'
import * as repo from './repo'
import * as edit from './planEdit'
import type { PlanExercise } from '../domain/types'

let db: FitDB
let n = 0

beforeEach(async () => {
  db = new FitDB(`plan-edit-${++n}`)
  repo.setDatabase(db)
  await repo.setupNewUser({ templateId: 'hipertrofia-5x', planStartDate: '2026-10-03' })
})
afterEach(async () => {
  await db.delete()
})

const firstDay = async () => (await repo.getPlanDays())[0]

describe('dias', () => {
  it('adiciona no primeiro dia livre e bloqueia dia da semana repetido', async () => {
    const id = await edit.addPlanDay()
    const day = (await repo.getPlanDays()).find((d) => d.id === id)!
    expect(day.weekday).toBe(1) // segunda está livre no plano da planilha (Ter–Sáb)
    await expect(edit.updatePlanDay(id, { weekday: 2 })).rejects.toThrow(/dia da semana/)
    await edit.updatePlanDay(id, { weekday: 0, name: '  Cardio  ' })
    const after = (await repo.getPlanDays()).find((d) => d.id === id)!
    expect(after).toMatchObject({ weekday: 0, name: 'Cardio' })
    expect((await repo.getProfile()).planCustomized).toBe(true)
  })

  it('em sequência, mover troca a posição (e o dia da semana) com o vizinho', async () => {
    const before = await repo.getPlanDays() // Ter, Qua, Qui, Sex, Sáb
    const [a, b] = before
    await edit.moveDayInSequence(b.id, -1)
    const after = await repo.getPlanDays()
    expect(after.find((d) => d.id === b.id)?.weekday).toBe(a.weekday)
    expect(after.find((d) => d.id === a.id)?.weekday).toBe(b.weekday)
    await edit.moveDayInSequence(b.id, -1) // já é o primeiro
    expect((await repo.getPlanDays()).find((d) => d.id === b.id)?.weekday).toBe(a.weekday)
  })

  it('remover arquiva: some do plano mas o histórico mantém o nome', async () => {
    const day = await firstDay()
    const [item] = await repo.getPlanItems(day.id)
    const sid = await repo.startSession(day.id)
    await repo.logSet({ sessionId: sid, exerciseId: item.exerciseId, setNumber: 1, weightKg: 40, reps: 10, isWarmup: false })
    await repo.finishSession(sid)

    await edit.archivePlanDay(day.id)
    expect((await repo.getPlanDays()).some((d) => d.id === day.id)).toBe(false)
    expect((await repo.getAllPlanDays()).find((d) => d.id === day.id)?.name).toBe(day.name)
    expect(await repo.getPlanDayByWeekday(day.weekday)).toBeUndefined()
    // o dia da semana fica livre de novo
    expect(await edit.freeWeekdays()).toContain(day.weekday)
  })
})

describe('exercícios do dia', () => {
  it('adiciona, reordena e remove mantendo a ordem 1..n', async () => {
    const day = await firstDay()
    const exId = await edit.createExercise({ name: 'Remada cavalinho', muscleGroup: 'costas', equipment: 'Barra', isCompound: true })
    const newItem = await edit.addPlanExercise(day.id, exId)
    let items = await repo.getPlanItems(day.id)
    expect(items.at(-1)).toMatchObject({ id: newItem, restSeconds: 120 })

    await edit.movePlanExercise(newItem, -1)
    items = await repo.getPlanItems(day.id)
    expect(items.at(-2)?.id).toBe(newItem)
    await edit.movePlanExercise(items[0].id, -1) // já é o primeiro: nada muda
    expect((await repo.getPlanItems(day.id))[0].id).toBe(items[0].id)

    await edit.removePlanExercise(items[0].id)
    items = await repo.getPlanItems(day.id)
    expect(items.map((i) => i.order)).toEqual(items.map((_, i) => i + 1))
    expect(items.some((i) => i.id === newItem)).toBe(true)
  })

  it('criar exercício com nome já existente reaproveita o mesmo', async () => {
    const a = await edit.createExercise({ name: 'Supino reto com barra', muscleGroup: 'peito', equipment: 'Barra', isCompound: true })
    expect(a).toBe('ex-supino-reto-com-barra')
    await expect(edit.createExercise({ name: '  ', muscleGroup: 'peito', equipment: '', isCompound: false })).rejects.toThrow()
  })

  it('biblioteca esconde exercícios órfãos e mostra os criados pelo usuário', async () => {
    await db.exercises.add({ id: 'ex-orfao', name: 'Sobra de plano antigo', muscleGroup: 'peito', equipment: '', isCompound: false })
    const mine = await edit.createExercise({ name: 'Face pull', muscleGroup: 'ombros', equipment: 'Polia', isCompound: false })
    const ids = (await edit.getLibraryExercises()).map((e) => e.id)
    expect(ids).not.toContain('ex-orfao')
    expect(ids).toContain(mine)
    expect(ids).toContain('ex-supino-reto-com-barra')
  })

  it('valida séries, reps e descanso', () => {
    const cur = { repMin: 8, repMax: 12 } as PlanExercise
    expect(edit.sanitizeItemPatch(cur, { setsPhase1: 0, setsPhase2: 99, restSeconds: -5 })).toMatchObject({ setsPhase1: 1, setsPhase2: 10, restSeconds: 0 })
    expect(edit.sanitizeItemPatch(cur, { repMin: 15 })).toMatchObject({ repMin: 15, repMax: 15 })
    expect(edit.sanitizeItemPatch(cur, { repMax: 5 })).toMatchObject({ repMin: 5, repMax: 5 })
    expect(edit.sanitizeItemPatch(cur, { note: '   ' }).note).toBeUndefined()
  })
})

describe('plano recebido por link', () => {
  it('troca o plano, arquiva os dias antigos e traz exercícios criados por quem mandou', async () => {
    // quem manda: plano com um exercício criado por ela
    const day = await firstDay()
    const exId = await edit.createExercise({ name: 'Remada cavalinho', muscleGroup: 'costas', equipment: 'Barra', isCompound: true })
    await edit.addPlanExercise(day.id, exId)
    await repo.updateProfile({ schedule: 'rotation' })
    const shared = await edit.getSharedPlan()

    // quem recebe: outro aparelho, outro modelo, com histórico
    const other = new FitDB(`plan-recebe-${n}`)
    repo.setDatabase(other)
    await repo.setupNewUser({ templateId: 'corpo-inteiro-3x' })
    const [oldDay] = await repo.getPlanDays()
    const count = await edit.importSharedPlan(shared)

    const days = await repo.getPlanDays()
    expect(days.map((d) => d.name)).toEqual(shared.days.map((d) => d.name))
    expect(count).toBe(shared.days.reduce((a, d) => a + d.items.length, 0))
    expect((await repo.getAllPlanDays()).find((d) => d.id === oldDay.id)?.archived).toBe(true)
    expect((await repo.getExercises()).some((e) => e.name === 'Remada cavalinho' && e.custom)).toBe(true)
    expect((await repo.getProfile()).schedule).toBe('rotation')
    expect((await repo.getProfile()).planCustomized).toBe(true)
    await other.delete()
    repo.setDatabase(db)
  })
})

describe('planilha x plano editado', () => {
  it('plano editado não é sobrescrito por versão nova da planilha', async () => {
    const day = await firstDay()
    await edit.updatePlanDay(day.id, { name: 'Meu treino' })
    await db.profile.update('me', { seedVersion: 1 }) // simula planilha mais nova
    await repo.ensureSeeded()
    expect((await repo.getPlanDays()).find((d) => d.id === day.id)?.name).toBe('Meu treino')
  })

  it('restaurar volta à planilha sem apagar treinos', async () => {
    const day = await firstDay()
    const original = day.name
    const sid = await repo.startSession(day.id)
    const [item] = await repo.getPlanItems(day.id)
    await repo.logSet({ sessionId: sid, exerciseId: item.exerciseId, setNumber: 1, weightKg: 40, reps: 10, isWarmup: false })
    await repo.finishSession(sid)
    const extra = await edit.addPlanDay('Extra')
    await edit.updatePlanDay(day.id, { name: 'Mudado' })
    await edit.removePlanExercise(item.id)

    await edit.resetPlanToTemplate()
    const days = await repo.getPlanDays()
    expect(days.find((d) => d.id === day.id)?.name).toBe(original)
    expect(days.some((d) => d.id === extra)).toBe(false)
    expect((await repo.getPlanItems(day.id)).some((i) => i.id === item.id)).toBe(true)
    expect(await repo.getFinishedSessions()).toHaveLength(1)
    expect((await repo.getProfile()).planCustomized).toBe(false)
  })
})
