import { useEffect, useState } from 'react'
import { canPromptInstall, detectPlatform, isIosNonSafari, isStandalone, onInstallChange, promptInstall, type Platform } from './install'
import { Button, Icon, Segmented } from './ui'

/** Passo a passo de instalação, com a plataforma detectada já selecionada. */
export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>(() => {
    const p = detectPlatform()
    return p === 'other' ? 'android' : p
  })
  const [canPrompt, setCanPrompt] = useState(canPromptInstall)
  useEffect(() => onInstallChange(() => setCanPrompt(canPromptInstall())), [])

  if (isStandalone()) {
    return (
      <p className="flex items-center gap-2 text-sm text-ok">
        <Icon name="check" className="size-4" /> A Forja já está instalada neste aparelho.
      </p>
    )
  }

  return (
    <div>
      <Segmented<Platform>
        value={platform}
        onChange={setPlatform}
        options={[
          { value: 'android', label: 'Android' },
          { value: 'ios', label: 'iPhone' },
        ]}
      />
      {platform === 'android' ? (
        <div className="mt-3">
          {canPrompt ? (
            <Button variant="primary" className="w-full" onClick={() => void promptInstall()}>
              <Icon name="download" className="size-4" /> Instalar agora
            </Button>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-iron-300">
              <li>Abra este endereço no Chrome.</li>
              <li>Toque no menu ⋮ no canto de cima.</li>
              <li>
                Toque em <strong className="text-chalk">Instalar app</strong> (ou "Adicionar à tela inicial").
              </li>
            </ol>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {isIosNonSafari() && (
            <p className="mb-2 rounded-lg bg-pr/10 p-2 text-sm text-pr">No iPhone, só dá para instalar pelo Safari. Abra este endereço no Safari.</p>
          )}
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-iron-300">
            <li>Abra este endereço no Safari.</li>
            <li>
              Toque em <strong className="text-chalk">Compartilhar</strong> (o quadrado com a seta para cima).
            </li>
            <li>
              Role e toque em <strong className="text-chalk">Adicionar à Tela de Início</strong>.
            </li>
            <li>Abra a Forja sempre pelo ícone da tela de início.</li>
          </ol>
          <p className="mt-2 text-xs text-iron-400">
            Importante no iPhone: se usar só pelo Safari, sem instalar, o iOS pode apagar os dados depois de alguns dias sem abrir.
          </p>
        </div>
      )}
    </div>
  )
}
