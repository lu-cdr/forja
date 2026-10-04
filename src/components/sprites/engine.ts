/**
 * Motor de pixel art "16 bits": formas com volume (elipses e cápsulas) iluminadas por uma luz
 * vinda de cima à esquerda, convertidas em rampas de 5 tons, com contorno colorido (sel-out).
 */

/** 0 = brilho … 4 = sombra mais funda */
export type Ramp = readonly [string, string, string, string, string]

type Cell = { ramp: Ramp; s: number; solid: boolean; color?: string } | null

const L = (() => {
  const v = [-0.5, -0.62, 0.6]
  const n = Math.hypot(...v)
  return v.map((x) => x / n)
})()

function shadeOf(nx: number, ny: number, nz: number, bias = 0): number {
  const i = nx * L[0] + ny * L[1] + nz * L[2] + bias
  if (i > 0.86) return 0
  if (i > 0.58) return 1
  if (i > 0.22) return 2
  if (i > -0.12) return 3
  return 4
}

// ---------- cores ----------

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`
}

/** Rampa de 5 tons a partir da cor base, com desvio de matiz: luz puxa para o amarelo, sombra para o roxo. */
export function rampFrom(base: string): Ramp {
  const [h, s, l] = hexToHsl(base)
  const toward = (target: number, amt: number) => {
    let d = target - h
    if (d > 180) d -= 360
    if (d < -180) d += 360
    return h + Math.sign(d) * Math.min(Math.abs(d), amt)
  }
  return [
    hslToHex(toward(55, 14), s * 0.85, l + (1 - l) * 0.45),
    hslToHex(toward(55, 7), s * 0.95, l + (1 - l) * 0.2),
    base,
    hslToHex(toward(275, 10), Math.min(1, s * 1.05 + 0.04), l * 0.72),
    hslToHex(toward(275, 22), Math.min(1, s * 1.1 + 0.08), l * 0.46),
  ]
}

export function darken(hex: string, f: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, l * f)
}

// ---------- tela ----------

export interface ShapeOpts {
  /** Desloca a iluminação: + mais claro, − mais escuro. */
  bias?: number
  /** Linha escura onde a forma passa por cima de outra (separa braço do tronco etc). */
  contour?: boolean
  /** Não entra no contorno externo (brilho, fogo, faíscas). */
  solid?: boolean
  /** Só desenha onde já existe pixel (pintar por cima: avental, tatuagem…). */
  clipToExisting?: boolean
  /** Recorte livre: só desenha onde retornar true. */
  clip?: (x: number, y: number) => boolean
}

export class PixelCanvas {
  px: Cell[]
  constructor(
    public w: number,
    public h: number,
  ) {
    this.px = Array<Cell>(w * h).fill(null)
  }

  get(x: number, y: number): Cell {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null
    return this.px[y * this.w + x]
  }

  put(x: number, y: number, ramp: Ramp, s: number, solid = true) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = { ramp, s: Math.max(0, Math.min(4, s)), solid }
  }

  /** Cor exata (olhos, brilho dos olhos, presas). */
  dot(x: number, y: number, color: string, solid = true) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = { ramp: [color, color, color, color, color], s: 2, solid, color }
  }

  private plot(x: number, y: number, ramp: Ramp, s: number, edge: boolean, o: ShapeOpts) {
    const under = this.get(x, y)
    if (o.clipToExisting && !under) return
    if (o.clip && !o.clip(x, y)) return
    const shade = o.contour && edge && under ? 4 : s
    this.put(x, y, ramp, shade, o.solid ?? true)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, ramp: Ramp, o: ShapeOpts = {}) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        const d = dx * dx + dy * dy
        if (d > 1) continue
        const nz = Math.sqrt(1 - d)
        const edge = d > 1 - 2.2 / Math.max(rx, ry)
        this.plot(x, y, ramp, shadeOf(dx, dy, nz, o.bias), edge, o)
      }
  }

  /** Cápsula afunilada entre dois pontos (membros). */
  capsule(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, ramp: Ramp, o: ShapeOpts = {}) {
    const minX = Math.floor(Math.min(x1 - r1, x2 - r2))
    const maxX = Math.ceil(Math.max(x1 + r1, x2 + r2))
    const minY = Math.floor(Math.min(y1 - r1, y2 - r2))
    const maxY = Math.ceil(Math.max(y1 + r1, y2 + r2))
    const vx = x2 - x1
    const vy = y2 - y1
    const len2 = vx * vx + vy * vy || 1
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5
        const py = y + 0.5
        const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2))
        const r = r1 + (r2 - r1) * t
        const ex = px - (x1 + vx * t)
        const ey = py - (y1 + vy * t)
        const d = Math.hypot(ex, ey) / r
        if (d > 1) continue
        const nx = ex / r
        const ny = ey / r
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
        this.plot(x, y, ramp, shadeOf(nx, ny, nz, o.bias), d > 1 - 1.6 / r, o)
      }
  }

  /** Forma por linhas: para cada y, meia-largura dada por w(y). Sombreada como cilindro vertical. */
  column(cx: number, y0: number, y1: number, halfWidth: (y: number) => number, ramp: Ramp, o: ShapeOpts & { roundBottom?: number } = {}) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const hw = halfWidth(y)
      if (hw <= 0) continue
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
        const nx = (x + 0.5 - cx) / hw
        if (Math.abs(nx) > 1) continue
        const ny = ((y - y0) / Math.max(1, y1 - y0) - 0.5) * 0.5
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx))
        this.plot(x, y, ramp, shadeOf(nx, ny, nz, o.bias), Math.abs(nx) > 1 - 1.5 / hw, o)
      }
    }
  }

  /** Contorno externo colorido: tom bem escuro do material vizinho (não preto puro). */
  outline() {
    const add: [number, number, string][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue
        const n = [this.get(x, y - 1), this.get(x, y + 1), this.get(x - 1, y), this.get(x + 1, y)].find((c) => c?.solid)
        if (n) add.push([x, y, darken(n.ramp[4], 0.55)])
      }
    for (const [x, y, c] of add) this.dot(x, y, c, false)
  }

  color(x: number, y: number): string | null {
    const c = this.get(x, y)
    return c ? (c.color ?? c.ramp[c.s]) : null
  }

  toRuns(): { x: number; y: number; w: number; c: string }[] {
    const out: { x: number; y: number; w: number; c: string }[] = []
    for (let y = 0; y < this.h; y++) {
      let x = 0
      while (x < this.w) {
        const c = this.color(x, y)
        if (!c) {
          x++
          continue
        }
        let w = 1
        while (x + w < this.w && this.color(x + w, y) === c) w++
        out.push({ x, y, w, c })
        x += w
      }
    }
    return out
  }
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
