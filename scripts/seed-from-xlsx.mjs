// Gera src/seed/plan.generated.ts a partir do Treino_Hipertrofia.xlsx.
// Uso: npm run seed
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import XLSX from 'xlsx'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wb = XLSX.read(readFileSync(resolve(root, 'Treino_Hipertrofia.xlsx')))

const WEEKDAYS = { Domingo: 0, Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6 }

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Ordem importa: regras mais específicas primeiro.
// [regex, grupo, composto]
const MUSCLE_RULES = [
  [/crucifixo inverso|elevacao lateral|elevacao frontal|remada alta|desenvolvimento/, 'ombros', null],
  [/puxada|pulldown|remada|serrote/, 'costas', true],
  [/rosca/, 'biceps', false],
  [/triceps/, 'triceps', false],
  [/supino/, 'peito', true],
  [/crucifixo|peck deck|crossover/, 'peito', false],
  [/agachamento|leg press|afundo|passada/, 'quadriceps', true],
  [/extensora/, 'quadriceps', false],
  [/stiff|romeno|terra/, 'posterior', true],
  [/flexora/, 'posterior', false],
  [/elevacao pelvica|hip thrust/, 'gluteos', true],
  [/abdutora/, 'gluteos', false],
  [/panturrilha/, 'panturrilha', false],
  [/abdominal|prancha/, 'abdomen', false],
]

const EQUIPMENT_RULES = [
  [/polia|crossover|pulldown|puxada|crunch|remada baixa/, 'Polia'],
  [/barra|stiff|agachamento livre|hip thrust/, 'Barra'],
  [/maquina|cadeira|mesa|leg press|peck deck|smith|sentado|em pe/, 'Máquina'],
  [/halter|martelo|lateral|frontal|unilateral/, 'Halteres'],
  [/prancha/, 'Peso corporal'],
]

function classify(name) {
  const n = norm(name)
  const rule = MUSCLE_RULES.find(([re]) => re.test(n))
  if (!rule) throw new Error(`Grupo muscular desconhecido para "${name}". Adicione uma regra em scripts/seed-from-xlsx.mjs.`)
  const isCompound = rule[2] ?? /desenvolvimento/.test(n)
  const equipment = EQUIPMENT_RULES.find(([re]) => re.test(n))?.[1] ?? 'Livre'
  return { muscleGroup: rule[1], isCompound, equipment }
}

/** "8-12" → 8..12 ; "12" → 12..12 ; "10 por perna" → 10..10 + nota ; "30-45 s" → tempo */
function parseReps(raw) {
  const s = String(raw).trim()
  const m = s.match(/^(\d+)\s*(?:-\s*(\d+))?\s*(.*)$/)
  if (!m) throw new Error(`Reps inválidas: "${s}"`)
  const min = Number(m[1])
  const max = Number(m[2] ?? m[1])
  const rest = m[3].trim()
  const isTime = /^s(eg)?$/.test(rest)
  return { repMin: min, repMax: max, targetUnit: isTime ? 'seconds' : 'reps', note: !isTime && rest ? rest : undefined }
}

/** "90 s" → 90 ; "2 min" → 120 ; "45-60 s" → 60 (usa o maior) */
function parseRest(raw) {
  const s = norm(String(raw))
  const nums = [...s.matchAll(/\d+/g)].map((x) => Number(x[0]))
  if (!nums.length) throw new Error(`Descanso inválido: "${raw}"`)
  const v = Math.max(...nums)
  return /min/.test(s) ? v * 60 : v
}

const slug = (s) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const exercises = new Map()
const planDays = []
const planExercises = []

for (const sheetName of wb.SheetNames) {
  if (!(sheetName in WEEKDAYS)) continue
  const weekday = WEEKDAYS[sheetName]
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false })
  const title = String(rows[0][0])
  const name = title.split('—')[1]?.trim() ?? title
  const dayId = `day-${weekday}`
  planDays.push({ id: dayId, weekday, name: name.charAt(0).toUpperCase() + name.slice(1) })

  const headerIdx = rows.findIndex((r) => r[0] === 'Exercício')
  let order = 0
  for (const r of rows.slice(headerIdx + 1)) {
    if (!r[0] || typeof r[1] !== 'number') break
    const exName = String(r[0]).trim()
    const exId = `ex-${slug(exName)}`
    if (!exercises.has(exId)) exercises.set(exId, { id: exId, name: exName, ...classify(exName) })
    const reps = parseReps(r[3])
    order++
    planExercises.push({
      id: `${dayId}-${order}`,
      planDayId: dayId,
      exerciseId: exId,
      order,
      setsPhase1: r[1],
      setsPhase2: r[2],
      repMin: reps.repMin,
      repMax: reps.repMax,
      restSeconds: parseRest(r[4]),
      ...(reps.targetUnit === 'seconds' ? { targetUnit: 'seconds' } : {}),
      ...(reps.note ? { note: reps.note } : {}),
    })
  }
}

// Perfil e medidas da planilha NÃO entram no código: o app é publicado e cada pessoa informa os seus na primeira abertura.

const out = `// GERADO por scripts/seed-from-xlsx.mjs a partir de Treino_Hipertrofia.xlsx — não editar à mão.
// Para atualizar: edite a planilha e rode \`npm run seed\`.
import type { Exercise, PlanDay, PlanExercise } from '../domain/types'

export const SEED_VERSION = ${2}

export const exercises: Exercise[] = ${JSON.stringify([...exercises.values()], null, 2)}

export const planDays: PlanDay[] = ${JSON.stringify(planDays, null, 2)}

export const planExercises: PlanExercise[] = ${JSON.stringify(planExercises, null, 2)}


`
writeFileSync(resolve(root, 'src/seed/plan.generated.ts'), out)
console.log(`OK: ${planDays.length} dias, ${planExercises.length} itens, ${exercises.size} exercícios.`)
for (const d of planDays) {
  console.log(`  ${d.weekday} ${d.name}`)
  for (const p of planExercises.filter((x) => x.planDayId === d.id)) {
    const e = exercises.get(p.exerciseId)
    console.log(`     ${e.name} [${e.muscleGroup}${e.isCompound ? ', composto' : ''}, ${e.equipment}] ${p.setsPhase1}/${p.setsPhase2} × ${p.repMin}-${p.repMax}${p.targetUnit === 'seconds' ? 's' : ''}${p.note ? ' ' + p.note : ''} desc ${p.restSeconds}s`)
  }
}
