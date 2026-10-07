import { describe, expect, it } from 'vitest'
import { daysPerWeek, nextInRotation, sequenceOrder } from './plan'

describe('treinos em sequência', () => {
  // domingo (0) fica no fim: a ordem é segunda primeiro
  const days = [
    { id: 'c', weekday: 0 },
    { id: 'a', weekday: 1 },
    { id: 'b', weekday: 3 },
  ]

  it('ordem A → B → C pela posição na semana (segunda primeiro)', () => {
    expect(sequenceOrder(days).map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('próximo treino vem depois do último feito e volta ao começo', () => {
    expect(nextInRotation(days)?.id).toBe('a') // nenhum treino ainda
    expect(nextInRotation(days, 'a')?.id).toBe('b')
    expect(nextInRotation(days, 'c')?.id).toBe('a')
    expect(nextInRotation(days, 'dia-que-saiu-do-plano')?.id).toBe('a')
    expect(nextInRotation([], 'a')).toBeUndefined()
  })

  it('treinos por semana: dias do plano, ou a meta da sequência', () => {
    expect(daysPerWeek(undefined, 5)).toBe(5)
    expect(daysPerWeek({ schedule: 'weekly', rotationDaysPerWeek: 3 }, 5)).toBe(5)
    expect(daysPerWeek({ schedule: 'rotation' }, 2)).toBe(2)
    expect(daysPerWeek({ schedule: 'rotation', rotationDaysPerWeek: 4 }, 2)).toBe(4)
  })
})
