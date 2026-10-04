export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posterior'
  | 'gluteos'
  | 'panturrilha'
  | 'abdomen'
  | 'trapezio'

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  abdomen: 'Abdômen',
  trapezio: 'Trapézio',
}

export interface Profile {
  id: 'me'
  heightCm?: number
  birthDate?: string
  startWeightKg?: number
  goal?: string
  /** Início do plano (YYYY-MM-DD): conta as semanas e a fase de readaptação. */
  planStartDate: string
  /** Último export de backup (ISO completo). */
  lastExportAt?: string
  /** Versão do plano-semente aplicada (ver src/seed). */
  seedVersion?: number
  /** O plano foi editado pelo app: versões novas da planilha não o substituem. */
  planCustomized?: boolean
  /** Modelo de plano escolhido (ver src/seed/templates.ts). Ausente = instalação antiga, planilha. */
  planTemplate?: string
  /** Quando passou pela tela de boas-vindas (ISO completo). */
  onboardedAt?: string
  /** Aparência do ferreiro. Ausente = visual padrão. */
  smith?: SmithLook
  /** Ano de nascimento (a idade é calculada). */
  birthYear?: number
  trainingLevel?: TrainingLevel
  activityLevel?: ActivityLevel
  /** Semanas iniciais com menos séries (readaptação). Ausente = 3, como no plano original. */
  rampUpWeeks?: number
}

export type TrainingLevel = 'iniciante' | 'intermediario' | 'avancado'
export type ActivityLevel = 'sedentario' | 'pouco-ativo' | 'ativo' | 'muito-ativo'

/** Ids de predefinições (ver src/components/sprites/art/palette.ts). Ids desconhecidos caem no padrão. */
export interface SmithLook {
  skin: string
  hair: string
  beard: string
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: string
  isCompound: boolean
  /** Criado pelo usuário no app. */
  custom?: boolean
}

export interface PlanDay {
  id: string
  /** 0 = domingo … 6 = sábado (igual a Date.getDay()). */
  weekday: number
  name: string
  /** Dia removido do plano: some das telas, mas o histórico continua mostrando o nome. */
  archived?: boolean
}

export interface PlanExercise {
  id: string
  planDayId: string
  exerciseId: string
  order: number
  setsPhase1: number
  setsPhase2: number
  repMin: number
  repMax: number
  restSeconds: number
  /** Meta em repetições (padrão) ou em segundos (ex.: prancha). */
  targetUnit?: 'reps' | 'seconds'
  /** Observação curta da meta, ex.: "por perna". */
  note?: string
}

export interface WorkoutSession {
  id: string
  planDayId: string
  /** YYYY-MM-DD */
  date: string
  startedAt: string
  finishedAt?: string
  notes?: string
  /** Retrato do plano no início do treino: séries planejadas do dia (o XP não muda se o plano for editado depois). */
  plannedSets?: number
  /** Retrato do plano no início do treino: dias de treino por semana. */
  plannedDaysPerWeek?: number
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
  isWarmup: boolean
  /** ISO completo — quando a série foi concluída. */
  loggedAt: string
}

export const MEASUREMENT_FIELDS = [
  'waistCm',
  'abdomenCm',
  'hipCm',
  'chestCm',
  'armRCm',
  'armLCm',
  'thighRCm',
  'thighLCm',
  'calfCm',
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]

export const MEASUREMENT_LABEL: Record<MeasurementField | 'weightKg' | 'bodyFatPct', string> = {
  weightKg: 'Peso',
  bodyFatPct: '% gordura',
  waistCm: 'Cintura',
  abdomenCm: 'Abdômen',
  hipCm: 'Quadril',
  chestCm: 'Peito',
  armRCm: 'Braço D',
  armLCm: 'Braço E',
  thighRCm: 'Coxa D',
  thighLCm: 'Coxa E',
  calfCm: 'Panturrilha',
}

export type BodyMeasurement = {
  id: string
  /** YYYY-MM-DD */
  date: string
  weightKg?: number
  bodyFatPct?: number
  notes?: string
} & Partial<Record<MeasurementField, number>>
