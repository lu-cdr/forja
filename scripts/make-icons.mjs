// Gera os ícones PNG a partir do public/icon.svg (pixel art 16×16 feita de <rect>), sem dependências.
// iPhone não aceita SVG como ícone da tela inicial, e o ícone "maskable" do Android precisa de margem.
// Uso: npm run icons
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const svg = readFileSync('public/icon.svg', 'utf8')
const GRID = 16
const BG = '#14110e'

/** Grade 16×16 de cores, pintada na ordem dos <rect> (o último ganha). */
const grid = Array.from({ length: GRID }, () => Array(GRID).fill(BG))
for (const m of svg.matchAll(/<rect\s([^>]*)\/>/g)) {
  const attr = (k, d) => {
    const v = new RegExp(`\\b${k}="([^"]+)"`).exec(m[1])
    return v ? v[1] : d
  }
  const x = Number(attr('x', 0))
  const y = Number(attr('y', 0))
  const w = Number(attr('width', 0))
  const h = Number(attr('height', 0))
  const fill = attr('fill', BG)
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (grid[j]?.[i] !== undefined) grid[j][i] = fill
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Ícone quadrado de `size` px com a arte em escala inteira `scale`, centralizada sobre o fundo. */
function render(size, scale) {
  const off = Math.floor((size - GRID * scale) / 2)
  const px = Buffer.alloc(size * size * 3)
  const bg = rgb(BG)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / scale)
      const gy = Math.floor((y - off) / scale)
      const c = x >= off && y >= off && gx < GRID && gy < GRID ? rgb(grid[gy][gx]) : bg
      px.set(c, (y * size + x) * 3)
    }
  return png(size, size, px)
}

// ---- PNG mínimo (RGB 8 bits, sem filtro) ----
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(w, h, rgbPixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 2 // RGB
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) rgbPixels.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const icons = [
  ['public/apple-touch-icon.png', 180, 11], // iOS arredonda os cantos sozinho
  ['public/icon-192.png', 192, 12],
  ['public/icon-512.png', 512, 32],
  // maskable: a arte cabe no círculo seguro (80% do lado) para o Android recortar à vontade
  ['public/icon-maskable-512.png', 512, 18],
]
for (const [file, size, scale] of icons) {
  writeFileSync(file, render(size, scale))
  console.log(`${file} (${size}×${size})`)
}
