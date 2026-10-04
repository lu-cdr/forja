/**
 * Pixel art desenhado à mão: cada sprite é uma grade de caracteres, e cada caractere é um índice
 * de paleta ('.' = transparente). Personalização por troca de paleta, como nos jogos de SNES/arcade:
 * pele, cabelo e barba usam índices próprios, e trocar as cores desses índices muda a aparência.
 */

export type Palette = Record<string, string>

export interface PixelSprite {
  w: number
  h: number
  rows: string[]
}

/** Monta um sprite a partir das linhas desenhadas; linhas curtas são completadas com transparência. */
export function sprite(w: number, rows: string[]): PixelSprite {
  return { w, h: rows.length, rows: rows.map((r) => r.padEnd(w, '.').slice(0, w)) }
}

/** Sobrepõe camadas (ex.: presas do orc, ombreiras) — '.' na camada não apaga o que está embaixo. */
export function overlay(base: PixelSprite, ...layers: { x: number; y: number; rows: string[] }[]): PixelSprite {
  const grid = base.rows.map((r) => r.split(''))
  for (const l of layers)
    l.rows.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        const y = l.y + j
        const x = l.x + i
        if (ch !== '.' && grid[y]?.[x] !== undefined) grid[y][x] = ch
      }),
    )
  return { ...base, rows: grid.map((r) => r.join('')) }
}

/** Corridas horizontais de mesma cor, para um SVG enxuto. */
export function toRuns(s: PixelSprite, pal: Palette): { x: number; y: number; w: number; c: string }[] {
  const out: { x: number; y: number; w: number; c: string }[] = []
  s.rows.forEach((row, y) => {
    let x = 0
    while (x < s.w) {
      const c = pal[row[x]]
      if (!c) {
        x++
        continue
      }
      let w = 1
      while (x + w < s.w && pal[row[x + w]] === c) w++
      out.push({ x, y, w, c })
      x += w
    }
  })
  return out
}
