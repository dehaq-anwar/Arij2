import type { ReactNode } from 'react'

/**
 * Visibly marks content that the association still has to supply ("[PLACEHOLDER: …]").
 * Nothing invented is shown instead; scripts/check-placeholders.mjs lists what is left before launch.
 */
export function Placeholder({
  children,
  inline = false,
}: {
  children: ReactNode
  inline?: boolean
}) {
  const className =
    'rounded-md border border-dashed border-line-strong bg-surface-sky px-3 py-2 text-ink'
  return inline ? (
    <span data-placeholder className={`inline-block ${className}`}>
      {children}
    </span>
  ) : (
    <p data-placeholder className={className}>
      {children}
    </p>
  )
}
