import { useMemo } from 'react'
import { Smith } from '../../components/Smith'
import { CHIBI, measureAnchors } from '../../components/sprites/hero'
import { cx } from '../../components/ui'
import { fmt } from '../../domain/calc'
import { MEASUREMENT_LABEL, type MeasurementField } from '../../domain/types'

/**
 * Ficha do personagem: o ferreiro de pé com as circunferências em volta, cada uma ligada por uma
 * linha ao ponto do corpo. Coordenadas em "unidades" de um quadrado 100×100: o sprite (64×66 px)
 * é ampliado 1,25× (o personagem ocupa só o centro do sprite), ficando em x 10–90 e y 0–82.
 */
const FIG_S = 1.25
const FIG_X = 10
const FIG_Y = 4
/** Altura ÷ largura da ficha: mais alta que larga, para caber 5 caixas por coluna. */
const ASPECT = 1.22
/** x em % da largura; y (em unidades de largura) convertido para % da altura. */
const X = (u: number) => u
const Y = (u: number) => u / ASPECT

// colunas ordenadas de cima para baixo, para as linhas não se cruzarem
const LEFT: MeasurementField[] = ['chestCm', 'armRCm', 'waistCm', 'thighRCm']
const RIGHT: MeasurementField[] = ['armLCm', 'abdomenCm', 'hipCm', 'thighLCm', 'calfCm']
const BOX_W = 25

// linhas das caixas, em % da altura (abaixo da cabeça, até os pés)
const rows = (n: number) => Array.from({ length: n }, (_, i) => 30 + (i * 62) / Math.max(1, n - 1))

type Props = { tier: number } & (
  | {
      mode: 'edit'
      values: Partial<Record<MeasurementField, string>>
      onChange: (field: MeasurementField, value: string) => void
    }
  | {
      mode: 'view'
      values: Partial<Record<MeasurementField, number>>
      deltas: Partial<Record<MeasurementField, number>>
      selected?: string
      onSelect: (field: MeasurementField) => void
    }
)

export function BodySheet(props: Props) {
  const anchors = useMemo(() => measureAnchors(CHIBI, props.tier), [props.tier])
  const placed = [
    ...LEFT.map((f, i) => ({ f, side: 'left' as const, y: rows(LEFT.length)[i] })),
    ...RIGHT.map((f, i) => ({ f, side: 'right' as const, y: rows(RIGHT.length)[i] })),
  ]

  return (
    <div className="relative mx-auto w-full max-w-md" style={{ aspectRatio: `1 / ${ASPECT}` }}>
      <div className="absolute" style={{ left: `${X(FIG_X)}%`, top: `${Y(FIG_Y)}%`, width: `${64 * FIG_S}%` }}>
        <Smith tier={props.tier} stance="ficha" size={1000} className="h-auto w-full" label="Ferreiro com as medidas" />
      </div>

      {/* linhas de chamada */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {placed.map(({ f, side, y }) => {
          const a = anchors[f]
          const active = props.mode === 'view' && props.selected === f
          return (
            <line
              key={f}
              x1={side === 'left' ? BOX_W : 100 - BOX_W}
              y1={y}
              x2={X(FIG_X + a.x * FIG_S)}
              y2={Y(FIG_Y + a.y * FIG_S)}
              stroke={active ? 'var(--color-xp)' : 'var(--color-iron-500)'}
              strokeWidth={active ? 2 : 1.25}
              strokeDasharray={active ? undefined : '3 2'}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      {placed.map(({ f }) => {
        const a = anchors[f]
        const active = props.mode === 'view' && props.selected === f
        return (
          <span
            key={f}
            className={cx('absolute size-2 -translate-x-1/2 -translate-y-1/2 border', active ? 'border-iron-950 bg-xp' : 'border-iron-950 bg-chalk')}
            style={{ left: `${X(FIG_X + a.x * FIG_S)}%`, top: `${Y(FIG_Y + a.y * FIG_S)}%` }}
            aria-hidden="true"
          />
        )
      })}

      {/* caixas */}
      {placed.map(({ f, side, y }) => (
        <div key={f} className="absolute -translate-y-1/2" style={{ top: `${y}%`, width: `${BOX_W}%`, [side]: 0 }}>
          {props.mode === 'edit' ? (
            <label className="frame block rounded-lg bg-iron-850 px-1.5 pt-1 pb-0.5">
              <span className="block truncate text-[10px] leading-tight text-iron-400">{MEASUREMENT_LABEL[f]}</span>
              <span className="flex items-baseline">
                <input
                  inputMode="decimal"
                  value={props.values[f] ?? ''}
                  onChange={(e) => props.onChange(f, e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="—"
                  aria-label={`${MEASUREMENT_LABEL[f]} em cm`}
                  className="num h-7 w-full min-w-0 bg-transparent text-xl outline-none placeholder:text-iron-600"
                />
                <span className="text-[10px] text-iron-500">cm</span>
              </span>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => props.onSelect(f)}
              aria-pressed={props.selected === f}
              className={cx(
                'block w-full rounded-lg bg-iron-850 px-1.5 py-1 text-left',
                props.selected === f ? 'frame-gold' : 'frame',
                side === 'right' && 'text-right',
              )}
            >
              <span className="block truncate text-[10px] leading-tight text-iron-400">{MEASUREMENT_LABEL[f]}</span>
              <span className="num block text-lg leading-tight">{props.values[f] != null ? fmt(props.values[f]!) : '—'}</span>
              {props.deltas[f] != null && Math.abs(props.deltas[f]!) >= 0.05 && (
                <span className="block text-[10px] leading-tight text-iron-400">
                  {props.deltas[f]! > 0 ? '▲ +' : '▼ '}
                  {fmt(props.deltas[f]!)}
                </span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
