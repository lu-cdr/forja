import type { MeasurementField } from '../../../domain/types'
import type { PixelSprite } from '../pixelart'
import { Board } from './canvas'

/**
 * Ferreiro da primeira versão (48×44): de lado para a bigorna, martelando. Cada patente (0–4) muda as
 * proporções e o equipamento; o contorno é calculado em volta de tudo que é sólido.
 *   0 Aprendiz: túnica, sem barba · 1 Ferreiro: avental, faixa, barba curta · 2 Ferreiro de Aço: braçadeiras
 *   3 Mestre: ombreiras de couro, martelo com ouro · 4 Lenda: capa, ombreiras de aço, diadema, martelo rúnico
 * Desenha com índices da paleta (palette.ts), então pele, cabelo e barba mudam por troca de paleta;
 * careca, sem barba e orc mudam o desenho.
 */

export const SMITH_W = 48
export const SMITH_H = 44

/** Ficha de medidas: só o corpo, sem bigorna nem chão (recorte do desenho completo). */
export const FICHA_W = 35
export const FICHA_H = 38
const FICHA_Y = 4

export interface SmithShape {
  bald: boolean
  beardless: boolean
  orc: boolean
}

export interface DrawOptions {
  /** 0 = martelo erguido; 1 = martelada na bigorna, com faíscas */
  frame?: 0 | 1
  /** falso na ficha de medidas: de pé, braços soltos, sem bigorna */
  hammer?: boolean
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

const CX = 17

// índices da paleta (ver palette.ts)
const P = {
  skin: 'B',
  skinShade: 'C',
  skinHi: 'A',
  hair: 'i',
  brow: 'j',
  beard: 'b',
  beardShade: 'c',
  eye: 'e',
  band: 'Q',
  tunic: 'v',
  tunicShade: 'y',
  rope: 'L',
  apron: 'M',
  apronShade: 'N',
  leather: 'N',
  belt: 'O',
  gold: 'G',
  pants: 'q',
  pantsShade: 'r',
  boots: 'l',
  wood: 'W',
  woodShade: 'X',
  metal: '2',
  metalShade: '3',
  metalHi: '1',
  // cabeça do martelo: índices próprios para trocar o material (ferro, bronze, ouro…) sem mexer na armadura
  head: 'z',
  headShade: 'a',
  headHi: 'x',
  rune: 'R',
  cape: 'Q',
  capeShade: 'Z',
  tusk: 'T',
  anvil: '6',
  anvilShade: '7',
  anvilHi: '5',
  hot: 'H',
  hotCore: 'I',
  spark: 'J',
  stone: '8',
  stoneDark: '9',
  stoneHi: 'V',
} as const

class Grid extends Board {
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  /** Coluna só sobre o que já está pintado (sombra/brilho dentro da parte). */
  col(x: number, y0: number, y1: number, c: string) {
    for (let y = y0; y <= y1; y++) if (this.get(x, y) !== '.') this.set(x, y, c)
  }
}

function drawHammer(g: Grid, tier: number, cx: number, top: number, s: TierShape, handleLen: number) {
  const hw = tier >= 2 ? 2 : 1
  const hx = cx - Math.floor(hw / 2)
  g.rect(hx, top + s.hammerH, hw, handleLen, P.wood)
  if (hw === 2) g.col(hx + 1, top + s.hammerH, top + s.hammerH + handleLen - 1, P.woodShade)
  const x0 = cx - Math.floor(s.hammerW / 2)
  g.rect(x0, top, s.hammerW, s.hammerH, P.head)
  g.rect(x0, top + s.hammerH - 1, s.hammerW, 1, P.headShade)
  g.rect(x0, top, s.hammerW, 1, P.headHi)
  if (tier >= 3) {
    g.col(x0 + 1, top, top + s.hammerH - 1, P.gold)
    g.col(x0 + s.hammerW - 2, top, top + s.hammerH - 1, P.gold)
  }
  if (tier >= 4) for (let i = 2; i < s.hammerW - 2; i += 2) g.set(x0 + i, top + 1 + (i % 4 === 0 ? 1 : 0), P.rune)
}

/** Ombreira arredondada: couro (mestre) ou aço com friso de ouro (lenda). */
function pauldron(g: Grid, tier: number, x: number, w: number) {
  const mat = tier >= 4 ? P.metal : P.leather
  g.rect(x + 1, 15, w - 2, 1, tier >= 4 ? P.metalHi : mat)
  g.rect(x, 16, w, 2, mat)
  g.rect(x, 18, w, 1, tier >= 4 ? P.gold : P.belt)
}

/** Braço solto ao lado do corpo; `x0` é a borda de dentro (encostada no tronco), `dir` −1 = esquerda da tela. */
function hangingArm(g: Grid, t: number, s: TierShape, x0: number, dir: -1 | 1) {
  const near = x0
  const far = x0 + dir * (s.arm - 1)
  const lo = Math.min(near, far)
  const shoulder = s.arm + s.delt
  g.rect(dir < 0 ? lo - s.delt : lo, 17, shoulder, 3 + (s.delt > 1 ? 1 : 0), P.skin)
  g.rect(lo, 18, s.arm, 11, P.skin)
  // luz da esquerda: lado esquerdo claro, direito escuro
  g.col(lo + s.arm - 1, 18, 28, P.skinShade)
  if (s.arm >= 3) g.col(lo, 19, 27, P.skinHi)
  if (t >= 2) g.set(dir < 0 ? lo : lo + s.arm - 1, 23, P.skinShade) // dobra do cotovelo
  g.rect(lo, 29, s.arm, 2, P.skin)
  g.rect(lo, 30, s.arm, 1, P.skinShade)
  if (t >= 2) g.rect(lo, 25, s.arm, 3, t >= 4 ? P.metal : P.leather)
  if (t >= 3) pauldron(g, t, dir < 0 ? lo - s.delt : lo - 1, shoulder + 1)
}

export function drawSmith(tier: number, shape: SmithShape, opts: DrawOptions = {}): PixelSprite {
  const t = Math.max(0, Math.min(4, Math.round(tier)))
  const frame = opts.frame ?? 0
  const forge = opts.hammer !== false
  const s = SHAPES[t]
  const g = new Grid(SMITH_W, SMITH_H)
  const cx = CX
  const tl = cx - s.torso / 2
  const tr = cx + s.torso / 2 - 1
  const taper = t >= 2 ? 1 : 0

  // ---- bigorna (atrás do braço) ----
  if (forge) {
    g.rect(26, 30, 15, 2, P.anvil)
    g.rect(41, 30, 3, 1, P.anvil)
    g.set(44, 30, P.anvil)
    g.rect(26, 30, 15, 1, P.anvilHi)
    g.rect(30, 32, 7, 4, P.anvilShade)
    g.rect(28, 36, 11, 1, P.anvil)
    g.rect(27, 37, 13, 2, P.anvil)
    g.rect(27, 38, 13, 1, P.anvilShade)
  }

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
  g.rect(tl + taper, 28, s.torso - 2 * taper, 3, P.pants)

  // ---- tronco ----
  for (let y = 17; y <= 27; y++) {
    const inset = y >= 24 ? taper : 0
    g.rect(tl + inset, y, s.torso - 2 * inset, 1, P.skin)
    g.set(tr - inset, y, P.skinShade)
    if (t >= 1) g.set(tl + inset, y, P.skinHi)
  }
  if (t >= 1) {
    const py = t >= 3 ? 21 : 20
    g.rect(tl + 1, py, s.torso / 2 - 2, 1, P.skinShade)
    g.rect(cx + 1, py, s.torso / 2 - 2, 1, P.skinShade)
    if (t >= 3) {
      g.rect(tl + 1, 18, 2, 1, P.skinHi)
      g.rect(cx + 1, 18, 2, 1, P.skinHi)
    }
  }
  if (t === 0) {
    g.rect(tl, 17, s.torso, 12, P.tunic)
    g.col(tr, 17, 28, P.tunicShade)
    g.rect(cx - 1, 17, 2, 2, P.skin)
    g.rect(tl, 26, s.torso, 1, P.rope)
  } else {
    g.rect(tl + 1, 22, s.torso - 2, 13, P.apron)
    g.rect(tl + 1, 34, s.torso - 2, 1, P.apronShade)
    g.col(tr - 1, 22, 34, P.apronShade)
    g.col(tl + 2, 17, 21, P.apron)
    g.col(tr - 2, 17, 21, P.apron)
    g.rect(tl + taper, 27, s.torso - 2 * taper, 1, P.belt)
    if (t >= 3) g.rect(cx - 1, 27, 2, 1, P.gold)
  }

  // ---- pescoço e cabeça ----
  g.rect(cx - s.neck / 2, 16, s.neck, 1, P.skinShade)
  g.rect(cx - 4, 8, 8, 8, P.skin)
  g.col(cx + 3, 8, 15, P.skinShade)
  if (shape.orc) {
    // orelhas pontudas
    g.dots(P.skin, [[cx - 5, 10], [cx - 5, 11], [cx - 6, 10], [cx + 4, 10], [cx + 4, 11], [cx + 5, 10]])
  }
  if (shape.bald) {
    g.rect(cx - 3, 7, 6, 1, P.skin)
    g.set(cx - 2, 8, P.skinHi)
  } else {
    g.rect(cx - 4, 7, 8, 3, P.hair)
    g.set(cx - 4, 10, P.hair)
    g.set(cx + 3, 10, P.hair)
    if (t === 0) g.set(cx - 3, 10, P.hair) // franja bagunçada
  }
  if (t >= 1 && t <= 2) g.rect(cx - 4, 9, 8, 1, P.band)
  if (t >= 4) {
    g.rect(cx - 4, 8, 8, 1, P.gold)
    g.rect(cx - 1, 8, 2, 1, P.rune)
  }
  g.set(cx - 2, 11, P.eye)
  g.set(cx + 1, 11, P.eye)
  if (t >= 3 || shape.orc) {
    // sobrancelhas fortes
    g.rect(cx - 3, 10, 2, 1, P.brow)
    g.rect(cx + 1, 10, 2, 1, P.brow)
  }
  // barba
  if (!shape.beardless) {
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
  }
  if (shape.orc) g.dots(P.tusk, [[cx - 2, 13], [cx + 1, 13]]) // presas saindo da boca

  // ---- braço esquerdo da tela (sempre solto) ----
  hangingArm(g, t, s, tl - 1, -1)

  // ---- braço direito da tela ----
  const ra = tr + 1
  if (!forge) hangingArm(g, t, s, ra, 1)
  else {
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
    }
    if (t >= 3) pauldron(g, t, ra - 1, s.arm + s.delt + 1)
  }

  g.outline('o', '')

  if (forge) {
    // ---- brilho e faíscas: sem contorno ----
    const hotX = frame === 0 ? 31 : 33
    g.rect(hotX, 29, 6, 1, P.hot)
    g.rect(hotX + 2, 29, 2, 1, P.hotCore)
    if (frame === 1) {
      const hcx = ra + 5 + Math.floor(s.arm / 2)
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
      for (const [x, y] of sp) g.set(x, y, t >= 4 && x > hx1 ? P.rune : P.spark)
    }
    // ---- chão de pedra ----
    for (let x = 0; x < SMITH_W; x++) {
      g.set(x, 40, x % 8 === 0 ? P.stoneDark : P.stoneHi)
      for (let y = 41; y < SMITH_H; y++) g.set(x, y, (x + y * 3) % 11 === 0 ? P.stoneDark : P.stone)
    }
    return g.toSprite()
  }

  // ficha: recorta só o corpo
  const rows = g.toSprite().rows.slice(FICHA_Y, FICHA_Y + FICHA_H).map((r) => r.slice(0, FICHA_W))
  return { w: FICHA_W, h: FICHA_H, rows }
}

/**
 * Pontos do corpo para a ficha de medidas (coordenadas do recorte da ficha).
 * "D"/"E" são do personagem: o braço direito dele aparece à esquerda da tela.
 */
export function measureAnchors(tier: number): Record<MeasurementField, { x: number; y: number }> {
  const t = Math.max(0, Math.min(4, Math.round(tier)))
  const s = SHAPES[t]
  const tl = CX - s.torso / 2
  const tr = CX + s.torso / 2 - 1
  const taper = t >= 2 ? 1 : 0
  const lx = CX - 1 - s.leg
  const rx = CX + 1
  const legMid = Math.floor(s.leg / 2)
  const y = (v: number) => v - FICHA_Y
  return {
    chestCm: { x: CX - 0.5, y: y(20) },
    armRCm: { x: tl - Math.ceil(s.arm / 2), y: y(21) },
    armLCm: { x: tr + Math.ceil(s.arm / 2), y: y(21) },
    waistCm: { x: tl + taper + 1, y: y(26) },
    abdomenCm: { x: CX + 1, y: y(24) },
    hipCm: { x: tr - taper - 1, y: y(29) },
    thighRCm: { x: lx + legMid, y: y(32) },
    thighLCm: { x: rx + legMid, y: y(32) },
    calfCm: { x: rx + legMid, y: y(36) },
  }
}
