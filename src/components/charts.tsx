import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmt } from '../domain/calc'
import { formatDateBR } from '../domain/dates'

const AXIS = { stroke: '#6f6457', fontSize: 11, tickLine: false, axisLine: false } as const
const GRID = <CartesianGrid stroke="#352d26" strokeDasharray="0" vertical={false} />
const ACCENT = '#ff7a2f'
const RAW = '#9d8f7e'

type Row = Record<string, string | number | undefined>

function TooltipBox({
  active,
  payload,
  label,
  unit,
  labels,
  digits,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number; color?: string }[]
  label?: string
  unit: string
  labels: Record<string, string>
  digits: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-iron-700 bg-iron-800 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 text-iron-400">{label ? formatDateBR(String(label), { day: '2-digit', month: 'short', year: '2-digit' }) : ''}</div>
      {payload.map((p) =>
        p.value == null ? null : (
          <div key={String(p.dataKey)} className="flex items-center gap-2 text-chalk">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-iron-300">{labels[String(p.dataKey)] ?? p.dataKey}</span>
            <span className="num ml-auto pl-3 text-sm">
              {fmt(p.value, digits)} {unit}
            </span>
          </div>
        ),
      )}
    </div>
  )
}

const tickDate = (v: string) => formatDateBR(v, { day: '2-digit', month: '2-digit' })

/** Linha de tendência; opcionalmente pontos crus em cinza por trás (ex.: peso diário + média 7d). */
export function TrendChart({
  data,
  yKey,
  rawKey,
  unit,
  labels,
  height = 200,
  digits = 1,
}: {
  data: Row[]
  yKey: string
  rawKey?: string
  unit: string
  labels: Record<string, string>
  height?: number
  digits?: number
}) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={tickDate} minTickGap={24} />
          <YAxis {...AXIS} width={40} domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]} allowDecimals={false} tickFormatter={(v: number) => fmt(v, 0)} />
          <Tooltip
            cursor={{ stroke: '#6f6457', strokeWidth: 1 }}
            content={(p) => <TooltipBox {...(p as object)} unit={unit} labels={labels} digits={digits} />}
          />
          {rawKey && <Scatter dataKey={rawKey} fill={RAW} fillOpacity={0.55} shape="circle" isAnimationActive={false} />}
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={ACCENT}
            strokeWidth={2}
            dot={data.length <= 16 ? { r: 3.5, fill: ACCENT, stroke: '#1c1814', strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: ACCENT, stroke: '#1c1814', strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SimpleLine({ data, yKey, unit, label }: { data: Row[]; yKey: string; unit: string; label: string }) {
  return (
    <div style={{ height: 180 }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={tickDate} minTickGap={24} />
          <YAxis {...AXIS} width={40} domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]} allowDecimals={false} tickFormatter={(v: number) => fmt(v, 0)} />
          <Tooltip cursor={{ stroke: '#6f6457' }} content={(p) => <TooltipBox {...(p as object)} unit={unit} labels={{ [yKey]: label }} digits={1} />} />
          <Line type="monotone" dataKey={yKey} stroke={ACCENT} strokeWidth={2} dot={{ r: 3.5, fill: ACCENT, stroke: '#1c1814', strokeWidth: 2 }} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function VolumeBars({ data }: { data: { week: string; volume: number }[] }) {
  return (
    <div style={{ height: 170 }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ date: d.week, volume: d.volume }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={tickDate} minTickGap={16} />
          <YAxis {...AXIS} width={40} tickFormatter={(v: number) => (v >= 1000 ? `${fmt(v / 1000, 0)}t` : fmt(v, 0))} />
          <Tooltip cursor={{ fill: '#ffffff0d' }} content={(p) => <TooltipBox {...(p as object)} unit="kg" labels={{ volume: 'Volume da semana' }} digits={0} />} />
          <Bar dataKey="volume" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: 'accent' | 'raw'; shape: 'line' | 'dot' }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4 text-xs text-iron-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.shape === 'line' ? (
            <span className="h-0.5 w-4 rounded" style={{ background: i.color === 'accent' ? ACCENT : RAW }} />
          ) : (
            <span className="size-2 rounded-full" style={{ background: i.color === 'accent' ? ACCENT : RAW, opacity: 0.7 }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}
