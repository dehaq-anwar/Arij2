import sharp from 'sharp'

/**
 * Abstract placeholder images in the site's colours (light, wings, grain) for the project
 * slots the association fills later with real photos. They are deliberately not photographs:
 * nothing on the site may look like an invented event or person.
 */
type Palette = {
  from: string
  to: string
  blobs: { x: number; y: number; r: number; color: string; opacity: number }[]
  wings: string[]
}

const palettes: Palette[] = [
  {
    from: '#021b2b',
    to: '#0d6867',
    blobs: [
      { x: 300, y: 820, r: 520, color: '#1b9c9b', opacity: 0.85 },
      { x: 1300, y: 140, r: 420, color: '#1f6fa8', opacity: 0.7 },
      { x: 900, y: 620, r: 260, color: '#7fe0d6', opacity: 0.45 },
    ],
    wings: [
      'M-100 760 C 300 520 620 470 860 560 C 760 360 980 180 1320 150',
      'M-100 840 C 360 640 640 600 860 660 C 1120 580 1380 640 1720 820',
    ],
  },
  {
    from: '#8bb7e0',
    to: '#eaf4fa',
    blobs: [
      { x: 1200, y: 760, r: 520, color: '#1b9c9b', opacity: 0.55 },
      { x: 260, y: 160, r: 460, color: '#ffffff', opacity: 0.9 },
      { x: 760, y: 980, r: 300, color: '#04324e', opacity: 0.35 },
    ],
    wings: [
      'M-80 300 C 320 520 640 560 920 470 C 1180 390 1400 420 1700 560',
      'M200 1080 C 420 820 700 700 1000 720',
    ],
  },
  {
    from: '#04324e',
    to: '#1b9c9b',
    blobs: [
      { x: 1350, y: 860, r: 480, color: '#7fe0d6', opacity: 0.5 },
      { x: 220, y: 240, r: 420, color: '#021b2b', opacity: 0.8 },
      { x: 820, y: 420, r: 300, color: '#8bb7e0', opacity: 0.4 },
    ],
    wings: [
      'M1700 700 C 1300 520 1000 500 760 600 C 860 380 640 200 300 160',
      'M1700 820 C 1240 660 960 640 760 700 C 520 640 260 700 -100 880',
    ],
  },
  {
    from: '#062a40',
    to: '#1f6fa8',
    blobs: [
      { x: 1250, y: 160, r: 460, color: '#7fe0d6', opacity: 0.55 },
      { x: 360, y: 900, r: 520, color: '#0d6867', opacity: 0.8 },
      { x: 800, y: 520, r: 240, color: '#ffffff', opacity: 0.18 },
    ],
    wings: [
      'M-100 600 C 260 420 560 380 820 470 C 1060 550 1320 520 1700 340',
      'M-100 700 C 300 560 600 540 840 600',
    ],
  },
  {
    from: '#eaf4fa',
    to: '#cfe1f1',
    blobs: [
      { x: 360, y: 700, r: 500, color: '#1b9c9b', opacity: 0.45 },
      { x: 1280, y: 300, r: 480, color: '#8bb7e0', opacity: 0.8 },
      { x: 900, y: 900, r: 260, color: '#0d6867', opacity: 0.3 },
    ],
    wings: [
      'M1700 380 C 1360 560 1060 600 800 520 C 900 760 760 920 520 1080',
      'M-100 460 C 260 600 560 640 800 560',
    ],
  },
]

const svgDoc = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">${body}</svg>`

/** Gradient and light blobs; blurred afterwards with a true Gaussian blur (sharp). */
const lightLayer = ({ from, to, blobs }: Palette) =>
  svgDoc(`<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="1600" height="1000" fill="url(#bg)"/>
    ${blobs.map((b) => `<circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${b.color}" fill-opacity="${b.opacity}"/>`).join('')}`)

/** Thin wing lines and a fine grain on top, kept sharp. */
const detailLayer = ({ to, wings }: Palette) => {
  const stroke = to === '#eaf4fa' || to === '#cfe1f1' ? '#04324e' : '#ffffff'
  return svgDoc(`<defs><filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer>
    </filter></defs>
    <g fill="none" stroke="${stroke}" stroke-opacity="0.22" stroke-width="2.2" stroke-linecap="round">
      ${wings.map((d) => `<path d="${d}"/>`).join('')}
    </g>
    <rect width="1600" height="1000" filter="url(#grain)"/>`)
}

export const placeholderArtworkCount = palettes.length

/** JPEG (1600 × 1000) for placeholder slot `index` (0-based). */
export async function placeholderArtwork(index: number): Promise<Buffer> {
  const palette = palettes[index % palettes.length]!
  // Blurring at 1/10 size and enlarging again gives smooth light without banding or blocks.
  const small = await sharp(Buffer.from(lightLayer(palette)))
    .resize(160, 100)
    .blur(16)
    .toBuffer()
  const light = await sharp(small).resize(1600, 1000, { kernel: 'cubic' }).toBuffer()
  return sharp(light)
    .composite([{ input: Buffer.from(detailLayer(palette)) }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()
}
