import { useMemo, useState } from 'react'
import { Button, Empty, Icon, PageHeader, Section, Sheet, cx } from '../../components/ui'
import { SimpleLine } from '../../components/charts'
import { useGame, useMeasurements } from '../../db/hooks'
import { BodySheet } from './BodySheet'
import { PhotosSection } from './PhotosSection'
import { deleteMeasurement, saveMeasurement } from '../../db/repo'
import { deltas, fmt } from '../../domain/calc'
import { formatDateBR, toISODate } from '../../domain/dates'
import { MEASUREMENT_FIELDS, MEASUREMENT_LABEL, type BodyMeasurement, type MeasurementField } from '../../domain/types'

type Field = 'weightKg' | 'bodyFatPct' | MeasurementField
const ALL_FIELDS: Field[] = ['weightKg', 'bodyFatPct', ...MEASUREMENT_FIELDS]
const unitOf = (f: Field) => (f === 'weightKg' ? 'kg' : f === 'bodyFatPct' ? '%' : 'cm')

export function MeasurementsPage() {
  const list = useMeasurements()
  const gameData = useGame()
  // último valor de cada medida e a variação para o valor anterior dela
  const { latest, latestDelta } = useMemo(() => {
    const latest: Partial<Record<Field, number>> = {}
    const latestDelta: Partial<Record<Field, number>> = {}
    for (const f of ALL_FIELDS) {
      const vals = (list ?? []).filter((m) => m[f] != null).map((m) => m[f] as number)
      if (vals.length) latest[f] = vals[vals.length - 1]
      if (vals.length >= 2) latestDelta[f] = vals[vals.length - 1] - vals[vals.length - 2]
    }
    return { latest, latestDelta }
  }, [list])
  const [editing, setEditing] = useState<Partial<BodyMeasurement> | null>(null)
  const [field, setField] = useState<Field>('weightKg')

  const available = useMemo(() => ALL_FIELDS.filter((f) => (list ?? []).some((m) => m[f] != null)), [list])
  const current = available.includes(field) || MEASUREMENT_FIELDS.includes(field as MeasurementField) ? field : available[0]
  const series = useMemo(
    () => (list ?? []).filter((m) => current && m[current] != null).map((m) => ({ date: m.date, v: m[current!] as number })),
    [list, current],
  )

  if (!list || !gameData) return null
  const reversed = [...list].reverse()
  const tier = gameData.game.rank.tier
  const d = deltas(series.map((s) => s.v))

  return (
    <div>
      <PageHeader
        title="Medidas"
        sub="Peso e circunferências"
        right={
          <Button variant="primary" onClick={() => setEditing({ date: toISODate() })}>
            <Icon name="plus" className="size-4" /> Nova
          </Button>
        }
      />

      {list.length === 0 ? (
        <>
          <Section className="mb-6">
            <Empty title="Nenhuma medida ainda">
              Comece pelo peso. Meça sempre do mesmo jeito: de manhã, em jejum, depois do banheiro.
            </Empty>
          </Section>
          <PhotosSection />
        </>
      ) : (
        <>
          {current && (
            <Section className="mb-6">
              {/* ficha do personagem: peso e gordura no topo, circunferências apontando para o corpo */}
              <div className="frame forge-bg mb-3 rounded-2xl p-3">
                <div className="mb-1 grid grid-cols-2 gap-2">
                  {(['weightKg', 'bodyFatPct'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setField(f)}
                      aria-pressed={current === f}
                      className={cx('rounded-xl bg-iron-850 px-3 py-2 text-left', current === f ? 'frame-gold' : 'frame')}
                    >
                      <span className="block text-[11px] text-iron-400">{MEASUREMENT_LABEL[f]}</span>
                      <span className="num text-2xl leading-tight">
                        {latest[f] != null ? fmt(latest[f]!) : '—'}
                        <span className="ml-1 text-xs text-iron-500">{unitOf(f)}</span>
                      </span>
                      {latestDelta[f] != null && Math.abs(latestDelta[f]!) >= 0.05 && (
                        <span className="ml-2 text-[11px] text-iron-400">
                          {latestDelta[f]! > 0 ? '▲ +' : '▼ '}
                          {fmt(latestDelta[f]!)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <BodySheet mode="view" tier={tier} values={latest} deltas={latestDelta} selected={current} onSelect={setField} />
                <p className="text-center text-[11px] text-iron-500">Toque numa medida para ver a evolução.</p>
              </div>
              <div className="frame rounded-2xl bg-iron-850 p-4">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <div className="num text-[34px] leading-none font-semibold">
                      {series.length ? fmt(series.at(-1)!.v) : '—'}
                      <span className="ml-1 text-base text-iron-400">{unitOf(current)}</span>
                    </div>
                    <div className="mt-1 text-xs text-iron-400">{MEASUREMENT_LABEL[current]}, última medição</div>
                  </div>
                  {d && (
                    <div className="text-right text-sm">
                      <div className="num text-lg">
                        {d.fromFirst >= 0 ? '+' : ''}
                        {fmt(d.fromFirst)} {unitOf(current)}
                      </div>
                      <div className="text-xs text-iron-400">desde a primeira</div>
                    </div>
                  )}
                </div>
                {series.length === 0 ? (
                  <p className="py-6 text-center text-sm text-iron-500">Ainda sem registros de {MEASUREMENT_LABEL[current].toLowerCase()}. Toque em Nova para medir.</p>
                ) : series.length >= 2 ? (
                  <SimpleLine data={series} yKey="v" unit={unitOf(current)} label={MEASUREMENT_LABEL[current]} />
                ) : (
                  <p className="py-6 text-center text-sm text-iron-500">O gráfico aparece a partir da segunda medição.</p>
                )}
                {current === 'bodyFatPct' && (
                  <p className="mt-2 text-xs text-iron-500">% de gordura é estimativa. Use sempre o mesmo método e olhe a tendência.</p>
                )}
              </div>
            </Section>
          )}

          <PhotosSection />

          <Section title="Linha do tempo">
            <ul className="space-y-2">
              {reversed.map((m, i) => {
                const prev = reversed[i + 1]
                const filled = ALL_FIELDS.filter((f) => m[f] != null)
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => setEditing(m)} className="w-full frame rounded-2xl bg-iron-850 p-4 text-left active:bg-iron-800">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium">{formatDateBR(m.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <Icon name="chevron" className="size-4 text-iron-600" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                        {filled.map((f) => {
                          const diff = prev?.[f] != null ? (m[f] as number) - (prev[f] as number) : undefined
                          return (
                            <div key={f}>
                              <div className="text-[11px] text-iron-500">{MEASUREMENT_LABEL[f]}</div>
                              <div className="num text-lg leading-tight">
                                {fmt(m[f] as number)}
                                {diff != null && Math.abs(diff) >= 0.05 && (
                                  <span className="ml-1 text-xs text-iron-400">
                                    {diff > 0 ? '+' : ''}
                                    {fmt(diff)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {m.notes && <p className="mt-2 text-sm text-iron-400">{m.notes}</p>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>
        </>
      )}

      {editing && <MeasurementForm initial={editing} tier={tier} onClose={() => setEditing(null)} />}
    </div>
  )
}

function MeasurementForm({ initial, onClose, tier }: { initial: Partial<BodyMeasurement>; onClose: () => void; tier: number }) {
  const [date, setDate] = useState(initial.date ?? toISODate())
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_FIELDS.map((f) => [f, initial[f] != null ? String(initial[f]).replace('.', ',') : ''])),
  )
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [error, setError] = useState<string>()

  async function onSave() {
    const out: Omit<BodyMeasurement, 'id'> & { id?: string } = { id: initial.id, date }
    let any = false
    for (const f of ALL_FIELDS) {
      const raw = values[f].trim()
      if (!raw) continue
      const n = Number(raw.replace(',', '.'))
      if (!Number.isFinite(n) || n <= 0) {
        setError(`Valor inválido em ${MEASUREMENT_LABEL[f]}.`)
        return
      }
      out[f] = n
      any = true
    }
    if (!any) {
      setError('Preencha pelo menos um campo.')
      return
    }
    if (notes.trim()) out.notes = notes.trim()
    await saveMeasurement(out)
    onClose()
  }

  async function onDelete() {
    if (!initial.id || !window.confirm('Apagar esta medição?')) return
    await deleteMeasurement(initial.id)
    onClose()
  }

  const input = (f: Field) => (
    <label key={f} className="block">
      <span className="text-xs text-iron-400">{MEASUREMENT_LABEL[f]}</span>
      <div className="mt-1 flex items-center rounded-xl bg-iron-800 pr-3 focus-within:ring-2 focus-within:ring-rubber">
        <input
          inputMode="decimal"
          value={values[f]}
          onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value.replace(/[^0-9.,]/g, '') }))}
          className="num h-12 w-full min-w-0 bg-transparent px-3 text-2xl outline-none"
          placeholder="—"
        />
        <span className="text-sm text-iron-500">{unitOf(f)}</span>
      </div>
    </label>
  )

  return (
    <Sheet open onClose={onClose} title={initial.id ? 'Editar medição' : 'Nova medição'}>
      <label className="block">
        <span className="text-xs text-iron-400">Data</span>
        <input type="date" value={date} max={toISODate()} onChange={(e) => setDate(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-iron-800 px-3 text-[15px]" />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {input('weightKg')}
        {input('bodyFatPct')}
      </div>
      <h3 className="mt-5 mb-1 text-sm text-iron-300">Circunferências</h3>
      <div className="frame forge-bg rounded-2xl p-2">
        <BodySheet mode="edit" tier={tier} values={values} onChange={(f, v) => setValues((s) => ({ ...s, [f]: v }))} />
      </div>
      <label className="mt-4 block">
        <span className="text-xs text-iron-400">Anotações</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl bg-iron-800 p-3 text-[15px]" />
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={onSave}>
        Salvar medição
      </Button>
      {initial.id && (
        <Button variant="danger" className="mt-2 w-full" onClick={onDelete}>
          Apagar medição
        </Button>
      )}
    </Sheet>
  )
}
