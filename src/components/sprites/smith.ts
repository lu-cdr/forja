/**
 * Gerador procedural do ferreiro em pixel art (48×44).
 * Cada patente (tier 0–4) muda proporções e equipamento; o contorno é
 * calculado automaticamente ao redor de tudo que é "sólido".
 */

export const W = 48
export const H = 44

const P = {
  outline: '#1b1210',
  skin: '#e2a378',
  skinShade: '#b56f48',
  skinHi: '#f4c8a0',
  hair: '#3b2416',
  beard: '#6e3b1e',
  beardShade: '#4e2913',
  eye: '#1b1210',
  band: '#a8322d',
  tunic: '#5d6b78',
  tunicShade: '#414c57',
  rope: '#b08a55',
  apron: '#7b4a2a',
  apronShade: '#5a331b',
  leather: '#4f2f1a',
  belt: '#2c1a10',
  gold: '#f4c542',
  goldShade: '#b88a1c',
  pants: '#3d3630',
  pantsShade: '#2a2420',
  boots: '#4a2b17',
  wood: '#8c5b33',
  woodShade: '#62401f',
  metal: '#a3acb6',
  metalShade: '#6c747e',
  metalHi: '#dfe6ec',
  rune: '#6ef3ff',
  cape: '#8e1f2b',
  capeShade: '#64141d',
  anvil: '#4a4f57',
  anvilShade: '#30343a',
  anvilHi: '#7b828c',
  hot: '#ff7a2f',
  hotCore: '#ffd36b',
  spark: '#ffe28a',
  stone: '#2b2622',
  stoneDark: '#1f1b18',
  stoneHi: '#36302b',
} as const

type Cell = { c: string; solid: boolean } | null

class Grid {
  px: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill(null))
  set(x: number, y: number, c: string, solid = true) {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    this.px[y][x] = { c, solid }
  }
  rect(x: number, y: number, w: number, h: number, c: string, solid = true) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, solid)
  }
  col(x: number, y0: number, y1: number, c: string) {
    for (let y = y0; y <= y1; y++) if (this.px[y]?.[x]) this.set(x, y, c)
  }
  outline() {
    const add: [number, number][] = []
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (this.px[y][x]) continue
        const n = [this.px[y - 1]?.[x], this.px[y + 1]?.[x], this.px[y]?.[x - 1], this.px[y]?.[x + 1]]
        if (n.some((c) => c?.solid)) add.push([x, y])
      }
    for (const [x, y] of add) this.set(x, y, P.outline, false)
  }
}

interface TierShape {
  torso: number // largura do tronco (par)
  arm: number
  leg: number
  delt: number // ombro extra
  neck: number
  hammerW: number
  hammerH: number
}

const SHAPES: TierShape[] = [
  { torso: 8, arm: 2, leg: 3, delt: 0, neck: 4, hammerW: 4, hammerH: 3 },
  { torso: 10, arm: 3, leg: 3, delt: 1, neck: 4, hammerW: 5, hammerH: 3 },
  { torso: 12, arm: 4, leg: 4, delt: 1, neck: 4, hammerW: 6, hammerH: 4 },
  { torso: 14, arm: 5, leg: 4, delt: 2, neck: 6, hammerW: 7, hammerH: 4 },
  { torso: 16, arm: 6, leg: 5, delt: 2, neck: 6, hammerW: 8, hammerH: 5 },
]

function drawHammer(g: Grid, tier: number, cx: number, top: number, s: TierShape, handleLen: number) {
  const hw = tier >= 2 ? 2 : 1
  const hx = cx - Math.floor(hw / 2)
  // cabo
  g.rect(hx, top + s.hammerH, hw, handleLen, P.wood)
  if (hw === 2) g.col(hx + 1, top + s.hammerH, top + s.hammerH + handleLen - 1, P.woodShade)
  // cabeça
  const x0 = cx - Math.floor(s.hammerW / 2)
  const head = tier >= 3 ? P.metal : P.metal
  g.rect(x0, top, s.hammerW, s.hammerH, head)
  g.rect(x0, top + s.hammerH - 1, s.hammerW, 1, P.metalShade)
  g.rect(x0, top, s.hammerW, 1, P.metalHi)
  if (tier >= 3) {
    // faixas de ouro
    g.col(x0 + 1, top, top + s.hammerH - 1, P.gold)
    g.col(x0 + s.hammerW - 2, top, top + s.hammerH - 1, P.gold)
  }
  if (tier >= 4) {
    // runas brilhantes
    for (let i = 2; i < s.hammerW - 2; i += 2) g.set(x0 + i, top + 1 + (i % 4 === 0 ? 1 : 0), P.rune)
  }
}

/** Ombreira arredondada: couro (mestre) ou aço com friso de ouro (lenda). */
function pauldron(g: Grid, tier: number, x: number, w: number) {
  const mat = tier >= 4 ? P.metal : P.leather
  g.rect(x + 1, 15, w - 2, 1, tier >= 4 ? P.metalHi : mat)
  g.rect(x, 16, w, 2, mat)
  g.rect(x, 18, w, 1, tier >= 4 ? P.gold : P.belt)
}

export function drawSmith(tier: number, frame: 0 | 1): Grid {
  const t = Math.max(0, Math.min(4, tier))
  const s = SHAPES[t]
  const g = new Grid()
  const cx = 17
  const tl = cx - s.torso / 2
  const tr = cx + s.torso / 2 - 1
  const taper = t >= 2 ? 1 : 0

  // ---- bigorna (atrás do braço) ----
  g.rect(26, 30, 15, 2, P.anvil) // tampo
  g.rect(41, 30, 3, 1, P.anvil) // bico
  g.set(44, 30, P.anvil)
  g.rect(26, 30, 15, 1, P.anvilHi)
  g.rect(30, 32, 7, 4, P.anvilShade) // cintura
  g.rect(28, 36, 11, 1, P.anvil)
  g.rect(27, 37, 13, 2, P.anvil) // base
  g.rect(27, 38, 13, 1, P.anvilShade)
  // metal em brasa
  const hotX = frame === 0 ? 31 : 33
  g.rect(hotX, 29, 6, 1, P.hot, false)
  g.rect(hotX + 2, 29, 2, 1, P.hotCore, false)

  // ---- capa (lenda) ----
  if (t >= 4) {
    g.rect(tl - 2, 18, s.torso + 4, 17, P.cape)
    g.rect(tl - 2, 33, s.torso + 4, 2, P.capeShade)
  }

  // ---- pernas e botas ----
  const legTop = 31
  const lx = cx - 1 - s.leg
  const rx = cx + 1
  g.rect(lx, legTop, s.leg, 7, P.pants)
  g.rect(rx, legTop, s.leg, 7, P.pants)
  g.col(cx - 2, legTop, 37, P.pantsShade)
  g.col(rx + s.leg - 1, legTop, 37, P.pantsShade)
  g.rect(lx - 1, 37, s.leg + 1, 3, P.boots)
  g.rect(rx, 37, s.leg + 1, 3, P.boots)
  // quadril
  g.rect(tl + taper, 28, s.torso - 2 * taper, 3, P.pants)

  // ---- tronco ----
  for (let y = 17; y <= 27; y++) {
    const inset = y >= 24 ? taper : 0
    g.rect(tl + inset, y, s.torso - 2 * inset, 1, P.skin)
    g.set(tr - inset, y, P.skinShade)
    if (t >= 1) g.set(tl + inset, y, P.skinHi)
  }
  if (t >= 1) {
    // peitoral
    const py = t >= 3 ? 21 : 20
    g.rect(tl + 1, py, s.torso / 2 - 2, 1, P.skinShade)
    g.rect(cx + 1, py, s.torso / 2 - 2, 1, P.skinShade)
    if (t >= 3) {
      g.rect(tl + 1, 18, 2, 1, P.skinHi)
      g.rect(cx + 1, 18, 2, 1, P.skinHi)
    }
  }
  if (t === 0) {
    // túnica de aprendiz
    g.rect(tl, 17, s.torso, 12, P.tunic)
    g.col(tr, 17, 28, P.tunicShade)
    g.rect(cx - 1, 17, 2, 2, P.skin)
    g.rect(tl, 26, s.torso, 1, P.rope)
  } else {
    // avental de couro
    g.rect(tl + 1, 22, s.torso - 2, 13, P.apron)
    g.rect(tl + 1, 34, s.torso - 2, 1, P.apronShade)
    g.col(tr - 1, 22, 34, P.apronShade)
    g.col(tl + 2, 17, 21, P.apron)
    g.col(tr - 2, 17, 21, P.apron)
    // cinto
    g.rect(tl + taper, 27, s.torso - 2 * taper, 1, P.belt)
    if (t >= 3) g.rect(cx - 1, 27, 2, 1, P.gold)
  }

  // ---- pescoço e cabeça ----
  g.rect(cx - s.neck / 2, 16, s.neck, 1, P.skinShade)
  g.rect(cx - 4, 8, 8, 8, P.skin)
  g.col(cx + 3, 8, 15, P.skinShade)
  g.rect(cx - 4, 7, 8, 3, P.hair)
  g.set(cx - 4, 10, P.hair)
  g.set(cx + 3, 10, P.hair)
  if (t === 0) g.set(cx - 3, 10, P.hair) // franja bagunçada
  if (t >= 1 && t <= 2) g.rect(cx - 4, 9, 8, 1, P.band)
  if (t >= 4) {
    g.rect(cx - 4, 8, 8, 1, P.gold)
    g.rect(cx - 1, 8, 2, 1, P.rune)
  }
  g.set(cx - 2, 11, P.eye)
  g.set(cx + 1, 11, P.eye)
  if (t >= 3) {
    // sobrancelhas fortes
    g.rect(cx - 3, 10, 2, 1, P.hair)
    g.rect(cx + 1, 10, 2, 1, P.hair)
  }
  // barba
  if (t === 1) {
    g.rect(cx - 3, 14, 6, 2, P.beard)
    g.rect(cx - 1, 14, 2, 1, P.beardShade)
  } else if (t >= 2) {
    g.rect(cx - 4, 12, 1, 4, P.beard)
    g.rect(cx + 3, 12, 1, 4, P.beard)
    g.rect(cx - 3, 13, 6, 3, P.beard)
    g.rect(cx - 1, 14, 2, 1, P.beardShade)
    if (t >= 3) {
      g.rect(cx - 3, 16, 6, 2, P.beard)
      g.rect(cx - 2, 18, 4, t >= 4 ? 3 : 1, P.beard)
      g.col(cx + 1, 16, 18, P.beardShade)
    }
  }

  // ---- braço esquerdo (pendurado) ----
  const la = tl - s.arm
  g.rect(la - s.delt, 17, s.arm + s.delt, 3 + (s.delt > 1 ? 1 : 0), P.skin)
  g.rect(la, 18, s.arm, 11, P.skin)
  g.col(tl - 1, 18, 28, P.skinShade)
  if (s.arm >= 3) g.col(la, 19, 27, P.skinHi)
  if (t >= 2) g.set(la, 23, P.skinShade) // dobra do cotovelo
  g.rect(la, 29, s.arm, 2, P.skin)
  g.rect(la, 30, s.arm, 1, P.skinShade)
  if (t >= 2) g.rect(la, 25, s.arm, 3, t >= 4 ? P.metal : P.leather)
  if (t >= 3) pauldron(g, t, la - s.delt, s.arm + s.delt + 1)

  // ---- braço direito (martelo) ----
  const ra = tr + 1
  g.rect(ra, 17, s.arm + s.delt, 3, P.skin)
  if (frame === 0) {
    const ax = ra + Math.floor(s.delt / 2)
    const hcx = ax + Math.floor(s.arm / 2)
    drawHammer(g, t, hcx, 1, s, 9 - s.hammerH)
    g.rect(ax, 10, s.arm, 9, P.skin)
    g.col(ax, 11, 18, P.skinShade)
    g.rect(ax, 8, s.arm, 2, P.skin)
    g.rect(ax, 9, s.arm, 1, P.skinShade)
    if (t >= 2) g.rect(ax, 11, s.arm, 2, t >= 4 ? P.metal : P.leather)
  } else {
    g.rect(ra, 18, 5, s.arm, P.skin)
    g.rect(ra, 18 + s.arm - 1, 5, 1, P.skinShade)
    const fx = ra + 5
    g.rect(fx, 18, s.arm, 6, P.skin)
    g.col(fx + s.arm - 1, 18, 23, P.skinShade)
    if (t >= 2) g.rect(fx, 20, s.arm, 2, t >= 4 ? P.metal : P.leather)
    const hcx = fx + Math.floor(s.arm / 2)
    drawHammer(g, t, hcx, 30 - s.hammerH, s, 0)
    g.rect(fx, 24, s.arm, 2, P.skin)
    g.rect(fx, 25, s.arm, 1, P.skinShade)
    // faíscas
    const hx0 = hcx - Math.floor(s.hammerW / 2)
    const hx1 = hx0 + s.hammerW - 1
    const sp: [number, number][] = [
      [hx0 - 2, 27],
      [hx0 - 3, 25],
      [hx1 + 2, 26],
      [hx1 + 4, 24],
      [hx1 + 3, 28],
    ]
    if (t >= 3) sp.push([hx0 - 5, 23], [hx1 + 6, 22])
    for (const [x, y] of sp) g.set(x, y, t >= 4 && x > hx1 ? P.rune : P.spark, false)
  }
  if (t >= 3) pauldron(g, t, ra - 1, s.arm + s.delt + 1)

  g.outline()

  // ---- chão de pedra (sem contorno) ----
  for (let x = 0; x < W; x++) {
    g.set(x, 40, (x % 8 === 0 ? P.stoneDark : P.stoneHi), false)
    for (let y = 41; y < H; y++) g.set(x, y, (x + y * 3) % 11 === 0 ? P.stoneDark : P.stone, false)
  }
  return g
}

/** Converte a grade em retângulos (uma corrida horizontal por cor) para SVG enxuto. */
export function toRuns(g: Grid): { x: number; y: number; w: number; c: string }[] {
  const out: { x: number; y: number; w: number; c: string }[] = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const cell = g.px[y][x]
      if (!cell) {
        x++
        continue
      }
      let w = 1
      while (x + w < W && g.px[y][x + w]?.c === cell.c) w++
      out.push({ x, y, w, c: cell.c })
      x += w
    }
  }
  return out
}
