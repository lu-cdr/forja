import { describe, expect, it } from 'vitest'
import { ageFromBirthYear, recommendTemplate } from './recommend'

describe('recomendação de plano', () => {
  it('experiência define a base', () => {
    expect(recommendTemplate({ training: 'iniciante', activity: 'ativo' }).templateId).toBe('corpo-inteiro-3x')
    expect(recommendTemplate({ training: 'intermediario', activity: 'ativo' }).templateId).toBe('superior-inferior-4x')
    expect(recommendTemplate({ training: 'avancado', activity: 'ativo' }).templateId).toBe('hipertrofia-5x')
  })

  it('sedentário desce um degrau', () => {
    expect(recommendTemplate({ training: 'avancado', activity: 'sedentario' }).templateId).toBe('superior-inferior-4x')
    expect(recommendTemplate({ training: 'intermediario', activity: 'sedentario' }).templateId).toBe('empurrar-puxar-pernas-3x')
    expect(recommendTemplate({ training: 'iniciante', activity: 'sedentario' }).templateId).toBe('corpo-inteiro-3x')
  })

  it('idade limita os dias', () => {
    expect(recommendTemplate({ age: 55, training: 'avancado', activity: 'muito-ativo' }).templateId).toBe('superior-inferior-4x')
    expect(recommendTemplate({ age: 65, training: 'avancado', activity: 'ativo' }).templateId).toBe('empurrar-puxar-pernas-3x')
    expect(recommendTemplate({ age: 65, training: 'iniciante', activity: 'ativo' }).templateId).toBe('corpo-inteiro-3x')
  })

  it('readaptação só para quem precisa', () => {
    expect(recommendTemplate({ age: 30, training: 'avancado', activity: 'ativo' }).rampUpWeeks).toBe(0)
    expect(recommendTemplate({ age: 30, training: 'iniciante', activity: 'ativo' }).rampUpWeeks).toBe(3)
    expect(recommendTemplate({ age: 30, training: 'avancado', activity: 'sedentario' }).rampUpWeeks).toBe(3)
    expect(recommendTemplate({ age: 52, training: 'avancado', activity: 'ativo' }).rampUpWeeks).toBe(3)
  })

  it('sempre explica o porquê', () => {
    const r = recommendTemplate({ age: 62, training: 'avancado', activity: 'sedentario' })
    expect(r.reason).toMatch(/parado/)
    expect(r.reason).toMatch(/recupera/)
  })

  it('idade a partir do ano de nascimento', () => {
    expect(ageFromBirthYear(1996, new Date(2026, 9, 4))).toBe(30)
    expect(ageFromBirthYear(undefined)).toBeUndefined()
  })
})
