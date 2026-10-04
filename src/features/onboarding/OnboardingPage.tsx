import { useMemo, useRef, useState } from 'react'
import { ChoiceList } from '../../components/ChoiceList'
import { InstallGuide } from '../../components/InstallGuide'
import { Smith } from '../../components/Smith'
import { SmithCustomizer } from '../../components/SmithCustomizer'
import { TemplateList } from '../../components/TemplateList'
import { DEFAULT_LOOK } from '../../components/sprites/art/palette'
import { Button, Icon, cx } from '../../components/ui'
import { importAll, parseBackup } from '../../db/backup'
import { setupNewUser } from '../../db/repo'
import { ACTIVITY_LEVELS, TRAINING_LEVELS, recommendTemplate } from '../../domain/recommend'
import type { ActivityLevel, SmithLook, TrainingLevel } from '../../domain/types'

// boas-vindas + 4 passos: você, ferreiro, plano, instalar
const STEPS = 5

const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined
}

/** Primeira abertura. Ao terminar (ou importar um backup), o perfil passa a existir e o app abre. */
export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [training, setTraining] = useState<TrainingLevel>()
  const [activity, setActivity] = useState<ActivityLevel>()
  const [look, setLook] = useState<SmithLook>(DEFAULT_LOOK)
  const [template, setTemplate] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ageNum = parseNum(age)
  const rec = useMemo(() => recommendTemplate({ age: ageNum, training, activity }), [ageNum, training, activity])

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

  function goToPlan() {
    // pré-seleciona a recomendação (a pessoa pode trocar)
    if (!template) setTemplate(rec.templateId)
    setStep(3)
  }

  async function onFinish() {
    if (!template) return
    setBusy(true)
    await setupNewUser({
      templateId: template,
      heightCm: parseNum(height),
      weightKg: parseNum(weight),
      birthYear: ageNum ? new Date().getFullYear() - Math.round(ageNum) : undefined,
      trainingLevel: training,
      activityLevel: activity,
      rampUpWeeks: rec.rampUpWeeks,
      smith: look,
    })
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
            <Smith tier={0} size={176} label="Ferreiro aprendiz" look={DEFAULT_LOOK} />
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
          <p className="mt-1 text-sm text-iron-400">Usamos isso para indicar um plano que combine com você.</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <NumberField label="Idade" unit="anos" value={age} onChange={setAge} placeholder="30" />
            <NumberField label="Altura" unit="cm" value={height} onChange={setHeight} placeholder="175" />
            <NumberField label="Peso" unit="kg" value={weight} onChange={setWeight} placeholder="80" />
          </div>
          <h2 className="mt-6 mb-2 text-[15px] font-semibold text-iron-300">Experiência com musculação</h2>
          <ChoiceList label="Experiência com musculação" options={TRAINING_LEVELS} value={training} onChange={setTraining} />
          <h2 className="mt-6 mb-2 text-[15px] font-semibold text-iron-300">Como está sua rotina hoje</h2>
          <ChoiceList label="Nível de atividade" options={ACTIVITY_LEVELS} value={activity} onChange={setActivity} />
          <div className="sticky bottom-0 mt-6 bg-iron-900 pt-3 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setStep(2)} disabled={!training || !activity}>
              Continuar
            </Button>
            {(!training || !activity) && <p className="mt-2 text-center text-xs text-iron-500">Escolha sua experiência e sua rotina para continuar.</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-3xl font-bold">Seu ferreiro</h1>
          <p className="mt-1 mb-4 text-sm text-iron-400">Ele começa aprendiz e fica mais forte a cada treino. Dá para mudar depois na aba Forja.</p>
          <SmithCustomizer value={look} onChange={setLook} />
          <div className="sticky bottom-0 mt-6 bg-iron-900 pt-3 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={goToPlan}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-3xl font-bold">Escolha seu plano</h1>
          <div className="frame-gold mt-3 mb-4 rounded-xl bg-iron-850 p-3 text-sm text-iron-300">{rec.reason}</div>
          <TemplateList value={template} onChange={setTemplate} recommendedId={rec.templateId} />
          <p className="mt-3 text-xs text-iron-500">Dá para editar tudo depois: dias, exercícios, séries e descanso.</p>
          <div className="sticky bottom-0 mt-4 bg-iron-900 pt-3 pb-6">
            <Button variant="primary" className="min-h-14 w-full text-lg" onClick={() => setStep(4)} disabled={!template}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
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
    <label className="block min-w-0">
      <span className="text-xs text-iron-400">{label}</span>
      <div className="mt-1 flex items-center rounded-xl bg-iron-800 pr-2 focus-within:ring-2 focus-within:ring-rubber">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder={placeholder}
          className="num h-12 w-full min-w-0 bg-transparent px-2 text-2xl outline-none placeholder:text-iron-600"
        />
        <span className="text-xs text-iron-500">{unit}</span>
      </div>
    </label>
  )
}
