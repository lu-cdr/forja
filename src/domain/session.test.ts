import { describe, expect, it } from 'vitest'
import { isAbandoned, lastActivityAt } from './session'

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
