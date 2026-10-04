import { TEMPLATES, templateWeekdays } from '../seed/plan'
import { WEEKDAY_SHORT } from '../domain/dates'
import { cx } from './ui'

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Escolha de modelo de plano: cartões com os dias da semana de cada um. */
export function TemplateList({ value, onChange, recommendedId }: { value?: string; onChange: (id: string) => void; recommendedId?: string }) {
  return (
    <ul className="space-y-2" role="radiogroup" aria-label="Modelo de plano">
      {[...TEMPLATES].sort((a, b) => Number(b.id === recommendedId) - Number(a.id === recommendedId)).map((t) => {
        const days = new Set(templateWeekdays(t))
        const selected = t.id === value
        return (
          <li key={t.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(t.id)}
              className={cx('w-full rounded-2xl bg-iron-850 p-4 text-left', selected ? 'frame-gold' : 'frame')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {t.id === recommendedId && (
                    <span className="mb-1 inline-block bg-xp px-1.5 py-0.5 text-[11px] font-semibold text-iron-950">Recomendado para você</span>
                  )}
                  <p className="num text-xl leading-tight">{t.name}</p>
                </div>
                <span
                  className={cx('mt-0.5 size-5 shrink-0 border-2', selected ? 'border-xp-deep bg-xp' : 'border-iron-600 bg-iron-950')}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1 text-sm text-iron-300">{t.summary}</p>
              <p className="mt-0.5 text-xs text-iron-400">{t.forWho}</p>
              {days.size > 0 && (
                <div className="mt-3 flex gap-1" aria-label="Dias de treino">
                  {WEEK_ORDER.map((w) => (
                    <span
                      key={w}
                      className={cx('flex-1 rounded py-1 text-center text-[11px]', days.has(w) ? 'bg-rubber font-semibold text-iron-950' : 'bg-iron-800 text-iron-500')}
                    >
                      {WEEKDAY_SHORT[w]}
                    </span>
                  ))}
                </div>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
