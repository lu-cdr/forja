import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Icon, PageHeader, Section } from '../../components/ui'
import { useFinishedSessions, useMeasurements, useProfile } from '../../db/hooks'
import { isStoragePersisted, requestPersistentStorage, updateProfile } from '../../db/repo'
import { backupFileName, daysSinceExport, exportAll, importAll, parseBackup } from '../../db/backup'
import { clearHistory, loadSampleData } from '../../db/sample'
import { formatDateBR } from '../../domain/dates'
import { playCoin, setSfxEnabled, sfxEnabled } from '../../components/sfx'
import { InstallGuide } from '../../components/InstallGuide'
import { ACTIVITY_LEVELS, TRAINING_LEVELS, ageFromBirthYear } from '../../domain/recommend'
import type { ActivityLevel, TrainingLevel } from '../../domain/types'

export function SettingsPage() {
  const profile = useProfile()
  const sessions = useFinishedSessions()
  const measurements = useMeasurements()
  const [persisted, setPersisted] = useState<boolean>()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string }>()
  const fileRef = useRef<HTMLInputElement>(null)
  const [sfx, setSfx] = useState(sfxEnabled)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  if (!profile || !sessions || !measurements) return null
  const isEmpty = sessions.length === 0 && measurements.length <= 1
  const since = daysSinceExport(profile.lastExportAt)

  async function onExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const file = new File([blob], backupFileName(), { type: 'application/json' })
    // No celular, a folha de compartilhar permite salvar direto no Drive/iCloud.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Backup Forja' })
        setMsg({ kind: 'ok', text: 'Backup exportado.' })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ kind: 'ok', text: `Backup exportado: ${file.name}` })
  }

  async function onImportFile(f: File) {
    try {
      const backup = parseBackup(await f.text())
      const n = backup.data.sessions.length
      if (!window.confirm(`Importar backup de ${formatDateBR(backup.exportedAt, { day: 'numeric', month: 'long', year: 'numeric' })} com ${n} treinos? Isso SUBSTITUI todos os dados atuais.`)) return
      await importAll(backup)
      setMsg({ kind: 'ok', text: 'Backup importado.' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Falha ao importar.' })
    }
  }

  const numField = (label: string, key: 'heightCm' | 'startWeightKg', unit: string) => (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-[15px]">{label}</span>
      <span className="flex items-center gap-2">
        <input
          inputMode="decimal"
          defaultValue={profile[key] != null ? String(profile[key]).replace('.', ',') : ''}
          onBlur={(e) => {
            const n = Number(e.target.value.replace(',', '.'))
            void updateProfile({ [key]: e.target.value.trim() && Number.isFinite(n) && n > 0 ? n : undefined })
          }}
          className="num h-11 w-24 rounded-xl bg-iron-800 px-3 text-right text-xl"
          placeholder="—"
        />
        <span className="w-6 text-sm text-iron-500">{unit}</span>
      </span>
    </label>
  )

  return (
    <div>
      <PageHeader title="Ajustes" right={<Link to="/forja" className="flex min-h-11 items-center rounded-xl px-3 text-sm text-iron-300 active:bg-iron-800">Voltar</Link>} />

      <Section className="mb-6" title="Backup">
        <div className="frame rounded-2xl bg-iron-850 p-4">
          <p className="text-sm text-iron-300">
            Seus dados existem só neste aparelho. Exporte com frequência e guarde o arquivo no Google Drive ou iCloud.
          </p>
          <p className="mt-2 text-sm text-iron-400">
            {since === undefined ? 'Nenhum backup feito ainda.' : since === 0 ? 'Último backup: hoje.' : `Último backup: há ${since} ${since === 1 ? 'dia' : 'dias'}.`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={onExport}>
              <Icon name="download" className="size-4" /> Exportar
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Icon name="upload" className="size-4" /> Importar
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void onImportFile(f)
            }}
          />
          {msg && <p className={`mt-3 text-sm ${msg.kind === 'ok' ? 'text-ok' : 'text-danger'}`}>{msg.text}</p>}
        </div>
      </Section>

      <Section className="mb-6" title="Instalar no celular">
        <div className="frame rounded-2xl bg-iron-850 p-4">
          <InstallGuide />
        </div>
      </Section>

      <Section className="mb-6" title="Sons">
        <label className="frame flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-iron-850 px-4">
          <span className="text-[15px]">Efeitos sonoros (moeda, bigorna, fanfarra)</span>
          <input
            type="checkbox"
            checked={sfx}
            onChange={(e) => {
              setSfx(e.target.checked)
              setSfxEnabled(e.target.checked)
              if (e.target.checked) playCoin()
            }}
            className="size-6 accent-rubber"
          />
        </label>
      </Section>

      <Section className="mb-6" title="Perfil">
        <div className="divide-y divide-iron-800 frame rounded-2xl bg-iron-850 px-4 py-1">
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-[15px]">Idade</span>
            <span className="flex items-center gap-2">
              <input
                inputMode="numeric"
                defaultValue={ageFromBirthYear(profile.birthYear) ?? ''}
                onBlur={(e) => {
                  const n = Number(e.target.value)
                  void updateProfile({ birthYear: e.target.value.trim() && n > 0 && n < 120 ? new Date().getFullYear() - Math.round(n) : undefined })
                }}
                className="num h-11 w-24 rounded-xl bg-iron-800 px-3 text-right text-xl"
                placeholder="—"
              />
              <span className="w-6 text-sm text-iron-500">anos</span>
            </span>
          </label>
          {numField('Altura', 'heightCm', 'cm')}
          {numField('Peso inicial', 'startWeightKg', 'kg')}
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-[15px]">Experiência</span>
            <select
              value={profile.trainingLevel ?? ''}
              onChange={(e) => void updateProfile({ trainingLevel: (e.target.value || undefined) as TrainingLevel | undefined })}
              className="h-11 rounded-xl bg-iron-800 px-3 text-[15px]"
            >
              <option value="">—</option>
              {TRAINING_LEVELS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-[15px]">Rotina</span>
            <select
              value={profile.activityLevel ?? ''}
              onChange={(e) => void updateProfile({ activityLevel: (e.target.value || undefined) as ActivityLevel | undefined })}
              className="h-11 rounded-xl bg-iron-800 px-3 text-[15px]"
            >
              <option value="">—</option>
              {ACTIVITY_LEVELS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      <Section className="mb-6" title="Plano">
        <div className="divide-y divide-iron-800 frame rounded-2xl bg-iron-850 px-4 py-1">
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-[15px]">Início do plano</span>
            <input
              type="date"
              value={profile.planStartDate}
              onChange={(e) => e.target.value && void updateProfile({ planStartDate: e.target.value })}
              className="h-11 rounded-xl bg-iron-800 px-3 text-[15px]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-[15px]">
              Readaptação
              <span className="block text-xs text-iron-400">Semanas iniciais com menos séries</span>
            </span>
            <select
              value={String(profile.rampUpWeeks ?? 3)}
              onChange={(e) => void updateProfile({ rampUpWeeks: Number(e.target.value) })}
              className="h-11 rounded-xl bg-iron-800 px-3 text-[15px]"
            >
              <option value="0">Sem</option>
              <option value="2">2 semanas</option>
              <option value="3">3 semanas</option>
              <option value="4">4 semanas</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-iron-500">Treinos já feitos não mudam: cada um guarda as séries planejadas no dia.</p>
      </Section>

      <Section className="mb-6" title="Armazenamento">
        <div className="frame rounded-2xl bg-iron-850 p-4 text-sm">
          {persisted ? (
            <p className="text-ok">Armazenamento persistente ativo: o navegador não apaga os dados por falta de espaço.</p>
          ) : (
            <>
              <p className="text-iron-300">
                {persisted === undefined
                  ? 'Este navegador não informa se o armazenamento é persistente (normal fora de HTTPS).'
                  : 'Armazenamento ainda não é persistente. Instalar o app na tela inicial costuma resolver.'}
              </p>
              <Button className="mt-3" onClick={() => requestPersistentStorage().then(setPersisted)}>
                Pedir armazenamento persistente
              </Button>
            </>
          )}
        </div>
      </Section>

      <Section className="mb-6" title="Dados de exemplo">
        <div className="frame rounded-2xl bg-iron-850 p-4 text-sm text-iron-300">
          {isEmpty ? (
            <>
              <p>Carrega 8 semanas de treinos e medidas fictícios para ver os gráficos funcionando.</p>
              <Button className="mt-3" onClick={() => loadSampleData().then(() => setMsg({ kind: 'ok', text: 'Dados de exemplo carregados.' }))}>
                Carregar exemplo
              </Button>
            </>
          ) : (
            <>
              <p>Apaga todos os treinos e medidas. O plano e o perfil continuam. Faça backup antes se tiver dados reais.</p>
              <Button
                variant="danger"
                className="mt-3"
                onClick={() => {
                  if (window.confirm('Apagar TODOS os treinos e medidas? Não dá para desfazer.')) void clearHistory()
                }}
              >
                Apagar histórico
              </Button>
            </>
          )}
        </div>
      </Section>

      <Section className="mb-6" title="Sobre a Forja">
        <div className="frame space-y-3 rounded-2xl bg-iron-850 p-4 text-sm leading-relaxed text-iron-300">
          <p>
            <strong className="text-chalk">Privacidade.</strong> Não existe conta nem servidor. Treinos, medidas e progresso ficam só neste
            aparelho; o site apenas entrega o app. Nada é coletado ou enviado.
          </p>
          <p>
            <strong className="text-chalk">Saúde.</strong> A Forja é um registro de treinos, não orientação profissional. Os modelos de plano são
            genéricos: ajuste com um profissional de educação física e pare se sentir dor. % de gordura e massa magra são estimativas.
          </p>
          <p>
            <strong className="text-chalk">Seus dados.</strong> Para trocar de celular ou se proteger de perda, use Exportar e Importar acima.
          </p>
        </div>
      </Section>

      <p className="px-4 pb-4 text-center text-xs text-iron-600">Forja. Nada sai deste aparelho.</p>
    </div>
  )
}
