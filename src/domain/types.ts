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
  /** "weekly" (padrão): cada treino tem dia da semana. "rotation": treinos em sequência (A, B, C…), em qualquer dia. */
  schedule?: Schedule
  /** Na sequência: quantos treinos por semana conta como semana completa. Ausente = número de treinos do plano. */
  rotationDaysPerWeek?: number
  /** Perguntar o esforço (RPE) depois de cada série. */
  askRpe?: boolean
  /** Visuais escolhidos (ids de src/domain/cosmetics.ts); destravados por conquista. */
  cosmetics?: { scene?: string; hammer?: string }
}

export type Schedule = 'weekly' | 'rotation'

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
  /** Anotação da pessoa que aparece em todo treino, ex.: "banco no furo 4". */
  setupNote?: string
}

/** Exercícios sem carga externa: o campo de carga vira "carga extra" (colete, anilha) e pode ficar vazio. */
export const BODYWEIGHT_EQUIPMENT = 'Peso corporal'

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
  /** Trocas só neste treino (máquina ocupada): id do item do plano → exercício usado no lugar. */
  swaps?: Record<string, string>
  /** Exercícios acrescentados só neste treino. */
  extraExercises?: string[]
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  /** Esforço percebido, 6–10 (10 = não sairia mais nenhuma repetição). */
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

export type PhotoAngle = 'frente' | 'lado' | 'costas'
export const PHOTO_ANGLES: { id: PhotoAngle; label: string }[] = [
  { id: 'frente', label: 'Frente' },
  { id: 'lado', label: 'Lado' },
  { id: 'costas', label: 'Costas' },
]

/** Foto de progresso, guardada só no aparelho (JPEG reduzido). */
export interface ProgressPhoto {
  id: string
  /** YYYY-MM-DD */
  date: string
  angle: PhotoAngle
  blob: Blob
  width: number
  height: number
}

export type BodyMeasurement = {
  id: string
  /** YYYY-MM-DD */
  date: string
  weightKg?: number
  bodyFatPct?: number
  notes?: string
} & Partial<Record<MeasurementField, number>>
