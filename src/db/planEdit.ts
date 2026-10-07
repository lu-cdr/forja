import { DEFAULT_TARGET, defaultRest, sequenceOrder } from '../domain/plan'
import type { Exercise, MuscleGroup, PlanDay, PlanExercise } from '../domain/types'
import { CATALOG_IDS, DEFAULT_TEMPLATE_ID } from '../seed/plan'
import { newId } from './db'
import { applyTemplate, currentDb } from './repo'

/**
 * Edição do plano pelo app. Toda alteração marca o perfil como `planCustomized`,
 * o que impede uma versão nova da planilha de sobrescrever o plano do usuário.
 */

async function markCustomized() {
  const db = currentDb()
  const p = await db.profile.get('me')
  if (p && !p.planCustomized) await db.profile.update('me', { planCustomized: true })
}

function tx<T>(fn: () => Promise<T>): Promise<T> {
  const db = currentDb()
  return db.transaction('rw', [db.planDays, db.planExercises, db.exercises, db.profile], async () => {
    const r = await fn()
    await markCustomized()
    return r
  })
}

// ---------- dias ----------

export async function freeWeekdays(exceptDayId?: string): Promise<number[]> {
  const days = (await currentDb().planDays.toArray()).filter((d) => !d.archived && d.id !== exceptDayId)
  const taken = new Set(days.map((d) => d.weekday))
  return [0, 1, 2, 3, 4, 5, 6].filter((w) => !taken.has(w))
}

/** Cria um dia no primeiro dia da semana livre (segunda primeiro). */
export async function addPlanDay(name = 'Novo treino'): Promise<string> {
  return tx(async () => {
    const free = await freeWeekdays()
    if (free.length === 0) throw new Error('Todos os dias da semana já têm treino.')
    const order = [1, 2, 3, 4, 5, 6, 0]
    const weekday = order.find((w) => free.includes(w))!
    const id = `day-${newId()}`
    await currentDb().planDays.add({ id, weekday, name })
    return id
  })
}

export async function updatePlanDay(id: string, patch: Partial<Pick<PlanDay, 'name' | 'weekday'>>): Promise<void> {
  return tx(async () => {
    if (patch.weekday !== undefined && !(await freeWeekdays(id)).includes(patch.weekday)) {
      throw new Error('Já existe treino nesse dia da semana.')
    }
    if (patch.name !== undefined) patch.name = patch.name.trim() || 'Treino'
    await currentDb().planDays.update(id, patch)
  })
}

/**
 * Treinos em sequência: muda a posição de um treino (A → B → C). A ordem é a dos dias da semana,
 * então mover troca o dia da semana com o vizinho — se a pessoa voltar aos dias fixos, a ordem continua.
 */
export async function moveDayInSequence(id: string, delta: -1 | 1): Promise<void> {
  return tx(async () => {
    const seq = sequenceOrder((await currentDb().planDays.toArray()).filter((d) => !d.archived))
    const i = seq.findIndex((d) => d.id === id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= seq.length) return
    await currentDb().planDays.update(seq[i].id, { weekday: seq[j].weekday })
    await currentDb().planDays.update(seq[j].id, { weekday: seq[i].weekday })
  })
}

/** Remove o dia do plano. Fica arquivado para o histórico continuar com o nome. */
export async function archivePlanDay(id: string): Promise<void> {
  return tx(async () => {
    await currentDb().planDays.update(id, { archived: true })
  })
}

// ---------- exercícios do dia ----------

async function itemsOf(planDayId: string) {
  return currentDb().planExercises.where('planDayId').equals(planDayId).sortBy('order')
}

async function renumber(planDayId: string) {
  const items = await itemsOf(planDayId)
  await Promise.all(items.map((it, i) => (it.order === i + 1 ? null : currentDb().planExercises.update(it.id, { order: i + 1 }))))
}

export async function addPlanExercise(planDayId: string, exerciseId: string): Promise<string> {
  return tx(async () => {
    const items = await itemsOf(planDayId)
    const ex = await currentDb().exercises.get(exerciseId)
    const id = `${planDayId}-${newId()}`
    await currentDb().planExercises.add({
      id,
      planDayId,
      exerciseId,
      order: items.length + 1,
      ...DEFAULT_TARGET,
      restSeconds: defaultRest(!!ex?.isCompound),
    })
    return id
  })
}

export type PlanItemPatch = Partial<
  Pick<PlanExercise, 'setsPhase1' | 'setsPhase2' | 'repMin' | 'repMax' | 'restSeconds' | 'targetUnit' | 'note'>
>

/** Valida e normaliza: séries 1–10, reps 1–999, mín ≤ máx, descanso 0–10 min. */
export function sanitizeItemPatch(current: PlanExercise, patch: PlanItemPatch): PlanItemPatch {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))
  const out: PlanItemPatch = { ...patch }
  if (out.setsPhase1 !== undefined) out.setsPhase1 = clamp(out.setsPhase1, 1, 10)
  if (out.setsPhase2 !== undefined) out.setsPhase2 = clamp(out.setsPhase2, 1, 10)
  if (out.restSeconds !== undefined) out.restSeconds = clamp(out.restSeconds, 0, 600)
  let min = out.repMin !== undefined ? clamp(out.repMin, 1, 999) : current.repMin
  let max = out.repMax !== undefined ? clamp(out.repMax, 1, 999) : current.repMax
  if (min > max) {
    // quem foi editado manda; o outro acompanha
    if (out.repMin !== undefined) max = min
    else min = max
  }
  if (out.repMin !== undefined || out.repMax !== undefined) {
    out.repMin = min
    out.repMax = max
  }
  if (out.note !== undefined) out.note = out.note.trim() || undefined
  return out
}

export async function updatePlanExercise(id: string, patch: PlanItemPatch): Promise<void> {
  return tx(async () => {
    const cur = await currentDb().planExercises.get(id)
    if (!cur) return
    await currentDb().planExercises.update(id, sanitizeItemPatch(cur, patch))
  })
}

export async function removePlanExercise(id: string): Promise<void> {
  return tx(async () => {
    const cur = await currentDb().planExercises.get(id)
    if (!cur) return
    await currentDb().planExercises.delete(id)
    await renumber(cur.planDayId)
  })
}

export async function movePlanExercise(id: string, delta: -1 | 1): Promise<void> {
  return tx(async () => {
    const cur = await currentDb().planExercises.get(id)
    if (!cur) return
    const items = await itemsOf(cur.planDayId)
    const i = items.findIndex((x) => x.id === id)
    const j = i + delta
    if (j < 0 || j >= items.length) return
    await currentDb().planExercises.update(items[i].id, { order: items[j].order })
    await currentDb().planExercises.update(items[j].id, { order: items[i].order })
    await renumber(cur.planDayId)
  })
}

/** Troca o exercício de um item (ex.: máquina ocupada → variação), mantendo séries e reps. */
export async function swapPlanExercise(id: string, exerciseId: string): Promise<void> {
  return tx(async () => {
    await currentDb().planExercises.update(id, { exerciseId })
  })
}

// ---------- biblioteca de exercícios ----------

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function createExercise(input: { name: string; muscleGroup: MuscleGroup; equipment: string; isCompound: boolean }): Promise<string> {
  const name = input.name.trim()
  if (!name) throw new Error('Dê um nome ao exercício.')
  return tx(async () => {
    const db = currentDb()
    const existing = (await db.exercises.toArray()).find((e) => slug(e.name) === slug(name))
    if (existing) return existing.id
    let id = `ex-${slug(name)}`
    if (await db.exercises.get(id)) id = `ex-${newId()}`
    const ex: Exercise = { id, name, muscleGroup: input.muscleGroup, equipment: input.equipment, isCompound: input.isCompound, custom: true }
    await db.exercises.add(ex)
    return id
  })
}

/** Biblioteca do seletor: catálogo, exercícios do plano, já treinados ou criados (esconde sobras do plano provisório antigo). */
export async function getLibraryExercises(): Promise<Exercise[]> {
  const db = currentDb()
  const [all, items, sets] = await Promise.all([db.exercises.toArray(), db.planExercises.toArray(), db.sets.toArray()])
  const used = new Set([...items.map((i) => i.exerciseId), ...sets.map((s) => s.exerciseId)])
  return all.filter((e) => e.custom || used.has(e.id) || CATALOG_IDS.has(e.id))
}

// ---------- restaurar / trocar modelo ----------

/** Volta ao modelo de plano escolhido (desfaz as edições). Treinos, medidas e exercícios criados continuam. */
export async function resetPlanToTemplate(): Promise<void> {
  const p = await currentDb().profile.get('me')
  await applyTemplate(p?.planTemplate ?? DEFAULT_TEMPLATE_ID)
}

/** Troca para outro modelo. Dias atuais ficam arquivados; histórico intacto. */
export const switchTemplate = (templateId: string) => applyTemplate(templateId)