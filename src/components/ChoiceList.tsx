import { cx } from './ui'

/** Lista de opções exclusivas, com título e explicação curta em cada uma. */
export function ChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string; hint: string }[]
  value?: T
  onChange: (id: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      {options.map((o) => {
        const selected = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={cx('flex min-h-12 w-full items-center gap-3 rounded-xl bg-iron-850 px-3 py-2 text-left', selected ? 'frame-gold' : 'frame')}
          >
            <span className={cx('size-4 shrink-0 border-2', selected ? 'border-xp-deep bg-xp' : 'border-iron-600 bg-iron-950')} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{o.label}</span>
              <span className="block text-xs text-iron-400">{o.hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
