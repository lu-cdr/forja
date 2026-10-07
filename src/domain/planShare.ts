import { MUSCLE_LABEL, type Exercise, type MuscleGroup, type PlanDay, type PlanExercise } from './types'

/**
 * Plano compartilhável por link, sem servidor: o plano vai inteiro dentro do endereço
 * (JSON compacto → deflate → base64url). Leva só o plano (dias, exercícios, metas); nada de
 * treinos, medidas ou perfil. Exercícios do catálogo vão pelo id; os criados pela pessoa, por nome.
 */

export interface SharedItem {
  /** id do catálogo (string) ou índice em `custom` (número). */
  ex: string | number
  setsPhase1: number
  setsPhase2: number
  repMin: number
  repMax: number
  restSeconds: number
  targetUnit?: 'seconds'
  note?: string
}

export interface SharedPlan {
  rotation: boolean
  days: { name: string; weekday: number; items: SharedItem[] }[]
  custom: Pick<Exercise, 'name' | 'muscleGroup' | 'equipment' | 'isCompound'>[]
}

const VERSION = 1

/** Monta o plano compartilhável a partir do plano ativo. */
export function planToShared(
  days: PlanDay[],
  items: PlanExercise[],
  exercises: Exercise[],
  catalogIds: Set<string>,
  rotation: boolean,
): SharedPlan {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const custom: SharedPlan['custom'] = []
  const customIndex = new Map<string, number>()
  const ref = (exerciseId: string): string | number | undefined => {
    if (catalogIds.has(exerciseId)) return exerciseId
    const e = byId.get(exerciseId)
    if (!e) return undefined
    if (!customIndex.has(e.id)) {
      customIndex.set(e.id, custom.length)
      custom.push({ name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment, isCompound: e.isCompound })
    }
    return customIndex.get(e.id)
  }
  return {
    rotation,
    custom,
    days: days
      .filter((d) => !d.archived)
      .map((d) => ({
        name: d.name,
        weekday: d.weekday,
        items: items
          .filter((i) => i.planDayId === d.id)
          .sort((a, b) => a.order - b.order)
          .flatMap((i) => {
            const ex = ref(i.exerciseId)
            if (ex === undefined) return []
            const item: SharedItem = { ex, setsPhase1: i.setsPhase1, setsPhase2: i.setsPhase2, repMin: i.repMin, repMax: i.repMax, restSeconds: i.restSeconds }
            if (i.targetUnit === 'seconds') item.targetUnit = 'seconds'
            if (i.note) item.note = i.note
            return [item]
          }),
      })),
  }
}

// ---------- formato compacto ----------

type Packed = [number, 0 | 1, [string, number, (string | number)[][]][], [string, string, string, 0 | 1][]]

function pack(p: SharedPlan): Packed {
  return [
    VERSION,
    p.rotation ? 1 : 0,
    p.days.map((d) => [
      d.name,
      d.weekday,
      d.items.map((i) => {
        const row: (string | number)[] = [
          typeof i.ex === 'string' ? i.ex.replace(/^ex-/, '') : i.ex,
          i.setsPhase1,
          i.setsPhase2,
          i.repMin,
          i.repMax,
          i.restSeconds,
        ]
        if (i.targetUnit || i.note) row.push(i.targetUnit === 'seconds' ? 1 : 0)
        if (i.note) row.push(i.note)
        return row
      }),
    ]),
    p.custom.map((c) => [c.name, c.muscleGroup, c.equipment, c.isCompound ? 1 : 0]),
  ]
}

const INVALID = 'Link de plano inválido ou incompleto.'
const int = (v: unknown, lo: number, hi: number) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(INVALID)
  return Math.min(hi, Math.max(lo, Math.round(v)))
}
const text = (v: unknown, max: number) => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(INVALID)
  return v.trim().slice(0, max)
}

/** Valida e normaliza (o link vem de fora: nada é confiável). */
function unpack(raw: unknown): SharedPlan {
  if (!Array.isArray(raw) || raw[0] !== VERSION || !Array.isArray(raw[2]) || !Array.isArray(raw[3])) throw new Error(INVALID)
  const [, rotation, days, custom] = raw as Packed
  if (days.length > 7 || custom.length > 100) throw new Error(INVALID)
  const groups = new Set(Object.keys(MUSCLE_LABEL))
  const outCustom: SharedPlan['custom'] = custom.map((c) => {
    if (!Array.isArray(c)) throw new Error(INVALID)
    const group = groups.has(c[1]) ? (c[1] as MuscleGroup) : 'peito'
    return { name: text(c[0], 60), muscleGroup: group, equipment: typeof c[2] === 'string' ? c[2].slice(0, 30) : '', isCompound: c[3] === 1 }
  })
  const used = new Set<number>()
  const outDays = days.map((d) => {
    if (!Array.isArray(d) || !Array.isArray(d[2]) || d[2].length > 30) throw new Error(INVALID)
    let weekday = int(d[1], 0, 6)
    // dia da semana repetido: vai para o próximo livre (segunda primeiro)
    if (used.has(weekday)) weekday = [1, 2, 3, 4, 5, 6, 0].find((w) => !used.has(w))!
    used.add(weekday)
    return {
      name: text(d[0], 40),
      weekday,
      items: d[2].map((row) => {
        if (!Array.isArray(row)) throw new Error(INVALID)
        const [ex, s1, s2, min, max, rest, timed, note] = row
        const exRef = typeof ex === 'number' ? int(ex, 0, outCustom.length - 1) : `ex-${text(ex, 80).replace(/^ex-/, '')}`
        const repMin = int(min, 1, 999)
        const item: SharedItem = {
          ex: exRef,
          setsPhase1: int(s1, 1, 10),
          setsPhase2: int(s2, 1, 10),
          repMin,
          repMax: Math.max(repMin, int(max, 1, 999)),
          restSeconds: int(rest, 0, 600),
        }
        if (timed === 1) item.targetUnit = 'seconds'
        if (typeof note === 'string' && note.trim()) item.note = note.trim().slice(0, 40)
        return item
      }),
    }
  })
  return { rotation: rotation === 1, days: outDays, custom: outCustom }
}

// ---------- base64url + deflate ----------

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Código do plano para o link. */
export async function encodePlan(p: SharedPlan): Promise<string> {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(pack(p))), new CompressionStream('deflate-raw')))
}

/** Lê o código do link; erro com mensagem amigável se estiver corrompido. */
export async function decodePlan(code: string): Promise<SharedPlan> {
  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw'))))
  } catch {
    throw new Error(INVALID)
  }
  return unpack(raw)
}
