import { describe, expect, it } from 'vitest'
import { buildWorkout, isAbandoned, lastActivityAt } from './session'
import type { Exercise } from './types'

describe('lista do treino de hoje', () => {
  const ex = (id: string, name: string, isCompound = false): Exercise => ({ id, name, muscleGroup: 'peito', equipment: 'Máquina', isCompound })
  const exercises = new Map(
    [ex('sup', 'Supino', true), ex('inc', 'Supino inclinado', true), ex('cru', 'Crucifixo'), ex('pra', 'Prancha')].map((e) => [e.id, e]),
  )
  exercises.get('inc')!.setupNote = 'banco no furo 4'
  const item = (id: string, exerciseId: string, extra = {}) => ({
    id,
    planDayId: 'd',
    exerciseId,
    order: 1,
    setsPhase1: 2,
    setsPhase2: 4,
    repMin: 6,
    repMax: 10,
    restSeconds: 150,
    exerciseName: exercises.get(exerciseId)!.name,
    muscleGroup: 'peito',
    equipment: 'Barra',
    ...extra,
  })
  const plan = [item('p1', 'sup'), item('p2', 'pra', { targetUnit: 'seconds' as const })]

  it('sem trocas: o plano como está', () => {
    const w = buildWorkout(plan, {}, exercises)
    expect(w.map((i) => [i.exerciseId, i.origin])).toEqual([
      ['sup', 'plan'],
      ['pra', 'plan'],
    ])
    expect(w[1].targetUnit).toBe('seconds')
  })

  it('troca só hoje mantém séries, reps e descanso do plano e traz a anotação do exercício', () => {
    const [swapped] = buildWorkout(plan, { swaps: { p1: 'inc' } }, exercises)
    expect(swapped).toMatchObject({ exerciseId: 'inc', origin: 'swap', replaces: 'Supino', setsPhase2: 4, restSeconds: 150, setupNote: 'banco no furo 4' })
  })

  it('acrescentados e exercícios com séries que saíram da lista vão no fim, sem repetir', () => {
    const w = buildWorkout(plan, { swaps: { p1: 'inc' }, extraExercises: ['cru', 'inc'] }, exercises, ['sup', 'cru'])
    expect(w.map((i) => [i.exerciseId, i.origin])).toEqual([
      ['inc', 'swap'],
      ['pra', 'plan'],
      ['cru', 'extra'],
      ['sup', 'extra'], // tinha séries antes da troca
    ])
    expect(w[2]).toMatchObject({ setsPhase2: 3, repMin: 8, repMax: 12, restSeconds: 60 })
    expect(w[3].restSeconds).toBe(120) // composto
  })
})

const at = (h: number, min = 0) => new Date(2026, 9, 7, h, min)
const iso = (d: Date) => d.toISOString()

describe('treino esquecido aberto', () => {
  const session = { date: '2026-10-07', startedAt: iso(at(7)) }

  it('treino em andamento hoje, com série recente, não está esquecido', () => {
    expect(isAbandoned(session, [{ loggedAt: iso(at(7, 40)) }], at(8))).toBe(false)
  })

  it('parado há mais de 3 h desde a última série', () => {
    const sets = [{ loggedAt: iso(at(7, 40)) }]
    expect(lastActivityAt(session, sets)).toBe(iso(at(7, 40)))
    expect(isAbandoned(session, sets, at(10, 30))).toBe(false)
    expect(isAbandoned(session, sets, at(10, 41))).toBe(true)
  })

  it('começou em outro dia', () => {
    expect(isAbandoned({ date: '2026-10-06', startedAt: iso(new Date(2026, 9, 6, 23)) }, [], new Date(2026, 9, 7, 0, 30))).toBe(true)
  })

  it('treino concluído nunca está esquecido', () => {
    expect(isAbandoned({ ...session, finishedAt: iso(at(8)) }, [], at(23))).toBe(false)
  })
})
