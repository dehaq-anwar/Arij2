import type { ReactNode } from 'react'

/**
 * Visibly marks content that the association still has to supply ("[PLACEHOLDER: …]") or approve
 * ("[ENTWURF]" / "[DRAFT]" / "[مسودة]"). Nothing invented is shown instead;
 * scripts/check-placeholders.mjs lists what is left before launch.
 */
export function Placeholder({
  children,
  inline = false,
  variant = 'placeholder',
  className: extra = '',
}: {
  children: ReactNode
  inline?: boolean
  variant?: 'placeholder' | 'draft'
  /** Layout classes only (e.g. margins); the marker's own look is fixed. */
  className?: string
}) {
  const look =
    variant === 'draft'
      ? 'rounded-md border border-dashed border-accent bg-canvas px-3 py-2 text-ink'
      : 'rounded-md border border-dashed border-line-strong bg-surface-sky px-3 py-2 text-ink'
  const className = `${look} ${extra}`.trim()
  return inline ? (
    <span data-placeholder={variant} className={`inline-block ${className}`}>
      {children}
    </span>
  ) : (
    <p data-placeholder={variant} className={className}>
      {children}
    </p>
  )
}
