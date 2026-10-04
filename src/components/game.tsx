import type { AchievementIcon } from '../domain/game'
import { cx } from './ui'

// ---------- ícones 8×8 ----------

const ICON_COLORS: Record<string, string> = {
  y: '#f4c542',
  Y: '#b88a1c',
  o: '#ff7a2f',
  r: '#a8322d',
  g: '#a3acb6',
  d: '#5a616b',
  w: '#8c5b33',
  p: '#e9dcbc',
  k: '#3a2a1c',
  c: '#6ef3ff',
}

const ICONS: Record<AchievementIcon, string[]> = {
  spark: ['...y....', '...y....', '.y.y.y..', '..yyy...', 'yyyoyyy.', '..yyy...', '.y.y.y..', '...y....'],
  anvil: ['........', '........', 'gggggggg', '.gggggd.', '...gd...', '...gd...', '..gggd..', '.dddddd.'],
  hammer: ['..ggg...', '.ggggd..', 'ggggdw..', '.ggd.w..', '....w...', '...w....', '..w.....', '.w......'],
  flame: ['...o....', '...oo...', '..ooo...', '.ooyoo..', '.oyyyo..', 'ooyyyoo.', '.oyyyo..', '..ooo...'],
  trophy: ['yyyyyyy.', 'y.yyY.y.', 'y.yyY.y.', '.yyyyY..', '..yyY...', '...Y....', '..yyY...', '.yyyyY..'],
  weight: ['..dddd..', '.d....d.', '.d....d.', '.dddddd.', 'dgggggdd', 'dgggggdd', 'dggggddd', '.dddddd.'],
  scroll: ['wpppppw.', '.pkkkp..', '.pppppp.', '.pkkkkp.', '.pppppp.', '.pkkkp..', 'wpppppw.', '........'],
  shield: ['gggggggg', 'grrrrrrg', 'grryyrrg', 'grryyrrg', '.grrrrg.', '.grrrrg.', '..gggg..', '...gg...'],
  crown: ['........', 'y..y...y', 'yy.yy.yy', 'yyyyyyyy', 'yycyyryy', 'yyyyyyyy', 'YYYYYYYY', '........'],
}

export function PixelIcon({ name, size = 32, muted = false }: { name: AchievementIcon; size?: number; muted?: boolean }) {
  const rows = ICONS[name]
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={muted ? { filter: 'grayscale(1) brightness(0.55)' } : undefined}
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ICON_COLORS[ch]} />)),
      )}
    </svg>
  )
}

// ---------- barra de XP ----------

export function XpBar({ value, height = 14, className }: { value: number; height?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={cx('xp-track relative w-full overflow-hidden', className)}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label="Progresso até o próximo nível"
    >
      <div className="xp-fill h-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function LevelBadge({ level, size = 'md' }: { level: number; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-9 min-w-9 text-lg', md: 'h-12 min-w-12 text-2xl', lg: 'h-16 min-w-16 text-4xl' }[size]
  return (
    <div className={cx('frame-gold num flex items-center justify-center bg-iron-950 px-1.5 font-bold text-xp', s)} aria-label={`Nível ${level}`}>
      {level}
    </div>
  )
}

// ---------- atributos ----------

export function AttributeRow({ abbr, name, value, hint }: { abbr: string; name: string; value: number; hint: string }) {
  const blocks = 10
  const filled = Math.round((value / 99) * blocks)
  return (
    <div className="grid grid-cols-[44px_1fr_32px] items-center gap-3 py-1.5">
      <span className="num text-lg font-semibold text-rubber">{abbr}</span>
      <div className="min-w-0">
        <div className="flex gap-[3px]" aria-hidden="true">
          {Array.from({ length: blocks }, (_, i) => (
            <span key={i} className={cx('h-3 flex-1', i < filled ? 'bg-rubber' : 'bg-iron-800')} />
          ))}
        </div>
        <p className="mt-1 text-[11px] text-iron-400">
          {name}: {hint}
        </p>
      </div>
      <span className="num text-right text-xl" aria-label={`${name} ${value}`}>
        {value}
      </span>
    </div>
  )
}
