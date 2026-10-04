import type { MeasurementField } from '../../../domain/types'
import type { PixelSprite } from '../pixelart'
import { Board, type Span } from './canvas'

/**
 * Ferreiro desenhado à mão, 64×88, três-quartos suave (quase de frente), luz de cima à esquerda.
 * Base: o protótipo "forte" (patente 3). As outras patentes afinam/alargam o corpo e trocam o equipamento:
 *   0 Aprendiz: magro, túnica, sem barba · 1 Ferreiro: avental, faixa, barba curta
 *   2 Ferreiro de Aço: braçadeiras · 3 Mestre: ombreiras de couro, martelo com ouro
 *   4 Lenda: mais largo, capa, ombreiras de aço, diadema, martelo rúnico, barba trançada
 * Paleta (ver palette.ts): o contorno · A–E pele · h i j cabelo · b c d barba · w e olho · m boca
 * L M N O couro · p q r calça · k l n bota · u v y túnica · K Q Z capa · 1–4 metal · W X madeira
 * G g ouro · R runa · T U presas · s sombra no chão
 */

export const SMITH_W = 64
export const SMITH_H = 88

export interface SmithShape {
  bald: boolean
  beardless: boolean
  orc: boolean
}

interface Build {
  /** braços se aproximam do centro (tronco mais estreito) */
  s: number
  /** braços mais finos (do lado de fora) */
  t: number
  /** pernas mais finas */
  leg: number
  /** largura da cabeça do martelo */
  hammer: number
}

const BUILDS: Build[] = [
  { s: 4, t: 4, leg: 1, hammer: 10 },
  { s: 3, t: 2, leg: 0, hammer: 12 },
  { s: 1, t: 1, leg: 0, hammer: 14 },
  { s: 0, t: 0, leg: 0, hammer: 16 },
  { s: -1, t: -1, leg: 0, hammer: 16 },
]

const mx = (x: number) => 63 - x
const mirror = (list: Span[]): Span[] => list.map(([a, z]) => [mx(z), mx(a)])

// ---------- desenho base (formas da patente 3; deslocadas por patente) ----------
const TORSO: Span[] = [
  [22, 41], [20, 43], [18, 45], [17, 46], [16, 47], [16, 47], [16, 47], [16, 47], [17, 46], [17, 46], // y25..34
  [18, 45], [19, 44], [19, 44], [20, 43], [20, 43], [20, 43], [20, 43], [20, 43], [20, 43], [21, 42], // y35..44
  [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], [21, 42], // y45..54
]
const DELT: Span[] = [[14, 19], [12, 21], [11, 22], [10, 22], [9, 22], [9, 21], [9, 21], [9, 20], [9, 19], [9, 18], [10, 17]] // y24..34
const UPPER: Span[] = [[9, 17], [8, 17], [7, 17], [7, 17], [7, 17], [7, 16], [7, 16], [7, 16], [8, 16], [8, 15], [8, 15], [9, 14], [9, 14]] // y35..47
const FORE: Span[] = [[7, 15], [6, 15], [6, 15], [6, 14], [6, 14], [7, 14], [7, 13], [7, 13], [7, 13], [8, 13], [8, 13]] // y48..58
const FIST: Span[] = [[7, 14], [6, 14], [6, 14], [6, 14], [6, 14], [7, 13], [8, 12]] // y59..65
const LEG: Span[] = [[21, 30], [21, 30], [21, 30], [21, 29], [21, 29], [22, 29], [22, 29], [22, 29], [22, 28], [22, 28], [22, 28], [22, 28], [22, 28], [22, 28], [22, 28]] // y64..78
const BOOT: Span[] = [[20, 28], [19, 28], [19, 29], [18, 29], [18, 29], [18, 29], [19, 28]] // y78..84

// cabeça mais estreita e menos redonda: testa reta, laterais retas, maxilar quadrado
const FACE: Span[] = [
  [26, 37], [24, 39], [23, 40], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], // y6..15
  [22, 41], [22, 41], [23, 40], [23, 40], [24, 39], [24, 39], [25, 38], [27, 36], [28, 35], // y16..24
]

export interface DrawOptions {
  /** 0 = parado; 1 = respirando (tronco 1 px para baixo) */
  frame?: 0 | 1
  /** com o martelo na mão (falso na ficha de medidas) */
  hammer?: boolean
  /** martelada: "raise" ergue o martelo acima da cabeça; "impact" bate no chão com faíscas */
  pose?: 'idle' | 'raise' | 'impact'
}

export function drawSmith(tier: number, shape: SmithShape, opts: DrawOptions = {}): PixelSprite {
  const T = Math.max(0, Math.min(4, Math.round(tier)))
  const { s, t, leg, hammer: hw } = BUILDS[T]
  const b = new Board(SMITH_W, SMITH_H)
  const rows = (y0: number, list: Span[], ch: string) => b.part(y0, list, ch)
  const paint = (y0: number, list: Span[], ch: string, over?: string) => b.paint(y0, list, ch, over)
  const sh = (list: Span[], dl: number, dr = dl): Span[] => list.map(([a, z]) => [a + dl, z - dr])

  // ---------- sombra no chão ----------
  rows(85, [[14, 60], [18, 56]], 's')

  // ---------- capa (lenda), atrás de tudo ----------
  if (T >= 4) {
    for (let y = 26; y <= 80; y++) {
      const spread = Math.min(4, Math.floor((y - 26) / 10))
      b.h1(y, 8 - spread, 55 + spread, 'Q')
      b.set(8 - spread, y, 'K')
      b.set(9 - spread, y, 'K')
      b.set(55 + spread, y, 'Z')
      b.set(54 + spread, y, 'Z')
    }
    for (const x of [13, 50]) for (let y = 60; y <= 80; y++) b.set(x, y, 'Z')
    b.h1(80, 4, 59, 'Z')
  }

  const raise = opts.pose === 'raise' && opts.hammer !== false
  // ---------- martelo (cabeça no chão, cabo até a mão direita) ----------
  if (opts.hammer !== false && !raise) {
    // o cabo acompanha a mão direita (braços mais finos ficam mais perto do corpo)
    const hx = 53 - s
    for (let y = 63; y <= 78; y++) {
      b.set(hx - 1, y, 'W')
      b.set(hx, y, 'X')
    }
    const half = hw / 2
    const a = Math.round(hx - half)
    const z = Math.round(hx + half)
    const top = T === 0 ? 79 : 78
    const head: Span[] = []
    for (let y = top; y <= 84; y++) head.push(y === top || y === 84 ? [a + 1, z - 1] : [a, z])
    rows(top, head, '3')
    paint(top, [[a + 1, z - 1], [a, z]], '2')
    paint(top, [[a + 3, a + 7]], '1')
    paint(top + 1, [[a + 1, a + 3]], '1')
    for (let y = top + 2; y <= 82; y++) {
      b.set(a, y, '2')
      b.set(z, y, '4')
    }
    paint(83, [[a, z], [a + 1, z - 1]], '4')
    if (T >= 3)
      for (const x of [a + 3, z - 3])
        for (let y = top; y <= 84; y++) if (b.get(x, y) !== '.') b.set(x, y, y <= top + 1 ? 'G' : 'g')
    if (T >= 4) b.dots('R', [[a + 6, 81], [a + 8, 80], [a + 10, 81]])
  }

  // ---------- pernas e botas ----------
  if (T === 0) {
    // aprendiz não tem avental: quadril da calça aparece entre a túnica e as pernas
    rows(53, [[22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41], [22, 41]], 'q')
    for (let y = 53; y <= 63; y++) {
      b.set(22, y, 'p')
      b.set(41, y, 'r')
    }
    for (let y = 58; y <= 63; y++) b.set(31, y, 'r')
  }
  const legL = sh(LEG, leg)
  for (const lg of [legL, mirror(legL)]) {
    rows(64, lg, 'q')
    lg.forEach(([a, z], i) => {
      b.set(a, 64 + i, 'p')
      b.set(a + 1, 64 + i, 'p')
      b.set(z, 64 + i, 'r')
    })
  }
  b.dots('r', [[24, 70], [25, 71], [38, 70], [39, 71], [26, 66], [37, 66]])
  rows(78, BOOT, 'l')
  rows(78, mirror(BOOT), 'l')
  paint(78, [[20, 24], [19, 22]], 'k')
  paint(78, [[35, 39], [35, 37]], 'k')
  paint(83, [[18, 29], [19, 28]], 'n')
  paint(83, mirror([[18, 29], [19, 28]]), 'n')
  b.h1(78, 20, 28, 'n')
  b.h1(78, 35, 43, 'n')

  // ---------- tronco ----------
  const torso = sh(TORSO, s)
  rows(25, torso, 'C')
  if (T === 0) {
    // túnica do aprendiz: cobre o tronco, decote em V, corda na cintura
    rows(25, torso, 'v')
    torso.forEach(([a, z], i) => {
      b.set(a, 25 + i, 'u')
      b.set(a + 1, 25 + i, 'u')
      b.set(z, 25 + i, 'y')
      b.set(z - 1, 25 + i, 'y')
    })
    rows(25, [[28, 35], [29, 34], [30, 33], [31, 32]], 'C')
    b.dots('D', [[28, 25], [35, 25], [29, 26], [34, 26]])
    for (const x of [27, 33, 38]) for (let y = 38; y <= 54; y++) if (b.get(x, y) === 'v') b.set(x, y, 'y')
    b.h1(50, torso[25][0], torso[25][1], 'W')
    b.h1(51, torso[26][0], torso[26][1], 'X')
  } else {
    // trapézio e clavículas
    paint(25, sh([[22, 27], [20, 26], [19, 24]], s, -s), 'B')
    paint(25, sh([[37, 41], [38, 43], [40, 44]], -s, s), 'D')
    b.h1(27, 23 + s, 28, 'D')
    b.h1(27, 35, 40 - s, 'D')
    // peitorais (só com músculo à mostra)
    paint(29, sh([[20, 29], [19, 30], [18, 30], [18, 30], [19, 30], [20, 29], [22, 28]], s, 0), 'B')
    paint(29, sh([[22, 26], [20, 24], [20, 22]], s, -s), 'A')
    b.h1(36, 21 + s, 30, 'D')
    b.dots('D', [[19 + s, 35], [20 + s, 35], [29, 35], [30, 35], [30, 34]])
    paint(29, sh([[34, 41], [33, 42], [33, 42], [33, 41], [34, 40]], 0, s), 'B')
    paint(29, [[34, 37]], 'A')
    b.h1(36, 33, 43 - s, 'D')
    paint(30, sh([[43, 46], [43, 46], [43, 46], [42, 45], [42, 45], [41, 44]], -s, s), 'D')
    for (let y = 29; y <= 36; y++) b.set(31, y, 'D')
    b.set(32, 30, 'D')
    for (let y = 37; y <= 54; y++) {
      b.set(torso[y - 25][0], y, 'B')
      b.set(torso[y - 25][1], y, 'D')
    }
    // avental de couro
    const ai = Math.max(0, s - 1)
    const apron: Span[] = []
    for (let y = 37; y <= 67; y++) apron.push(y < 50 ? [22 + ai, 41 - ai] : y < 60 ? [21 + ai, 42 - ai] : [20 + ai, 43 - ai])
    rows(37, apron, 'M')
    apron.forEach(([a, z], i) => {
      b.set(a + 1, 37 + i, 'L')
      b.set(a + 2, 37 + i, 'L')
      b.set(z - 1, 37 + i, 'N')
      b.set(z, 37 + i, 'N')
    })
    b.h1(37, apron[0][0], apron[0][1], 'O')
    b.h1(38, apron[1][0] + 1, apron[1][1] - 1, 'N')
    for (let y = 44; y <= 66; y++) b.set(27, y, 'N')
    for (let y = 47; y <= 66; y++) b.set(35, y, 'N')
    for (let y = 46; y <= 60; y++) b.set(28, y, 'L')
    b.h1(66, apron[29][0], apron[29][1], 'N')
    b.h1(67, apron[30][0], apron[30][1], 'O')
    for (const y of [50, 51, 52]) b.h1(y, torso[y - 25][0], torso[y - 25][1], y === 50 ? 'N' : 'O')
    rows(50, [[30, 33], [30, 33], [30, 33]], 'G')
    b.dots('g', [[31, 51], [32, 51], [33, 52]])
    if (T >= 4) b.dots('R', [[31, 51]])
    for (let y = 55; y <= 60; y++) {
      b.set(35, y, 'N')
      b.set(40 - ai, y, 'N')
    }
    b.h1(55, 35, 40 - ai, 'N')
    b.h1(60, 35, 40 - ai, 'O')
    for (let y = 26; y <= 37; y++) {
      b.set(23 + s, y, 'N')
      b.set(24 + s, y, 'O')
      b.set(39 - s, y, 'N')
      b.set(40 - s, y, 'O')
    }
  }

  // ---------- braços (mesma massa dos dois lados) ----------
  const armSh = (list: Span[]): Span[] => list.map(([a, z]) => [a + s + t, z + s])
  const off = s + Math.round(t / 2) // detalhes acompanham o braço
  const arm = (side: 'L' | 'R') => {
    const S = (list: Span[]) => (side === 'L' ? list : mirror(list))
    const X = (x: number) => (side === 'L' ? x + off : mx(x + off))
    const dots = (ch: string, pts: [number, number][]) => b.dots(ch, pts.map(([x, y]) => [X(x), y]))
    const skinTop = T === 0 ? 'v' : 'C' // manga da túnica no aprendiz
    const delt = S(armSh(DELT))
    rows(24, delt, skinTop)
    const upper = S(armSh(UPPER))
    // luz do lado esquerdo de cada parte, sombra no direito (luz vem da esquerda)
    const shade = (y0: number, list: Span[], hiW: number, shW: number, lit: string, dark: string) =>
      list.forEach(([a, z], i) => {
        for (let k = 0; k < hiW && a + 1 + k < z; k++) if (b.get(a + 1 + k, y0 + i) !== '.') b.set(a + 1 + k, y0 + i, lit)
        for (let k = 0; k < shW; k++) b.set(z - k, y0 + i, dark)
      })
    if (T === 0) {
      shade(24, delt, 2, 2, 'u', 'y')
      shade(35, upper.slice(0, 3), 2, 1, 'u', 'y')
    } else {
      shade(25, delt.slice(1, 8), side === 'L' ? 5 : 4, 0, 'B', 'D')
      dots('A', [[13, 26], [14, 26], [15, 26], [11, 27], [12, 27], [13, 27], [10, 28], [11, 28]])
      shade(31, delt.slice(7), 0, 3, 'B', 'D')
      dots('D', [[10, 34], [11, 34], [12, 34], [13, 34], [14, 34], [15, 34], [16, 34]])
      dots('D', [[12, 28], [13, 29], [13, 30]])
    }
    // ombreira (mestre: couro; lenda: aço com friso de ouro)
    const shoulderPad = () => {
      if (T < 3) return
      const [a, z] = delt[3]
      const pad: Span[] = [[a + 2, z - 2], [a, z], [a - 1, z + 1], [a - 1, z + 1], [a, z]]
      const m = T >= 4 ? ['2', '3', '4', 'o'] : ['L', 'M', 'N', 'O']
      rows(23, pad, m[1])
      shade(23, pad, 3, 2, m[0], m[2])
      b.h1(27, pad[4][0], pad[4][1], T >= 4 ? 'G' : m[3])
      b.dots(m[3], [[Math.round((a + z) / 2), 25]])
    }
    if (side === 'R' && raise) {
      raisedArm(shade)
      shoulderPad()
      return
    }
    // (a parte do braço abaixo do ombro, pendurada)
    rows(35, upper, 'C')
    if (T === 0) rows(35, upper.slice(0, 3), 'v')
    shade(T === 0 ? 38 : 36, upper.slice(T === 0 ? 3 : 1, 9), T === 0 ? 2 : 4, 2, 'B', 'D')
    if (T >= 1) {
      dots('A', [[8, 37], [9, 37], [8, 38], [9, 38], [8, 39], [9, 39]])
      dots('D', [[13, 38], [13, 39], [13, 40], [13, 41], [12, 42], [12, 43]])
    }
    shade(44, upper.slice(9), 1, 2, 'B', 'D')
    if (side === 'R') upper.forEach(([a], i) => b.set(a, 35 + i, 'E'))
    dots('D', [[10, 47], [11, 47], [12, 47], [13, 47]])
    // antebraço
    const fore = S(armSh(FORE))
    rows(48, fore, 'C')
    shade(48, fore, 3, 1, 'B', 'D')
    if (T >= 1) dots('D', [[11, 49], [11, 50], [12, 51], [12, 52]])
    // braçadeira (patente 2+) ou munhequeira
    const band = T >= 2 ? fore.slice(3) : fore.slice(7)
    const by0 = T >= 2 ? 51 : 55
    const mat = T >= 4 ? ['2', '3', '4', 'o'] : ['L', 'M', 'N', 'O']
    rows(by0, band, mat[1])
    shade(by0, band, 2, 1, mat[0], mat[2])
    b.h1(by0, band[0][0], band[0][1], mat[0])
    b.h1(58, band[band.length - 1][0], band[band.length - 1][1], mat[3])
    if (T >= 4) b.h1(by0 + 1, band[1][0], band[1][1], 'G')
    // punho fechado
    // mão menor nos corpos magros
    const fist = S(FIST.map(([a, z]) => [a + s + Math.max(0, Math.ceil(t / 2)), z + s - Math.max(0, Math.floor(t / 2))]))
    rows(59, fist, 'C')
    shade(59, fist.slice(0, 2), 5, 0, 'B', 'D')
    const fx = fist[3][0]
    b.dots('D', [[fx + 2, 62], [fx + 4, 62], [fx + 6, 62], [fx + 2, 63], [fx + 4, 63], [fx + 6, 63]])
    paint(64, fist.slice(5), 'D')
    shoulderPad()
  }

  /**
   * Braço direito erguido com o martelo acima da cabeça (preparando a martelada):
   * braço sai do ombro para a direita, cotovelo dobrado, antebraço e punho para cima.
   */
  const raisedArm = (shade: (y0: number, list: Span[], hiW: number, shW: number, lit: string, dark: string) => void) => {
    const A = (list: Span[]): Span[] => list.map(([a, z]) => [a - s, z - s - t])
    const upperR = A([[52, 57], [50, 59], [49, 60], [48, 60], [48, 60], [48, 59], [49, 58], [50, 57]]) // y26..33
    const foreR = A([[55, 60], [55, 61], [55, 61], [56, 61], [56, 61], [56, 61], [55, 61]]) // y19..25
    const fistR = A([[55, 60], [54, 61], [54, 61], [54, 61], [54, 61], [55, 61], [55, 60]]) // y12..18
    // martelo: cabo vertical acima do punho, cabeça no alto
    const hx = Math.round((fistR[3][0] + fistR[3][1]) / 2)
    for (let y = 5; y <= 20; y++) {
      b.set(hx - 1, y, 'W')
      b.set(hx, y, 'X')
    }
    const half = Math.floor(hw / 2)
    const z = Math.min(63, hx + half)
    const a = z - hw
    const head: Span[] = [[a + 1, z - 1], [a, z], [a, z], [a, z], [a, z], [a + 1, z - 1]] // y0..5
    rows(0, head, '3')
    paint(0, [[a + 1, z - 1], [a, z]], '2')
    paint(0, [[a + 3, a + 7]], '1')
    for (let y = 1; y <= 4; y++) {
      b.set(a, y, '2')
      b.set(z, y, '4')
    }
    paint(4, [[a, z], [a + 1, z - 1]], '4')
    if (T >= 3) for (const x of [a + 3, z - 3]) for (let y = 0; y <= 5; y++) if (b.get(x, y) !== '.') b.set(x, y, y <= 1 ? 'G' : 'g')
    if (T >= 4) b.dots('R', [[a + 6, 3], [a + 8, 2], [a + 10, 3]])
    // braço (bíceps contraído em cima), antebraço e punho
    rows(26, upperR, 'C')
    upperR.forEach(([ua, uz], i) => {
      if (i <= 1) for (let x = ua + 1; x < uz; x++) b.set(x, 26 + i, i === 0 ? 'A' : 'B')
      if (i >= 6) for (let x = ua; x <= uz; x++) b.set(x, 26 + i, 'D')
      b.set(uz, 26 + i, 'D')
    })
    b.dots('A', [[53 - s, 27], [54 - s, 27], [52 - s, 28]])
    rows(19, foreR, 'C')
    shade(19, foreR, 2, 1, 'B', 'D')
    b.h1(25, foreR[6][0], foreR[6][1], 'D') // dobra do cotovelo
    // braçadeira (patente 2+) ou munhequeira, logo abaixo do punho
    const band = T >= 2 ? foreR.slice(0, 4) : foreR.slice(0, 2)
    const mat = T >= 4 ? ['2', '3', '4', 'o'] : ['L', 'M', 'N', 'O']
    rows(19, band, mat[1])
    shade(19, band, 2, 1, mat[0], mat[2])
    b.h1(19 + band.length - 1, band[band.length - 1][0], band[band.length - 1][1], mat[3])
    if (T >= 4) b.h1(20, band[1][0], band[1][1], 'G')
    rows(12, fistR, 'C')
    shade(12, fistR.slice(0, 2), 4, 0, 'B', 'D')
    const fx = fistR[3][0]
    b.dots('D', [[fx + 1, 15], [fx + 3, 15], [fx + 5, 15], [fx + 1, 16], [fx + 3, 16], [fx + 5, 16]])
    paint(17, fistR.slice(5), 'D')
    // separação entre o braço e o ombro
    b.h1(34, upperR[7][0], upperR[7][1], 'E')
  }

  arm('L')
  arm('R')
  if (T >= 1) {
    b.dots('E', [[22, 26], [22, 27], [21, 28], [21, 29], [20, 30], [20, 31], [19, 32], [18, 33], [17, 34]].map(([x, y]) => [x + s, y] as [number, number]))
    b.dots('E', [[41, 26], [41, 27], [42, 28], [42, 29], [43, 30], [43, 31], [44, 32], [45, 33], [46, 34]].map(([x, y]) => [x - s, y] as [number, number]))
  }

  drawHead(b, T, shape)

  // ---------- respiração: tronco e cabeça 1 px para baixo ----------
  if (opts.frame === 1) {
    for (let y = 57; y >= 1; y--) b.g[y] = [...b.g[y - 1]]
    b.g[0] = Array<string>(SMITH_W).fill('.')
  }

  b.outline('o', 's')

  // ---------- impacto da martelada: faíscas e poeira (sem contorno) ----------
  if (opts.pose === 'impact' && opts.hammer !== false) {
    const hx = 53 - s
    const sparks: [number, number, string][] = [
      [-10, 78, 'G'], [-12, 76, '1'], [-9, 75, 'G'], [-14, 79, 'G'], [-7, 73, '1'],
      [7, 76, 'G'], [9, 74, '1'], [6, 73, 'G'], [8, 77, 'G'], [4, 71, '1'],
      [-4, 75, 'G'], [4, 74, 'G'], [0, 73, '1'],
    ]
    const put = (x: number, y: number, ch: string) => {
      if (x >= 0 && x < SMITH_W && y >= 0 && y < SMITH_H && (b.get(x, y) === '.' || b.get(x, y) === 's')) b.set(x, y, ch)
    }
    // faíscas: riscos de 2 px saindo do ponto de impacto
    for (const [dx, y, ch] of sparks.slice(0, 7 + T * 2)) {
      const c = T >= 4 && dx > 0 && ch === 'G' ? 'R' : ch
      put(hx + dx, y, c)
      put(hx + dx - Math.sign(dx), y + 1, c)
    }
    // clarão no ponto do impacto
    for (const [dx, y] of [[-9, 81], [-10, 82], [-9, 83], [9, 81], [10, 82], [9, 83]] as [number, number][]) put(hx + dx, y, '1')
    // nuvem de poeira dos dois lados da cabeça do martelo
    for (const side of [-1, 1])
      for (const [dx, y] of [[11, 85], [12, 85], [13, 85], [14, 85], [12, 84], [13, 84], [14, 84], [15, 84], [13, 83], [14, 83], [15, 82], [16, 83]] as [number, number][])
        put(hx + side * dx, y, 'F')
  }
  return b.toSprite()
}

function drawHead(b: Board, T: number, shape: SmithShape) {
  const rows = (y0: number, list: Span[], ch: string) => b.part(y0, list, ch)
  const paint = (y0: number, list: Span[], ch: string, over?: string) => b.paint(y0, list, ch, over)

  rows(6, FACE, 'C')
  // pescoço (mais grosso nas patentes altas)
  const neck = T === 0 ? 2 : 0
  rows(23, [[27 + neck, 36 - neck], [26 + neck, 37 - neck], [26 + neck, 37 - neck], [27 + neck, 36 - neck]], 'D')

  // orelhas (pontudas no orc)
  if (shape.orc) {
    rows(9, [[17, 17], [17, 19], [18, 21], [18, 21], [19, 21], [19, 21], [19, 21], [20, 21], [20, 21]], 'C')
    rows(9, mirror([[17, 17], [17, 19], [18, 21], [18, 21], [19, 21], [19, 21], [19, 21], [20, 21], [20, 21]]), 'D')
    b.dots('B', [[17, 10], [18, 11], [18, 12]])
    b.dots('D', [[20, 13], [20, 14], [20, 15]])
    b.dots('E', [[43, 13], [43, 14]])
  } else {
    rows(13, [[19, 21], [19, 21], [19, 21], [19, 21], [20, 21], [21, 21]], 'C')
    b.dots('D', [[20, 14], [20, 15], [21, 16]])
    b.dots('B', [[19, 14], [19, 15]])
    rows(13, [[42, 43], [42, 44], [42, 44], [42, 44], [42, 43]], 'D')
    b.dots('E', [[43, 15], [43, 16]])
  }

  // luz e sombra do rosto
  paint(9, [[23, 33], [23, 33], [23, 32], [23, 30], [23, 29], [23, 28], [23, 27], [23, 27], [23, 27], [23, 27]], 'B')
  paint(9, [[24, 29], [24, 27]], 'A')
  b.dots('A', [[24, 16], [25, 16], [24, 17]])
  paint(10, [[39, 41], [38, 41], [38, 41], [38, 41], [38, 41], [38, 41], [38, 41], [38, 41], [38, 40], [37, 40], [37, 39]], 'D')
  // sobrancelhas franzidas, com ruga entre elas
  b.h1(10, 24, 27, 'c')
  b.h1(11, 26, 29, 'c')
  b.h1(10, 36, 39, 'c')
  b.h1(11, 34, 37, 'c')
  b.dots('d', [[29, 11], [34, 11], [24, 10], [39, 10]])
  if (T >= 1) b.dots('D', [[31, 11], [32, 12], [31, 12]])
  // órbitas, pálpebras, olhos com brilho
  b.h1(12, 25, 29, 'C')
  b.h1(13, 25, 29, 'D')
  b.h1(12, 34, 38, 'D')
  b.h1(13, 34, 38, 'D')
  b.h1(14, 25, 29, 'o')
  b.h1(14, 34, 38, 'o')
  b.dots('w', [[25, 15], [26, 15], [29, 15], [34, 15], [37, 15], [38, 15]])
  b.dots('e', [[27, 15], [28, 15], [35, 15], [36, 15], [27, 16], [28, 16], [35, 16], [36, 16]])
  b.dots('w', [[27, 15], [35, 15]])
  b.dots('C', [[25, 16], [26, 16], [29, 16], [34, 16], [37, 16]])
  b.h1(17, 26, 28, 'D')
  b.h1(17, 35, 37, 'D')
  b.dots('B', [[38, 17], [39, 16]])
  // nariz
  for (let y = 14; y <= 17; y++) b.set(31, y, 'A')
  for (let y = 15; y <= 18; y++) b.set(33, y, 'D')
  b.h1(18, 30, 32, 'B')
  b.set(31, 18, 'A')
  b.dots('E', [[30, 19], [33, 19]])
  b.h1(19, 31, 32, 'D')
  b.dots('D', [[29, 18], [34, 18]])
  // boca e queixo (aparecem sem barba)
  b.h1(21, 29, 34, 'm')
  b.dots('E', [[29, 21], [34, 21]])
  b.h1(22, 30, 33, 'D')
  b.dots('B', [[30, 23], [31, 23]])
  b.dots('D', [[27, 24], [36, 24], [28, 25], [35, 25]])

  // cabelo ou careca
  if (shape.bald) {
    rows(3, [[29, 34], [27, 36], [25, 38]], 'C')
    paint(3, [[29, 31], [27, 30], [25, 29]], 'B')
    b.dots('A', [[28, 4], [29, 4], [27, 5], [26, 6], [27, 6]])
    b.dots('D', [[36, 4], [37, 5], [38, 6], [39, 7], [40, 8]])
  } else {
    rows(1, [[28, 35], [25, 38], [23, 40], [22, 41], [21, 42], [21, 42], [20, 42], [20, 42]], 'i')
    rows(9, [[20, 23], [20, 22], [20, 22], [20, 21], [20, 21], [20, 21]], 'i')
    rows(9, [[40, 42], [41, 42], [41, 42], [42, 42]], 'i')
    b.dots('i', [[30, 0], [31, 0], [26, 1], [25, 2], [37, 1], [38, 2], [42, 4], [43, 5], [19, 7], [19, 8], [19, 11], [43, 9]])
    const strands: [number, Span[]][] = [
      [1, [[29, 33]]],
      [2, [[27, 29], [32, 35]]],
      [3, [[25, 27], [30, 31], [34, 37]]],
      [4, [[24, 25], [28, 29], [32, 33], [37, 39]]],
      [5, [[23, 23], [27, 27], [31, 31], [36, 37], [40, 40]]],
      [6, [[22, 22], [26, 26], [35, 35], [40, 40]]],
      [7, [[21, 21], [25, 25], [39, 39]]],
    ]
    for (const [y, list] of strands) for (const [a, z] of list) b.h1(y, a, z, 'h')
    b.h1(7, 28, 31, 'j')
    b.h1(8, 33, 36, 'j')
    b.h1(8, 23, 25, 'j')
    for (let y = 9; y <= 14; y++) b.set(20, y, 'j')
    b.dots('j', [[41, 9], [42, 10], [42, 11]])
    if (T === 0) b.dots('i', [[30, 9], [31, 9], [29, 10], [31, 10], [30, 11], [33, 9], [34, 10]])
    else {
      b.dots('i', [[30, 9], [31, 9], [29, 10], [31, 10], [30, 11]])
      b.dots('j', [[29, 11]])
    }
  }
  // faixa (ferreiro e ferreiro de aço) e diadema (lenda)
  if (T >= 1 && T <= 2) {
    b.h1(8, 21, 42, 'Q')
    b.h1(9, 21, 42, 'Z')
    b.h1(8, 22, 26, 'K')
    b.dots('Q', [[19, 9], [18, 10], [19, 10], [18, 11]]) // pontas da faixa na nuca
  }
  if (T >= 4) {
    b.h1(8, 21, 42, 'G')
    b.h1(9, 22, 41, 'g')
    b.dots('R', [[31, 8], [32, 8]])
    b.dots('1', [[31, 7]])
  }

  // barba (cresce com a patente) ou só o queixo
  if (!shape.beardless) {
    if (T === 0) {
      // aprendiz: barba por fazer
      for (let y = 19; y <= 24; y++)
        for (let x = 23; x <= 40; x++)
          if ((x + y) % 2 === 0 && b.get(x, y) !== '.' && 'CBDA'.includes(b.get(x, y)) && !(y === 21 && x >= 29 && x <= 34)) b.set(x, y, 'c')
    } else {
      // costeletas e bigode
      rows(16, [[22, 23], [22, 24], [22, 24], [22, 24]], 'c')
      rows(16, [[40, 41], [39, 41], [39, 41], [39, 41]], 'c')
      rows(19, [[27, 36], [26, 37]], 'c')
      b.h1(19, 28, 31, 'b')
      b.h1(19, 33, 35, 'b')
      if (T === 1) {
        // barba curta: maxilar e queixo
        rows(20, [[22, 26], [23, 26], [24, 28], [25, 38], [27, 36], [29, 34]], 'c')
        rows(20, [[37, 41], [37, 40], [35, 39]], 'c')
        b.dots('b', [[23, 21], [24, 22], [26, 23], [29, 24], [32, 24], [38, 21]])
        b.h1(21, 29, 34, 'm')
        b.h1(22, 30, 33, 'D')
      } else {
        // barba cheia em tufos
        const len = T >= 4 ? 3 : 0
        rows(20, [[22, 27], [22, 28], [23, 29], [23, 40], [24, 40], [25, 39], [26, 38], [27, 37], [28, 36], [29, 35]], 'c')
        rows(20, [[37, 41], [35, 41], [34, 40]], 'c')
        b.dots('c', [[30, 30], [32, 30], [34, 30]])
        b.h1(21, 29, 34, 'm')
        b.dots('E', [[29, 21], [34, 21]])
        b.h1(22, 30, 33, 'D')
        const tufts: [number, Span[]][] = [
          [17, [[22, 22]]],
          [20, [[23, 24]]],
          [21, [[24, 26], [37, 38]]],
          [23, [[24, 25], [27, 29], [32, 33]]],
          [24, [[25, 26], [30, 31], [35, 36]]],
          [25, [[26, 28], [32, 33]]],
          [26, [[27, 28], [30, 31], [34, 35]]],
          [27, [[29, 30], [33, 34]]],
        ]
        for (const [y, list] of tufts) for (const [a, z] of list) b.h1(y, a, z, 'b')
        b.dots('d', [[38, 22], [39, 22], [39, 23], [37, 24], [38, 24], [36, 25], [37, 25], [35, 26], [36, 27], [34, 28], [31, 28], [32, 29], [40, 19], [41, 20]])
        if (len) {
          // trança com anel de ouro
          rows(30, [[30, 33], [30, 33], [31, 32], [30, 33], [31, 32], [31, 32]], 'c')
          b.dots('b', [[30, 30], [31, 32], [30, 33]])
          b.h1(33, 30, 33, 'G')
          b.dots('g', [[32, 33], [33, 33]])
        }
      }
    }
  }
  // presas do orc, saindo do lábio de baixo
  if (shape.orc) {
    b.dots('T', [[29, 20], [34, 20]])
    b.dots('U', [[29, 21], [34, 21]])
  }
}

/**
 * Pontos do corpo para a ficha de medidas (coordenadas do sprite, sem martelo).
 * "D"/"E" são do personagem: o braço direito dele aparece à esquerda da tela.
 */
export function measureAnchors(tier: number): Record<MeasurementField, { x: number; y: number }> {
  const T = Math.max(0, Math.min(4, Math.round(tier)))
  const { s, t } = BUILDS[T]
  const armX = 12 + s + Math.round(t / 2)
  return {
    chestCm: { x: 31.5, y: 32 },
    armRCm: { x: armX, y: 40 },
    armLCm: { x: mx(armX), y: 40 },
    waistCm: { x: 26, y: 47 },
    abdomenCm: { x: 37, y: 54 },
    hipCm: { x: 40, y: 61 },
    thighRCm: { x: 25, y: 69 },
    thighLCm: { x: 38, y: 69 },
    calfCm: { x: 38, y: 75 },
  }
}
