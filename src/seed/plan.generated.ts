// GERADO por scripts/seed-from-xlsx.mjs a partir de Treino_Hipertrofia.xlsx — não editar à mão.
// Para atualizar: edite a planilha e rode `npm run seed`.
import type { Exercise, PlanDay, PlanExercise } from '../domain/types'

export const SEED_VERSION = 2

export const exercises: Exercise[] = [
  {
    "id": "ex-puxada-frontal-pulldown",
    "name": "Puxada frontal (pulldown)",
    "muscleGroup": "costas",
    "isCompound": true,
    "equipment": "Polia"
  },
  {
    "id": "ex-remada-curvada-com-barra-ou-remada-na-maquina",
    "name": "Remada curvada com barra ou remada na máquina",
    "muscleGroup": "costas",
    "isCompound": true,
    "equipment": "Barra"
  },
  {
    "id": "ex-remada-baixa-triangulo",
    "name": "Remada baixa (triângulo)",
    "muscleGroup": "costas",
    "isCompound": true,
    "equipment": "Polia"
  },
  {
    "id": "ex-pulldown-pegada-neutra-ou-serrote",
    "name": "Pulldown pegada neutra ou serrote",
    "muscleGroup": "costas",
    "isCompound": true,
    "equipment": "Polia"
  },
  {
    "id": "ex-rosca-direta-barra-w",
    "name": "Rosca direta (barra W)",
    "muscleGroup": "biceps",
    "isCompound": false,
    "equipment": "Barra"
  },
  {
    "id": "ex-rosca-martelo",
    "name": "Rosca martelo",
    "muscleGroup": "biceps",
    "isCompound": false,
    "equipment": "Halteres"
  },
  {
    "id": "ex-agachamento-livre-ou-no-smith",
    "name": "Agachamento livre ou no smith",
    "muscleGroup": "quadriceps",
    "isCompound": true,
    "equipment": "Barra"
  },
  {
    "id": "ex-leg-press-45",
    "name": "Leg press 45°",
    "muscleGroup": "quadriceps",
    "isCompound": true,
    "equipment": "Máquina"
  },
  {
    "id": "ex-cadeira-extensora",
    "name": "Cadeira extensora",
    "muscleGroup": "quadriceps",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-afundo-ou-passada-com-halteres",
    "name": "Afundo ou passada com halteres",
    "muscleGroup": "quadriceps",
    "isCompound": true,
    "equipment": "Halteres"
  },
  {
    "id": "ex-panturrilha-em-pe",
    "name": "Panturrilha em pé",
    "muscleGroup": "panturrilha",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-desenvolvimento-com-halteres",
    "name": "Desenvolvimento com halteres",
    "muscleGroup": "ombros",
    "isCompound": true,
    "equipment": "Halteres"
  },
  {
    "id": "ex-elevacao-lateral",
    "name": "Elevação lateral",
    "muscleGroup": "ombros",
    "isCompound": false,
    "equipment": "Halteres"
  },
  {
    "id": "ex-crucifixo-inverso-peck-deck-invertido",
    "name": "Crucifixo inverso (peck deck invertido)",
    "muscleGroup": "ombros",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-elevacao-frontal-ou-remada-alta-leve",
    "name": "Elevação frontal ou remada alta leve",
    "muscleGroup": "ombros",
    "isCompound": false,
    "equipment": "Halteres"
  },
  {
    "id": "ex-abdominal-na-polia-crunch",
    "name": "Abdominal na polia (crunch)",
    "muscleGroup": "abdomen",
    "isCompound": false,
    "equipment": "Polia"
  },
  {
    "id": "ex-prancha",
    "name": "Prancha",
    "muscleGroup": "abdomen",
    "isCompound": false,
    "equipment": "Peso corporal"
  },
  {
    "id": "ex-stiff-ou-levantamento-romeno",
    "name": "Stiff ou levantamento romeno",
    "muscleGroup": "posterior",
    "isCompound": true,
    "equipment": "Barra"
  },
  {
    "id": "ex-mesa-flexora",
    "name": "Mesa flexora",
    "muscleGroup": "posterior",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-elevacao-pelvica-hip-thrust",
    "name": "Elevação pélvica (hip thrust)",
    "muscleGroup": "gluteos",
    "isCompound": true,
    "equipment": "Barra"
  },
  {
    "id": "ex-cadeira-abdutora",
    "name": "Cadeira abdutora",
    "muscleGroup": "gluteos",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-panturrilha-sentado",
    "name": "Panturrilha sentado",
    "muscleGroup": "panturrilha",
    "isCompound": false,
    "equipment": "Máquina"
  },
  {
    "id": "ex-supino-reto-com-barra",
    "name": "Supino reto com barra",
    "muscleGroup": "peito",
    "isCompound": true,
    "equipment": "Barra"
  },
  {
    "id": "ex-supino-inclinado-com-halteres",
    "name": "Supino inclinado com halteres",
    "muscleGroup": "peito",
    "isCompound": true,
    "equipment": "Halteres"
  },
  {
    "id": "ex-crucifixo-no-peck-deck-ou-crossover",
    "name": "Crucifixo no peck deck ou crossover",
    "muscleGroup": "peito",
    "isCompound": false,
    "equipment": "Polia"
  },
  {
    "id": "ex-triceps-corda-na-polia",
    "name": "Tríceps corda na polia",
    "muscleGroup": "triceps",
    "isCompound": false,
    "equipment": "Polia"
  },
  {
    "id": "ex-triceps-testa-barra-w-ou-halteres",
    "name": "Tríceps testa (barra W ou halteres)",
    "muscleGroup": "triceps",
    "isCompound": false,
    "equipment": "Barra"
  },
  {
    "id": "ex-triceps-frances-unilateral",
    "name": "Tríceps francês unilateral",
    "muscleGroup": "triceps",
    "isCompound": false,
    "equipment": "Halteres"
  }
]

export const planDays: PlanDay[] = [
  {
    "id": "day-2",
    "weekday": 2,
    "name": "Costas + bíceps"
  },
  {
    "id": "day-3",
    "weekday": 3,
    "name": "Quadríceps + panturrilha"
  },
  {
    "id": "day-4",
    "weekday": 4,
    "name": "Ombros + abdômen"
  },
  {
    "id": "day-5",
    "weekday": 5,
    "name": "Posterior de coxa + glúteos + panturrilha"
  },
  {
    "id": "day-6",
    "weekday": 6,
    "name": "Peito + tríceps"
  }
]

export const planExercises: PlanExercise[] = [
  {
    "id": "day-2-1",
    "planDayId": "day-2",
    "exerciseId": "ex-puxada-frontal-pulldown",
    "order": 1,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-2-2",
    "planDayId": "day-2",
    "exerciseId": "ex-remada-curvada-com-barra-ou-remada-na-maquina",
    "order": 2,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 8,
    "repMax": 10,
    "restSeconds": 90
  },
  {
    "id": "day-2-3",
    "planDayId": "day-2",
    "exerciseId": "ex-remada-baixa-triangulo",
    "order": 3,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-2-4",
    "planDayId": "day-2",
    "exerciseId": "ex-pulldown-pegada-neutra-ou-serrote",
    "order": 4,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 60
  },
  {
    "id": "day-2-5",
    "planDayId": "day-2",
    "exerciseId": "ex-rosca-direta-barra-w",
    "order": 5,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 60
  },
  {
    "id": "day-2-6",
    "planDayId": "day-2",
    "exerciseId": "ex-rosca-martelo",
    "order": 6,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 60
  },
  {
    "id": "day-3-1",
    "planDayId": "day-3",
    "exerciseId": "ex-agachamento-livre-ou-no-smith",
    "order": 1,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 120
  },
  {
    "id": "day-3-2",
    "planDayId": "day-3",
    "exerciseId": "ex-leg-press-45",
    "order": 2,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-3-3",
    "planDayId": "day-3",
    "exerciseId": "ex-cadeira-extensora",
    "order": 3,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-3-4",
    "planDayId": "day-3",
    "exerciseId": "ex-afundo-ou-passada-com-halteres",
    "order": 4,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 10,
    "repMax": 10,
    "restSeconds": 60,
    "note": "por perna"
  },
  {
    "id": "day-3-5",
    "planDayId": "day-3",
    "exerciseId": "ex-panturrilha-em-pe",
    "order": 5,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 10,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-4-1",
    "planDayId": "day-4",
    "exerciseId": "ex-desenvolvimento-com-halteres",
    "order": 1,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 8,
    "repMax": 10,
    "restSeconds": 90
  },
  {
    "id": "day-4-2",
    "planDayId": "day-4",
    "exerciseId": "ex-elevacao-lateral",
    "order": 2,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-4-3",
    "planDayId": "day-4",
    "exerciseId": "ex-crucifixo-inverso-peck-deck-invertido",
    "order": 3,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-4-4",
    "planDayId": "day-4",
    "exerciseId": "ex-elevacao-frontal-ou-remada-alta-leve",
    "order": 4,
    "setsPhase1": 2,
    "setsPhase2": 2,
    "repMin": 12,
    "repMax": 12,
    "restSeconds": 60
  },
  {
    "id": "day-4-5",
    "planDayId": "day-4",
    "exerciseId": "ex-abdominal-na-polia-crunch",
    "order": 5,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-4-6",
    "planDayId": "day-4",
    "exerciseId": "ex-prancha",
    "order": 6,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 30,
    "repMax": 45,
    "restSeconds": 45,
    "targetUnit": "seconds"
  },
  {
    "id": "day-5-1",
    "planDayId": "day-5",
    "exerciseId": "ex-stiff-ou-levantamento-romeno",
    "order": 1,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 8,
    "repMax": 10,
    "restSeconds": 120
  },
  {
    "id": "day-5-2",
    "planDayId": "day-5",
    "exerciseId": "ex-mesa-flexora",
    "order": 2,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-5-3",
    "planDayId": "day-5",
    "exerciseId": "ex-elevacao-pelvica-hip-thrust",
    "order": 3,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-5-4",
    "planDayId": "day-5",
    "exerciseId": "ex-cadeira-abdutora",
    "order": 4,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-5-5",
    "planDayId": "day-5",
    "exerciseId": "ex-panturrilha-sentado",
    "order": 5,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-6-1",
    "planDayId": "day-6",
    "exerciseId": "ex-supino-reto-com-barra",
    "order": 1,
    "setsPhase1": 3,
    "setsPhase2": 4,
    "repMin": 6,
    "repMax": 10,
    "restSeconds": 120
  },
  {
    "id": "day-6-2",
    "planDayId": "day-6",
    "exerciseId": "ex-supino-inclinado-com-halteres",
    "order": 2,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-6-3",
    "planDayId": "day-6",
    "exerciseId": "ex-crucifixo-no-peck-deck-ou-crossover",
    "order": 3,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  },
  {
    "id": "day-6-4",
    "planDayId": "day-6",
    "exerciseId": "ex-triceps-corda-na-polia",
    "order": 4,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 10,
    "repMax": 12,
    "restSeconds": 60
  },
  {
    "id": "day-6-5",
    "planDayId": "day-6",
    "exerciseId": "ex-triceps-testa-barra-w-ou-halteres",
    "order": 5,
    "setsPhase1": 2,
    "setsPhase2": 3,
    "repMin": 8,
    "repMax": 12,
    "restSeconds": 90
  },
  {
    "id": "day-6-6",
    "planDayId": "day-6",
    "exerciseId": "ex-triceps-frances-unilateral",
    "order": 6,
    "setsPhase1": 2,
    "setsPhase2": 2,
    "repMin": 12,
    "repMax": 15,
    "restSeconds": 60
  }
]


