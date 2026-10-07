import Dexie, { type EntityTable } from 'dexie'
import { freezePlanSnapshots } from './db'
import { currentDb, updateProfile } from './repo'

export const BACKUP_FORMAT = 'fitapp-backup'
export const BACKUP_VERSION = 1

const TABLES = ['profile', 'exercises', 'planDays', 'planExercises', 'sessions', 'sets', 'measurements'] as const
type TableName = (typeof TABLES)[number]

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  data: Record<TableName, unknown[]>
}

/** Lê todos os dados. Não marca o backup como feito: isso só depois que o arquivo foi salvo (`markExported`). */
export async function exportAll(): Promise<Backup> {
  const db = currentDb()
  const data = {} as Backup['data']
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
}

/** Chamar só quando o arquivo foi de fato salvo/compartilhado: zera o lembrete de backup. */
export async function markExported(at = new Date().toISOString()): Promise<void> {
  await updateProfile({ lastExportAt: at })
}

export function parseBackup(json: string): Backup {
  let obj: unknown
  try {
    obj = JSON.parse(json)
  } catch {
    throw new Error('Arquivo não é um JSON válido.')
  }
  const b = obj as Partial<Backup>
  if (b?.format !== BACKUP_FORMAT || typeof b.version !== 'number' || !b.data) {
    throw new Error('Arquivo não é um backup deste app.')
  }
  if (b.version > BACKUP_VERSION) {
    throw new Error('Backup feito por uma versão mais nova do app.')
  }
  for (const t of TABLES) {
    if (!Array.isArray(b.data[t])) throw new Error(`Backup incompleto: falta "${t}".`)
  }
  const problem = findInvalidRecord(b.data)
  if (problem) throw new Error(`Backup corrompido (${problem}). Nada foi alterado.`)
  return b as Backup
}

// ---------- validação dos registros ----------

type Rec = Record<string, unknown>
const isStr = (v: unknown) => typeof v === 'string' && v.length > 0
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const optNum = (v: unknown) => v === undefined || v === null || isNum(v)

const RULES: Record<TableName, (r: Rec) => boolean> = {
  profile: (r) => r.id === 'me' && isDate(r.planStartDate),
  exercises: (r) => isStr(r.name),
  planDays: (r) => Number.isInteger(r.weekday) && (r.weekday as number) >= 0 && (r.weekday as number) <= 6 && typeof r.name === 'string',
  planExercises: (r) =>
    isStr(r.planDayId) && isStr(r.exerciseId) && [r.setsPhase1, r.setsPhase2, r.repMin, r.repMax, r.restSeconds].every(isNum),
  sessions: (r) => isStr(r.planDayId) && isDate(r.date) && isStr(r.startedAt),
  sets: (r) => isStr(r.sessionId) && isStr(r.exerciseId) && isNum(r.setNumber) && isNum(r.weightKg) && isNum(r.reps),
  measurements: (r) => isDate(r.date) && Object.entries(r).every(([k, v]) => !/(Kg|Cm|Pct)$/.test(k) || optNum(v)),
}

/** Primeiro problema encontrado ("sets nº 12"), ou undefined se tudo estiver certo. */
function findInvalidRecord(data: Record<TableName, unknown[]>): string | undefined {
  for (const t of TABLES) {
    const ids = new Set<string>()
    for (const [i, rec] of data[t].entries()) {
      const r = rec as Rec
      const ok = r !== null && typeof r === 'object' && isStr(r.id) && !ids.has(r.id as string) && RULES[t](r)
      if (!ok) return `${t} nº ${i + 1}`
      ids.add(r.id as string)
    }
  }
  return undefined
}

// ---------- cópia de segurança antes de importar ----------

interface Safety {
  id: 'pre-import'
  takenAt: string
  backup: Backup
}

/** Banco separado: a cópia sobrevive à troca de todos os dados do banco principal. */
class SafetyDB extends Dexie {
  snapshots!: EntityTable<Safety, 'id'>
  constructor(name: string) {
    super(name)
    this.version(1).stores({ snapshots: 'id' })
  }
}

const safetyDbs = new Map<string, SafetyDB>()
function safetyDb(): SafetyDB {
  const name = `${currentDb().name}-seguranca`
  let s = safetyDbs.get(name)
  if (!s) safetyDbs.set(name, (s = new SafetyDB(name)))
  return s
}

/**
 * Substitui TODOS os dados pelo conteúdo do backup (transação única: ou tudo, ou nada).
 * Antes, guarda uma cópia dos dados atuais para `undoImport` (escolheu o arquivo errado).
 */
export async function importAll(backup: Backup): Promise<void> {
  const current = await exportAll()
  const hasData = current.data.sessions.length > 0 || current.data.measurements.length > 0
  // sem treinos nem medidas não há o que proteger; uma cópia antiga deixaria de fazer sentido
  if (hasData) await safetyDb().snapshots.put({ id: 'pre-import', takenAt: current.exportedAt, backup: current })
  else await safetyDb().snapshots.delete('pre-import')
  await replaceAll(backup)
}

async function replaceAll(backup: Backup): Promise<void> {
  const db = currentDb()
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(backup.data[t])
    }
    // backups antigos não têm o retrato do plano nas sessões
    await freezePlanSnapshots(db.table('sessions'), db.table('planExercises'), db.table('planDays'), db.table('profile'))
  })
}

/** Quando foi tirada a cópia de antes da última importação (para oferecer "desfazer"). */
export async function preImportSnapshotDate(): Promise<string | undefined> {
  return (await safetyDb().snapshots.get('pre-import'))?.takenAt
}

/** Volta aos dados de antes da última importação e descarta a cópia. */
export async function undoImport(): Promise<boolean> {
  const snap = await safetyDb().snapshots.get('pre-import')
  if (!snap) return false
  await replaceAll(snap.backup)
  await safetyDb().snapshots.delete('pre-import')
  return true
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `forja-backup-${d}.json`
}

export const BACKUP_REMINDER_DAYS = 14

export function daysSinceExport(lastExportAt: string | undefined, now = new Date()): number | undefined {
  if (!lastExportAt) return undefined
  return Math.floor((now.getTime() - Date.parse(lastExportAt)) / 86_400_000)
}
