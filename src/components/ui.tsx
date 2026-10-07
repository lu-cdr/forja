import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type BtnVariant = 'primary' | 'ghost' | 'subtle' | 'danger'

export function Button({
  variant = 'subtle',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-rubber text-iron-950 font-semibold active:brightness-90',
    subtle: 'bg-iron-800 text-chalk active:bg-iron-700',
    ghost: 'text-iron-300 active:bg-iron-800',
    danger: 'bg-danger/15 text-danger active:bg-danger/25',
  }
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] transition disabled:opacity-40',
        styles[variant],
        className,
      )}
    />
  )
}

export function PageHeader({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe px-4 pb-3">
      <div className="flex items-end justify-between gap-3 pt-5">
        <div className="min-w-0">
          {sub && <p className="text-sm text-iron-400">{sub}</p>}
          <h1 className="font-display text-[34px] leading-none font-bold tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  )
}

export function Section({ title, right, children, className }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('px-4', className)}>
      {(title || right) && (
        <div className="mb-2 flex items-center justify-between">
          {title && <h2 className="text-[15px] font-semibold text-iron-300">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="num text-[28px] leading-none font-semibold whitespace-nowrap text-chalk">
        {value}
        {unit && <span className="ml-0.5 text-base font-medium text-iron-400">{unit}</span>}
      </div>
      <div className="mt-1 text-xs text-iron-400">{label}</div>
      {hint && <div className="mt-0.5 text-xs">{hint}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-iron-850 p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 flex-1 rounded-lg px-3 text-sm transition',
            o.value === value ? 'bg-iron-700 text-chalk font-medium' : 'text-iron-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Campo numérico com − / +, alvos de 44px. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = (v: number) => String(v),
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  format?: (v: number) => string
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div>
      <span className="text-xs text-iron-400">{label}</span>
      <div className="mt-1 flex items-center rounded-xl bg-iron-800">
        <button
          type="button"
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Diminuir ${label}`}
          className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-700 disabled:opacity-30"
        >
          <Icon name="minus" className="size-4" />
        </button>
        <span className="num flex-1 text-center text-xl" aria-live="polite">
          {format(value)}
        </span>
        <button
          type="button"
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
          className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-700 disabled:opacity-30"
        >
          <Icon name="plus" className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="anim-sheet pb-safe relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-iron-850">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-iron-850 px-4 pt-3 pb-2">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Fechar" className="px-3">
            <Icon name="x" />
          </Button>
        </div>
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-iron-700 px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-iron-400">{children}</div>}
    </div>
  )
}

const PATHS: Record<string, string> = {
  today: 'M6.5 6.5h11M6.5 17.5h11M3 9.5v5M21 9.5v5M6.5 5v14M17.5 5v14M9 12h6',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7.5V12l3 2',
  progress: 'M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7',
  body: 'M12 5.5a2 2 0 1 0 0-.01M8 9h8l-1 5h-1.5l-.5 6h-2l-.5-6H9z',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 6l6 6-6 6',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13',
  timer: 'M12 8v5l3 2M9 2.5h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  more: 'M4.5 12h1M11.5 12h1M18.5 12h1',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  anvil: 'M2 7h15c2 0 3.5-.8 5-2v3c-1.2 1.3-3 2-5 2h-1a4 4 0 0 1-4 4v2.5h3V20H7v-3.5h3V14a4.5 4.5 0 0 1-4.5-4.5V9H2z',
  flame:'M12 21c3.5 0 6-2.4 6-6 0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7.5 10 6 12.3 6 15c0 3.6 2.5 6 6 6z',
}

export function Icon({ name, className = 'size-5' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
