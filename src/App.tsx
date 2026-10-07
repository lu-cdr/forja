import { Suspense, lazy, useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { RestTimerBar, RestTimerProvider } from './components/RestTimer'
import { ensureSeeded, requestPersistentStorage } from './db/repo'
import { TodayPage } from './features/today/TodayPage'
import { WorkoutPage } from './features/workout/WorkoutPage'
import { HistoryPage } from './features/history/HistoryPage'
import { SessionDetailPage } from './features/history/SessionDetailPage'
import { PlanPage } from './features/plan/PlanPage'
import { DayEditorPage } from './features/plan/DayEditorPage'
import { PlanImportPage } from './features/plan/PlanImportPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { CharacterPage } from './features/character/CharacterPage'
import { RewardPage } from './features/reward/RewardPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { OnboardingPage } from './features/onboarding/OnboardingPage'
import { useHasProfile } from './db/hooks'

// Laboratório de sprites: só em desenvolvimento, nunca entra no build publicado
const SpriteLab = import.meta.env.DEV ? lazy(() => import('./features/lab/SpriteLab').then((m) => ({ default: m.SpriteLab }))) : null

// Gráficos (Recharts) em chunk separado: a tela Hoje abre mais rápido.
const ProgressPage = lazy(() => import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const MeasurementsPage = lazy(() => import('./features/measurements/MeasurementsPage').then((m) => ({ default: m.MeasurementsPage })))

function Shell() {
  const { pathname } = useLocation()
  // telas de foco total: sem barra de navegação
  const inWorkout = pathname.startsWith('/treino') || pathname.startsWith('/recompensa')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <main className={inWorkout ? 'pb-28' : 'pb-[calc(96px+env(safe-area-inset-bottom))]'}>
        <ErrorBoundary key={pathname}>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/treino" element={<WorkoutPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/historico/:id" element={<SessionDetailPage />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="/medidas" element={<MeasurementsPage />} />
          <Route path="/plano" element={<PlanPage />} />
          <Route path="/plano/importar" element={<PlanImportPage />} />
          <Route path="/plano/:id" element={<DayEditorPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/forja" element={<CharacterPage />} />
          <Route path="/recompensa/:id" element={<RewardPage />} />
          {SpriteLab && <Route path="/lab/sprites" element={<SpriteLab />} />}
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      <RestTimerBar aboveNav={!inWorkout} />
      {!inWorkout && <BottomNav />}
    </div>
  )
}

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
    void requestPersistentStorage()
  }, [])

  if (error)
    return (
      <div className="p-6 text-danger">
        Não foi possível abrir o banco local: {error}. Verifique se o navegador não está em modo anônimo.
      </div>
    )
  if (!ready) return null
  return <Gate />
}

/** Sem perfil (primeira abertura): boas-vindas. Com perfil: o app. Troca sozinho quando o perfil é criado ou importado. */
function Gate() {
  const onboarded = useHasProfile()
  if (onboarded === undefined) return null
  return (
    <>
      <UpdateBanner />
      {onboarded ? (
        <HashRouter>
          <RestTimerProvider>
            <Shell />
          </RestTimerProvider>
        </HashRouter>
      ) : (
        <OnboardingPage />
      )}
    </>
  )
}
