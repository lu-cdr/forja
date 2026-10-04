import { useMemo, useState } from 'react'
import { Button, Icon, Sheet, cx } from '../../components/ui'
import { useLibraryExercises } from '../../db/hooks'
import { createExercise } from '../../db/planEdit'
import { MUSCLE_LABEL, type MuscleGroup } from '../../domain/types'

const EQUIPMENT = ['Barra', 'Halteres', 'Máquina', 'Polia', 'Peso corporal', 'Livre']
const GROUPS = Object.keys(MUSCLE_LABEL) as MuscleGroup[]

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function ExercisePicker({
  open,
  title,
  onClose,
  onPick,
  alreadyIn = [],
}: {
  open: boolean
  title: string
  onClose: () => void
  onPick: (exerciseId: string) => void
  alreadyIn?: string[]
}) {
  const exercises = useLibraryExercises()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ muscleGroup: 'peito' as MuscleGroup, equipment: 'Máquina', isCompound: false })
  const [error, setError] = useState<string>()

  const list = useMemo(() => {
    const nq = norm(q.trim())
    return (exercises ?? [])
      .filter((e) => (group === 'all' || e.muscleGroup === group) && (!nq || norm(e.name).includes(nq)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [exercises, q, group])

  function close() {
    setQ('')
    setCreating(false)
    setError(undefined)
    onClose()
  }

  async function onCreate() {
    try {
      const id = await createExercise({ name: q, ...form })
      onPick(id)
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar.')
    }
  }

  return (
    <Sheet open={open} onClose={close} title={title}>
      <label className="flex items-center gap-2 rounded-xl bg-iron-800 px-3 focus-within:ring-2 focus-within:ring-rubber">
        <Icon name="search" className="size-5 text-iron-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ou digitar um nome novo"
          className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-iron-500"
          aria-label="Buscar exercício"
        />
      </label>

      {!creating && (
        <>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {(['all', ...GROUPS] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={cx('min-h-9 shrink-0 rounded-full px-3 text-sm', g === group ? 'bg-chalk text-iron-950 font-medium' : 'bg-iron-800 text-iron-300')}
              >
                {g === 'all' ? 'Todos' : MUSCLE_LABEL[g]}
              </button>
            ))}
          </div>

          <ul className="mt-3 divide-y divide-iron-800">
            {list.map((e) => {
              const inDay = alreadyIn.includes(e.id)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(e.id)
                      close()
                    }}
                    className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-iron-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{e.name}</p>
                      <p className="text-xs text-iron-400">
                        {MUSCLE_LABEL[e.muscleGroup]}, {e.equipment.toLowerCase()}
                        {e.isCompound ? ', composto' : ''}
                      </p>
                    </div>
                    {inDay && <span className="shrink-0 text-xs text-iron-500">já está no treino</span>}
                    <Icon name="plus" className="size-5 shrink-0 text-rubber" />
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="py-4 text-sm text-iron-400">Nenhum exercício encontrado.</li>}
          </ul>

          <Button className="mt-4 w-full" onClick={() => setCreating(true)}>
            <Icon name="plus" className="size-4" /> {q.trim() ? `Criar "${q.trim()}"` : 'Criar exercício novo'}
          </Button>
        </>
      )}

      {creating && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-iron-300">O nome é o que está no campo acima.</p>
          <label className="block">
            <span className="text-xs text-iron-400">Grupo muscular</span>
            <select
              value={form.muscleGroup}
              onChange={(e) => setForm((f) => ({ ...f, muscleGroup: e.target.value as MuscleGroup }))}
              className="mt-1 h-12 w-full rounded-xl bg-iron-800 px-3 text-[15px]"
            >
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {MUSCLE_LABEL[g]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-xs text-iron-400">Equipamento</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {EQUIPMENT.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, equipment: eq }))}
                  className={cx('min-h-10 rounded-full px-3 text-sm', form.equipment === eq ? 'bg-chalk text-iron-950 font-medium' : 'bg-iron-800 text-iron-300')}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[15px]">
              Exercício composto
              <span className="block text-xs text-iron-400">Vários músculos e articulações, como supino e agachamento.</span>
            </span>
            <input
              type="checkbox"
              checked={form.isCompound}
              onChange={(e) => setForm((f) => ({ ...f, isCompound: e.target.checked }))}
              className="size-6 accent-rubber"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setCreating(false)}>Voltar</Button>
            <Button variant="primary" onClick={onCreate} disabled={!q.trim()}>
              Criar e adicionar
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
