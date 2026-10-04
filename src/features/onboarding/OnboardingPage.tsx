import { useRef, useState } from 'react'
import { InstallGuide } from '../../components/InstallGuide'
import { Smith } from '../../components/Smith'
import { TemplateList } from '../../components/TemplateList'
import { Button, Icon, cx } from '../../components/ui'
import { importAll, parseBackup } from '../../db/backup'
import { setupNewUser } from '../../db/repo'
import { toISODate } from '../../domain/dates'

const STEPS = 4

const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined
}

/** Primeira abertura. Ao terminar (ou importar um backup), o perfil passa a existir e o app abre. */
export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [start, setStart] = useState(toISODate())
  const [template, setTemplate] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImport(f: File) {
    setError(undefined)
    try {
      const backup = parseBackup(await f.text())
      setBusy(true)
      await importAll(backup)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível importar.')
      setBusy(false)
    }
  }

  async function onFinish() {
    if (!template) return
    setBusy(true)
    await setupNewUser({ templateId: template, planStartDate: start, heightCm: parseNum(height), weightKg: parseNum(weight) })
  }

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-lg flex-col px-4">
      {step > 0 && (
        <div className="flex items-center gap-2 pt-4">
          <Button variant="ghost" className="px-2" onClick={() => setStep(step - 1)} aria-label="Voltar">
            <Icon name="back" />
          </Button>
          <div className="flex flex-1 gap-1.5" aria-label={`Passo ${step} de ${STEPS - 1}`}>
            {Array.from({ length: STEPS - 1 }, (_, i) => (
              <span key={i} className={cx('h-2 flex-1', i < step ? 'bg-xp' : 'bg-iron-800')} />
            ))}
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-1 flex-col pt-8">
          <div className="frame forge-bg flex justify-center rounded-2xl pt-4">
            <Smith tier={0} size={240} label="Ferreiro aprendiz" />
          </div>
          <h1 className="mt-6 font-display text-4xl leading-none font-bold">Bem-vindo à Forja</h1>
          <ul className="mt-4 space-y-3 text-[15px] text-iron-300">
            <li className="flex gap-3">
              <Icon name="check" className="mt-0.5 size-5 shrink-0 text-rubber" />
              Registre cada série em poucos toques, com o que você fez da última vez já preenchido.
            </li>
            <li className="flex gap-3">
              <Icon name="anvil" className="mt-0.5 size-5 shrink-0 text-rubber" />
              Cada treino rende XP. Seu ferreiro sobe de nível e fica mais forte junto com você.
            </li>
            <li className="flex gap-3">
              <Icon name="download" className="mt-0.5 size-5 shrink-0 text-rubber" />
              Seus dados ficam só neste aparelho. Sem conta, sem nuvem. Faça backup de vez em quando.
            </li>
          </ul>
          <div className="mt-auto space-y-2 pt-8 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setStep(1)}>
              Começar
            </Button>
            <Button variant="ghost" className="w-full text-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              Já uso a Forja: importar meu backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void onImport(f)
              }}
            />
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-3xl font-bold">Sobre você</h1>
          <p className="mt-1 text-sm text-iron-400">Serve para o IMC e para acompanhar o peso. Pode pular e preencher depois em Ajustes.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <NumberField label="Altura" unit="cm" value={height} onChange={setHeight} placeholder="175" />
            <NumberField label="Peso hoje" unit="kg" value={weight} onChange={setWeight} placeholder="80" />
          </div>
          <label className="mt-4 block">
            <span className="text-xs text-iron-400">Quando começa o plano</span>
            <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-iron-800 px-3 text-[15px]" />
          </label>
          <p className="mt-2 text-xs text-iron-500">As semanas 1 a 3 são de readaptação, com menos séries. A partir da semana 4 o volume sobe.</p>
          <div className="mt-auto pt-8 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-3xl font-bold">Escolha seu plano</h1>
          <p className="mt-1 mb-4 text-sm text-iron-400">Dá para editar tudo depois: dias, exercícios, séries e descanso.</p>
          <TemplateList value={template} onChange={setTemplate} />
          <div className="sticky bottom-0 mt-4 bg-iron-900 pt-3 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setStep(3)} disabled={!template}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-3xl font-bold">Instale no celular</h1>
          <p className="mt-1 mb-4 text-sm text-iron-400">Instalado, abre como um app, funciona sem internet e guarda seus dados com mais segurança.</p>
          <div className="frame rounded-2xl bg-iron-850 p-4">
            <InstallGuide />
          </div>
          <div className="frame mt-3 flex gap-3 rounded-2xl bg-iron-850 p-4 text-sm text-iron-300">
            <Icon name="download" className="size-5 shrink-0 text-pr" />
            <p>
              Faça backup em Ajustes → Exportar e guarde no Google Drive ou iCloud. Se trocar de celular ou limpar o navegador, é o backup que
              traz tudo de volta.
            </p>
          </div>
          <div className="mt-auto pt-8 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={onFinish} disabled={busy}>
              Acender a forja
            </Button>
            <p className="mt-2 text-center text-xs text-iron-500">Dá para instalar depois também, em Ajustes.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function NumberField({ label, unit, value, onChange, placeholder }: { label: string; unit: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs text-iron-400">{label}</span>
      <div className="mt-1 flex items-center rounded-xl bg-iron-800 pr-3 focus-within:ring-2 focus-within:ring-rubber">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder={placeholder}
          className="num h-12 w-full min-w-0 bg-transparent px-3 text-2xl outline-none placeholder:text-iron-600"
        />
        <span className="text-sm text-iron-500">{unit}</span>
      </div>
    </label>
  )
}
