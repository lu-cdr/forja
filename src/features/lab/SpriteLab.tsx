import { useState } from 'react'
import type { SmithLook } from '../../domain/types'
import { Smith } from '../../components/Smith'
import { DEFAULT_LOOK } from '../../components/sprites/art/palette'

// Página só de desenvolvimento (rota registrada apenas com import.meta.env.DEV): revisar o sprite.
// ?z=2 aumenta; ?t=0,4 escolhe patentes
const q = new URLSearchParams(location.search)
const Z = Number(q.get('z') ?? 1)
const TIERS = (q.get('t') ?? '0,1,2,3,4').split(',').map(Number)

const LOOKS: { label: string; look: SmithLook }[] = [
  { label: 'Padrão', look: DEFAULT_LOOK },
  { label: 'Grisalho, barba preta', look: { skin: 'clara', hair: 'grisalho', beard: 'preto' } },
  { label: 'Orc careca', look: { skin: 'orc', hair: 'careca', beard: 'ruivo' } },
  { label: 'Pele escura, sem barba', look: { skin: 'escura', hair: 'preto', beard: 'sem' } },
  { label: 'Ruivo', look: { skin: 'morena', hair: 'ruivo', beard: 'ruivo' } },
]

export function SpriteLab() {
  const [lookIdx, setLookIdx] = useState(0)
  const look = LOOKS[lookIdx].look
  return (
    <div className="p-3" style={{ background: '#14110e', minHeight: '100dvh' }}>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {LOOKS.map((l, i) => (
          <button key={l.label} className={`rounded px-3 py-2 ${i === lookIdx ? 'bg-rubber text-iron-950' : 'bg-iron-800'}`} onClick={() => setLookIdx(i)}>
            {l.label}
          </button>
        ))}
      </div>
      {(['forja', 'ficha'] as const).map((stance) => (
        <section key={stance} className="mb-4">
          <h2 className="mb-1 font-display text-xl">Postura: {stance}</h2>
          <div className="flex flex-wrap items-end gap-2">
            {TIERS.map((t) => (
              <div key={t} className="text-center" style={{ background: '#2a2420' }}>
                <Smith tier={t} size={128 * Z} look={look} stance={stance} />
                <div className="text-[10px] text-iron-400">patente {t}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
