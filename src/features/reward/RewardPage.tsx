import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Smith } from '../../components/Smith'
import { LevelBadge, PixelIcon, XpBar } from '../../components/game'
import { playAnvil, playLevelUp, playTick } from '../../components/sfx'
import { Button, cx } from '../../components/ui'
import { useGameInput } from '../../db/hooks'
import { fmt } from '../../domain/calc'
import { levelProgress, rewardForSession } from '../../domain/game'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function RewardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const input = useGameInput()
  const reward = useMemo(() => {
    if (!input || !id || !input.sessions.some((s) => s.id === id)) return null
    return rewardForSession(input, id)
  }, [input, id])

  const [shown, setShown] = useState(0) // XP exibido no contador
  const [lines, setLines] = useState(0) // linhas reveladas
  const [bar, setBar] = useState<{ value: number; key: number } | null>(null)
  const [levelUp, setLevelUp] = useState(false)
  const [evolved, setEvolved] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!reward || started.current) return
    started.current = true
    const { before, after, xp, sessionEvents, leveledUp, rankedUp } = reward
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    if (reducedMotion()) {
      setShown(xp)
      setLines(sessionEvents.length)
      setBar({ value: levelProgress(after), key: 1 })
      setLevelUp(leveledUp)
      setEvolved(rankedUp)
      return
    }

    setBar({ value: levelProgress(before), key: 0 })
    // linhas de XP, uma a uma
    sessionEvents.forEach((e, i) =>
      at(300 + i * 280, () => {
        setLines(i + 1)
        if (e.kind === 'pr' || e.kind === 'achievement') playAnvil()
        else playTick()
      }),
    )
    // contador
    const countStart = 300
    const countDur = Math.max(900, sessionEvents.length * 280)
    const steps = 24
    for (let k = 1; k <= steps; k++) at(countStart + (countDur * k) / steps, () => setShown(Math.round((xp * k) / steps)))
    // barra
    const barAt = countStart + countDur + 200
    if (leveledUp) {
      at(barAt, () => setBar({ value: 1, key: 0 }))
      at(barAt + 1000, () => {
        setLevelUp(true)
        playLevelUp()
        setBar({ value: 0, key: 1 })
      })
      at(barAt + 1100, () => setBar({ value: levelProgress(after), key: 1 }))
      if (rankedUp) at(barAt + 1900, () => setEvolved(true))
    } else {
      at(barAt, () => setBar({ value: levelProgress(after), key: 0 }))
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [reward])

  if (input && !reward) return <Navigate to="/historico" replace />
  if (!reward) return null

  const { before, after, sessionEvents, newAchievements } = reward
  const tier = evolved ? after.rank.tier : before.rank.tier
  const level = levelUp ? after.level : before.level

  return (
    <div className="pt-safe min-h-dvh px-4 pb-10">
      <p className="pt-6 text-center text-sm text-iron-400">Treino forjado</p>
      <p className="num mt-1 text-center text-6xl font-bold text-xp" aria-live="polite">
        +{fmt(shown, 0)} <span className="text-3xl">XP</span>
      </p>

      <div className="frame forge-bg relative mt-5 overflow-hidden rounded-2xl">
        <div className="flex justify-center pt-3">
          <Smith key={tier} tier={tier} size={240} className={evolved ? 'anim-level-pop' : undefined} />
        </div>
        {levelUp && (
          <div className="anim-level-pop absolute inset-x-0 top-3 text-center">
            <span className="frame-gold num inline-block bg-iron-950 px-3 py-1 text-xl text-xp">Subiu para o nível {after.level}!</span>
          </div>
        )}
        <div className="border-t-2 border-iron-700 bg-iron-900/85 p-4">
          <div className="flex items-center gap-3">
            <LevelBadge level={level} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-iron-400">{evolved ? after.rank.title : before.rank.title}</p>
              {bar && <XpBar key={bar.key} value={bar.value} className="mt-1" />}
              <p className="mt-1 text-xs text-iron-400">
                <span className="num text-sm text-chalk">{fmt(after.totalXp, 0)}</span> XP no total
              </p>
            </div>
          </div>
          {evolved && (
            <p className="anim-level-pop mt-3 text-sm text-chalk">
              Seu ferreiro evoluiu para <span className="num text-base text-xp">{after.rank.title}</span>. {after.rank.flavor}
            </p>
          )}
        </div>
      </div>

      <ul className="frame mt-4 divide-y divide-iron-800 rounded-2xl bg-iron-850">
        {sessionEvents.map((e, i) => (
          <li
            key={i}
            className={cx(
              'flex items-center justify-between px-4 py-2.5 text-[15px] transition-opacity',
              i < lines ? 'opacity-100' : 'opacity-0',
            )}
          >
            <span className={cx(e.kind === 'pr' || e.kind === 'achievement' ? 'text-xp' : 'text-iron-300')}>{e.label}</span>
            <span className="num text-lg text-xp">+{e.xp}</span>
          </li>
        ))}
      </ul>

      {newAchievements.length > 0 && lines >= sessionEvents.length && (
        <section className="mt-4">
          <h2 className="mb-2 text-[15px] font-semibold text-iron-300">Conquistas forjadas</h2>
          <ul className="space-y-2">
            {newAchievements.map((a) => (
              <li key={a.def.id} className="frame-gold anim-level-pop flex items-center gap-3 rounded-xl bg-iron-850 p-3">
                <div className="anim-glow">
                  <PixelIcon name={a.def.icon} size={40} />
                </div>
                <div>
                  <p className="num text-lg leading-tight">{a.def.name}</p>
                  <p className="text-xs text-iron-400">{a.def.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button onClick={() => navigate('/forja', { replace: true })}>Ver ferreiro</Button>
        <Button variant="primary" onClick={() => navigate(`/historico/${id}`, { replace: true })}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
