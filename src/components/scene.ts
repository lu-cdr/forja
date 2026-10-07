import { useProfile } from '../db/hooks'

/** Classe CSS do cenário atrás do ferreiro (ver `.scene-*` em index.css). */
export const sceneClass = (sceneId?: string) => `scene-${sceneId ?? 'forja'}`

/** Cores dos cenários para desenhar em canvas (cartão de compartilhar): topo, base e brilho. */
export const SCENE_COLORS: Record<string, { top: string; bottom: string; glow: string }> = {
  forja: { top: '#1a1511', bottom: '#120f0c', glow: '#ff7a2f' },
  caverna: { top: '#0f1620', bottom: '#0b0d12', glow: '#6ef3ff' },
  montanha: { top: '#1b2230', bottom: '#11141b', glow: '#dbe9ff' },
  vulcao: { top: '#24100b', bottom: '#140806', glow: '#ff4a1f' },
  salao: { top: '#1f1328', bottom: '#120b17', glow: '#f4c542' },
}

/** Cenário escolhido no perfil. */
export function useSceneClass(): string {
  return sceneClass(useProfile()?.cosmetics?.scene)
}
