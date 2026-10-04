import { describe, expect, it } from 'vitest'
import { FICHA_H, FICHA_W, SMITH_H, SMITH_W, drawSmith, measureAnchors } from './smith'
import { BASE, paletteFor } from './palette'

const shapes = [
  { bald: false, beardless: false, orc: false },
  { bald: true, beardless: false, orc: false },
  { bald: false, beardless: true, orc: false },
  { bald: true, beardless: true, orc: true },
]
const count = (rows: string[], ch: string) => rows.join('').split(ch).length - 1

describe('ferreiro', () => {
  it('todas as patentes e formas geram o tamanho certo só com cores da paleta', () => {
    for (let t = 0; t <= 4; t++)
      for (const shape of shapes) {
        const sprites = [
          drawSmith(t, shape, { frame: 0 }),
          drawSmith(t, shape, { frame: 1 }),
          drawSmith(t, shape, { hammer: false }),
        ]
        for (const [i, s] of sprites.entries()) {
          const [w, h] = i < 2 ? [SMITH_W, SMITH_H] : [FICHA_W, FICHA_H]
          expect(s.w).toBe(w)
          expect(s.h).toBe(h)
          expect(s.rows).toHaveLength(h)
          expect(s.rows.every((r) => r.length === w)).toBe(true)
          for (const ch of new Set(s.rows.join(''))) if (ch !== '.') expect(BASE[ch], `caractere sem cor: ${ch}`).toBeDefined()
        }
      }
  })

  it('martelada: martelo no alto no quadro 0; no quadro 1 bate na bigorna e solta faíscas', () => {
    for (let t = 0; t <= 4; t++) {
      const up = drawSmith(t, shapes[0], { frame: 0 })
      const hit = drawSmith(t, shapes[0], { frame: 1 })
      expect(up.rows.slice(0, 6).join('').includes('2'), `martelo no alto na patente ${t}`).toBe(true)
      expect(hit.rows.slice(0, 6).join('').includes('2')).toBe(false)
      expect(count(hit.rows, 'J') + count(hit.rows, 'R')).toBeGreaterThan(count(up.rows, 'J') + count(up.rows, 'R'))
    }
  })

  it('ficha de medidas sem martelo nem bigorna; forja com os dois', () => {
    const ficha = drawSmith(2, shapes[0], { hammer: false }).rows
    expect(count(ficha, 'W') + count(ficha, '6')).toBe(0)
    const forja = drawSmith(2, shapes[0]).rows
    expect(count(forja, 'W')).toBeGreaterThan(0)
    expect(count(forja, '6')).toBeGreaterThan(0)
  })

  it('careca não tem cabelo; orc tem presas; sem barba não tem barba', () => {
    expect(count(drawSmith(3, shapes[1]).rows, 'i')).toBe(0)
    expect(count(drawSmith(3, shapes[0]).rows, 'i')).toBeGreaterThan(0)
    expect(count(drawSmith(3, shapes[3]).rows, 'T')).toBe(2)
    expect(count(drawSmith(3, shapes[2]).rows, 'b')).toBe(0)
    expect(count(drawSmith(3, shapes[0]).rows, 'b')).toBeGreaterThan(0)
  })

  it('pontos das medidas caem sobre o corpo em todas as patentes', () => {
    for (let t = 0; t <= 4; t++) {
      const s = drawSmith(t, shapes[0], { hammer: false })
      for (const [field, p] of Object.entries(measureAnchors(t))) {
        const ch = s.rows[Math.round(p.y)][Math.round(p.x)]
        expect(ch !== '.' && ch !== 'o', `${field} fora do corpo na patente ${t}`).toBe(true)
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
