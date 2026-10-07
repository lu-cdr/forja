import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FitDB } from './db'
import * as repo from './repo'
import { exportAll, importAll, markExported, parseBackup, preImportSnapshotDate, undoImport } from './backup'
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

  it('guarda idade, experiência, rotina, aparência; sem readaptação o treino já pede o volume cheio', async () => {
    const other = new FitDB(`test-perfil-${n}`)
    repo.setDatabase(other)
    await repo.setupNewUser({
      templateId: 'superior-inferior-4x',
      birthYear: 1996,
      trainingLevel: 'avancado',
      activityLevel: 'ativo',
      rampUpWeeks: 0,
      smith: { skin: 'orc', hair: 'careca', beard: 'ruivo' },
    })
    const p = await repo.getProfile()
    expect(p).toMatchObject({ birthYear: 1996, trainingLevel: 'avancado', activityLevel: 'ativo', rampUpWeeks: 0, smith: { skin: 'orc' } })
    expect(p.planStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/) // hoje
    const [day] = await repo.getPlanDays()
    const items = await repo.getPlanItems(day.id)
    await repo.startSession(day.id)
    const s = (await repo.getActiveSession())!
    expect(s.plannedSets).toBe(items.reduce((a, i) => a + i.setsPhase2, 0))
    await other.delete()
    repo.setDatabase(db)
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

  it('treino esquecido aberto é concluído com o horário da última série', async () => {
    const [day] = await repo.getPlanDays()
    const [item] = await repo.getPlanItems(day.id)
    const id = await repo.startSession(day.id, new Date('2026-10-06T10:00:00.000Z'))
    await repo.logSet({ sessionId: id, exerciseId: item.exerciseId, setNumber: 1, weightKg: 40, reps: 10, isWarmup: false })
    await db.sets.toCollection().modify({ loggedAt: '2026-10-06T10:20:00.000Z' })

    expect(await repo.finishAbandonedSession(id)).toBe(true)
    const s = await repo.getSession(id)
    expect(s?.finishedAt).toBe('2026-10-06T10:20:00.000Z')
    expect(s?.date).toBe('2026-10-06')
    expect(await repo.getActiveSession()).toBeUndefined()

    // sem séries: não vai para o histórico
    const empty = await repo.startSession(day.id)
    expect(await repo.finishAbandonedSession(empty)).toBe(false)
    expect(await repo.getSession(empty)).toBeUndefined()
  })

  it('troca e acréscimo só no treino de hoje, sem mexer no plano', async () => {
    const [day] = await repo.getPlanDays()
    const items = await repo.getPlanItems(day.id)
    const id = await repo.startSession(day.id)
    const other = (await repo.getExercises()).find((e) => !items.some((i) => i.exerciseId === e.id))!

    await repo.swapSessionExercise(id, items[0].id, other.id)
    expect((await repo.getSession(id))?.swaps).toEqual({ [items[0].id]: other.id })
    expect((await repo.getPlanItems(day.id))[0].exerciseId).toBe(items[0].exerciseId) // plano intacto
    // não dá para ter o mesmo exercício duas vezes
    await expect(repo.addSessionExercise(id, other.id)).rejects.toThrow(/já está/)
    await expect(repo.swapSessionExercise(id, items[1].id, other.id)).rejects.toThrow(/já está/)
    await repo.swapSessionExercise(id, items[0].id) // desfaz
    expect((await repo.getSession(id))?.swaps).toBeUndefined()

    await repo.addSessionExercise(id, other.id)
    expect((await repo.getSession(id))?.extraExercises).toEqual([other.id])
    await repo.logSet({ sessionId: id, exerciseId: other.id, setNumber: 1, weightKg: 0, reps: 12, isWarmup: false })
    await expect(repo.removeSessionExercise(id, other.id)).rejects.toThrow(/séries/)
    await db.sets.where('sessionId').equals(id).delete()
    await repo.removeSessionExercise(id, other.id)
    expect((await repo.getSession(id))?.extraExercises).toBeUndefined()
  })

  it('anotação do exercício fica salva e some quando apagada', async () => {
    const [ex] = await repo.getExercises()
    await repo.setExerciseNote(ex.id, '  banco no furo 4 ')
    expect((await db.exercises.get(ex.id))?.setupNote).toBe('banco no furo 4')
    await repo.setExerciseNote(ex.id, '')
    expect((await db.exercises.get(ex.id))?.setupNote).toBeUndefined()
    // a planilha nova não apaga a anotação
    await db.profile.update('me', { seedVersion: 1 })
    await repo.ensureSeeded()
    await repo.setExerciseNote(ex.id, 'polia na 7')
    await repo.ensureSeeded()
    expect((await db.exercises.get(ex.id))?.setupNote).toBe('polia na 7')
  })

  it('em sequência, o treino grava a meta de treinos por semana', async () => {
    await repo.updateProfile({ schedule: 'rotation', rotationDaysPerWeek: 4 })
    const [day] = await repo.getPlanDays()
    const id = await repo.startSession(day.id)
    expect((await repo.getSession(id))?.plannedDaysPerWeek).toBe(4)
  })

  it('catálogo ganha exercícios de peso do corpo', async () => {
    const names = (await repo.getExercises()).map((e) => e.name)
    expect(names).toEqual(expect.arrayContaining(['Barra fixa', 'Flexão de braço', 'Mergulho nas paralelas', 'Elevação de pernas']))
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
      const sortById = (a: unknown[]) => [...a].sort((x, y) => String((x as { id: string }).id).localeCompare((y as { id: string }).id))
      expect(sortById(after.data[t])).toEqual(sortById(before.data[t]))
    }
    expect(after.data.sessions.length).toBeGreaterThan(0)
    await other.delete()
  })

  it('fotos vão no backup e voltam iguais; backup v1 (sem fotos) continua importando', async () => {
    const bytes = new Uint8Array([255, 216, 255, 224, 1, 2, 3, 4, 5, 250])
    await repo.addPhoto({ date: '2026-10-07', angle: 'frente', blob: new Blob([bytes], { type: 'image/jpeg' }), width: 10, height: 20 })
    const json = JSON.stringify(await exportAll())
    const parsed = parseBackup(json)
    expect(parsed.version).toBe(2)
    expect((parsed.data.photos[0] as { data: string }).data).toMatch(/^data:image\/jpeg;base64,/)

    const other = new FitDB(`test-fotos-${n}`)
    repo.setDatabase(other)
    await importAll(parsed)
    const [photo] = await repo.getPhotos()
    expect(photo).toMatchObject({ date: '2026-10-07', angle: 'frente', width: 10, height: 20 })
    expect(new Uint8Array(await photo.blob.arrayBuffer())).toEqual(bytes)

    // backup antigo, sem a tabela de fotos
    const v1 = JSON.parse(json)
    v1.version = 1
    delete v1.data.photos
    await importAll(parseBackup(JSON.stringify(v1)))
    expect(await repo.getPhotos()).toEqual([])
    expect(await repo.hasProfile()).toBe(true)
    await other.delete()
    repo.setDatabase(db)
  })

  it('rejeita arquivos inválidos', () => {
    expect(() => parseBackup('não é json')).toThrow()
    expect(() => parseBackup('{"foo":1}')).toThrow(/backup/)
  })

  it('rejeita backup com registro estragado, dizendo qual', async () => {
    await loadSampleData(1)
    const ok = await exportAll()
    const broken = structuredClone(ok)
    ;(broken.data.sets[2] as { reps: unknown }).reps = 'dez'
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/sets nº 3/)
    const dup = structuredClone(ok)
    dup.data.sessions.push(dup.data.sessions[0])
    expect(() => parseBackup(JSON.stringify(dup))).toThrow(/sessions/)
    expect(() => parseBackup(JSON.stringify(ok))).not.toThrow()
  })

  it('exportar não zera o lembrete; só markExported (arquivo salvo de verdade)', async () => {
    await exportAll()
    expect((await repo.getProfile()).lastExportAt).toBeUndefined()
    await markExported('2026-10-07T10:00:00.000Z')
    expect((await repo.getProfile()).lastExportAt).toBe('2026-10-07T10:00:00.000Z')
  })

  it('importar o arquivo errado pode ser desfeito', async () => {
    await loadSampleData(2)
    const mine = await exportAll()
    // backup de outra pessoa: só a pesagem inicial
    const other = new FitDB(`test-outro-${n}`)
    repo.setDatabase(other)
    await repo.setupNewUser({ templateId: 'corpo-inteiro-3x', weightKg: 70 })
    const theirs = await exportAll()
    await other.delete()
    repo.setDatabase(db)

    await importAll(parseBackup(JSON.stringify(theirs)))
    expect(await repo.getFinishedSessions()).toHaveLength(0)
    expect(await preImportSnapshotDate()).toBeDefined()

    expect(await undoImport()).toBe(true)
    expect((await repo.getFinishedSessions()).length).toBe(mine.data.sessions.length)
    expect(await preImportSnapshotDate()).toBeUndefined()
    expect(await undoImport()).toBe(false)
  })
})
