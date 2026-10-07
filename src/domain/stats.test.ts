import { describe, expect, it } from 'vitest'
import { adherence, exerciseProgress, muscleVolumeForWeek, personalRecords, weekStreak, weeklyVolume } from './stats'
import type { Exercise, SetLog, WorkoutSession } from './types'

const sess = (id: string, date: string): WorkoutSession => ({
  id,
  planDayId: 'd',
  date,
  startedAt: `${date}T18:00:00.000Z`,
  finishedAt: `${date}T19:00:00.000Z`,
})
const set = (sessionId: string, exerciseId: string, weightKg: number, reps: number, isWarmup = false): SetLog => ({
  id: `${sessionId}-${exerciseId}-${weightKg}-${reps}`,
  sessionId,
  exerciseId,
  setNumber: 1,
  weightKg,
  reps,
  isWarmup,
  loggedAt: '',
})

const sessions = [sess('a', '2026-09-15'), sess('b', '2026-09-17'), sess('c', '2026-09-22')]
const sets = [
  set('a', 'supino', 60, 10),
  set('a', 'supino', 40, 10, true),
  set('b', 'agacho', 80, 8),
  set('c', 'supino', 65, 8),
  set('c', 'supino', 70, 3),
]

describe('estatísticas', () => {
  it('volume semanal agrupa por segunda-feira e ignora aquecimento', () => {
    expect(weeklyVolume(sessions, sets)).toEqual([
      { week: '2026-09-14', volume: 600 + 640 },
      { week: '2026-09-21', volume: 520 + 210 },
    ])
  })

  it('volume por grupo muscular', () => {
    const exercises: Exercise[] = [
      { id: 'supino', name: 'Supino', muscleGroup: 'peito', equipment: '', isCompound: true },
      { id: 'agacho', name: 'Agachamento', muscleGroup: 'quadriceps', equipment: '', isCompound: true },
    ]
    expect(muscleVolumeForWeek('2026-09-14', sessions, sets, exercises)).toEqual([
      { group: 'quadriceps', volume: 640, sets: 1 },
      { group: 'peito', volume: 600, sets: 1 },
    ])
  })

  it('progressão por exercício usa a melhor série da sessão', () => {
    const p = exerciseProgress('supino', sessions, sets)
    expect(p.map((x) => x.date)).toEqual(['2026-09-15', '2026-09-22'])
    expect(p[1].topWeight).toBe(70)
    expect(p[1].kind).toBe('load')
    expect(p[1].value).toBeCloseTo(82.3, 1) // 65×8 > 70×3
  })

  it('recordes pessoais', () => {
    const pr = personalRecords(sessions, sets).find((r) => r.exerciseId === 'supino')!
    expect(pr.kind).toBe('load')
    expect(pr.bestWeight).toBe(70)
    expect(pr.bestSet).toEqual({ weightKg: 65, reps: 8, date: '2026-09-22' })
  })

  it('peso do corpo: progresso e recorde em repetições', () => {
    const bw = [set('a', 'barra', 0, 8), set('b', 'barra', 0, 11), set('c', 'barra', 0, 10)]
    expect(exerciseProgress('barra', sessions, bw).map((p) => [p.kind, p.value])).toEqual([
      ['reps', 8],
      ['reps', 11],
      ['reps', 10],
    ])
    const pr = personalRecords(sessions, bw)[0]
    expect([pr.kind, pr.best, pr.bestSet.date]).toEqual(['reps', 11, '2026-09-17'])
  })

  it('sequência de semanas', () => {
    expect(weekStreak(sessions, '2026-09-24').current).toBe(2)
    expect(weekStreak(sessions, '2026-09-30').current).toBe(2) // semana atual vazia ainda conta a anterior
    expect(weekStreak(sessions, '2026-10-08').current).toBe(0) // sem brasa guardada, a semana vazia quebra
  })

  it('brasa guardada: a cada 4 semanas seguidas, uma semana vazia não quebra a sequência', () => {
    // 4 semanas seguidas (07/09 a 28/09), pula 05/10, volta em 12/10
    const four = ['2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'].map((d, i) => sess(`w${i}`, d))
    expect(weekStreak(four, '2026-09-30')).toMatchObject({ current: 4, embers: 1 })
    // semana de 05/10 terminou vazia: gasta a brasa, sequência fica
    expect(weekStreak(four, '2026-10-13')).toMatchObject({ current: 4, embers: 0 })
    const back = [...four, sess('w5', '2026-10-13')]
    expect(weekStreak(back, '2026-10-13')).toMatchObject({ current: 5, best: 5, embers: 0, saved: 1 })
    // duas semanas vazias com uma brasa só: recomeça
    const gap2 = [...four, sess('w6', '2026-10-20')]
    expect(weekStreak(gap2, '2026-10-20')).toMatchObject({ current: 1, best: 4 })
  })

  it('aderência', () => {
    // 3 treinos em 4 semanas × 5 planejados
    expect(adherence(sessions, 5, '2026-09-24', 4)).toBeCloseTo(3 / 20)
  })
})
