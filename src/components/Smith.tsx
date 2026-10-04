import { memo, useMemo } from 'react'
import type { SmithLook } from '../domain/types'
import { useProfile } from '../db/hooks'
import { toRuns } from './sprites/pixelart'
import { drawSmith } from './sprites/art/smith'
import { BALD, DEFAULT_LOOK, NO_BEARD, paletteFor } from './sprites/art/palette'

export type Stance = 'forja' | 'ficha'

/**
 * Mascote: o ferreiro em pixel art, conforme a patente (0–4).
 * Usa a aparência salva no perfil; `look` sobrepõe (prévia da personalização, boas-vindas).
 * Postura "forja": martelando na bigorna. "ficha": de pé, sem martelo, parado (tela de medidas).
 */
export const Smith = memo(function Smith({
  tier,
  size = 192,
  animate = true,
  className,
  label,
  look,
  stance = 'forja',
}: {
  tier: number
  size?: number
  animate?: boolean
  className?: string
  label?: string
  look?: SmithLook
  stance?: Stance
}) {
  const profile = useProfile()
  const l = look ?? profile?.smith ?? DEFAULT_LOOK
  const { w, h, frames } = useMemo(
    () => {
      const shape = { bald: l.hair === BALD, beardless: l.beard === NO_BEARD, orc: l.skin === 'orc' }
      const pal = paletteFor(l)
      // quadros: 0 martelo erguido · 1 martelada (ordem da animação no CSS)
      const sprites =
        stance === 'forja'
          ? [drawSmith(tier, shape, { frame: 0 }), drawSmith(tier, shape, { frame: 1 })]
          : [drawSmith(tier, shape, { hammer: false })]
      return { w: sprites[0].w, h: sprites[0].h, frames: sprites.map((f) => toRuns(f, pal)) }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tier, l.skin, l.hair, l.beard, stance],
  )
  const moving = animate && stance === 'forja'
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      className={`smith ${moving ? 'smith-anim' : ''} ${className ?? ''}`}
      role="img"
      aria-label={label ?? 'Ferreiro'}
    >
      {frames.map((runs, i) => (
        <g key={i} className={`smith-f${i}`}>
          {runs.map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
          ))}
        </g>
      ))}
    </svg>
  )
})
