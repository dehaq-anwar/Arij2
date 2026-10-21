// Draws the small previews of the page builder's blocks (public/admin/blocks/<slug>.svg), shown
// in the Control Center when a block is added. Schematic only, in the website's colours.
// Usage: node scripts/block-thumbnails.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'admin',
  'blocks',
)
const c = {
  night: '#021b2b',
  canvas: '#f2f7fa',
  surface: '#ffffff',
  sky: '#e1edf5',
  ink: '#04324e',
  muted: '#9db3c2',
  accent: '#0d6867',
  glow: '#7fe0d6',
  onNight: '#ffffff',
  line: '#d5e4ee',
}
const W = 480
const H = 320

const rect = (x, y, w, h, fill, r = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
const bar = (x, y, w, fill = c.ink, h = 12) => rect(x, y, w, h, fill, h / 2)
const text = (x, y, lines, fill = c.muted, gap = 20, widths = [300, 260, 280, 200]) =>
  Array.from({ length: lines }, (_, i) =>
    bar(x, y + i * gap, widths[i % widths.length], fill, 9),
  ).join('')
const button = (x, y, w, fill, stroke) =>
  `<rect x="${x}" y="${y}" width="${w}" height="30" rx="15" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="2"` : ''}/>`
const card = (x, y, w, h, inner = '') => rect(x, y, w, h, c.surface, 14) + inner
const image = (x, y, w, h, r = 14) =>
  rect(x, y, w, h, c.sky, r) +
  `<path d="M${x + w * 0.2} ${y + h * 0.75}l${w * 0.2}-${h * 0.3} ${w * 0.15} ${h * 0.18} ${w * 0.12}-${h * 0.1} ${w * 0.15} ${h * 0.22}z" fill="${c.muted}"/>` +
  `<circle cx="${x + w * 0.7}" cy="${y + h * 0.3}" r="${Math.min(w, h) * 0.08}" fill="${c.glow}"/>`
const glowDots = `<circle cx="380" cy="70" r="60" fill="${c.glow}" opacity=".18"/><circle cx="90" cy="250" r="70" fill="${c.glow}" opacity=".1"/>`
const svg = (bg, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${rect(0, 0, W, H, bg)}${body}</svg>\n`

const night = (body) => svg(c.night, glowDots + body)
const day = (body, bg = c.canvas) => svg(bg, body)

const blocks = {
  header: night(bar(48, 140, 300, c.onNight, 26) + text(48, 190, 2, '#5f8197')),
  hero: night(
    bar(90, 110, 300, c.onNight, 30) +
      bar(150, 160, 180, c.glow, 12) +
      button(150, 200, 90, c.onNight) +
      button(250, 200, 80, 'rgba(255,255,255,.18)'),
  ),
  mediaHeader: svg(
    c.night,
    image(0, 0, W, H, 0) +
      `<rect width="${W}" height="${H}" fill="${c.night}" opacity=".45"/>` +
      bar(48, 210, 280, c.onNight, 24) +
      text(48, 252, 1, '#cfe0ea'),
  ),
  text: day(bar(48, 60, 220, c.ink, 18) + text(48, 110, 6)),
  cards: day(
    [0, 1, 2]
      .map((i) =>
        card(
          32 + i * 144,
          70,
          128,
          180,
          bar(48 + i * 144, 95, 40, c.accent, 20) +
            text(48 + i * 144, 150, 3, c.muted, 18, [90, 70, 80]),
        ),
      )
      .join(''),
  ),
  imageText: day(
    image(32, 50, 200, 220) +
      bar(260, 90, 160, c.ink, 18) +
      text(260, 135, 5, c.muted, 20, [180, 160, 170, 120]),
  ),
  statement: day(
    bar(48, 80, 380, c.ink, 22) +
      bar(48, 116, 320, c.ink, 22) +
      rect(48, 190, 120, 2, c.line) +
      text(200, 186, 4, c.muted, 20, [220, 200, 210, 150]),
  ),
  quote: day(
    `<text x="70" y="120" font-size="90" font-family="Georgia, serif" fill="${c.accent}">“</text>` +
      bar(110, 130, 280, c.ink, 18) +
      bar(140, 164, 220, c.ink, 18) +
      bar(190, 214, 100, c.muted, 10),
    c.sky,
  ),
  faq: day(
    bar(48, 48, 200, c.ink, 18) +
      [0, 1, 2, 3]
        .map(
          (i) =>
            rect(48, 100 + i * 50, 384, 1, c.line) +
            bar(48, 118 + i * 50, 240 - i * 20, c.ink, 11) +
            `<circle cx="420" cy="124" r="11" transform="translate(0 ${i * 50})" fill="${c.sky}"/>`,
        )
        .join(''),
  ),
  gallery: day(
    [0, 1, 2, 3, 4, 5]
      .map((i) => image(32 + (i % 3) * 144, 40 + Math.floor(i / 3) * 128, 128, 112, 12))
      .join(''),
  ),
  timeline: night(
    rect(48, 150, 384, 2, 'rgba(255,255,255,.25)') +
      [0, 1, 2]
        .map(
          (i) =>
            `<circle cx="${70 + i * 140}" cy="151" r="7" fill="${c.glow}"/>` +
            bar(60 + i * 140, 175, 60, c.glow, 18) +
            text(60 + i * 140, 210, 2, '#5f8197', 18, [100, 80]),
        )
        .join('') +
      bar(48, 70, 200, c.onNight, 18),
  ),
  values: day(
    [0, 1, 2, 3, 4, 5]
      .map((i) =>
        card(
          32 + (i % 3) * 144,
          40 + Math.floor(i / 3) * 128,
          128,
          112,
          bar(46 + (i % 3) * 144, 58 + Math.floor(i / 3) * 128, 20, c.accent, 9) +
            bar(46 + (i % 3) * 144, 86 + Math.floor(i / 3) * 128, 80, c.ink, 11),
        ),
      )
      .join(''),
  ),
  journey: svg(
    c.canvas,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.night}"/><stop offset="1" stop-color="${c.sky}"/></linearGradient></defs>` +
      rect(0, 0, W, H, 'url(#g)') +
      bar(110, 90, 260, c.onNight, 18) +
      bar(130, 220, 220, c.ink, 18),
  ),
  nightBand: night(
    bar(48, 100, 320, c.onNight, 24) +
      text(48, 150, 2, '#5f8197') +
      button(48, 210, 110, c.onNight) +
      button(170, 210, 90, 'rgba(255,255,255,.18)'),
  ),
  callToAction: night(
    bar(140, 110, 200, c.onNight, 26) +
      button(90, 180, 100, c.onNight) +
      button(200, 180, 90, 'rgba(255,255,255,.18)') +
      button(300, 180, 90, 'rgba(255,255,255,.18)'),
  ),
  donation: night(
    bar(48, 60, 220, c.onNight, 22) +
      text(48, 105, 2, '#5f8197') +
      rect(48, 160, 300, 110, 'rgba(255,255,255,.1)', 16) +
      text(70, 185, 4, '#9fc0d3', 20, [200, 240, 220, 120]),
  ),
  projects: day(
    image(32, 40, 200, 240) +
      image(248, 40, 96, 112) +
      image(352, 40, 96, 112) +
      image(248, 168, 96, 112) +
      image(352, 168, 96, 112),
  ),
  news: day(
    [0, 1, 2]
      .map(
        (i) =>
          image(32 + i * 144, 50, 128, 96, 12) +
          bar(32 + i * 144, 165, 110, c.ink, 12) +
          text(32 + i * 144, 195, 3, c.muted, 18, [120, 100, 110]),
      )
      .join(''),
  ),
  focusAreas: day(
    [0, 1, 2, 3]
      .map((i) =>
        card(
          32 + i * 108,
          80,
          96,
          160,
          `<circle cx="${62 + i * 108}" cy="115" r="16" fill="${c.sky}"/>` +
            bar(46 + i * 108, 200, 64, c.ink, 11),
        ),
      )
      .join(''),
    c.sky,
  ),
  stats: day(
    [0, 1, 2, 3]
      .map((i) =>
        card(
          32 + i * 108,
          90,
          96,
          140,
          bar(46 + i * 108, 110, 50, c.muted, 9) +
            bar(46 + i * 108, 140, 60, c.accent, 26) +
            bar(46 + i * 108, 190, 54, c.muted, 8),
        ),
      )
      .join(''),
  ),
  board: day(
    [0, 1, 2, 3]
      .map((i) =>
        card(
          32 + i * 108,
          60,
          96,
          200,
          image(42 + i * 108, 70, 76, 76, 10) +
            bar(42 + i * 108, 165, 70, c.ink, 11) +
            bar(42 + i * 108, 188, 50, c.accent, 9),
        ),
      )
      .join(''),
  ),
  partners: day(
    [0, 1, 2, 3]
      .map((i) =>
        card(
          32 + i * 108,
          100,
          96,
          120,
          rect(46 + i * 108, 120, 68, 26, c.sky, 6) + bar(46 + i * 108, 170, 60, c.ink, 10),
        ),
      )
      .join(''),
  ),
  membershipForm: night(
    bar(48, 50, 200, c.onNight, 22) +
      rect(48, 100, 384, 190, c.surface, 16) +
      [0, 1, 2].map((i) => rect(72, 124 + i * 44, 336, 30, c.canvas, 8)).join('') +
      button(72, 252, 120, c.accent),
  ),
  contactForm: day(
    bar(32, 60, 170, c.ink, 16) +
      bar(32, 110, 200, c.accent, 20) +
      text(32, 160, 4, c.muted, 22, [150, 170, 130, 160]) +
      rect(250, 40, 200, 240, c.surface, 16) +
      [0, 1, 2].map((i) => rect(268, 70 + i * 50, 164, 32, c.canvas, 8)).join('') +
      button(268, 230, 100, c.accent),
  ),
}

mkdirSync(out, { recursive: true })
for (const [slug, content] of Object.entries(blocks))
  writeFileSync(path.join(out, `${slug}.svg`), content)
console.log(
  `${Object.keys(blocks).length} previews written to ${path.relative(process.cwd(), out)}`,
)
