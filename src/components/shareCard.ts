import type { SmithLook } from '../domain/types'
import { drawSmith } from './sprites/art/smith'
import { BALD, NO_BEARD, paletteFor } from './sprites/art/palette'
import { SCENE_COLORS } from './scene'

/**
 * Cartão "Compartilhar meu ferreiro" (1080×1350, formato de post): ferreiro martelando, nível,
 * patente e números de treino. Nada de medidas corporais — só o que a pessoa escolheria mostrar.
 */
export interface ShareCardData {
  tier: number
  look: SmithLook
  hammer?: string
  scene?: string
  level: number
  rankTitle: string
  /** 0–1 até o próximo nível. */
  progress: number
  workouts: number
  prs: number
  streakWeeks: number
  tons: number
  weekWorkouts: number
  weekTons: number
}

const W = 1080
const H = 1350
const CHALK = '#f0e6cf'
const MUTED = '#ab9e8c'
const GOLD = '#f4c542'
const DISPLAY = '"Forja Digits", "Pixelify Sans", sans-serif'

const num = (n: number, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits })

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  // as fontes da página precisam estar carregadas antes de desenhar texto no canvas
  await Promise.all([
    ...[500, 600, 700].map((w) => document.fonts.load(`${w} 40px "Pixelify Sans"`, 'Diário NÍVEL ção')),
    document.fonts.load(`400 80px "Forja Digits"`, '0123456789'),
  ]).catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  // fundo do cenário
  const sc = SCENE_COLORS[d.scene ?? 'forja'] ?? SCENE_COLORS.forja
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, sc.top)
  bg.addColorStop(1, sc.bottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.6, 760, 40, W * 0.6, 760, 560)
  glow.addColorStop(0, `${sc.glow}44`)
  glow.addColorStop(1, `${sc.glow}00`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // moldura em degrau, como as telas do app
  ctx.strokeStyle = '#352d26'
  ctx.lineWidth = 16
  ctx.strokeRect(24, 24, W - 48, H - 48)
  ctx.strokeStyle = '#b88a1c'
  ctx.lineWidth = 6
  ctx.strokeRect(44, 44, W - 88, H - 88)

  // título
  ctx.textAlign = 'center'
  ctx.fillStyle = CHALK
  ctx.font = `700 92px "Pixelify Sans", sans-serif`
  ctx.fillText('FORJA', W / 2, 160)
  ctx.fillStyle = MUTED
  ctx.font = `500 34px "Pixelify Sans", sans-serif`
  ctx.fillText('Diário do ferreiro', W / 2, 210)

  // ferreiro (quadro da martelada, com faíscas), pixel por pixel em escala inteira
  const shape = { bald: d.look.hair === BALD, beardless: d.look.beard === NO_BEARD, orc: d.look.skin === 'orc' }
  const sprite = drawSmith(d.tier, shape, { frame: 1 })
  const pal = paletteFor(d.look, d.hammer)
  const scale = 13
  const ox = Math.round((W - sprite.w * scale) / 2)
  const oy = 250
  sprite.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return
      ctx.fillStyle = pal[ch]
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale)
    }),
  )

  // nível e patente
  const panelY = oy + sprite.h * scale + 40
  ctx.fillStyle = '#0d0b09cc'
  ctx.fillRect(84, panelY, W - 168, 190)
  ctx.strokeStyle = '#b88a1c'
  ctx.lineWidth = 6
  ctx.strokeRect(84, panelY, W - 168, 190)
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = `400 120px ${DISPLAY}`
  ctx.fillText(String(d.level), 124, panelY + 130)
  const lvW = ctx.measureText(String(d.level)).width
  ctx.fillStyle = MUTED
  ctx.font = `500 30px "Pixelify Sans", sans-serif`
  ctx.fillText('NÍVEL', 140 + lvW, panelY + 62)
  ctx.fillStyle = CHALK
  ctx.font = `600 56px "Pixelify Sans", sans-serif`
  ctx.fillText(d.rankTitle, 140 + lvW, panelY + 118)
  // barra de XP segmentada
  const barX = 140 + lvW
  const barW = W - 124 - barX
  ctx.fillStyle = '#0d0b09'
  ctx.fillRect(barX, panelY + 140, barW, 22)
  ctx.fillStyle = GOLD
  ctx.fillRect(barX, panelY + 140, barW * Math.max(0, Math.min(1, d.progress)), 22)
  ctx.fillStyle = '#00000055'
  for (let x = barX + 18; x < barX + barW; x += 20) ctx.fillRect(x, panelY + 140, 3, 22)

  // números
  const stats: [string, string][] = [
    [num(d.workouts), 'treinos'],
    [num(d.prs), 'recordes'],
    [num(d.streakWeeks), d.streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'],
    [num(d.tons, 1), 'toneladas'],
  ]
  const colW = (W - 168) / stats.length
  const statsY = panelY + 268
  ctx.textAlign = 'center'
  stats.forEach(([value, label], i) => {
    const cx = 84 + colW * i + colW / 2
    ctx.fillStyle = CHALK
    ctx.font = `400 84px ${DISPLAY}`
    ctx.fillText(value, cx, statsY)
    ctx.fillStyle = MUTED
    ctx.font = `500 26px "Pixelify Sans", sans-serif`
    ctx.fillText(label, cx, statsY + 40)
  })

  ctx.fillStyle = MUTED
  ctx.font = `500 32px "Pixelify Sans", sans-serif`
  const week =
    d.weekWorkouts > 0
      ? `Esta semana: ${d.weekWorkouts} ${d.weekWorkouts === 1 ? 'treino' : 'treinos'}, ${num(d.weekTons, 1)} t levantadas`
      : 'Esta semana: a bigorna está esperando'
  ctx.fillText(week, W / 2, H - 92)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png'))
}

/** Compartilha (WhatsApp, Instagram…) pela folha do celular; sem suporte, baixa o arquivo. */
export async function shareImage(blob: Blob, fileName: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
