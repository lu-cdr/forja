import type { SmithLook } from '../../domain/types'
import { type Ramp, rampFrom } from './engine'

export const SKIN_RAMPS: Record<string, Ramp> = {
  clara: ['#fff0e0', '#ffd8b8', '#f0b892', '#cf8f6c', '#9a5e48'],
  media: ['#ffdcba', '#f5b98c', '#dc9466', '#b26c45', '#7c432c'],
  morena: ['#e8b48a', '#c98d60', '#a86c42', '#82502f', '#57321e'],
  escura: ['#b07a55', '#8c5a3a', '#6e4329', '#52301d', '#361d12'],
  orc: ['#c8ec8a', '#9fd162', '#76ad44', '#52842f', '#33571f'],
}

export const HAIR_BASE: Record<string, string> = {
  preto: '#2e2622',
  'castanho-escuro': '#4a2c1a',
  castanho: '#7a4422',
  ruivo: '#b4481e',
  loiro: '#d9a645',
  grisalho: '#a29e98',
  branco: '#e6e1d6',
}

export const M = {
  leather: ['#c48a58', '#a46c40', '#83522d', '#633b1f', '#432612'] as Ramp,
  leatherDark: ['#8a5e3c', '#6e4629', '#55331c', '#3e2414', '#28160c'] as Ramp,
  tunic: ['#a9c1d1', '#7f9db3', '#5e7a8f', '#455b6d', '#2e3d4b'] as Ramp,
  pants: ['#7d7266', '#625a50', '#4a433b', '#36302a', '#231f1b'] as Ramp,
  boots: ['#9a6b45', '#7a5032', '#5c3a22', '#422816', '#2a190d'] as Ramp,
  metal: ['#ffffff', '#dbe3ea', '#aab6c2', '#7b8794', '#4f5964'] as Ramp,
  gold: ['#fff4b0', '#ffd966', '#f2b632', '#c4841c', '#8a5510'] as Ramp,
  wood: ['#d9a46a', '#b98048', '#966136', '#704424', '#4a2b15'] as Ramp,
  cape: ['#ff8a8a', '#e0485a', '#b02a3e', '#80192c', '#52101d'] as Ramp,
  anvil: ['#9aa3ad', '#76808a', '#5a626b', '#40464e', '#2a2e34'] as Ramp,
  fire: ['#ffffff', '#fff1a0', '#ffc14a', '#ff7a2f', '#c9401c'] as Ramp,
  rune: ['#ffffff', '#c8fbff', '#6ef3ff', '#2bb8d4', '#127a99'] as Ramp,
  rope: ['#f0d9a0', '#d8b87a', '#b8955a', '#8f6f3e', '#634a26'] as Ramp,
}

// ---------- opções de personalização (ids gravados no perfil) ----------

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
].map((o) => ({ ...o, color: HAIR_BASE[o.id] }))

/** Valores especiais: cabelo "careca", barba "sem". */
export const BALD = 'careca'
export const NO_BEARD = 'sem'

export const DEFAULT_LOOK: SmithLook = { skin: 'media', hair: 'castanho-escuro', beard: 'castanho' }

export interface LookRamps {
  skin: Ramp
  hair: Ramp | null
  beard: Ramp | null
  orc: boolean
}

export function lookRamps(look: SmithLook): LookRamps {
  return {
    skin: SKIN_RAMPS[look.skin] ?? SKIN_RAMPS.media,
    hair: look.hair === 'careca' ? null : rampFrom(HAIR_BASE[look.hair] ?? HAIR_BASE['castanho-escuro']),
    beard: look.beard === 'sem' ? null : rampFrom(HAIR_BASE[look.beard] ?? HAIR_BASE.castanho),
    orc: look.skin === 'orc',
  }
}

export const EYE = '#1d1418'
export const EYE_GLINT = '#ffffff'
export const TUSK = '#f6efd8'
