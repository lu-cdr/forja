import { memo, useMemo } from 'react'
import { H, W, drawSmith, toRuns } from './sprites/smith'

/** Mascote: o ferreiro, desenhado em pixel art conforme a patente (0–4). */
export const Smith = memo(function Smith({
  tier,
  size = 192,
  animate = true,
  className,
  label,
}: {
  tier: number
  size?: number
  animate?: boolean
  className?: string
  label?: string
}) {
  const frames = useMemo(() => [toRuns(drawSmith(tier, 0)), toRuns(drawSmith(tier, 1))], [tier])
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={size}
      height={(size * H) / W}
      shapeRendering="crispEdges"
      className={`smith ${animate ? 'smith-anim' : ''} ${className ?? ''}`}
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
