import { describe, expect, it } from 'vitest'
import { XP, attributesFrom, computeGame, levelFromXp, questsFor, rankForLevel, rewardForSession, xpForLevel, type GameInput } from './game'
import type { SetLog, WorkoutSession } from './types'

const sess = (id: string, date: string, planDayId = 'd1'): WorkoutSession => ({
  id,
  planDayId,
  date,
  startedAt: `${date}T18:00:00.000Z`,
  finishedAt: `${date}T19:00:00.000Z`,
})
let n = 0
const set = (sessionId: string, exerciseId: string, weightKg: number, reps: number, isWarmup = false): SetLog => ({
  id: `s${++n}`,
  sessionId,
  exerciseId,
  setNumber: 1,
  weightKg,
  reps,
  isWarmup,
  loggedAt: '',
})

const base = (over: Partial<GameInput> = {}): GameInput => ({
  sessions: [],
  sets: [],
  plan: [{ planDayId: 'd1', setsPhase1: 2, setsPhase2: 3 }],
  plannedDaysPerWeek: 2,
  planStartDate: '2026-10-05',
  measurementDates: [],
  ...over,
})

describe('curva de níveis', () => {
  it('é crescente e consistente com levelFromXp', () => {
    expect(xpForLevel(1)).toBe(0)
    for (let l = 1; l < 60; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l))
      expect(levelFromXp(xpForLevel(l))).toBe(l)
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l)
    }
  })
  it('patentes por nível', () => {
    expect(rankForLevel(1).title).toBe('Aprendiz')
    expect(rankForLevel(5).tier).toBe(1)
    expect(rankForLevel(19).tier).toBe(2)
    expect(rankForLevel(20).tier).toBe(3)
    expect(rankForLevel(80).tier).toBe(4)
  })
})

describe('XP', () => {
  it('sem histórico = nível 1 com 0 XP', () => {
    const g = computeGame(base())
    expect(g.totalXp).toBe(0)
    expect(g.level).toBe(1)
    expect(g.rank.tier).toBe(0)
  })

  it('treino completo: base + séries + completo + conquista', () => {
    const g = computeGame(
      base({ sessions: [sess('a', '2026-10-06')], sets: [set('a', 'sup', 60, 10), set('a', 'sup', 60, 9), set('a', 'sup', 20, 10, true)] }),
    )
    // aquecimento não conta
    expect(g.stats.totalSets).toBe(2)
    expect(g.events.filter((e) => e.kind !== 'achievement').map((e) => e.xp)).toEqual([XP.workout, 2 * XP.perSet, XP.fullWorkout])
    expect(g.unlocked.map((u) => u.def.id)).toEqual(['primeira-faisca'])
    expect(g.totalXp).toBe(XP.workout + 2 * XP.perSet + XP.fullWorkout + 50)
  })

  it('recorde e carga subindo só contam a partir do 2º treino do exercício', () => {
    const g = computeGame(
      base({
        sessions: [sess('a', '2026-10-06'), sess('b', '2026-10-13')],
        sets: [set('a', 'sup', 60, 8), set('b', 'sup', 62.5, 8)],
      }),
    )
    expect(g.events.filter((e) => e.sessionId === 'a' && (e.kind === 'pr' || e.kind === 'loadUp'))).toHaveLength(0)
    expect(g.events.find((e) => e.sessionId === 'b' && e.kind === 'pr')?.xp).toBe(XP.pr)
    expect(g.events.find((e) => e.sessionId === 'b' && e.kind === 'loadUp')?.xp).toBe(XP.loadUp)
    expect(g.stats.prs).toBe(1)
  })

  it('peso do corpo e prancha batem recorde por repetições/segundos; carga e peso do corpo não se misturam', () => {
    const g = computeGame(
      base({
        sessions: [sess('a', '2026-10-06'), sess('b', '2026-10-13'), sess('c', '2026-10-20')],
        sets: [
          set('a', 'barra', 0, 8),
          set('a', 'prancha', 0, 40),
          set('b', 'barra', 0, 10), // recorde: mais repetições
          set('b', 'prancha', 0, 45), // recorde: mais segundos
          set('c', 'barra', 10, 5), // primeira vez com colete: ainda não é recorde
        ],
      }),
    )
    expect(g.events.find((e) => e.sessionId === 'b' && e.kind === 'pr')?.xp).toBe(2 * XP.pr)
    expect(g.events.some((e) => e.sessionId === 'c' && e.kind === 'pr')).toBe(false)
    expect(g.stats.prs).toBe(2)
  })

  it('semana completa e sequência de semanas', () => {
    const g = computeGame(
      base({
        sessions: [sess('a', '2026-10-06'), sess('b', '2026-10-07'), sess('c', '2026-10-13'), sess('d', '2026-10-27')],
        sets: [],
      }),
    )
    expect(g.events.filter((e) => e.kind === 'fullWeek')).toHaveLength(1)
    expect(g.stats.bestStreakWeeks).toBe(2) // 05/10 e 12/10; 26/10 quebra a sequência
    expect(g.stats.currentStreakWeeks).toBe(1)
  })

  it('medições: 1 XP por dia, não por registro', () => {
    const g = computeGame(base({ measurementDates: ['2026-10-03', '2026-10-03', '2026-10-10'] }))
    expect(g.stats.measurementDays).toBe(2)
    expect(g.totalXp).toBe(2 * XP.measurement)
  })

  it('treino na semana 4 do plano libera "Fim da readaptação"', () => {
    const g = computeGame(base({ sessions: [sess('a', '2026-10-27')] }))
    expect(g.unlocked.some((u) => u.def.id === 'fim-da-readaptacao')).toBe(true)
  })
})

describe('atributos', () => {
  it('começam baixos, sobem com retorno decrescente e respeitam o teto 99', () => {
    const zero = attributesFrom({ workouts: 0, totalVolume: 0, prs: 0, currentStreakWeeks: 0, bestStreakWeeks: 0, fullWeeks: 0, measurementDays: 0, reachedPhase2: false, totalSets: 0 })
    expect(zero).toEqual({ forca: 5, vigor: 5, constancia: 5, disciplina: 5 })
    const mid = attributesFrom({ workouts: 40, totalVolume: 150_000, prs: 25, currentStreakWeeks: 8, bestStreakWeeks: 8, fullWeeks: 6, measurementDays: 12, reachedPhase2: true, totalSets: 600 })
    expect(mid.forca).toBe(50)
    expect(Object.values(mid).every((v) => v > 5 && v < 99)).toBe(true)
    const huge = attributesFrom({ workouts: 999, totalVolume: 9e6, prs: 999, currentStreakWeeks: 200, bestStreakWeeks: 200, fullWeeks: 200, measurementDays: 999, reachedPhase2: true, totalSets: 1e5 })
    expect(Object.values(huge).every((v) => v === 99)).toBe(true)
  })
})

describe('retrato do plano na sessão', () => {
  it('"Treino completo" usa as séries planejadas gravadas, não o plano atual', () => {
    const s = { ...sess('a', '2026-10-06'), plannedSets: 2 }
    const sets = [set('a', 'x', 50, 10), set('a', 'x', 50, 10)]
    // plano atual pede 10 séries, mas no dia do treino eram 2
    const g = computeGame(base({ sessions: [s], sets, plan: [{ planDayId: 'd1', setsPhase1: 10, setsPhase2: 10 }] }))
    expect(g.events.some((e) => e.kind === 'fullWorkout')).toBe(true)
  })

  it('"Semana completa" usa os dias/semana gravados', () => {
    const sessions = [
      { ...sess('a', '2026-10-06'), plannedDaysPerWeek: 2 },
      { ...sess('b', '2026-10-07'), plannedDaysPerWeek: 2 },
    ]
    // hoje o plano tem 5 dias, mas naquela semana eram 2
    const g = computeGame(base({ sessions, plannedDaysPerWeek: 5 }))
    expect(g.events.filter((e) => e.kind === 'fullWeek')).toHaveLength(1)
  })

  it('sem retrato (sessão antiga), cai no plano atual', () => {
    const g = computeGame(base({ sessions: [sess('a', '2026-10-06')], sets: [set('a', 'x', 50, 10)] }))
    expect(g.events.some((e) => e.kind === 'fullWorkout')).toBe(false) // plano pede 2, fez 1
  })
})

describe('recompensa de um treino', () => {
  it('mostra só o XP daquele treino e detecta subida de nível', () => {
    const sessions = [sess('a', '2026-10-06'), sess('b', '2026-10-07')]
    const sets = [set('a', 'x', 50, 10), set('b', 'x', 55, 10), set('b', 'x', 55, 10)]
    const r = rewardForSession(base({ sessions, sets }), 'b')
    expect(r.xp).toBe(r.after.totalXp - r.before.totalXp)
    expect(r.sessionEvents.every((e) => e.sessionId === 'b')).toBe(true)
    expect(r.sessionEvents.some((e) => e.kind === 'fullWeek')).toBe(true)
    expect(r.leveledUp).toBe(r.after.level > r.before.level)
    expect(r.newAchievements.map((a) => a.def.id)).toContain('semana-de-aco')
  })
})

describe('missões', () => {
  it('missão do dia só aparece em dia de treino', () => {
    const tue = questsFor(base(), '2026-10-06', [2, 3])
    expect(tue.map((q) => q.id)).toEqual(['today', 'week', 'measure'])
    const sun = questsFor(base(), '2026-10-04', [2, 3])
    expect(sun.map((q) => q.id)).toEqual(['week', 'measure'])
  })
  it('em sequência, a missão do dia aparece até fechar a semana', () => {
    const two = [sess('a', '2026-10-06'), sess('b', '2026-10-07')]
    expect(questsFor(base(), '2026-10-04', [], true).map((q) => q.id)).toContain('today') // domingo também vale
    expect(questsFor(base({ sessions: two }), '2026-10-09', [], true).map((q) => q.id)).not.toContain('today') // 2 de 2
    expect(questsFor(base({ sessions: two }), '2026-10-07', [], true).find((q) => q.id === 'today')?.done).toBe(true)
  })

  it('progresso semanal', () => {
    const q = questsFor(base({ sessions: [sess('a', '2026-10-06')] }), '2026-10-08', [2, 3]).find((x) => x.id === 'week')!
    expect(q.progress).toEqual([1, 2])
    expect(q.done).toBe(false)
  })
})
