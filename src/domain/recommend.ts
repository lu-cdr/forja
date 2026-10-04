import type { ActivityLevel, TrainingLevel } from './types'

export const TRAINING_LEVELS: { id: TrainingLevel; label: string; hint: string }[] = [
  { id: 'iniciante', label: 'Iniciante', hint: 'Nunca treinei ou treino há menos de 6 meses' },
  { id: 'intermediario', label: 'Intermediário', hint: 'Treino com regularidade há 6 meses a 2 anos' },
  { id: 'avancado', label: 'Avançado', hint: 'Treino com regularidade há mais de 2 anos' },
]

export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; hint: string }[] = [
  { id: 'sedentario', label: 'Sedentário', hint: 'Trabalho sentado e quase não me exercito' },
  { id: 'pouco-ativo', label: 'Pouco ativo', hint: 'Caminho ou me exercito 1 a 2 vezes por semana' },
  { id: 'ativo', label: 'Ativo', hint: 'Me exercito 3 a 5 vezes por semana' },
  { id: 'muito-ativo', label: 'Muito ativo', hint: 'Treino quase todo dia ou tenho trabalho físico' },
]

export interface Recommendation {
  templateId: string
  /** Semanas de readaptação (menos séries) antes do volume cheio. */
  rampUpWeeks: number
  /** Explicação curta, mostrada na escolha do plano. */
  reason: string
}

const DAYS_BY_TEMPLATE: Record<string, number> = {
  'corpo-inteiro-3x': 3,
  'empurrar-puxar-pernas-3x': 3,
  'superior-inferior-4x': 4,
  'hipertrofia-5x': 5,
}

export function ageFromBirthYear(birthYear: number | undefined, today = new Date()): number | undefined {
  return birthYear ? today.getFullYear() - birthYear : undefined
}

/**
 * Recomendação de modelo de plano. Regra simples e explicável:
 * - experiência define a base (iniciante 3× corpo inteiro, intermediário 4×, avançado 5×);
 * - quem está parado (sedentário) começa um degrau abaixo;
 * - acima de 50 anos, no máximo 4 dias; acima de 60, no máximo 3;
 * - readaptação de 3 semanas para quem é iniciante, está parado ou tem 50+; os demais começam no volume cheio.
 */
export function recommendTemplate(input: { age?: number; training?: TrainingLevel; activity?: ActivityLevel }): Recommendation {
  const { age, training = 'iniciante', activity = 'pouco-ativo' } = input
  const ladder = ['corpo-inteiro-3x', 'superior-inferior-4x', 'hipertrofia-5x']
  let step = training === 'avancado' ? 2 : training === 'intermediario' ? 1 : 0
  const reasons: string[] = []

  if (activity === 'sedentario' && step > 0) {
    step--
    reasons.push('você está mais parado agora, então começa com menos dias')
  }
  let id = ladder[step]
  // intermediário com pouco tempo de atividade: 3 dias focados rendem mais que corpo inteiro
  if (training === 'intermediario' && step === 0) id = 'empurrar-puxar-pernas-3x'

  if (age !== undefined && age >= 60 && DAYS_BY_TEMPLATE[id] > 3) {
    id = training === 'iniciante' ? 'corpo-inteiro-3x' : 'empurrar-puxar-pernas-3x'
    reasons.push('mais dias de descanso ajudam na recuperação')
  } else if (age !== undefined && age >= 50 && DAYS_BY_TEMPLATE[id] > 4) {
    id = 'superior-inferior-4x'
    reasons.push('4 dias deixam mais espaço para recuperar')
  }

  const rampUp = training === 'iniciante' || activity === 'sedentario' || (age !== undefined && age >= 50)
  const base =
    training === 'avancado'
      ? 'Para quem já treina há anos: volume alto, um ou dois grupos por dia'
      : training === 'intermediario'
        ? 'Para quem já pegou o ritmo: cada músculo treinado duas vezes por semana'
        : 'Para começar bem: o corpo todo em cada treino, com tempo para aprender os movimentos'

  return {
    templateId: id,
    rampUpWeeks: rampUp ? 3 : 0,
    reason: `${base}${reasons.length ? `; ${reasons.join('; ')}` : ''}.${rampUp ? ' As 3 primeiras semanas têm menos séries para o corpo se adaptar.' : ''}`,
  }
}
