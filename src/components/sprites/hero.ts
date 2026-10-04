import type { MeasurementField, SmithLook } from '../../domain/types'
import { PixelCanvas, lerp, type Ramp } from './engine'
import { EYE, EYE_GLINT, M, TUSK, lookRamps } from './materials'

/**
 * Ferreiro 16 bits, de corpo inteiro e de frente, em proporção chibi (cabeção, estilo sprite de campo de RPG).
 * A patente (0–4) engrossa pescoço, trapézio, ombros, braços, peitoral e pernas, e troca o equipamento.
 * Postura "forja": martelo e bigorna (2 quadros de animação). Postura "ficha": de pé, braços abertos (medidas).
 */
export interface Proportions {
  w: number
  h: number
  cx: number
  headCY: number
  headRX: number
  headRY: number
  shoulderY: number
  waistY: number
  hipY: number
  kneeY: number
  ankleY: number
  /** Escala das larguras do corpo. */
  bs: number
  /** Olhos maiores (chibi). */
  bigEyes: boolean
  anvilX0: number
  anvilX1: number
  anvilTop: number
}

export const CHIBI: Proportions = {
  w: 64,
  h: 66,
  cx: 24,
  headCY: 16,
  headRX: 10,
  headRY: 10.5,
  shoulderY: 30,
  waistY: 41,
  hipY: 43,
  kneeY: 50,
  ankleY: 57,
  bs: 0.85,
  bigEyes: true,
  anvilX0: 41,
  anvilX1: 62,
  anvilTop: 52,
}

export type Stance = 'forja' | 'ficha'

interface Pt {
  x: number
  y: number
}

/** Geometria do corpo numa patente/postura — usada pelo desenho e pelos pontos da ficha de medidas. */
export function bodyGeometry(p: Proportions, tier: number, frame: 0 | 1, stance: Stance) {
  const t = Math.max(0, Math.min(4, tier))
  const k = t / 4
  const bs = p.bs
  const cx = stance === 'ficha' ? p.w / 2 : p.cx
  const sh = lerp(8.5, 15.5, k) * bs
  const g = {
    t,
    k,
    cx,
    sh,
    waist: lerp(6.5, 9.5, k) * bs,
    ua: lerp(2.4, 5.4, k) * bs,
    fa: lerp(2.1, 4.3, k) * bs,
    fist: lerp(2.3, 3.8, k) * bs,
    delt: lerp(3.2, 6.6, k) * bs,
    pecRX: lerp(3.6, 7.2, k) * bs,
    pecRY: lerp(2.4, 4.6, k) * bs,
    legR1: lerp(3, 5, k) * bs,
    legR2: lerp(2.4, 3.6, k) * bs,
    neck: lerp(2.6, 5, k) * bs,
    trapRX: lerp(3, 8, k) * bs,
    hw: lerp(7, 13, k),
    hh: lerp(4, 7, k),
    am: (p.anvilX0 + p.anvilX1) / 2 - 2,
    /** braço do lado esquerdo da tela (braço direito do personagem) */
    lS: { x: cx - sh + 1, y: p.shoulderY + 3 } as Pt,
    lE: { x: 0, y: 0 } as Pt,
    lW: { x: 0, y: 0 } as Pt,
    rS: { x: cx + sh - 1, y: p.shoulderY + 3 } as Pt,
    rE: { x: 0, y: 0 } as Pt,
    rF: { x: 0, y: 0 } as Pt,
    /** x do quadril e do joelho de cada perna (−1 = esquerda da tela) */
    legs: [-1, 1].map((side) => ({ side, hx: cx + side * 3.6 * bs, kx: cx + side * (4.4 + k) * bs })),
  }
  const open = stance === 'ficha' ? 1.6 : 0 // braços afastados do corpo na ficha
  g.lE = { x: cx - sh - 1.5 - k * 1.5 - open, y: p.waistY - 3 }
  g.lW = { x: cx - sh - 0.5 - k - open * 2, y: p.hipY + 2 }
  if (stance === 'ficha') {
    g.rE = { x: 2 * cx - g.lE.x, y: g.lE.y }
    g.rF = { x: 2 * cx - g.lW.x, y: g.lW.y + 1.5 }
  } else if (frame === 0) {
    g.rE = { x: cx + sh + 4 + 3 * k, y: p.shoulderY + 11 }
    g.rF = { x: g.rE.x + 1, y: p.shoulderY - 1 }
  } else {
    g.rE = { x: cx + sh + 6, y: p.shoulderY + 12 }
    g.rF = { x: g.am - 2, y: p.anvilTop - 10 }
  }
  return g
}

/**
 * Pontos do corpo para a ficha de medidas (coordenadas do sprite, postura "ficha").
 * "D"/"E" são do personagem: o braço direito dele aparece à esquerda da tela.
 */
export function measureAnchors(p: Proportions, tier: number): Record<MeasurementField, Pt> {
  const g = bodyGeometry(p, tier, 0, 'ficha')
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const [legL, legR] = g.legs
  const thighY = (p.hipY + p.kneeY) / 2
  const calfY = (p.kneeY + p.ankleY) / 2
  return {
    chestCm: { x: g.cx, y: p.shoulderY + g.pecRY + 1.5 },
    waistCm: { x: g.cx - g.waist * 0.4, y: p.waistY - 2 },
    abdomenCm: { x: g.cx + g.waist * 0.4, y: p.waistY + 1.5 },
    hipCm: { x: g.cx + g.waist * 0.7, y: p.hipY + 1.5 },
    armRCm: mid(g.lS, g.lE),
    armLCm: mid(g.rS, g.rE),
    thighRCm: { x: (legL.hx + legL.kx) / 2, y: thighY },
    thighLCm: { x: (legR.hx + legR.kx) / 2, y: thighY },
    calfCm: { x: legR.kx, y: calfY },
  }
}

export function drawHero(p: Proportions, tier: number, frame: 0 | 1, look: SmithLook, stance: Stance = 'forja'): PixelCanvas {
  const g = bodyGeometry(p, tier, frame, stance)
  const { t, k, cx, sh, waist, ua, fa, fist, delt, pecRX, pecRY, legR1, legR2, neck, trapRX, hw, hh, am, lS, lE, lW, rS, rE, rF } = g
  const forge = stance === 'forja'
  const c = new PixelCanvas(p.w, p.h)
  const L = lookRamps(look)
  const skin = L.skin
  const metalBits = t >= 4 ? M.metal : M.leather

  // sombra no chão
  for (let x = Math.floor(cx - sh); x <= cx + sh; x++)
    for (let y = p.ankleY + 2; y <= p.ankleY + 4; y++) {
      const dx = (x - cx) / sh
      const dy = (y - p.ankleY - 3) / 1.6
      if (dx * dx + dy * dy <= 1) c.dot(x, y, '#00000059', false)
    }

  // capa (lenda), atrás de tudo
  if (t >= 4) c.column(cx, p.shoulderY, p.kneeY + 3, (y) => sh + 1.5 + (y - p.shoulderY) * 0.14, M.cape, { bias: -0.1 })

  // bigorna
  if (forge) {
    c.capsule(p.anvilX0 + 2, p.anvilTop + 1.5, p.anvilX1 - 5, p.anvilTop + 1.5, 2.2, 2.2, M.anvil)
    c.capsule(p.anvilX1 - 5, p.anvilTop + 1.2, p.anvilX1, p.anvilTop + 0.8, 2, 0.6, M.anvil)
    c.column(am, p.anvilTop + 3, p.anvilTop + 8, () => 3, M.anvil, { bias: -0.15 })
    c.capsule(am - 6, p.anvilTop + 9.5, am + 6, p.anvilTop + 9.5, 2.2, 2.2, M.anvil)
  }

  // pernas e botas
  for (const { side, hx, kx } of g.legs) {
    c.capsule(hx, p.hipY, kx, p.kneeY, legR1, legR2 + 0.6, M.pants, { contour: true })
    c.capsule(kx, p.kneeY, kx, p.ankleY, legR2 + 0.6, legR2, M.pants, { contour: true })
    c.ellipse(kx + side * 0.5, p.ankleY + 1.6, legR2 + 1.6, 2.6, M.boots, { contour: true })
    c.capsule(kx, p.ankleY - 1, kx, p.ankleY + 0.5, legR2 + 0.8, legR2 + 0.8, M.boots, { contour: true })
  }

  // martelo erguido (quadro 0): cabo atrás do punho
  if (forge && frame === 0) {
    const top = rF.y - lerp(11, 15, k)
    c.capsule(rF.x, rF.y + 4, rF.x, top + hh / 2, t >= 2 ? 1.6 : 1.2, t >= 2 ? 1.6 : 1.2, M.wood)
    hammerHead(c, rF.x, top, hw, hh, t)
  }

  // tronco
  const torsoHW = (y: number) => {
    const f = Math.max(0, Math.min(1, (y - p.shoulderY) / (p.waistY - p.shoulderY)))
    return waist + (sh - 1.5 - waist) * Math.pow(1 - f, 1.2)
  }
  const bodyRamp: Ramp = t === 0 ? M.tunic : skin
  c.column(cx, p.shoulderY - 1, p.waistY + 2, torsoHW, bodyRamp)
  c.ellipse(cx, p.shoulderY + 0.5, trapRX, lerp(2, 4, k), skin, { contour: true })
  c.capsule(cx, p.headCY + p.headRY - 2, cx, p.shoulderY + 1, neck, neck + 0.5, skin)

  if (t === 0) {
    // túnica: decote em V e corda na cintura
    c.column(cx, p.shoulderY - 1, p.shoulderY + 6, torsoHW, M.tunic)
    for (let i = 0; i < 3; i++) for (let x = -2 + i; x <= 2 - i; x++) c.put(cx + x - 0.5, p.shoulderY - 1 + i, skin, 2)
    c.column(cx, p.waistY - 1, p.waistY, (y) => torsoHW(y) + 0.5, M.rope)
  } else {
    // peitoral
    for (const side of [-1, 1]) c.ellipse(cx + side * pecRX * 0.95, p.shoulderY + pecRY + 1.5, pecRX, pecRY, skin, { contour: true, bias: 0.05 })
    const apronTop = Math.round(p.shoulderY + pecRY * 2 + 2.5)
    // avental de couro e alças
    c.column(cx, apronTop, p.kneeY - 1, (y) => waist - 0.5 + ((y - apronTop) / (p.kneeY - apronTop)) * 2, M.leather, { bias: 0.15, contour: true })
    for (const side of [-1, 1]) c.capsule(cx + side * sh * 0.55, p.shoulderY + 0.5, cx + side * (waist - 1.5), apronTop + 1, 1, 1, M.leatherDark)
    c.column(cx, p.waistY, p.waistY + 1, (y) => torsoHW(y) + 0.6, M.leatherDark)
    c.ellipse(cx, p.waistY + 0.6, 1.8, 1.4, M.gold)
  }

  // braço do lado esquerdo da tela, pendurado
  c.ellipse(lS.x - 1, lS.y - 0.5, delt, delt * 0.95, t === 0 ? M.tunic : skin, { contour: true })
  c.capsule(lS.x - 1, lS.y + 1, lE.x, lE.y, ua, ua * 0.85, skin, { contour: true })
  if (t >= 2) c.ellipse((lS.x + lE.x) / 2 + ua * 0.25, (lS.y + lE.y) / 2 + 1, ua * 0.95, ua * 1.45, skin, { contour: true, bias: 0.08 })
  c.capsule(lE.x, lE.y, lW.x, lW.y, fa, fa * 0.82, skin, { contour: true })
  if (t >= 2) c.capsule((lE.x + lW.x) / 2 + 1, (lE.y + lW.y) / 2 + 2, lW.x, lW.y - 1.5, fa + 0.3, fa * 0.82 + 0.3, metalBits, { contour: true, bias: -0.15 })
  c.ellipse(lW.x, lW.y + 1.5, fist, fist * 1.05, skin, { contour: true })

  // braço do lado direito da tela
  const flexed = forge && frame === 0
  c.ellipse(rS.x + 1, rS.y - 0.5, delt, delt * 0.95, t === 0 ? M.tunic : skin, { contour: true })
  c.capsule(rS.x + 1, rS.y + 1, rE.x, rE.y, ua, ua * 0.85, skin, { contour: true })
  if (forge ? t >= 1 : t >= 2) {
    // bíceps: com o braço flexionado o pico fica em cima
    const mx = (rS.x + rE.x) / 2
    const my = (rS.y + rE.y) / 2
    if (forge) c.ellipse(mx + (flexed ? 0 : -0.5), my - (flexed ? ua * 0.45 : 0), ua * 1.25, ua * (flexed ? 1.05 : 1.2), skin, { contour: true, bias: 0.08 })
    else c.ellipse(mx - ua * 0.25, my + 1, ua * 0.95, ua * 1.45, skin, { contour: true, bias: 0.08 })
  }
  c.capsule(rE.x, rE.y, rF.x, rF.y, fa, fa * 0.82, skin, { contour: true })
  if (t >= 2) {
    const end = forge ? { x: rF.x, y: rF.y + (flexed ? 2.5 : -1.5) } : { x: rF.x, y: rF.y - 3 }
    const from = forge ? { x: (rE.x + rF.x) / 2, y: (rE.y + rF.y) / 2 } : { x: (rE.x + rF.x) / 2 - 1, y: (rE.y + rF.y) / 2 + 1 }
    c.capsule(from.x, from.y, end.x, end.y, fa + 0.3, fa * 0.82 + 0.3, metalBits, { contour: true, bias: -0.15 })
  }
  c.ellipse(rF.x, rF.y, fist, fist * (forge ? 1 : 1.05), skin, { contour: true })

  // ombreiras
  if (t >= 3) {
    for (const [x, y] of [
      [lS.x - 1, lS.y - delt * 0.5],
      [rS.x + 1, rS.y - delt * 0.5],
    ]) {
      c.ellipse(x, y, delt * 0.95, delt * 0.58, t >= 4 ? M.metal : M.leatherDark, { contour: true, bias: -0.1 })
      if (t >= 4) c.capsule(x - delt * 0.85, y + delt * 0.35, x + delt * 0.85, y + delt * 0.35, 0.7, 0.7, M.gold)
    }
  }

  // martelo batendo (quadro 1): cabo descendo do punho, cabeça deitada sobre a bigorna
  if (forge && frame === 1) {
    const headY = p.anvilTop - hh - 0.5
    c.capsule(rF.x, rF.y, am, headY + 1, t >= 2 ? 1.6 : 1.2, t >= 2 ? 1.6 : 1.2, M.wood)
    hammerHead(c, am + 1, headY, hw, hh, t)
  }

  drawHead(c, { ...p, cx }, t, L)

  c.outline()

  // brilhos (sem contorno): metal em brasa e faíscas
  if (forge) {
    c.capsule(am - 3, p.anvilTop - 0.5, am + 3, p.anvilTop - 0.5, 1, 1, M.fire, { solid: false, bias: 0.3 })
    if (frame === 1) {
      const sparks: [number, number][] = [
        [-4, -2],
        [-6, -4],
        [4, -3],
        [6, -6],
        [3, -1],
        [-2, -6],
      ]
      for (const [dx, dy] of sparks.slice(0, 3 + Math.round(k * 3)))
        c.put(am + 1 + dx, p.anvilTop + dy, t >= 4 && dx > 0 ? M.rune : M.fire, dy < -3 ? 1 : 0, false)
    }
  }
  return c
}

function hammerHead(c: PixelCanvas, x: number, top: number, w: number, h: number, t: number) {
  c.capsule(x - w / 2 + h / 2, top + h / 2, x + w / 2 - h / 2, top + h / 2, h / 2, h / 2, M.metal, { contour: true })
  if (t >= 3) for (const side of [-1, 1]) c.capsule(x + side * w * 0.22, top + 0.5, x + side * w * 0.22, top + h - 0.5, 0.8, 0.8, M.gold)
  if (t >= 4) for (let i = -1; i <= 1; i++) c.put(x + i * 2, top + h / 2 + (i === 0 ? -0.5 : 0.5), M.rune, 1)
}

function drawHead(c: PixelCanvas, p: Proportions, t: number, L: ReturnType<typeof lookRamps>) {
  const { cx, headCY: y, headRX: rx, headRY: ry } = p
  const skin = L.skin
  const browRamp = L.hair ?? L.beard ?? skin
  const insideHead = (xx: number, yy: number) => (xx - cx) ** 2 / (rx + 0.6) ** 2 + (yy - y) ** 2 / ry ** 2 <= 1

  // orelhas
  for (const side of [-1, 1]) {
    if (L.orc) c.capsule(cx + side * (rx - 0.5), y + 0.5, cx + side * (rx + 3.2), y - 3.2, 1.7, 0.6, skin, { contour: true })
    else c.ellipse(cx + side * rx, y + 1, 1.4, 2, skin)
  }
  // rosto e mandíbula (mais quadrada nas patentes altas)
  c.ellipse(cx, y, rx, ry, skin)
  if (t >= 2) c.ellipse(cx, y + ry * 0.35, rx * 0.95, ry * 0.65, skin, { bias: -0.05 })

  // cabelo
  if (L.hair) {
    c.ellipse(cx, y - ry * 0.32, rx + 0.8, ry * 0.78, L.hair, { clip: (_x, yy) => yy < y - ry * 0.18 })
    for (const side of [-1, 1]) c.capsule(cx + side * (rx - 0.3), y - ry * 0.3, cx + side * (rx - 0.6), y + ry * 0.1, 1.3, 1, L.hair)
    if (t === 0) for (const dx of [-3, -1, 2]) c.put(cx + dx, y - ry * 0.18, L.hair, 3)
  } else {
    c.put(cx - rx * 0.35, y - ry * 0.7, skin, 0)
    c.put(cx - rx * 0.35 + 1, y - ry * 0.7, skin, 0)
  }
  // faixa (ferreiro) e diadema (lenda)
  if (t >= 1 && t <= 2) c.capsule(cx - rx, y - ry * 0.28, cx + rx, y - ry * 0.28, 1, 1, M.cape, { clip: insideHead })
  if (t >= 4) {
    c.capsule(cx - rx, y - ry * 0.35, cx + rx, y - ry * 0.35, 0.9, 0.9, M.gold, { clip: insideHead })
    c.ellipse(cx - 0.5, y - ry * 0.35, 1.3, 1.3, M.rune)
  }

  // olhos
  const ey = Math.round(y + (p.bigEyes ? 0.5 : 0))
  const eyeDX = p.bigEyes ? 3.5 : 2.5
  for (const side of [-1, 1]) {
    const ex = Math.round(cx + side * eyeDX - (side > 0 ? 1 : 0))
    const eh = p.bigEyes ? 3 : 2
    for (let i = 0; i < eh; i++) c.dot(ex, ey + i, EYE)
    if (p.bigEyes) for (let i = 0; i < eh; i++) c.dot(ex + (side < 0 ? 1 : -1), ey + i, EYE)
    c.dot(ex, ey, EYE_GLINT)
    // sobrancelha: reta no aprendiz, franzida (heroica) nas patentes altas
    const by = ey - 2
    for (let i = -1; i <= 1; i++) {
      const slope = t >= 3 ? (i * side > 0 ? -1 : 0) : 0
      c.put(ex + i, by + slope, browRamp, t >= 3 ? 4 : 3)
    }
  }
  // nariz e boca
  c.put(cx - 0.5, ey + (p.bigEyes ? 3 : 2), skin, 3)
  const my = Math.round(y + ry * (p.bigEyes ? 0.55 : 0.6))
  for (let i = -1; i <= 0; i++) c.put(cx + i, my, skin, 4)

  // barba
  if (L.beard) {
    if (t === 1) {
      for (let yy = Math.round(y + ry * 0.35); yy <= y + ry; yy++)
        for (let xx = Math.round(cx - rx); xx <= cx + rx; xx++) {
          const inside = (xx + 0.5 - cx) ** 2 / rx ** 2 + (yy + 0.5 - y) ** 2 / ry ** 2 <= 1
          if (inside && (xx + yy) % 2 === 0 && Math.abs(yy - my) > 0) c.put(xx, yy, L.beard, 3)
        }
    } else if (t >= 2) {
      const len = lerp(3, 8, (t - 2) / 2)
      c.ellipse(cx, y + ry * 0.55, rx * 0.92, len, L.beard, { clip: (_x, yy) => yy >= y + ry * 0.2 })
      c.capsule(cx - 3, my - 1, cx + 2, my - 1, 1.1, 1.1, L.beard)
      for (let i = -1; i <= 0; i++) c.put(cx + i, my, L.beard, 4)
      if (t >= 4) {
        c.capsule(cx - 0.5, y + ry + len - 2, cx - 0.5, y + ry + len + 4, 1.6, 1, L.beard)
        c.capsule(cx - 2, y + ry + len + 1, cx + 1, y + ry + len + 1, 0.7, 0.7, M.gold)
      }
    }
  }
  // presas do orc, por cima da barba
  if (L.orc)
    for (const side of [-1, 1]) {
      const tx = Math.round(cx + side * 2 - (side > 0 ? 1 : 0))
      c.dot(tx, my - 1, TUSK)
      c.dot(tx, my, TUSK)
    }
}
