import type { ReactNode } from 'react'
import { ACHIEVEMENTS } from '../domain/game'
import { HAMMERS, SCENES, chosenCosmetic, isUnlocked, type Cosmetic } from '../domain/cosmetics'
import type { Profile } from '../domain/types'
import { HAMMER_RAMPS } from './sprites/art/palette'
import { sceneClass } from './scene'
import { cx } from './ui'

type Choice = NonNullable<Profile['cosmetics']>

const achievementName = (id?: string) => ACHIEVEMENTS.find((a) => a.id === id)?.name

/** Cenário e material do martelo; os bloqueados mostram a conquista que destrava. */
export function CosmeticPicker({ unlocked, value, onChange }: { unlocked: Set<string>; value: Choice; onChange: (v: Choice) => void }) {
  const scene = chosenCosmetic(SCENES, value.scene, unlocked)
  const hammer = chosenCosmetic(HAMMERS, value.hammer, unlocked)

  const option = (c: Cosmetic, selected: boolean, swatch: ReactNode, pick: () => void) => {
    const open = isUnlocked(c, unlocked)
    return (
      <button
        key={c.id}
        type="button"
        disabled={!open}
        onClick={pick}
        aria-pressed={selected}
        aria-label={open ? c.name : `${c.name}, bloqueado: conquista ${achievementName(c.achievement)}`}
        className={cx('rounded-xl bg-iron-800 p-1.5 text-left', selected ? 'frame-gold' : 'frame', !open && 'opacity-50')}
      >
        {swatch}
        <span className="mt-1 block truncate text-[13px] leading-tight">{c.name}</span>
        <span className="block truncate text-[11px] leading-tight text-iron-400">{open ? (selected ? 'em uso' : 'disponível') : achievementName(c.achievement)}</span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs text-iron-400">Cenário</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENES.map((c) =>
            option(c, c.id === scene.id, <span className={cx('block h-12 rounded-lg', sceneClass(c.id))} />, () => onChange({ ...value, scene: c.id })),
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-iron-400">Martelo</p>
        <div className="grid grid-cols-3 gap-2">
          {HAMMERS.map((c) =>
            option(
              c,
              c.id === hammer.id,
              <span className="flex h-12 overflow-hidden rounded-lg">
                {HAMMER_RAMPS[c.id].map((color) => (
                  <span key={color} className="flex-1" style={{ background: color }} />
                ))}
              </span>,
              () => onChange({ ...value, hammer: c.id }),
            ),
          )}
        </div>
      </div>
      <p className="text-xs text-iron-500">Conquistas novas destravam cenários e martelos.</p>
    </div>
  )
}
