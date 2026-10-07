import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Section } from '../../components/ui'
import { useExercises } from '../../db/hooks'
import { importSharedPlan } from '../../db/planEdit'
import { WEEKDAY_LONG, formatClock } from '../../domain/dates'
import { formatTarget } from '../../domain/plan'
import { decodePlan, type SharedPlan } from '../../domain/planShare'

/** Plano recebido por link (#/plano/importar?p=…): mostra antes de trocar. */
export function PlanImportPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const exercises = useExercises()
  const [plan, setPlan] = useState<SharedPlan>()
  const [error, setError] = useState<string>()
  const code = params.get('p')

  useEffect(() => {
    if (!code) return
    decodePlan(code).then(setPlan, (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [code])

  const nameOf = (ex: string | number) =>
    typeof ex === 'number' ? plan?.custom[ex]?.name : (exercises?.find((e) => e.id === ex)?.name ?? 'Exercício desconhecido (será pulado)')

  async function onUse() {
    if (!plan) return
    if (!window.confirm('Trocar seu plano por este? Seus dias atuais saem do plano; treinos e medidas continuam no histórico.')) return
    await importSharedPlan(plan)
    navigate('/plano', { replace: true })
  }

  return (
    <div>
      <div className="pt-safe px-2 pt-2">
        <Button variant="ghost" className="px-2" onClick={() => navigate('/plano')}>
          <Icon name="back" /> Plano
        </Button>
      </div>
      <PageHeader title="Plano recebido" sub="Alguém compartilhou um plano de treino com você" />
      <Section className="space-y-3 pb-6">
        {!code && <p className="text-sm text-danger">Link sem plano.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {plan && (
          <>
            <p className="text-sm text-iron-300">
              {plan.days.length} {plan.days.length === 1 ? 'treino' : 'treinos'}
              {plan.rotation ? ', em sequência (em qualquer dia)' : ', em dias fixos da semana'}. Só o plano vem no link: nada de treinos,
              medidas ou dados da pessoa.
            </p>
            {plan.days.map((d, i) => (
              <div key={i} className="frame rounded-2xl bg-iron-850 p-4">
                <p className="text-sm text-iron-400">{plan.rotation ? `Treino ${i + 1} da sequência` : WEEKDAY_LONG[d.weekday]}</p>
                <h2 className="font-display text-2xl font-bold">{d.name}</h2>
                <ul className="mt-3 space-y-2">
                  {d.items.map((it, j) => (
                    <li key={j} className="flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="min-w-0 truncate">{nameOf(it.ex)}</span>
                      <span className="shrink-0 text-right">
                        <span className="num text-lg">
                          {it.setsPhase2}×{formatTarget(it)}
                        </span>
                        <span className="ml-2 text-xs text-iron-500">{formatClock(it.restSeconds)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={onUse}>
              Usar este plano
            </Button>
            <p className="text-xs text-iron-500">Dá para editar tudo depois na tela do plano.</p>
          </>
        )}
      </Section>
    </div>
  )
}
