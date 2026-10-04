import { describe, expect, it } from 'vitest'
import { SMITH_H, SMITH_W, drawSmith, measureAnchors } from './smith'
import { BASE, paletteFor } from './palette'

const shapes = [
  { bald: false, beardless: false, orc: false },
  { bald: true, beardless: false, orc: false },
  { bald: false, beardless: true, orc: false },
  { bald: true, beardless: true, orc: true },
]
const count = (rows: string[], ch: string) => rows.join('').split(ch).length - 1

describe('ferreiro desenhado à mão', () => {
  it('todas as patentes e formas geram 64×88 só com cores da paleta', () => {
    for (let t = 0; t <= 4; t++)
      for (const shape of shapes)
        for (const frame of [0, 1] as const) {
          const s = drawSmith(t, shape, { frame })
          expect(s.w).toBe(SMITH_W)
          expect(s.h).toBe(SMITH_H)
          expect(s.rows.every((r) => r.length === SMITH_W)).toBe(true)
          const used = new Set(s.rows.join(''))
          used.delete('.')
          for (const ch of used) expect(BASE[ch], `caractere sem cor: ${ch}`).toBeDefined()
        }
  })

  it('respiração mexe só o tronco: pernas iguais nos dois quadros', () => {
    const shape = shapes[0]
    const a = drawSmith(3, shape, { frame: 0 })
    const b = drawSmith(3, shape, { frame: 1 })
    expect(a.rows).not.toEqual(b.rows)
    expect(a.rows.slice(64)).toEqual(b.rows.slice(64))
  })

  it('ficha de medidas sem martelo; forja com martelo', () => {
    expect(count(drawSmith(2, shapes[0], { hammer: false }).rows, 'W')).toBe(0)
    expect(count(drawSmith(2, shapes[0]).rows, 'W')).toBeGreaterThan(0)
  })

  it('careca não tem cabelo; orc tem presas; sem barba tem bem menos pelo', () => {
    expect(count(drawSmith(3, shapes[1]).rows, 'i')).toBe(0)
    expect(count(drawSmith(3, shapes[3]).rows, 'T')).toBe(2)
    expect(count(drawSmith(3, shapes[2]).rows, 'c')).toBeLessThan(count(drawSmith(3, shapes[0]).rows, 'c') / 4)
  })

  it('pontos das medidas caem sobre o corpo em todas as patentes', () => {
    for (let t = 0; t <= 4; t++) {
      const s = drawSmith(t, shapes[0], { hammer: false })
      for (const [field, p] of Object.entries(measureAnchors(t))) {
        const ch = s.rows[Math.round(p.y)][Math.round(p.x)]
        expect(ch !== '.' && ch !== 's', `${field} fora do corpo na patente ${t}`).toBe(true)
      }
    }
  })

  it('troca de paleta muda pele, cabelo e barba', () => {
    const p = paletteFor({ skin: 'orc', hair: 'loiro', beard: 'ruivo' })
    expect(p.C).not.toBe(BASE.C)
    expect(p.i).not.toBe(BASE.i)
    expect(p.c).not.toBe(BASE.c)
    expect(p.L).toBe(BASE.L) // couro não muda
  })
})
