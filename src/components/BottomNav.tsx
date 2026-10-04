import { NavLink } from 'react-router-dom'
import { Icon, cx } from './ui'

const TABS = [
  { to: '/', label: 'Hoje', icon: 'today' },
  { to: '/forja', label: 'Forja', icon: 'anvil' },
  { to: '/historico', label: 'Histórico', icon: 'history' },
  { to: '/progresso', label: 'Progresso', icon: 'progress' },
  { to: '/medidas', label: 'Medidas', icon: 'body' },
]

export function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t-2 border-iron-700 bg-iron-900/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 font-display text-[12px] transition',
                  isActive ? 'text-rubber' : 'text-iron-400',
                )
              }
            >
              <Icon name={t.icon} className="size-6" />
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
