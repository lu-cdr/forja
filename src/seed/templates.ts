import { BODYWEIGHT_EQUIPMENT, type Exercise, type PlanDay, type PlanExercise } from '../domain/types'
import * as gen from './plan.generated'

/**
 * Modelos de plano oferecidos na primeira abertura (e em Plano → Trocar modelo).
 * Todos usam o mesmo catálogo de exercícios (o da planilha), então histórico e recordes
 * continuam valendo se a pessoa trocar de modelo.
 */

/**
 * Exercícios com peso do corpo que a planilha não tem (entram no catálogo de quem já usa também).
 * Ids iguais aos que `createExercise` geraria pelo nome: quem já criou um igual não fica com dois.
 */
const BODYWEIGHT: Exercise[] = [
  { id: 'ex-barra-fixa', name: 'Barra fixa', muscleGroup: 'costas', equipment: BODYWEIGHT_EQUIPMENT, isCompound: true },
  { id: 'ex-flexao-de-braco', name: 'Flexão de braço', muscleGroup: 'peito', equipment: BODYWEIGHT_EQUIPMENT, isCompound: true },
  { id: 'ex-mergulho-nas-paralelas', name: 'Mergulho nas paralelas', muscleGroup: 'triceps', equipment: BODYWEIGHT_EQUIPMENT, isCompound: true },
  { id: 'ex-elevacao-de-pernas', name: 'Elevação de pernas', muscleGroup: 'abdomen', equipment: BODYWEIGHT_EQUIPMENT, isCompound: false },
]

export const CATALOG: Exercise[] = [...gen.exercises, ...BODYWEIGHT]
export const CATALOG_IDS = new Set(CATALOG.map((e) => e.id))

export interface PlanTemplate {
  id: string
  name: string
  summary: string
  /** Para quem é. */
  forWho: string
  build: () => { planDays: PlanDay[]; planExercises: PlanExercise[] }
}

// [nome exato do catálogo, séries sem 1–3, séries sem 4+, reps mín, reps máx, descanso (s), extra]
type Row = [string, number, number, number, number, number, Partial<Pick<PlanExercise, 'targetUnit' | 'note'>>?]

const byName = new Map(CATALOG.map((e) => [e.name, e.id]))

function days(templateId: string, spec: { weekday: number; name: string; rows: Row[] }[]) {
  return () => {
    const planDays: PlanDay[] = []
    const planExercises: PlanExercise[] = []
    for (const d of spec) {
      const dayId = `day-${templateId}-${d.weekday}`
      planDays.push({ id: dayId, weekday: d.weekday, name: d.name })
      d.rows.forEach(([name, s1, s2, repMin, repMax, rest, extra], i) => {
        const exerciseId = byName.get(name)
        if (!exerciseId) throw new Error(`Exercício fora do catálogo: ${name}`)
        planExercises.push({
          id: `${dayId}-${i + 1}`,
          planDayId: dayId,
          exerciseId,
          order: i + 1,
          setsPhase1: s1,
          setsPhase2: s2,
          repMin,
          repMax,
          restSeconds: rest,
          ...extra,
        })
      })
    }
    return { planDays, planExercises }
  }
}

const SUPINO = 'Supino reto com barra'
const SUPINO_INC = 'Supino inclinado com halteres'
const AGACHAMENTO = 'Agachamento livre ou no smith'
const STIFF = 'Stiff ou levantamento romeno'
const REMADA = 'Remada curvada com barra ou remada na máquina'
const REMADA_BAIXA = 'Remada baixa (triângulo)'
const PUXADA = 'Puxada frontal (pulldown)'
const PUXADA_NEUTRA = 'Pulldown pegada neutra ou serrote'
const DESENVOLVIMENTO = 'Desenvolvimento com halteres'
const LATERAL = 'Elevação lateral'
const LEG_PRESS = 'Leg press 45°'
const FLEXORA = 'Mesa flexora'
const EXTENSORA = 'Cadeira extensora'
const AFUNDO = 'Afundo ou passada com halteres'
const HIP_THRUST = 'Elevação pélvica (hip thrust)'
const ABDUTORA = 'Cadeira abdutora'
const PANT_PE = 'Panturrilha em pé'
const PANT_SENTADO = 'Panturrilha sentado'
const ROSCA = 'Rosca direta (barra W)'
const MARTELO = 'Rosca martelo'
const TRICEPS_CORDA = 'Tríceps corda na polia'
const TRICEPS_TESTA = 'Tríceps testa (barra W ou halteres)'
const TRICEPS_FRANCES = 'Tríceps francês unilateral'
const CRUCIFIXO_INV = 'Crucifixo inverso (peck deck invertido)'
const ABDOMINAL = 'Abdominal na polia (crunch)'
const PRANCHA = 'Prancha'

const POR_PERNA = { note: 'por perna' } as const
const SEGUNDOS = { targetUnit: 'seconds' } as const

export const TEMPLATES: PlanTemplate[] = [
  {
    id: 'hipertrofia-5x',
    name: 'Hipertrofia 5 dias',
    summary: 'Terça a sábado, um ou dois grupos por dia, cerca de 50 min.',
    forWho: 'Quem já treina e quer volume alto para ganhar massa.',
    // dias com ids "day-<weekday>" por compatibilidade com quem já usava o plano da planilha
    build: () => ({ planDays: structuredClone(gen.planDays), planExercises: structuredClone(gen.planExercises) }),
  },
  {
    id: 'superior-inferior-4x',
    name: 'Superior e inferior 4 dias',
    summary: 'Segunda, terça, quinta e sexta, alternando parte de cima e pernas.',
    forWho: 'Bom equilíbrio entre volume e descanso para quase todo mundo.',
    build: days('superior-inferior-4x', [
      {
        weekday: 1,
        name: 'Superior A',
        rows: [
          [SUPINO, 3, 4, 6, 10, 120],
          [REMADA, 3, 4, 8, 10, 90],
          [DESENVOLVIMENTO, 2, 3, 8, 10, 90],
          [PUXADA, 2, 3, 10, 12, 90],
          [ROSCA, 2, 3, 10, 12, 60],
          [TRICEPS_CORDA, 2, 3, 10, 12, 60],
        ],
      },
      {
        weekday: 2,
        name: 'Inferior A',
        rows: [
          [AGACHAMENTO, 3, 4, 6, 10, 150],
          [STIFF, 3, 3, 8, 10, 120],
          [LEG_PRESS, 2, 3, 10, 12, 90],
          [FLEXORA, 2, 3, 10, 12, 60],
          [PANT_PE, 3, 4, 10, 15, 60],
        ],
      },
      {
        weekday: 4,
        name: 'Superior B',
        rows: [
          [SUPINO_INC, 3, 4, 8, 12, 90],
          [PUXADA_NEUTRA, 3, 4, 10, 12, 90],
          [LATERAL, 3, 4, 12, 15, 60],
          [REMADA_BAIXA, 2, 3, 10, 12, 90],
          [MARTELO, 2, 3, 10, 12, 60],
          [TRICEPS_TESTA, 2, 3, 8, 12, 60],
        ],
      },
      {
        weekday: 5,
        name: 'Inferior B',
        rows: [
          [HIP_THRUST, 3, 4, 8, 12, 90],
          [AFUNDO, 2, 3, 10, 10, 60, POR_PERNA],
          [EXTENSORA, 2, 3, 12, 15, 60],
          [ABDUTORA, 2, 3, 12, 15, 60],
          [PANT_SENTADO, 3, 4, 12, 15, 60],
          [ABDOMINAL, 2, 3, 12, 15, 45],
        ],
      },
    ]),
  },
  {
    id: 'empurrar-puxar-pernas-3x',
    name: 'Empurrar, puxar, pernas 3 dias',
    summary: 'Segunda, quarta e sexta: peito/ombro/tríceps, costas/bíceps e pernas.',
    forWho: 'Quem tem três dias livres e gosta de treinos focados.',
    build: days('empurrar-puxar-pernas-3x', [
      {
        weekday: 1,
        name: 'Empurrar',
        rows: [
          [SUPINO, 3, 4, 6, 10, 120],
          [SUPINO_INC, 3, 3, 8, 12, 90],
          [DESENVOLVIMENTO, 3, 3, 8, 10, 90],
          [LATERAL, 3, 4, 12, 15, 60],
          [TRICEPS_CORDA, 2, 3, 10, 12, 60],
          [TRICEPS_FRANCES, 2, 2, 12, 15, 60],
        ],
      },
      {
        weekday: 3,
        name: 'Puxar',
        rows: [
          [PUXADA, 3, 4, 8, 12, 90],
          [REMADA, 3, 4, 8, 10, 90],
          [REMADA_BAIXA, 2, 3, 10, 12, 90],
          [CRUCIFIXO_INV, 2, 3, 12, 15, 60],
          [ROSCA, 2, 3, 8, 12, 60],
          [MARTELO, 2, 3, 10, 12, 60],
        ],
      },
      {
        weekday: 5,
        name: 'Pernas',
        rows: [
          [AGACHAMENTO, 3, 4, 6, 10, 150],
          [STIFF, 3, 3, 8, 10, 120],
          [LEG_PRESS, 3, 3, 10, 12, 90],
          [FLEXORA, 2, 3, 10, 12, 60],
          [PANT_PE, 3, 4, 10, 15, 60],
          [PRANCHA, 2, 3, 30, 45, 45, SEGUNDOS],
        ],
      },
    ]),
  },
  {
    id: 'corpo-inteiro-3x',
    name: 'Corpo inteiro 3 dias',
    summary: 'Segunda, quarta e sexta, o corpo todo em cada treino.',
    forWho: 'Iniciantes ou quem está voltando a treinar.',
    build: days('corpo-inteiro-3x', [
      {
        weekday: 1,
        name: 'Corpo inteiro A',
        rows: [
          [AGACHAMENTO, 3, 3, 8, 10, 120],
          [SUPINO, 3, 3, 8, 10, 120],
          [REMADA, 3, 3, 8, 10, 90],
          [DESENVOLVIMENTO, 2, 3, 10, 12, 90],
          [ROSCA, 2, 2, 10, 12, 60],
          [PRANCHA, 2, 3, 30, 45, 45, SEGUNDOS],
        ],
      },
      {
        weekday: 3,
        name: 'Corpo inteiro B',
        rows: [
          [STIFF, 3, 3, 8, 10, 120],
          [SUPINO_INC, 3, 3, 8, 12, 90],
          [PUXADA, 3, 3, 8, 12, 90],
          [LEG_PRESS, 2, 3, 10, 12, 90],
          [LATERAL, 2, 3, 12, 15, 60],
          [TRICEPS_CORDA, 2, 2, 10, 12, 60],
        ],
      },
      {
        weekday: 5,
        name: 'Corpo inteiro C',
        rows: [
          [AFUNDO, 2, 3, 10, 10, 60, POR_PERNA],
          [SUPINO, 3, 3, 8, 10, 120],
          [REMADA_BAIXA, 3, 3, 10, 12, 90],
          [FLEXORA, 2, 3, 10, 12, 60],
          [LATERAL, 2, 3, 12, 15, 60],
          [ABDOMINAL, 2, 3, 12, 15, 45],
        ],
      },
    ]),
  },
  {
    id: 'do-zero',
    name: 'Montar do zero',
    summary: 'Começa sem treinos; você monta os dias e exercícios no app.',
    forWho: 'Quem já tem uma ficha da academia ou de um professor.',
    build: () => ({ planDays: [], planExercises: [] }),
  },
]

export const DEFAULT_TEMPLATE_ID = 'hipertrofia-5x'

export function getTemplate(id: string | undefined): PlanTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
}

/** Dias da semana que um modelo usa (para mostrar na escolha). */
export function templateWeekdays(t: PlanTemplate): number[] {
  return t.build().planDays.map((d) => d.weekday)
}
