import { useEffect, useRef, useState } from 'react'
import { Button, Icon, Section, Segmented, Sheet, cx } from '../../components/ui'
import { prepareImage } from '../../components/photos'
import { usePhotos } from '../../db/hooks'
import { addPhoto, deletePhoto } from '../../db/repo'
import { formatDateBR, toISODate } from '../../domain/dates'
import { PHOTO_ANGLES, type PhotoAngle, type ProgressPhoto } from '../../domain/types'

const angleLabel = (a: PhotoAngle) => PHOTO_ANGLES.find((x) => x.id === a)?.label ?? a

/** Imagem a partir do Blob guardado (URL temporária liberada ao sair). */
function PhotoImg({ photo, className }: { photo: ProgressPhoto; className?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  // a URL nasce e morre no mesmo efeito (criar no render e revogar no efeito quebra a imagem)
  useEffect(() => {
    const url = URL.createObjectURL(photo.blob)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [photo.blob])
  return <img ref={ref} alt={`Foto de ${angleLabel(photo.angle).toLowerCase()} em ${formatDateBR(photo.date)}`} className={className} />
}

/** Fotos de progresso: só no aparelho (e no backup). Comparar a primeira com a mais recente de um ângulo. */
export function PhotosSection() {
  const photos = usePhotos()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ blob: Blob; width: number; height: number; url: string }>()
  const [angle, setAngle] = useState<PhotoAngle>('frente')
  const [date, setDate] = useState(toISODate())
  const [viewing, setViewing] = useState<ProgressPhoto>()
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string>()

  if (!photos) return null

  async function onFile(f: File) {
    setError(undefined)
    try {
      const img = await prepareImage(f)
      setPending({ ...img, url: URL.createObjectURL(img.blob) })
      setDate(toISODate())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler a foto.')
    }
  }

  function closePending() {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending(undefined)
  }

  async function onSave() {
    if (!pending) return
    await addPhoto({ date, angle, blob: pending.blob, width: pending.width, height: pending.height })
    closePending()
  }

  const canCompare = PHOTO_ANGLES.some((a) => photos.filter((p) => p.angle === a.id).length >= 2)

  return (
    <Section
      className="mb-6"
      title="Fotos de progresso"
      right={
        canCompare && (
          <button type="button" onClick={() => setComparing(true)} className="min-h-11 rounded-xl px-3 text-sm text-rubber active:bg-iron-800">
            Comparar
          </button>
        )
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onFile(f)
        }}
      />
      {photos.length === 0 ? (
        <div className="frame rounded-2xl bg-iron-850 p-4 text-sm text-iron-300">
          <p>
            Fotos mostram o que a fita métrica não pega. Tire sempre no mesmo lugar, com a mesma luz e a mesma pose, a cada 2 ou 4
            semanas.
          </p>
          <p className="mt-2 text-xs text-iron-400">As fotos ficam só neste aparelho e entram no backup. Nada é enviado.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setViewing(p)} className="frame block w-full overflow-hidden rounded-xl bg-iron-850 text-left">
                <PhotoImg photo={p} className="aspect-[3/4] w-full object-cover" />
                <span className="block px-1.5 py-1 text-[11px] leading-tight text-iron-300">
                  {formatDateBR(p.date)} · {angleLabel(p.angle)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button className="mt-3 w-full" onClick={() => fileRef.current?.click()}>
        <Icon name="plus" className="size-4" /> Adicionar foto
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {/* nova foto: ângulo e data antes de guardar */}
      <Sheet open={!!pending} onClose={closePending} title="Nova foto">
        {pending && <img src={pending.url} alt="Prévia da foto" className="mx-auto max-h-[45dvh] rounded-xl" />}
        <p className="mt-4 mb-1 text-xs text-iron-400">Ângulo</p>
        <Segmented<PhotoAngle> value={angle} onChange={setAngle} options={PHOTO_ANGLES.map((a) => ({ value: a.id, label: a.label }))} />
        <label className="mt-4 block">
          <span className="text-xs text-iron-400">Data</span>
          <input type="date" value={date} max={toISODate()} onChange={(e) => e.target.value && setDate(e.target.value)} className="mt-1 h-12 w-full rounded-xl bg-iron-800 px-3 text-[15px]" />
        </label>
        <Button variant="primary" className="mt-4 min-h-14 w-full text-lg" onClick={onSave}>
          Guardar foto
        </Button>
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(undefined)} title={viewing ? `${angleLabel(viewing.angle)}, ${formatDateBR(viewing.date, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}>
        {viewing && <PhotoImg photo={viewing} className="mx-auto max-h-[70dvh] rounded-xl" />}
        <Button
          variant="danger"
          className="mt-4 w-full"
          onClick={() => {
            if (!viewing || !window.confirm('Apagar esta foto? Não dá para desfazer (a não ser por um backup).')) return
            void deletePhoto(viewing.id)
            setViewing(undefined)
          }}
        >
          <Icon name="trash" className="size-4" /> Apagar foto
        </Button>
      </Sheet>

      {comparing && <CompareSheet photos={photos} onClose={() => setComparing(false)} />}
    </Section>
  )
}

/** Duas fotos do mesmo ângulo lado a lado (padrão: a primeira e a mais recente). */
function CompareSheet({ photos, onClose }: { photos: ProgressPhoto[]; onClose: () => void }) {
  const angles = PHOTO_ANGLES.filter((a) => photos.filter((p) => p.angle === a.id).length >= 2)
  const [angle, setAngle] = useState<PhotoAngle>(angles[0].id)
  const list = [...photos.filter((p) => p.angle === angle)].sort((a, b) => a.date.localeCompare(b.date))
  const [pick, setPick] = useState<{ a?: string; b?: string }>({})
  const a = list.find((p) => p.id === pick.a) ?? list[0]
  const b = list.find((p) => p.id === pick.b) ?? list[list.length - 1]

  const select = (value: ProgressPhoto, onChange: (id: string) => void) => (
    <select value={value.id} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-iron-800 px-2 text-sm" aria-label="Data da foto">
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {formatDateBR(p.date, { day: 'numeric', month: 'short', year: 'numeric' })}
        </option>
      ))}
    </select>
  )

  return (
    <Sheet open onClose={onClose} title="Comparar fotos">
      {angles.length > 1 && (
        <div className="mb-3">
          <Segmented<PhotoAngle>
            value={angle}
            onChange={(v) => {
              setAngle(v)
              setPick({})
            }}
            options={angles.map((x) => ({ value: x.id, label: x.label }))}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[
          { photo: a, set: (id: string) => setPick((s) => ({ ...s, a: id })) },
          { photo: b, set: (id: string) => setPick((s) => ({ ...s, b: id })) },
        ].map(({ photo, set }, i) => (
          <div key={i} className={cx('min-w-0')}>
            <PhotoImg photo={photo} className="aspect-[3/4] w-full rounded-xl object-cover" />
            {select(photo, set)}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
