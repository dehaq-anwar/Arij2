'use client'

import { useTranslation } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { useAdminText } from '../client'
import { Icon } from '../icons'

const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
] as const

/**
 * Screens whose data have no content language (association and security data, the Control
 * Center's own screens): Payload's content language menu is hidden there, so that only the
 * interface language menu remains and the two are not confused.
 */
const WITHOUT_CONTENT_LANGUAGE = [
  /^\/admin\/?$/,
  /^\/admin\/(security|export|notifications|account)(\/|$)/,
  /^\/admin\/collections\/(membership-applications|members|contact-messages|exports|users|audit-log)(\/|$)/,
]

/**
 * The language of the Control Center's interface (menus, buttons, messages), separate from the
 * content language (which language version of a page or project is edited). Payload's own menu
 * for the content language is labelled accordingly (payload.config.ts, i18n).
 */
export function LanguageMenu() {
  const { t } = useAdminText()
  const { i18n, switchLanguage } = useTranslation()
  const pathname = usePathname()
  const menuId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const hide = WITHOUT_CONTENT_LANGUAGE.some((pattern) => pattern.test(pathname ?? ''))
    document.documentElement.dataset.yopContentLanguage = hide ? 'off' : 'on'
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  return (
    <div className="yop-language" ref={wrapper}>
      <button
        ref={button}
        type="button"
        className="yop-language__button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="globe" />
        <span className="yop-language__label">{t.interfaceLanguage}:</span>{' '}
        <span className="yop-language__name" lang={current.code}>
          {current.name}
        </span>
      </button>
      {open && (
        <ul id={menuId} className="yop-language__menu" aria-label={t.interfaceLanguage}>
          {LANGUAGES.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                lang={language.code}
                aria-current={language.code === current.code ? 'true' : undefined}
                onClick={() => {
                  setOpen(false)
                  if (language.code !== current.code && switchLanguage) {
                    void switchLanguage(language.code)
                  }
                }}
              >
                {language.name}
                {language.code === current.code && <Icon name="check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
