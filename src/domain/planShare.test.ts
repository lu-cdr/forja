import { describe, expect, it } from 'vitest'
import { decodePlan, encodePlan, planToShared } from './planShare'
import type { Exercise, PlanDay, PlanExercise } from './types'

const ex = (id: string, name: string, custom = false): Exercise => ({ id, name, muscleGroup: 'costas', equipment: 'Barra', isCompound: true, custom })
const exercises = [ex('ex-supino-reto-com-barra', 'Supino reto com barra'), ex('ex-prancha', 'Prancha'), ex('ex-remada-cavalinho', 'Remada cavalinho', true)]
const catalog = new Set(['ex-supino-reto-com-barra', 'ex-prancha'])
const days: PlanDay[] = [
  { id: 'a', weekday: 1, name: 'Treino A' },
  { id: 'b', weekday: 4, name: 'Treino B' },
  { id: 'old', weekday: 2, name: 'Antigo', archived: true },
]
const item = (id: string, planDayId: string, exerciseId: string, order: number, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  id,
  planDayId,
  exerciseId,
  order,
  setsPhase1: 2,
  setsPhase2: 4,
  repMin: 6,
  repMax: 10,
  restSeconds: 150,
  ...extra,
})
const items = [
  item('1', 'a', 'ex-remada-cavalinho', 2),
  item('2', 'a', 'ex-supino-reto-com-barra', 1),
  item('3', 'b', 'ex-prancha', 1, { targetUnit: 'seconds', repMin: 30, repMax: 45, note: 'devagar' }),
  item('4', 'old', 'ex-prancha', 1),
]

describe('plano por link', () => {
  it('monta o plano: só dias ativos, na ordem, catálogo por id e criados por nome', () => {
    const p = planToShared(days, items, exercises, catalog, true)
    expect(p.rotation).toBe(true)
    expect(p.days.map((d) => d.name)).toEqual(['Treino A', 'Treino B'])
    expect(p.days[0].items.map((i) => i.ex)).toEqual(['ex-supino-reto-com-barra', 0])
    expect(p.custom).toEqual([{ name: 'Remada cavalinho', muscleGroup: 'costas', equipment: 'Barra', isCompound: true }])
  })

  it('ida e volta pelo link preserva tudo e cabe numa mensagem', async () => {
    const p = planToShared(days, items, exercises, catalog, false)
    const code = await encodePlan(p)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/) // seguro para URL
    expect(code.length).toBeLessThan(400)
    expect(await decodePlan(code)).toEqual(p)
  })

  it('link corrompido ou malicioso dá erro amigável; valores absurdos são limitados', async () => {
    await expect(decodePlan('nao-e-um-plano')).rejects.toThrow(/inválido/)
    const p = planToShared(days, items, exercises, catalog, false)
    p.days[0].items[0].setsPhase2 = 999
    p.days[1].weekday = 1 // dia repetido
    const back = await decodePlan(await encodePlan(p))
    expect(back.days[0].items[0].setsPhase2).toBe(10)
    expect(new Set(back.days.map((d) => d.weekday)).size).toBe(2)
  })
})
