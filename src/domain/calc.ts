import type { SetLog } from './types'

/** Volume de uma série: carga × reps. */
export function setVolume(s: Pick<SetLog, 'weightKg' | 'reps'>): number {
  return s.weightKg * s.reps
}

/** Soma de volume, ignorando aquecimento. */
export function totalVolume(sets: Pick<SetLog, 'weightKg' | 'reps' | 'isWarmup'>[]): number {
  return sets.filter((s) => !s.isWarmup).reduce((acc, s) => acc + setVolume(s), 0)
}

/** 1RM estimado pela fórmula de Epley. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

/** Melhor série (maior 1RM estimado) de uma lista. */
export function bestSet<T extends Pick<SetLog, 'weightKg' | 'reps' | 'isWarmup'>>(sets: T[]): T | undefined {
  let best: T | undefined
  let bestValue = -1
  for (const s of sets) {
    if (s.isWarmup) continue
    const v = epley1RM(s.weightKg, s.reps)
    if (v > bestValue) {
      bestValue = v
      best = s
    }
  }
  return best
}

/**
 * Média móvel por janela de dias corridos (não de pontos).
 * Para cada ponto, faz a média de todos os pontos com data em (d - window, d].
 */
export function movingAverageByDays<T extends { date: string; value: number }>(
  points: T[],
  windowDays = 7,
): (T & { avg: number })[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const windowMs = windowDays * 86_400_000
  return sorted.map((p) => {
    const t = Date.parse(p.date)
    const inWindow = sorted.filter((q) => {
      const tq = Date.parse(q.date)
      return tq <= t && tq > t - windowMs
    })
    const avg = inWindow.reduce((a, q) => a + q.value, 0) / inWindow.length
    return { ...p, avg }
  })
}

/** IMC = peso / altura² (altura em metros). */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

/** Massa magra estimada — só faz sentido como tendência. */
export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100)
}

/** Variação de um valor em relação à primeira e à anterior medição. */
export function deltas(values: number[]): { fromFirst: number; fromPrev: number } | undefined {
  if (values.length < 2) return undefined
  const last = values[values.length - 1]
  return { fromFirst: last - values[0], fromPrev: last - values[values.length - 2] }
}

/**
 * Sugestão de progressão: todas as séries de trabalho bateram o topo da faixa.
 */
export function shouldIncreaseLoad(
  sets: Pick<SetLog, 'reps' | 'isWarmup'>[],
  repMax: number,
  plannedSets: number,
): boolean {
  const work = sets.filter((s) => !s.isWarmup)
  return work.length >= plannedSets && work.every((s) => s.reps >= repMax)
}

/** Arredonda para 1 casa e formata em pt-BR. */
export function fmt(n: number, digits = 1): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

/** Volume com separador de milhar e sufixo "t" acima de 10 mil kg. */
export function fmtVolume(kg: number): string {
  if (kg >= 10_000) return `${fmt(kg / 1000, 1)} t`
  return `${fmt(kg, 0)} kg`
}
