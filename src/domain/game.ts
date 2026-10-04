import { bestSet, epley1RM, setVolume } from './calc'
import { fromISODate, planWeek, startOfWeek, toISODate } from './dates'
import { plannedSetsFor } from './plan'
import type { SetLog, WorkoutSession } from './types'

/**
 * Motor de RPG da Forja. Tudo é DERIVADO do histórico (treinos, séries, medidas):
 * nada de XP é armazenado, então apagar/editar um treino recalcula o nível e o
 * backup continua sendo só os dados brutos.
 */

// ---------- regras de XP ----------

export const XP = {
  workout: 100, // treino concluído
  perSet: 10, // cada série de trabalho
  fullWorkout: 50, // todas as séries planejadas do dia
  pr: 75, // novo recorde (1RM estimado) num exercício
  loadUp: 25, // carga máxima maior que na última vez
  fullWeek: 250, // todos os treinos planejados da semana
  measurement: 25, // dia com medição registrada
} as const

export type XpKind = keyof typeof XP | 'achievement'

export interface XpEvent {
  kind: XpKind
  xp: number
  date: string
  label: string
  sessionId?: string
  achievementId?: string
}

// ---------- níveis ----------

/** XP total necessário para ESTAR no nível L (L ≥ 1). Curva suave: ~1 nível/semana no início, mais lento depois. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(250 * Math.pow(level - 1, 1.7))
}

export function levelFromXp(xp: number): number {
  let l = 1
  while (xpForLevel(l + 1) <= xp) l++
  return l
}

export interface Rank {
  tier: 0 | 1 | 2 | 3 | 4
  minLevel: number
  title: string
  flavor: string
}

export const RANKS: Rank[] = [
  { tier: 0, minLevel: 1, title: 'Aprendiz', flavor: 'Ainda aprendendo a segurar o martelo. Toda lenda começou varrendo a oficina.' },
  { tier: 1, minLevel: 5, title: 'Ferreiro', flavor: 'O avental já tem marcas de brasa. Os golpes ganharam ritmo.' },
  { tier: 2, minLevel: 10, title: 'Ferreiro de Aço', flavor: 'Braços que dobram ferro frio. A vila inteira ouve a bigorna.' },
  { tier: 3, minLevel: 20, title: 'Mestre Ferreiro', flavor: 'O martelo é uma extensão do corpo. Aprendizes vêm de longe para observar.' },
  { tier: 4, minLevel: 35, title: 'Lenda da Forja', flavor: 'As runas do martelo brilham a cada golpe. Contam histórias sobre você nas tavernas.' },
]

export function rankForLevel(level: number): Rank {
  return [...RANKS].reverse().find((r) => level >= r.minLevel)!
}

// ---------- conquistas ----------

export interface RunningStats {
  workouts: number
  totalVolume: number
  prs: number
  currentStreakWeeks: number
  bestStreakWeeks: number
  fullWeeks: number
  measurementDays: number
  reachedPhase2: boolean
  totalSets: number
}

export type AchievementIcon = 'spark' | 'anvil' | 'hammer' | 'flame' | 'trophy' | 'weight' | 'scroll' | 'shield' | 'crown'

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: AchievementIcon
  xp: number
  test: (s: RunningStats) => boolean
  /** Para barra de progresso: [atual, alvo]. */
  progress: (s: RunningStats) => [number, number]
}

const ach = (
  id: string,
  name: string,
  description: string,
  icon: AchievementIcon,
  xp: number,
  value: (s: RunningStats) => number,
  target: number,
): AchievementDef => ({
  id,
  name,
  description,
  icon,
  xp,
  test: (s) => value(s) >= target,
  progress: (s) => [Math.min(value(s), target), target],
})

export const ACHIEVEMENTS: AchievementDef[] = [
  ach('primeira-faisca', 'Primeira faísca', 'Conclua o primeiro treino.', 'spark', 50, (s) => s.workouts, 1),
  ach('bigorna-quente', 'Bigorna quente', 'Conclua 5 treinos.', 'anvil', 100, (s) => s.workouts, 5),
  ach('martelo-firme', 'Martelo firme', 'Conclua 25 treinos.', 'hammer', 250, (s) => s.workouts, 25),
  ach('cem-golpes', 'Cem golpes', 'Conclua 100 treinos.', 'hammer', 1000, (s) => s.workouts, 100),
  ach('semana-de-aco', 'Semana de aço', 'Faça todos os treinos planejados de uma semana.', 'shield', 150, (s) => s.fullWeeks, 1),
  ach('ferro-temperado', 'Ferro temperado', 'Complete 8 semanas inteiras de treino.', 'shield', 500, (s) => s.fullWeeks, 8),
  ach('chama-viva', 'Chama viva', 'Treine 4 semanas seguidas.', 'flame', 200, (s) => s.bestStreakWeeks, 4),
  ach('fogo-eterno', 'Fogo eterno', 'Treine 12 semanas seguidas.', 'flame', 600, (s) => s.bestStreakWeeks, 12),
  ach('fim-da-readaptacao', 'Fim da readaptação', 'Treine na fase principal do plano.', 'scroll', 150, (s) => (s.reachedPhase2 ? 1 : 0), 1),
  ach('primeiro-recorde', 'Primeiro recorde', 'Bata um recorde pessoal.', 'trophy', 75, (s) => s.prs, 1),
  ach('quebra-recordes', 'Quebra-recordes', 'Bata 10 recordes pessoais.', 'trophy', 250, (s) => s.prs, 10),
  ach('colecionador-de-recordes', 'Colecionador de recordes', 'Bata 50 recordes pessoais.', 'crown', 800, (s) => s.prs, 50),
  ach('dez-toneladas', 'Dez toneladas', 'Levante 10 t somando todos os treinos.', 'weight', 100, (s) => s.totalVolume / 1000, 10),
  ach('cem-toneladas', 'Cem toneladas', 'Levante 100 t somando todos os treinos.', 'weight', 400, (s) => s.totalVolume / 1000, 100),
  ach('mil-toneladas', 'Mil toneladas', 'Levante 1.000 t somando todos os treinos.', 'crown', 1500, (s) => s.totalVolume / 1000, 1000),
  ach('espelho-do-ferreiro', 'Espelho do ferreiro', 'Registre medidas em 4 dias diferentes.', 'scroll', 100, (s) => s.measurementDays, 4),
  ach('cronista', 'Cronista', 'Registre medidas em 12 dias diferentes.', 'scroll', 250, (s) => s.measurementDays, 12),
]

// ---------- atributos ----------

export interface Attributes {
  forca: number
  vigor: number
  constancia: number
  disciplina: number
}

const cap = (n: number) => Math.max(1, Math.min(99, Math.round(n)))

export function attributesFrom(s: RunningStats): Attributes {
  return {
    // raiz quadrada = retorno decrescente: sobe rápido no início e continua subindo por anos
    forca: cap(5 + Math.sqrt(s.prs) * 9), // 25 recordes ≈ 50, 100 ≈ 95
    vigor: cap(5 + Math.sqrt(s.totalVolume / 1000) * 4), // 100 t ≈ 45, 500 t ≈ 94
    constancia: cap(5 + Math.sqrt(s.bestStreakWeeks * 5 + s.fullWeeks * 3) * 6), // ~6 meses firmes ≈ 90
    disciplina: cap(5 + Math.sqrt(s.measurementDays) * 9), // 12 dias ≈ 36, 100 ≈ 95
  }
}

// ---------- cálculo completo ----------

export interface GameInput {
  /** Só sessões concluídas. */
  sessions: WorkoutSession[]
  sets: SetLog[]
  /** Itens do plano (para saber quantas séries cada dia pede). */
  plan: { planDayId: string; setsPhase1: number; setsPhase2: number }[]
  plannedDaysPerWeek: number
  planStartDate: string
  /** Semanas de readaptação do perfil (padrão 3). */
  rampUpWeeks?: number
  measurementDates: string[]
}

export interface UnlockedAchievement {
  def: AchievementDef
  date: string
}

export interface GameState {
  totalXp: number
  level: number
  levelStartXp: number
  nextLevelXp: number
  rank: Rank
  stats: RunningStats
  attributes: Attributes
  events: XpEvent[]
  unlocked: UnlockedAchievement[]
}

const emptyStats = (): RunningStats => ({
  workouts: 0,
  totalVolume: 0,
  prs: 0,
  currentStreakWeeks: 0,
  bestStreakWeeks: 0,
  fullWeeks: 0,
  measurementDays: 0,
  reachedPhase2: false,
  totalSets: 0,
})

const prevWeek = (week: string) => {
  const d = fromISODate(week)
  d.setDate(d.getDate() - 7)
  return toISODate(d)
}

export function computeGame(input: GameInput): GameState {
  const events: XpEvent[] = []
  const stats = emptyStats()
  const unlocked: UnlockedAchievement[] = []
  const unlockedIds = new Set<string>()

  const setsBySession = new Map<string, SetLog[]>()
  for (const s of input.sets) {
    if (s.isWarmup) continue
    const arr = setsBySession.get(s.sessionId) ?? []
    arr.push(s)
    setsBySession.set(s.sessionId, arr)
  }

  // linha do tempo: treinos e dias de medição, em ordem
  type Step = { date: string; at: string; session?: WorkoutSession; measurement?: true }
  const steps: Step[] = [
    ...input.sessions.filter((s) => s.finishedAt).map((s) => ({ date: s.date, at: s.startedAt, session: s })),
    ...[...new Set(input.measurementDates)].map((d) => ({ date: d, at: `${d}T23:59:59.999Z`, measurement: true as const })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const bestE1RM = new Map<string, number>()
  const lastTop = new Map<string, number>()
  const weekDays = new Map<string, Set<string>>()
  const weeksWithWorkout = new Set<string>()
  const fullWeeksAwarded = new Set<string>()

  const checkAchievements = (date: string) => {
    for (const def of ACHIEVEMENTS) {
      if (unlockedIds.has(def.id) || !def.test(stats)) continue
      unlockedIds.add(def.id)
      unlocked.push({ def, date })
      events.push({ kind: 'achievement', xp: def.xp, date, label: `Conquista: ${def.name}`, achievementId: def.id })
    }
  }

  for (const step of steps) {
    if (step.measurement) {
      stats.measurementDays++
      events.push({ kind: 'measurement', xp: XP.measurement, date: step.date, label: 'Medidas registradas' })
      checkAchievements(step.date)
      continue
    }
    const sess = step.session!
    const sid = sess.id
    const sets = setsBySession.get(sid) ?? []
    const ev = (kind: XpKind, xp: number, label: string) => events.push({ kind, xp, date: sess.date, label, sessionId: sid })

    stats.workouts++
    stats.totalSets += sets.length
    stats.totalVolume += sets.reduce((a, s) => a + setVolume(s), 0)
    ev('workout', XP.workout, 'Treino concluído')
    if (sets.length) ev('perSet', sets.length * XP.perSet, `${sets.length} ${sets.length === 1 ? 'série' : 'séries'}`)

    if (planWeek(input.planStartDate, sess.date) > (input.rampUpWeeks ?? 3)) stats.reachedPhase2 = true
    // retrato gravado no início do treino; o plano atual é só reserva para sessões antigas
    const planned = sess.plannedSets ?? plannedSetsFor(sess.planDayId, sess.date, input.plan, input.planStartDate, input.rampUpWeeks)
    if (planned > 0 && sets.length >= planned) ev('fullWorkout', XP.fullWorkout, 'Treino completo')

    // recordes e progressão por exercício
    const byEx = new Map<string, SetLog[]>()
    for (const s of sets) byEx.set(s.exerciseId, [...(byEx.get(s.exerciseId) ?? []), s])
    let prs = 0
    let ups = 0
    for (const [exId, list] of byEx) {
      const best = bestSet(list)
      const e = best ? epley1RM(best.weightKg, best.reps) : 0
      const prev = bestE1RM.get(exId)
      if (e > 0 && prev !== undefined && e > prev + 0.01) prs++
      if (e > (prev ?? 0)) bestE1RM.set(exId, e)
      const top = Math.max(...list.map((s) => s.weightKg))
      const prevTop = lastTop.get(exId)
      if (prevTop !== undefined && top > prevTop) ups++
      lastTop.set(exId, top)
    }
    if (prs) ev('pr', prs * XP.pr, `${prs} ${prs === 1 ? 'recorde' : 'recordes'}`)
    if (ups) ev('loadUp', ups * XP.loadUp, `Carga subiu em ${ups} ${ups === 1 ? 'exercício' : 'exercícios'}`)
    stats.prs += prs

    // semanas
    const wk = startOfWeek(sess.date)
    if (!weeksWithWorkout.has(wk)) {
      weeksWithWorkout.add(wk)
      stats.currentStreakWeeks = weeksWithWorkout.has(prevWeek(wk)) ? stats.currentStreakWeeks + 1 : 1
      stats.bestStreakWeeks = Math.max(stats.bestStreakWeeks, stats.currentStreakWeeks)
    }
    const days = weekDays.get(wk) ?? new Set<string>()
    days.add(sess.date)
    weekDays.set(wk, days)
    const daysPerWeek = sess.plannedDaysPerWeek ?? input.plannedDaysPerWeek
    if (daysPerWeek > 0 && days.size >= daysPerWeek && !fullWeeksAwarded.has(wk)) {
      fullWeeksAwarded.add(wk)
      stats.fullWeeks++
      ev('fullWeek', XP.fullWeek, 'Semana completa')
    }

    checkAchievements(sess.date)
  }

  const totalXp = events.reduce((a, e) => a + e.xp, 0)
  const level = levelFromXp(totalXp)
  return {
    totalXp,
    level,
    levelStartXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    rank: rankForLevel(level),
    stats,
    attributes: attributesFrom(stats),
    events,
    unlocked,
  }
}

/** Fração (0–1) do caminho até o próximo nível. */
export function levelProgress(g: Pick<GameState, 'totalXp' | 'levelStartXp' | 'nextLevelXp'>): number {
  return (g.totalXp - g.levelStartXp) / (g.nextLevelXp - g.levelStartXp)
}

/** Recompensa de um treino: compara o estado sem e com a sessão. */
export function rewardForSession(input: GameInput, sessionId: string) {
  const after = computeGame(input)
  const before = computeGame({ ...input, sessions: input.sessions.filter((s) => s.id !== sessionId) })
  const sessionEvents = after.events.filter((e) => e.sessionId === sessionId)
  const newAchievements = after.unlocked.filter((u) => !before.unlocked.some((b) => b.def.id === u.def.id))
  const xp = after.totalXp - before.totalXp
  return {
    before,
    after,
    xp,
    sessionEvents,
    newAchievements,
    leveledUp: after.level > before.level,
    rankedUp: after.rank.tier > before.rank.tier,
  }
}

// ---------- missões ----------

export interface Quest {
  id: string
  title: string
  detail: string
  xp: number
  done: boolean
  progress?: [number, number]
}

export function questsFor(input: GameInput, today: string, planWeekdays: number[]): Quest[] {
  const week = startOfWeek(today)
  const sessionsThisWeek = new Set(input.sessions.filter((s) => s.finishedAt && startOfWeek(s.date) === week).map((s) => s.date))
  const quests: Quest[] = []
  if (planWeekdays.includes(fromISODate(today).getDay())) {
    quests.push({
      id: 'today',
      title: 'Forjar o treino de hoje',
      detail: 'Conclua o treino do dia. Cada série vale XP.',
      xp: XP.workout + XP.fullWorkout,
      done: input.sessions.some((s) => s.finishedAt && s.date === today),
    })
  }
  if (input.plannedDaysPerWeek > 0)
    quests.push({
    id: 'week',
    title: 'Semana completa',
    detail: `Faça os ${input.plannedDaysPerWeek} treinos da semana.`,
    xp: XP.fullWeek,
    done: sessionsThisWeek.size >= input.plannedDaysPerWeek,
    progress: [Math.min(sessionsThisWeek.size, input.plannedDaysPerWeek), input.plannedDaysPerWeek],
  })
  quests.push({
    id: 'measure',
    title: 'Olhar no espelho',
    detail: 'Registre seu peso pelo menos uma vez nesta semana.',
    xp: XP.measurement,
    done: input.measurementDates.some((d) => startOfWeek(d) === week),
  })
  return quests
}
