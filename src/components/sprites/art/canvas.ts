import type { PixelSprite } from '../pixelart'

/**
 * Prancheta para desenhar pixel art à mão com menos contagem de caracteres:
 * cada parte do corpo é descrita linha a linha por trechos [x0, x1] escolhidos à mão,
 * e os detalhes (brilho, sombra, separação de músculo, mecha) são pixels/trechos colocados um a um.
 */
export type Span = [number, number]

export class Board {
  g: string[][]
  constructor(
    public w: number,
    public h: number,
  ) {
    this.g = Array.from({ length: h }, () => Array<string>(w).fill('.'))
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = ch
  }
  get(x: number, y: number) {
    return this.g[y]?.[x] ?? '.'
  }
  /** Linha horizontal de x0 a x1 (inclusive). */
  h1(y: number, x0: number, x1: number, ch: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, ch)
  }
  /** Preenche uma parte: spans[i] é o trecho da linha y0+i. */
  part(y0: number, spans: Span[], ch: string) {
    spans.forEach(([a, b], i) => this.h1(y0 + i, a, b, ch))
  }
  /** Pinta só onde já existe a parte (pixels diferentes de '.') — para sombras e brilhos dentro dela. */
  paint(y0: number, spans: Span[], ch: string, onlyOver?: string) {
    spans.forEach(([a, b], i) => {
      for (let x = a; x <= b; x++) {
        const cur = this.get(x, y0 + i)
        if (cur === '.') continue
        if (onlyOver && !onlyOver.includes(cur)) continue
        this.set(x, y0 + i, ch)
      }
    })
  }
  /** Lista de pixels [x, y] com o mesmo caractere. */
  dots(ch: string, pts: [number, number][]) {
    for (const [x, y] of pts) this.set(x, y, ch)
  }
  /** Contorno: todo pixel vazio encostado (4 vizinhos) em algo pintado vira contorno. */
  outline(ch = 'o', skip = 's') {
    const add: [number, number][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== '.') continue
        const n = [this.get(x, y - 1), this.get(x, y + 1), this.get(x - 1, y), this.get(x + 1, y)]
        if (n.some((c) => c !== '.' && c !== ch && !skip.includes(c))) add.push([x, y])
      }
    for (const [x, y] of add) this.set(x, y, ch)
  }
  toSprite(): PixelSprite {
    return { w: this.w, h: this.h, rows: this.g.map((r) => r.join('')) }
  }
}

/** Gera trechos interpolando larguras entre linhas-chave: [[y, x0, x1], ...] → trechos linha a linha. */
export function shape(keys: [number, number, number][]): { y0: number; spans: Span[] } {
  const spans: Span[] = []
  for (let k = 0; k < keys.length - 1; k++) {
    const [ya, a0, a1] = keys[k]
    const [yb, b0, b1] = keys[k + 1]
    for (let y = ya; y < yb; y++) {
      const t = (y - ya) / (yb - ya)
      spans.push([Math.round(a0 + (b0 - a0) * t), Math.round(a1 + (b1 - a1) * t)])
    }
  }
  const last = keys[keys.length - 1]
  spans.push([last[1], last[2]])
  return { y0: keys[0][0], spans }
}
