import {
  ButtonArrow,
  ButtonLink,
  buttonClass,
  type ButtonVariant,
} from '@/components/ui/ButtonLink'
import { resolveLink, type LinkValue } from '@/lib/links'

export type { LinkValue } from '@/lib/links'

export function BlockButton({
  link,
  variant,
  arrow = false,
}: {
  link: LinkValue | null | undefined
  variant: ButtonVariant
  arrow?: boolean
}) {
  const target = resolveLink(link)
  if (!target || !link?.label?.trim()) return null
  if (target.external) {
    const web = /^https?:/i.test(target.href)
    return (
      <a
        href={target.href}
        className={buttonClass(variant)}
        rel={web ? 'noopener noreferrer' : undefined}
      >
        {link.label}
        {arrow ? <ButtonArrow /> : null}
      </a>
    )
  }
  return (
    <ButtonLink href={target.href} variant={variant} arrow={arrow}>
      {link.label}
    </ButtonLink>
  )
}

/** A row of buttons: the first is the main one, the others quieter. */
export function BlockButtons({
  buttons,
  surface,
  quiet = false,
  className = '',
}: {
  buttons: LinkValue[] | null | undefined
  surface: 'day' | 'night'
  /** All buttons in the quieter style (e.g. inside cards). */
  quiet?: boolean
  className?: string
}) {
  const shown = (buttons ?? []).filter((button) => resolveLink(button) && button.label?.trim())
  if (!shown.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {shown.map((button, i) => (
        <BlockButton
          key={i}
          link={button}
          arrow={i === 0}
          variant={
            surface === 'night'
              ? i === 0 && !quiet
                ? 'light'
                : 'glass'
              : i === 0 && !quiet
                ? 'primary'
                : 'secondary'
          }
        />
      ))}
    </div>
  )
}
