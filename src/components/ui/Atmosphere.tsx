import type { CSSProperties } from 'react'

type Blob = {
  size: string
  top: string
  start: string
  color: string
  opacity: number
  dx: string
  dy: string
  drift: string
}

const presets: Record<'hero' | 'page' | 'band', Blob[]> = {
  hero: [
    {
      size: '58vmax',
      top: '30%',
      start: '-14%',
      color: 'var(--color-brand)',
      opacity: 0.55,
      dx: '8%',
      dy: '-6%',
      drift: '24s',
    },
    {
      size: '52vmax',
      top: '-22%',
      start: '58%',
      color: '#1f6fa8',
      opacity: 0.5,
      dx: '-7%',
      dy: '6%',
      drift: '28s',
    },
    {
      size: '34vmax',
      top: '62%',
      start: '40%',
      color: 'var(--color-glow)',
      opacity: 0.2,
      dx: '5%',
      dy: '-8%',
      drift: '20s',
    },
  ],
  page: [
    {
      size: '44vmax',
      top: '10%',
      start: '-12%',
      color: 'var(--color-brand)',
      opacity: 0.45,
      dx: '6%',
      dy: '-4%',
      drift: '26s',
    },
    {
      size: '40vmax',
      top: '-40%',
      start: '62%',
      color: '#1f6fa8',
      opacity: 0.45,
      dx: '-5%',
      dy: '5%',
      drift: '30s',
    },
  ],
  band: [
    {
      size: '36vmax',
      top: '-10%',
      start: '-8%',
      color: 'var(--color-brand)',
      opacity: 0.35,
      dx: '5%',
      dy: '4%',
      drift: '28s',
    },
    {
      size: '30vmax',
      top: '30%',
      start: '70%',
      color: '#1f6fa8',
      opacity: 0.35,
      dx: '-4%',
      dy: '-4%',
      drift: '32s',
    },
  ],
}

/**
 * The slowly drifting light behind night sections (direction C): blurred colour fields, a fine
 * grain and, in the home hero, two thin wing lines. Decorative only; static with reduced motion.
 */
export function Atmosphere({
  variant = 'page',
  wings = false,
}: {
  variant?: keyof typeof presets
  wings?: boolean
}) {
  return (
    <div aria-hidden="true" className="aurora">
      {presets[variant].map((b, i) => (
        <span
          key={i}
          style={
            {
              width: b.size,
              height: b.size,
              insetBlockStart: b.top,
              insetInlineStart: b.start,
              background: b.color,
              opacity: b.opacity,
              '--dx': b.dx,
              '--dy': b.dy,
              '--drift': b.drift,
            } as CSSProperties
          }
        />
      ))}
      {wings ? (
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
          <path
            d="M-60 700C260 470 520 410 720 520C610 330 820 150 1180 120C1050 270 960 420 720 520C960 450 1200 520 1500 700"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1.2"
          />
          <path
            d="M-60 770C300 580 520 540 720 600C960 530 1180 590 1500 780"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1.2"
          />
        </svg>
      ) : null}
      <i />
    </div>
  )
}
