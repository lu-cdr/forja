import { useEffect, useRef, useState } from 'react'
import type { SmithLook } from '../domain/types'
import { Smith } from './Smith'
import { BALD, HAIR_OPTIONS, NO_BEARD, SKIN_OPTIONS } from './sprites/art/palette'
import { Icon, Segmented, cx } from './ui'

type Swatch = { id: string; label: string; color?: string }

function SwatchRow({ title, options, value, onChange }: { title: string; options: Swatch[]; value: string; onChange: (id: string) => void }) {
  const current = options.find((o) => o.id === value)
  return (
    <div>
      <p className="text-xs text-iron-400">
        {title}: <span className="text-chalk">{current?.label}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.id)}
            className={cx(
              'flex size-11 items-center justify-center border-2',
              o.id === value ? 'border-xp ring-2 ring-xp/40' : 'border-iron-700',
              !o.color && 'bg-iron-800 text-iron-400',
            )}
            style={o.color ? { background: o.color } : undefined}
          >
            {!o.color && <Icon name="x" className="size-5" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Personalização do ferreiro com prévia ao vivo. */
export function SmithCustomizer({ value: initial, onChange }: { value: SmithLook; onChange: (look: SmithLook) => void }) {
  const [previewTier, setPreviewTier] = useState<'0' | '3'>('3')
  // estado local: toques rápidos seguidos não se sobrescrevem enquanto o perfil salva
  const [value, setValue] = useState(initial)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    onChange(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const set = (patch: Partial<SmithLook>) => setValue((v) => ({ ...v, ...patch }))

  return (
    <div>
      <div className="frame forge-bg flex justify-center rounded-2xl pt-3">
        <Smith tier={Number(previewTier)} size={164} look={value} label="Prévia do ferreiro" />
      </div>
      <div className="mt-2">
        <Segmented<'0' | '3'>
          value={previewTier}
          onChange={setPreviewTier}
          options={[
            { value: '0', label: 'Como aprendiz' },
            { value: '3', label: 'Como mestre' },
          ]}
        />
      </div>
      <div className="mt-4 space-y-4">
        <SwatchRow title="Pele" options={SKIN_OPTIONS} value={value.skin} onChange={(skin) => set({ skin })} />
        <SwatchRow
          title="Cabelo"
          options={[...HAIR_OPTIONS, { id: BALD, label: 'Careca' }]}
          value={value.hair}
          onChange={(hair) => set({ hair })}
        />
        <SwatchRow
          title="Barba"
          options={[...HAIR_OPTIONS, { id: NO_BEARD, label: 'Sem barba' }]}
          value={value.beard}
          onChange={(beard) => set({ beard })}
        />
        <p className="text-xs text-iron-500">A barba cresce conforme o ferreiro sobe de patente.</p>
      </div>
    </div>
  )
}
