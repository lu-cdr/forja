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

export async function exportAll(): Promise<Backup> {
  const db = currentDb()
  const exportedAt = new Date().toISOString()
  await updateProfile({ lastExportAt: exportedAt })
  const data = {} as Backup['data']
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data }
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
  return b as Backup
}

/** Substitui TODOS os dados pelo conteúdo do backup (transação única: ou tudo, ou nada). */
export async function importAll(backup: Backup): Promise<void> {
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

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `forja-backup-${d}.json`
}

export const BACKUP_REMINDER_DAYS = 14

export function daysSinceExport(lastExportAt: string | undefined, now = new Date()): number | undefined {
  if (!lastExportAt) return undefined
  return Math.floor((now.getTime() - Date.parse(lastExportAt)) / 86_400_000)
}
