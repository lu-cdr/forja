import { memo, useMemo } from 'react'
import type { SmithLook } from '../domain/types'
import { useProfile } from '../db/hooks'
import { toRuns } from './sprites/pixelart'
import { SMITH_H, SMITH_W, drawSmith } from './sprites/art/smith'
import { BALD, DEFAULT_LOOK, NO_BEARD, paletteFor } from './sprites/art/palette'

export type Stance = 'forja' | 'ficha'

/**
 * Mascote: o ferreiro em pixel art desenhado à mão, conforme a patente (0–4).
 * Usa a aparência salva no perfil; `look` sobrepõe (prévia da personalização, boas-vindas).
 * Postura "forja": martelo na mão, respirando. "ficha": sem martelo, parado (tela de medidas).
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
  const frames = useMemo(
    () => {
      const shape = { bald: l.hair === BALD, beardless: l.beard === NO_BEARD, orc: l.skin === 'orc' }
      const pal = paletteFor(l)
      if (stance !== 'forja') return [toRuns(drawSmith(tier, shape, { hammer: false }), pal)]
      // quadros: 0 parado · 1 respira · 2 ergue o martelo · 3 impacto (ordem da animação no CSS)
      return [
        drawSmith(tier, shape, { frame: 0 }),
        drawSmith(tier, shape, { frame: 1 }),
        drawSmith(tier, shape, { frame: 0, pose: 'raise' }),
        drawSmith(tier, shape, { frame: 1, pose: 'impact' }),
      ].map((f) => toRuns(f, pal))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tier, l.skin, l.hair, l.beard, stance],
  )
  const moving = animate && stance === 'forja'
  return (
    <svg
      viewBox={`0 0 ${SMITH_W} ${SMITH_H}`}
      width={size}
      height={(size * SMITH_H) / SMITH_W}
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
