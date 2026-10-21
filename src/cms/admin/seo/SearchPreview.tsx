'use client'

import { useDocumentInfo, useFormFields, useLocale } from '@payloadcms/ui'

import { useAdminText } from '../client'

const SITE_NAME = 'Youth of Peace e.V.'
const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 160

/** Where the document lives on the website (the German paths; other languages add /en, /ar). */
const PATHS: Record<string, string> = {
  pages: '',
  projects: '/projekte',
  news: '/aktuelles',
  events: '/veranstaltungen',
}
const SYSTEM_PATHS: Record<string, string> = {
  home: '',
  about: '/ueber-uns',
  membership: '/mitglied-werden',
  support: '/unterstuetzen',
  contact: '/kontakt',
}

const cut = (text: string, limit: number) =>
  text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text

/**
 * How the page will look in search results, while typing: title, address and description, with
 * the length search engines usually show. A help for editors only; nothing is sent anywhere.
 */
export function SearchPreview() {
  const { t } = useAdminText()
  const { collectionSlug } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [title, excerpt, slug, systemKey, metaTitle, metaDescription, noIndex] = useFormFields(
    ([fields]) =>
      [
        'title',
        'excerpt',
        'slug',
        'systemKey',
        'seo.metaTitle',
        'seo.metaDescription',
        'seo.noIndex',
      ]
        .map((path) => fields[path]?.value ?? '')
        .join('\u0000'),
  )
    .split('\u0000')
    .map((v, i) => (i === 6 ? v === 'true' : v)) as [
    string,
    string,
    string,
    string,
    string,
    string,
    boolean,
  ]

  const shownTitle = metaTitle || (systemKey === 'home' ? '' : title)
  const fullTitle = shownTitle ? `${shownTitle} – ${SITE_NAME}` : SITE_NAME
  const description = metaDescription || excerpt
  const prefix = locale && locale !== 'de' ? `/${locale}` : ''
  const path =
    collectionSlug === 'pages' && systemKey
      ? (SYSTEM_PATHS[systemKey] ?? '')
      : `${PATHS[collectionSlug ?? ''] ?? ''}/${slug}`

  return (
    <div className="yop-search-preview" aria-label={t.searchPreview}>
      <p className="yop-search-preview__label">{t.searchPreview}</p>
      {noIndex ? (
        <p className="yop-search-preview__hidden">{t.searchPreviewHidden}</p>
      ) : (
        <div className="yop-search-preview__result" dir="auto">
          <p className="yop-search-preview__url">
            {SITE_NAME} › <bdi dir="ltr">{`${prefix}${path}` || '/'}</bdi>
          </p>
          <p className="yop-search-preview__title">{cut(fullTitle, TITLE_LIMIT)}</p>
          <p className="yop-search-preview__description">
            {description ? cut(description, DESCRIPTION_LIMIT) : t.searchPreviewNoDescription}
          </p>
        </div>
      )}
      <p className="yop-search-preview__counts">
        {t.searchPreviewTitle}: {fullTitle.length}/{TITLE_LIMIT} · {t.searchPreviewDescription}:{' '}
        {description.length}/{DESCRIPTION_LIMIT}
      </p>
    </div>
  )
}
