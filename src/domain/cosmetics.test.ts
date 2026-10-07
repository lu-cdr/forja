import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from './game'
import { HAMMERS, SCENES, chosenCosmetic, cosmeticsFor, isUnlocked } from './cosmetics'

describe('visuais destravados por conquista', () => {
  it('toda conquista citada existe e o primeiro de cada lista é livre', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
    for (const c of [...SCENES, ...HAMMERS]) if (c.achievement) expect(ids.has(c.achievement), c.id).toBe(true)
    expect(SCENES[0].achievement).toBeUndefined()
    expect(HAMMERS[0].achievement).toBeUndefined()
  })

  it('escolha bloqueada ou desconhecida cai no visual livre', () => {
    const none = new Set<string>()
    const some = new Set(['primeiro-recorde'])
    expect(isUnlocked(HAMMERS[1], none)).toBe(false)
    expect(chosenCosmetic(HAMMERS, 'bronze', none).id).toBe('ferro')
    expect(chosenCosmetic(HAMMERS, 'bronze', some).id).toBe('bronze')
    expect(chosenCosmetic(SCENES, 'nao-existe', some).id).toBe('forja')
    expect(cosmeticsFor('primeiro-recorde').map((c) => c.id)).toEqual(['bronze'])
  })
})
