import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { computeGame, type GameInput } from '../domain/game'
import * as repo from './repo'
import { getLibraryExercises } from './planEdit'

// Hooks reativos: re-renderizam sozinhos quando o IndexedDB muda.
// Componentes usam estes hooks e nunca importam Dexie diretamente.

export const useProfile = () => useLiveQuery(() => repo.getProfile(), [])
export const useHasProfile = () => useLiveQuery(() => repo.hasProfile(), [])
export const usePlanDays = () => useLiveQuery(() => repo.getPlanDays(), [])
/** Inclui dias removidos do plano (para nomes no histórico). */
export const useAllPlanDays = () => useLiveQuery(() => repo.getAllPlanDays(), [])
export const usePlanItems = (planDayId?: string) =>
  useLiveQuery(() => (planDayId ? repo.getPlanItems(planDayId) : Promise.resolve([])), [planDayId])
export const useActiveSession = () => useLiveQuery(() => repo.getActiveSession().then((s) => s ?? null), [])
export const useSessionSets = (sessionId?: string) =>
  useLiveQuery(() => (sessionId ? repo.getSessionSets(sessionId) : Promise.resolve([])), [sessionId])
export const useFinishedSessions = () => useLiveQuery(() => repo.getFinishedSessions(), [])
export const useAllSets = () => useLiveQuery(() => repo.getAllSets(), [])
export const useExercises = () => useLiveQuery(() => repo.getExercises(), [])
export const useLibraryExercises = () => useLiveQuery(() => getLibraryExercises(), [])
export const useMeasurements = () => useLiveQuery(() => repo.getMeasurements(), [])
export const useLastSets = (exerciseId: string, excludeSessionId?: string) =>
  useLiveQuery(() => repo.getLastSetsForExercise(exerciseId, excludeSessionId), [exerciseId, excludeSessionId])
export const useExerciseSets = (exerciseId?: string) =>
  useLiveQuery(() => (exerciseId ? repo.getExerciseSets(exerciseId) : Promise.resolve([])), [exerciseId])
export const useSession = (id?: string) => useLiveQuery(() => (id ? repo.getSession(id) : Promise.resolve(undefined)), [id])
/** Dados de entrada do motor de RPG, lidos do banco de forma reativa. */
export const useGameInput = (): GameInput | undefined =>
  useLiveQuery(async () => {
    const [sessions, sets, plan, planDays, profile, measurements] = await Promise.all([
      repo.getFinishedSessions(),
      repo.getAllSets(),
      repo.getAllPlanExercises(),
      repo.getPlanDays(),
      repo.getProfile(),
      repo.getMeasurements(),
    ])
    return {
      sessions,
      sets,
      plan,
      plannedDaysPerWeek: planDays.length,
      planStartDate: profile.planStartDate,
      measurementDates: measurements.map((m) => m.date),
    }
  }, [])

export function useGame() {
  const input = useGameInput()
  return useMemo(() => (input ? { input, game: computeGame(input) } : undefined), [input])
}