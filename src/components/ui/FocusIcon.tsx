import type { FocusArea } from '@/payload-types'

/** Simple line icons in the style of the logo (stroke only, currentColor). Decorative. */
const paths: Record<FocusArea['icon'], string> = {
  // a person with a raised arm
  youth: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 22v-7l-2-3 3-3h6l3-6M12 9v13M16 22v-8',
  // an olive branch
  peace:
    'M4 20c4-1 8-5 10-10l3-6M9 15c-2 0-3-1-3-3 2 0 3 1 3 3ZM12 11c-2 0-3-1-3-3 2 0 3 1 3 3ZM14 8c1-2 3-2 4-1-1 2-3 2-4 1ZM12 14c2-1 4 0 4 1-2 1-4 0-4-1Z',
  // two overlapping circles
  integration: 'M9 16a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM15 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  // a light bulb
  entrepreneurship:
    'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z',
  // an open book
  education: 'M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1V5ZM12 6v14',
  // three people
  community:
    'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM19 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9 20v-6a3 3 0 0 1 6 0v6M2 20v-4a3 3 0 0 1 5-2M22 20v-4a3 3 0 0 0-5-2',
}

export function FocusIcon({
  icon,
  className = '',
}: {
  icon: FocusArea['icon']
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={paths[icon]} />
    </svg>
  )
}
