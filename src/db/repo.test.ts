import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FitDB } from './db'
import * as repo from './repo'
import { exportAll, importAll, parseBackup } from './backup'
import { loadSampleData } from './sample'

let db: FitDB
let n = 0

beforeEach(async () => {
  db = new FitDB(`test-${++n}`)
  repo.setDatabase(db)
  await repo.ensureSeeded()
  await repo.setupNewUser({ templateId: 'hipertrofia-5x', planStartDate: '2026-10-03', heightCm: 175, weightKg: 80 })
})

afterEach(async () => {
  await db.delete()
})

describe('primeira abertura', () => {
  it('pessoa nova: ensureSeeded não cria nada até a tela de boas-vindas', async () => {
    const other = new FitDB(`test-novo-${n}`)
    repo.setDatabase(other)
    await repo.ensureSeeded()
    expect(await repo.hasProfile()).toBe(false)
    expect(await repo.getPlanDays()).toEqual([])
    expect(await other.measurements.count()).toBe(0)
    await other.delete()
    repo.setDatabase(db)
  })

  it('setupNewUser cria perfil, plano do modelo e a primeira pesagem', async () => {
    expect(await repo.hasProfile()).toBe(true)
    const p = await repo.getProfile()
    expect(p).toMatchObject({ heightCm: 175, startWeightKg: 80, planStartDate: '2026-10-03', planTemplate: 'hipertrofia-5x' })
    expect(p.onboardedAt).toBeDefined()
    const days = await repo.getPlanDays()
    expect(days.map((d) => d.weekday)).toEqual([2, 3, 4, 5, 6])
    expect(days.map((d) => d.name)).toContain('Costas + bíceps')
    expect(await repo.getMeasurements()).toEqual([expect.objectContaining({ weightKg: 80 })])
    // prancha é meta por tempo; afundo é "por perna"
    const items = (await Promise.all(days.map((d) => repo.getPlanItems(d.id)))).flat()
    expect(items.find((i) => i.exerciseName === 'Prancha')?.targetUnit).toBe('seconds')
    expect(items.find((i) => i.exerciseName.startsWith('Afundo'))?.note).toBe('por perna')
  })

  it('cada modelo cria dias válidos; "do zero" começa vazio mas com catálogo', async () => {
    for (const [id, weekdays] of [
      ['superior-inferior-4x', [1, 2, 4, 5]],
      ['empurrar-puxar-pernas-3x', [1, 3, 5]],
      ['corpo-inteiro-3x', [1, 3, 5]],
      ['do-zero', []],
    ] as const) {
      await repo.applyTemplate(id)
      const days = await repo.getPlanDays()
      expect(days.map((d) => d.weekday)).toEqual(weekdays)
      for (const d of days) expect((await repo.getPlanItems(d.id)).every((i) => i.exerciseName !== '?')).toBe(true)
      expect((await repo.getProfile()).planTemplate).toBe(id)
    }
    expect(await db.exercises.count()).toBeGreaterThanOrEqual(28)
  })
})

describe('quem já usava (instalação antiga)', () => {
  it('perfil sem modelo é tratado como planilha e recebe a versão nova, sem tocar em treinos e perfil', async () => {
    // simula banco antigo: plano provisório, treino feito com exercício antigo, sem planTemplate
    await db.planDays.clear()
    await db.planExercises.clear()
    await db.planDays.add({ id: 'day-2', weekday: 2, name: 'Peito + Tríceps' })
    await db.exercises.add({ id: 'ex-old', name: 'Exercício antigo', muscleGroup: 'peito', equipment: '', isCompound: true })
    await db.profile.put({ id: 'me', planStartDate: '2026-09-01', heightCm: 180, seedVersion: 1 })
    const sid = await repo.startSession('day-2')
    await repo.logSet({ sessionId: sid, exerciseId: 'ex-old', setNumber: 1, weightKg: 50, reps: 10, isWarmup: false })
    await repo.finishSession(sid)

    await repo.ensureSeeded()

    expect((await repo.getPlanDays()).find((d) => d.weekday === 2)?.name).toBe('Costas + bíceps')
    expect(await db.exercises.get('ex-old')).toBeDefined()
    expect(await repo.getFinishedSessions()).toHaveLength(1)
    const p = await repo.getProfile()
    expect(p).toMatchObject({ heightCm: 180, planStartDate: '2026-09-01', planTemplate: 'hipertrofia-5x' })
    expect(p.seedVersion).toBeGreaterThanOrEqual(2)
    await repo.ensureSeeded() // idempotente
    expect((await repo.getPlanDays()).length).toBe(5)
  })

  it('quem escolheu outro modelo nunca recebe a planilha', async () => {
    await repo.applyTemplate('corpo-inteiro-3x')
    await db.profile.update('me', { seedVersion: undefined })
    await repo.ensureSeeded()
    expect((await repo.getPlanDays()).map((d) => d.name)).toEqual(['Corpo inteiro A', 'Corpo inteiro B', 'Corpo inteiro C'])
  })
})
describe('sessão de treino', () => {
  it('registra séries, finaliza e pré-preenche a partir da última sessão', async () => {
    const [day] = await repo.getPlanDays()
    const [item] = await repo.getPlanItems(day.id)

    const s1 = await repo.startSession(day.id)
    expect(await repo.startSession(day.id)).toBe(s1) // não duplica sessão ativa
    await repo.logSet({ sessionId: s1, exerciseId: item.exerciseId, setNumber: 1, weightKg: 60, reps: 10, isWarmup: false })
    await repo.logSet({ sessionId: s1, exerciseId: item.exerciseId, setNumber: 2, weightKg: 62.5, reps: 8, isWarmup: false })
    await repo.finishSession(s1, '  bom treino ')

    expect(await repo.getActiveSession()).toBeUndefined()
    const finished = await repo.getFinishedSessions()
    expect(finished).toHaveLength(1)
    expect(finished[0].notes).toBe('bom treino')

    const s2 = await repo.startSession(day.id)
    const last = await repo.getLastSetsForExercise(item.exerciseId, s2)
    expect(last.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 10],
      [62.5, 8],
    ])
  })

  it('sessão sem séries é descartada ao finalizar', async () => {
    const [day] = await repo.getPlanDays()
    const id = await repo.startSession(day.id)
    await repo.finishSession(id)
    expect(await repo.getFinishedSessions()).toHaveLength(0)
    expect(await repo.getActiveSession()).toBeUndefined()
  })
})

describe('backup', () => {
  it('ciclo exportar → importar preserva todos os dados', async () => {
    await loadSampleData(3)
    await repo.saveMeasurement({ date: '2026-01-01', weightKg: 80, notes: 'manual' })
    const before = await exportAll()
    const json = JSON.stringify(before)

    // banco novo, vazio
    const other = new FitDB(`test-import-${n}`)
    repo.setDatabase(other)
    await importAll(parseBackup(json))
    const after = await exportAll()

    for (const t of Object.keys(before.data) as (keyof typeof before.data)[]) {
      if (t === 'profile') continue // lastExportAt muda a cada export
      const sortById = (a: unknown[]) => [...a].sort((x, y) => String((x as { id: string }).id).localeCompare((y as { id: string }).id))
      expect(sortById(after.data[t])).toEqual(sortById(before.data[t]))
    }
    expect(after.data.sessions.length).toBeGreaterThan(0)
    await other.delete()
  })

  it('rejeita arquivos inválidos', () => {
    expect(() => parseBackup('não é json')).toThrow()
    expect(() => parseBackup('{"foo":1}')).toThrow(/backup/)
  })
})
