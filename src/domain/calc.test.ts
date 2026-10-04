import { describe, expect, it } from 'vitest'
import {
  bestSet,
  bmi,
  deltas,
  epley1RM,
  leanMassKg,
  movingAverageByDays,
  setVolume,
  shouldIncreaseLoad,
  totalVolume,
} from './calc'
import { planPhase, planWeek, startOfWeek } from './dates'
import { describeTarget, formatTarget } from './plan'

describe('volume', () => {
  it('multiplica carga por reps', () => {
    expect(setVolume({ weightKg: 80, reps: 10 })).toBe(800)
  })
  it('ignora aquecimento no total', () => {
    expect(
      totalVolume([
        { weightKg: 40, reps: 10, isWarmup: true },
        { weightKg: 80, reps: 8, isWarmup: false },
        { weightKg: 80, reps: 7, isWarmup: false },
      ]),
    ).toBe(1200)
  })
})

describe('1RM (Epley)', () => {
  it('1 rep = a própria carga', () => expect(epley1RM(100, 1)).toBe(100))
  it('100 kg × 10 ≈ 133,3', () => expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1))
  it('valores inválidos = 0', () => expect(epley1RM(0, 10)).toBe(0))
  it('melhor série escolhe maior 1RM, ignorando aquecimento', () => {
    const best = bestSet([
      { weightKg: 120, reps: 1, isWarmup: true },
      { weightKg: 80, reps: 10, isWarmup: false },
      { weightKg: 90, reps: 5, isWarmup: false },
    ])
    expect(best?.weightKg).toBe(80)
  })
})

describe('média móvel de 7 dias', () => {
  it('usa janela de dias corridos', () => {
    const r = movingAverageByDays([
      { date: '2026-01-01', value: 80 },
      { date: '2026-01-03', value: 82 },
      { date: '2026-01-09', value: 84 },
    ])
    expect(r[0].avg).toBe(80)
    expect(r[1].avg).toBe(81)
    // 01-09 enxerga 01-03..01-09 (01-01 fica fora da janela)
    expect(r[2].avg).toBe(83)
  })
})

describe('corpo', () => {
  it('IMC', () => expect(bmi(80, 180)).toBeCloseTo(24.69, 2))
  it('massa magra', () => expect(leanMassKg(80, 15)).toBe(68))
  it('deltas', () => {
    expect(deltas([80])).toBeUndefined()
    expect(deltas([80, 81, 82.5])).toEqual({ fromFirst: 2.5, fromPrev: 1.5 })
  })
})

describe('progressão', () => {
  it('sugere subir quando todas as séries batem o topo', () => {
    const sets = [
      { reps: 12, isWarmup: false },
      { reps: 12, isWarmup: false },
      { reps: 13, isWarmup: false },
    ]
    expect(shouldIncreaseLoad(sets, 12, 3)).toBe(true)
    expect(shouldIncreaseLoad(sets.slice(0, 2), 12, 3)).toBe(false)
    expect(shouldIncreaseLoad([...sets, { reps: 10, isWarmup: false }], 12, 3)).toBe(false)
  })
})

describe('formato da meta', () => {
  it('reps, valor único, tempo e observação', () => {
    expect(formatTarget({ repMin: 8, repMax: 12 })).toBe('8–12')
    expect(formatTarget({ repMin: 12, repMax: 12 })).toBe('12')
    expect(formatTarget({ repMin: 30, repMax: 45, targetUnit: 'seconds' })).toBe('30–45 s')
    expect(describeTarget(2, { repMin: 10, repMax: 10, note: 'por perna' })).toBe('2 séries de 10 reps por perna')
  })
})

describe('fases do plano', () => {
  it('semanas 1–3 = fase 1, 4+ = fase 2', () => {
    expect(planWeek('2026-01-05', '2026-01-05')).toBe(1)
    expect(planWeek('2026-01-05', '2026-01-25')).toBe(3)
    expect(planWeek('2026-01-05', '2026-01-26')).toBe(4)
    expect(planPhase(3)).toBe(1)
    expect(planPhase(4)).toBe(2)
  })
  it('início da semana é segunda', () => {
    expect(startOfWeek('2026-10-03')).toBe('2026-09-28') // sábado → segunda
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28')
  })
})
