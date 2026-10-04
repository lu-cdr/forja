/** YYYY-MM-DD no fuso local. */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converte YYYY-MM-DD em Date local à meia-noite. */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000)
}

/** Semana do plano (1-based) a partir da data de início. */
export function planWeek(planStartDate: string, today: string): number {
  const d = daysBetween(planStartDate, today)
  return d < 0 ? 1 : Math.floor(d / 7) + 1
}

/** Fase 1 = readaptação (semanas 1–3); fase 2 = semana 4 em diante. */
export function planPhase(week: number): 1 | 2 {
  return week <= 3 ? 1 : 2
}

/** Segunda-feira da semana de uma data (YYYY-MM-DD). */
export function startOfWeek(date: string): string {
  const d = fromISODate(date)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return toISODate(d)
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function formatDateBR(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }) {
  return fromISODate(iso.slice(0, 10)).toLocaleDateString('pt-BR', opts).replace('.', '')
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
