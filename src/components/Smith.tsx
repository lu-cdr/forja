import { memo, useMemo } from 'react'
import type { SmithLook } from '../domain/types'
import { useProfile } from '../db/hooks'
import { CHIBI, drawHero, type Stance } from './sprites/hero'
import { DEFAULT_LOOK } from './sprites/materials'

/**
 * Mascote: o ferreiro em pixel art 16 bits (estilo chibi), conforme a patente (0–4).
 * Usa a aparência salva no perfil; `look` sobrepõe (prévia da personalização, boas-vindas).
 * Postura "forja" anima martelo e bigorna; "ficha" fica de pé, de braços abertos (tela de medidas).
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
      const f0 = drawHero(CHIBI, tier, 0, l, stance)
      const f1 = stance === 'forja' ? drawHero(CHIBI, tier, 1, l, stance) : f0
      return { w: f0.w, h: f0.h, runs: [f0.toRuns(), f1.toRuns()] }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tier, l.skin, l.hair, l.beard, stance],
  )
  return (
    <svg
      viewBox={`0 0 ${frames.w} ${frames.h}`}
      width={size}
      height={(size * frames.h) / frames.w}
      shapeRendering="crispEdges"
      className={`smith ${animate && stance === 'forja' ? 'smith-anim' : ''} ${className ?? ''}`}
      role="img"
      aria-label={label ?? 'Ferreiro'}
    >
      {frames.runs.map((runs, i) => (
        <g key={i} className={`smith-f${i}`}>
          {runs.map((r) => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
          ))}
        </g>
      ))}
    </svg>
  )
})
