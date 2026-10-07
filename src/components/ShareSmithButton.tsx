import { useState } from 'react'
import { useGame, useProfile } from '../db/hooks'
import { toISODate } from '../domain/dates'
import { levelProgress, weekSummary } from '../domain/game'
import { weekStreak } from '../domain/stats'
import { DEFAULT_LOOK } from './sprites/art/palette'
import { renderShareCard, shareImage } from './shareCard'
import { Button, Icon } from './ui'

/** "Compartilhar meu ferreiro": gera o cartão (imagem) e abre a folha de compartilhar do celular. */
export function ShareSmithButton({ className, variant = 'subtle' }: { className?: string; variant?: 'subtle' | 'primary' }) {
  const data = useGame()
  const profile = useProfile()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  if (!data || !profile) return null

  async function onShare() {
    if (!data || !profile) return
    setBusy(true)
    setMsg(undefined)
    try {
      const { game, input } = data
      const today = toISODate()
      const week = weekSummary(input, today)
      const blob = await renderShareCard({
        tier: game.rank.tier,
        look: profile.smith ?? DEFAULT_LOOK,
        hammer: profile.cosmetics?.hammer,
        scene: profile.cosmetics?.scene,
        level: game.level,
        rankTitle: game.rank.title,
        progress: levelProgress(game),
        workouts: game.stats.workouts,
        prs: game.stats.prs,
        streakWeeks: weekStreak(input.sessions, today).current,
        tons: game.stats.totalVolume / 1000,
        weekWorkouts: week.workouts,
        weekTons: week.volume / 1000,
      })
      const result = await shareImage(blob, `forja-nivel-${game.level}.png`, `Meu ferreiro chegou ao nível ${game.level} na Forja!`)
      if (result === 'downloaded') setMsg('Imagem salva. Agora é só mandar.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível gerar a imagem.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Button variant={variant} className="w-full" onClick={onShare} disabled={busy}>
        <Icon name="upload" className="size-4" /> {busy ? 'Gerando imagem…' : 'Compartilhar meu ferreiro'}
      </Button>
      {msg && <p className="mt-1 text-center text-xs text-iron-400">{msg}</p>}
    </div>
  )
}
