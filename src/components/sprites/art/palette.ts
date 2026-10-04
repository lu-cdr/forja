import type { SmithLook } from '../../../domain/types'
import type { Palette } from '../pixelart'

/** Paleta base do ferreiro (luz vinda de cima à esquerda; contorno marrom-escuro, não preto). */
export const BASE: Palette = {
  o: '#20120d',
  // pele: A brilho … E sombra funda
  A: '#ffd4ab',
  B: '#eda676',
  C: '#c97d50',
  D: '#93512f',
  E: '#62321c',
  // cabelo
  h: '#8c6a52',
  i: '#5e4434',
  j: '#3a281d',
  // barba
  b: '#5a3824',
  c: '#3d2416',
  d: '#24130a',
  // olhos e boca
  w: '#f2ede2',
  e: '#1a0f0a',
  m: '#6e2a20',
  // couro
  L: '#b98250',
  M: '#8f5a33',
  N: '#66391d',
  O: '#43230f',
  // calça
  p: '#646a7d',
  q: '#444a5c',
  r: '#2d3140',
  // bota
  k: '#7d4f2d',
  l: '#553219',
  n: '#331d0e',
  // túnica do aprendiz
  u: '#a9c1d1',
  v: '#7f9db3',
  y: '#566f82',
  // capa e faixa
  K: '#e0485a',
  Q: '#a8273a',
  Z: '#6a1424',
  // metal
  '1': '#f4f7f8',
  '2': '#b9c3cc',
  '3': '#7c8794',
  '4': '#4c5460',
  // madeira
  W: '#b8803f',
  X: '#7a4a1f',
  // ouro e runa
  G: '#f2c24c',
  g: '#a0701c',
  R: '#6ef3ff',
  // presas do orc
  T: '#f4eedb',
  U: '#c7bc9d',
  // bigorna
  '5': '#7b828c',
  '6': '#4a4f57',
  '7': '#30343a',
  // metal em brasa e faíscas
  H: '#ff7a2f',
  I: '#ffd36b',
  J: '#ffe28a',
  // chão de pedra
  '8': '#2b2622',
  '9': '#1f1b18',
  V: '#36302b',
}

/** Rampas trocáveis (troca de paleta): pele A–E, cabelo h i j, barba b c d. */
export const SKIN_RAMPS: Record<string, string[]> = {
  clara: ['#fff0e0', '#ffd6b5', '#eaa985', '#bd7556', '#874633'],
  media: ['#ffd4ab', '#eda676', '#c97d50', '#93512f', '#62321c'],
  morena: ['#f0bb8c', '#cf8e5f', '#a8673c', '#774222', '#4e2814'],
  escura: ['#c08a62', '#93603d', '#6f4327', '#4e2c18', '#331a0d'],
  orc: ['#d2ee96', '#9fcb63', '#72a442', '#4b7a2b', '#2f5219'],
}
export const HAIR_RAMPS: Record<string, string[]> = {
  preto: ['#4a3f3a', '#2b2421', '#171211'],
  'castanho-escuro': ['#8c6a52', '#5e4434', '#3a281d'],
  castanho: ['#a8703f', '#7a4a26', '#4f2d15'],
  ruivo: ['#e07a3a', '#b1471c', '#76290f'],
  loiro: ['#f5d47e', '#d2a445', '#93681e'],
  grisalho: ['#d2d0cc', '#9c9893', '#625e5a'],
  branco: ['#ffffff', '#e2ddd2', '#a9a397'],
}

/** Valores especiais: cabelo "careca", barba "sem". */
export const BALD = 'careca'
export const NO_BEARD = 'sem'

export const DEFAULT_LOOK: SmithLook = { skin: 'media', hair: 'castanho-escuro', beard: 'preto' }

export const SKIN_OPTIONS = [
  { id: 'clara', label: 'Clara' },
  { id: 'media', label: 'Média' },
  { id: 'morena', label: 'Morena' },
  { id: 'escura', label: 'Escura' },
  { id: 'orc', label: 'Orc' },
].map((o) => ({ ...o, color: SKIN_RAMPS[o.id][2] }))

export const HAIR_OPTIONS = [
  { id: 'preto', label: 'Preto' },
  { id: 'castanho-escuro', label: 'Castanho escuro' },
  { id: 'castanho', label: 'Castanho' },
  { id: 'ruivo', label: 'Ruivo' },
  { id: 'loiro', label: 'Loiro' },
  { id: 'grisalho', label: 'Grisalho' },
  { id: 'branco', label: 'Branco' },
].map((o) => ({ ...o, color: HAIR_RAMPS[o.id][1] }))

export function paletteFor(look: SmithLook): Palette {
  const skin = SKIN_RAMPS[look.skin] ?? SKIN_RAMPS.media
  const hair = HAIR_RAMPS[look.hair] ?? HAIR_RAMPS['castanho-escuro']
  const beard = HAIR_RAMPS[look.beard] ?? HAIR_RAMPS.preto
  return {
    ...BASE,
    A: skin[0],
    B: skin[1],
    C: skin[2],
    D: skin[3],
    E: skin[4],
    h: hair[0],
    i: hair[1],
    j: hair[2],
    b: beard[0],
    c: beard[1],
    d: beard[2],
  }
}
