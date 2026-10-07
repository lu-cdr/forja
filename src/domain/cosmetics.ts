/**
 * Visuais do ferreiro destravados por conquista. O que está destravado é derivado das conquistas
 * (nunca gravado); o perfil guarda só a escolha. O primeiro de cada lista é livre.
 */

export type CosmeticKind = 'scene' | 'hammer'

export interface Cosmetic {
  id: string
  kind: CosmeticKind
  name: string
  /** Conquista que destrava (ausente = livre). */
  achievement?: string
}

export const SCENES: Cosmetic[] = [
  { id: 'forja', kind: 'scene', name: 'Forja da vila' },
  { id: 'caverna', kind: 'scene', name: 'Caverna de cristal', achievement: 'bigorna-quente' },
  { id: 'montanha', kind: 'scene', name: 'Forja da montanha', achievement: 'semana-de-aco' },
  { id: 'vulcao', kind: 'scene', name: 'Coração do vulcão', achievement: 'chama-viva' },
  { id: 'salao', kind: 'scene', name: 'Salão do rei', achievement: 'cacador-de-chefes' },
]

export const HAMMERS: Cosmetic[] = [
  { id: 'ferro', kind: 'hammer', name: 'Ferro' },
  { id: 'bronze', kind: 'hammer', name: 'Bronze', achievement: 'primeiro-recorde' },
  { id: 'ouro', kind: 'hammer', name: 'Ouro', achievement: 'dez-toneladas' },
  { id: 'obsidiana', kind: 'hammer', name: 'Obsidiana', achievement: 'quebra-recordes' },
  { id: 'mitril', kind: 'hammer', name: 'Mitril', achievement: 'cem-toneladas' },
]

export const isUnlocked = (c: Cosmetic, unlockedAchievements: Set<string>) => !c.achievement || unlockedAchievements.has(c.achievement)

/** Escolha válida: a do perfil se existir e estiver destravada; senão, a livre. */
export function chosenCosmetic(list: Cosmetic[], chosenId: string | undefined, unlockedAchievements: Set<string>): Cosmetic {
  const c = list.find((x) => x.id === chosenId)
  return c && isUnlocked(c, unlockedAchievements) ? c : list[0]
}

/** Visuais que a conquista destrava (para avisar na recompensa). */
export const cosmeticsFor = (achievementId: string) => [...SCENES, ...HAMMERS].filter((c) => c.achievement === achievementId)
