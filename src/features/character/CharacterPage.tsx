import { Link } from 'react-router-dom'
import { Smith } from '../../components/Smith'
import { AttributeRow, LevelBadge, PixelIcon, XpBar } from '../../components/game'
import { Button, Icon, PageHeader, Section, Sheet, Stat, cx } from '../../components/ui'
import { SmithCustomizer } from '../../components/SmithCustomizer'
import { DEFAULT_LOOK } from '../../components/sprites/art/palette'
import { updateProfile } from '../../db/repo'
import { useState } from 'react'
import { useGame, useProfile } from '../../db/hooks'
import { fmt } from '../../domain/calc'
import { formatDateBR } from '../../domain/dates'
import { ACHIEVEMENTS, RANKS, XP, levelProgress } from '../../domain/game'

const XP_RULES: [string, number][] = [
  ['Concluir um treino', XP.workout],
  ['Cada série registrada', XP.perSet],
  ['Fazer todas as séries do dia', XP.fullWorkout],
  ['Bater um recorde (por exercício)', XP.pr],
  ['Subir a carga (por exercício)', XP.loadUp],
  ['Fazer todos os treinos da semana', XP.fullWeek],
  ['Registrar medidas (por dia)', XP.measurement],
]

export function CharacterPage() {
  const data = useGame()
  const profile = useProfile()
  const [customizing, setCustomizing] = useState(false)
  if (!data || !profile) return null
  const { game } = data
  const { stats } = game
  const unlockedIds = new Map(game.unlocked.map((u) => [u.def.id, u.date]))
  const toNext = game.nextLevelXp - game.totalXp
  const recent = [...game.events].reverse().slice(0, 12)

  return (
    <div>
      <PageHeader
        sub="Seu ferreiro"
        title={game.rank.title}
        right={
          <Link to="/ajustes" aria-label="Ajustes" className="flex size-11 items-center justify-center rounded-xl text-iron-300 active:bg-iron-800">
            <Icon name="settings" className="size-6" />
          </Link>
        }
      />

      <Section className="mb-6">
        <div className="frame forge-bg overflow-hidden rounded-2xl">
          <div className="flex justify-center px-2 pt-4">
            <Smith tier={game.rank.tier} size={224} label={`Ferreiro, patente ${game.rank.title}`} />
          </div>
          <div className="border-t-2 border-iron-700 bg-iron-900/80 p-4">
            <div className="flex items-center gap-3">
              <LevelBadge level={game.level} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-iron-400">Nível {game.level}</p>
                <XpBar value={levelProgress(game)} className="mt-1" />
                <p className="mt-1.5 text-xs text-iron-300">
                  <span className="num text-sm text-xp">{fmt(game.totalXp, 0)} XP</span>, faltam{' '}
                  <span className="num text-sm">{fmt(toNext, 0)}</span> para o nível {game.level + 1}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-iron-300">{game.rank.flavor}</p>
            <Button className="mt-3 w-full" onClick={() => setCustomizing(true)}>
              <Icon name="edit" className="size-4" /> Personalizar ferreiro
            </Button>
          </div>
        </div>
      </Section>

      <Section className="mb-6">
        <div className="frame grid grid-cols-3 gap-3 rounded-2xl bg-iron-850 p-4">
          <Stat label="treinos forjados" value={stats.workouts} />
          <Stat label="recordes" value={stats.prs} />
          <Stat label="toneladas" value={fmt(stats.totalVolume / 1000, 1)} />
        </div>
      </Section>

      <Section className="mb-6" title="Atributos">
        <div className="frame rounded-2xl bg-iron-850 px-4 py-2">
          <AttributeRow abbr="FOR" name="Força" value={game.attributes.forca} hint="sobe a cada recorde" />
          <AttributeRow abbr="VIG" name="Vigor" value={game.attributes.vigor} hint="toneladas levantadas" />
          <AttributeRow abbr="CON" name="Constância" value={game.attributes.constancia} hint="semanas seguidas e completas" />
          <AttributeRow abbr="DIS" name="Disciplina" value={game.attributes.disciplina} hint="dias com medidas" />
        </div>
      </Section>

      <Section className="mb-6" title="Caminho do ferreiro">
        <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {RANKS.map((r) => {
            const reached = game.level >= r.minLevel
            const current = r.tier === game.rank.tier
            return (
              <li
                key={r.tier}
                className={cx(
                  'w-28 shrink-0 rounded-xl bg-iron-850 p-2 text-center',
                  current ? 'frame-gold' : 'frame',
                )}
              >
                <div className={cx('flex justify-center', !reached && 'locked-silhouette')}>
                  <Smith tier={r.tier} size={72} animate={false} label={r.title} />
                </div>
                <p className={cx('num mt-1 text-[15px] leading-tight', reached ? 'text-chalk' : 'text-iron-500')}>{r.title}</p>
                <p className="text-[11px] text-iron-400">Nível {r.minLevel}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section
        className="mb-6"
        title="Conquistas"
        right={
          <span className="num text-sm text-iron-400">
            {game.unlocked.length}/{ACHIEVEMENTS.length}
          </span>
        }
      >
        <ul className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const date = unlockedIds.get(a.id)
            const [cur, target] = a.progress(stats)
            return (
              <li key={a.id} className={cx('rounded-xl bg-iron-850 p-3', date ? 'frame-gold' : 'frame')}>
                <div className="flex items-start gap-2.5">
                  <div className={cx('shrink-0', date && 'anim-glow')}>
                    <PixelIcon name={a.icon} size={32} muted={!date} />
                  </div>
                  <div className="min-w-0">
                    <p className={cx('num text-[15px] leading-tight', date ? 'text-chalk' : 'text-iron-400')}>{a.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-iron-400">{a.description}</p>
                  </div>
                </div>
                {date ? (
                  <p className="mt-2 text-[11px] text-xp">Forjada em {formatDateBR(date)}, +{a.xp} XP</p>
                ) : (
                  <div className="mt-2">
                    <div className="h-1.5 bg-iron-800">
                      <div className="h-full bg-iron-500" style={{ width: `${(cur / target) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-iron-500">
                      {fmt(cur, 0)}/{fmt(target, 0)}, vale {a.xp} XP
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section className="mb-6" title="Como ganhar XP">
        <ul className="frame divide-y divide-iron-800 rounded-2xl bg-iron-850">
          {XP_RULES.map(([label, xp]) => (
            <li key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-iron-300">{label}</span>
              <span className="num text-base text-xp">+{xp}</span>
            </li>
          ))}
        </ul>
      </Section>

      {recent.length > 0 && (
        <Section className="mb-6" title="Registro de XP">
          <ul className="frame divide-y divide-iron-800 rounded-2xl bg-iron-850">
            {recent.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-12 shrink-0 text-xs text-iron-500">{formatDateBR(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-iron-300">{e.label}</span>
                <span className="num text-base text-xp">+{e.xp}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Sheet open={customizing} onClose={() => setCustomizing(false)} title="Personalizar ferreiro">
        <SmithCustomizer value={profile.smith ?? DEFAULT_LOOK} onChange={(smith) => void updateProfile({ smith })} />
        <Button variant="primary" className="mt-5 w-full" onClick={() => setCustomizing(false)}>
          Pronto
        </Button>
      </Sheet>
    </div>
  )
}
