import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/**
 * Avisa quando há versão nova publicada, em vez de recarregar sozinho (poderia ser no meio do treino).
 * Os dados ficam no IndexedDB, então atualizar nunca perde nada.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // app aberto por muito tempo: procura versão nova a cada hora
      if (reg) window.setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[calc(8px+env(safe-area-inset-top))]">
      <div className="frame-gold pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-xl bg-iron-900 p-3" role="status">
        <p className="min-w-0 flex-1 text-sm">Tem versão nova da Forja.</p>
        <Button variant="ghost" className="text-sm" onClick={() => setNeedRefresh(false)}>
          Depois
        </Button>
        <Button variant="primary" className="text-sm" onClick={() => void updateServiceWorker(true)}>
          Atualizar
        </Button>
      </div>
    </div>
  )
}
