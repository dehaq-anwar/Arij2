import type { LivePreviewConfig, PayloadRequest } from 'payload'

/** Collections whose drafts can be previewed (src/app/(frontend)/[locale]/preview). */
export const PREVIEW_COLLECTIONS = ['pages', 'projects', 'news', 'events'] as const
export type PreviewCollection = (typeof PREVIEW_COLLECTIONS)[number]

/**
 * Address of the preview of a draft: on the Control Center's own host (it is not served on the
 * website's), in the language being edited. Nothing until the document has been saved once.
 */
export function previewUrl(
  collection: PreviewCollection,
  id: unknown,
  locale: string | undefined,
  req: PayloadRequest,
): string | null {
  if (typeof id !== 'number' && typeof id !== 'string') return null
  const origin = req.payload.config.serverURL || ''
  const prefix = locale && locale !== 'de' ? `/${locale}` : ''
  return `${origin}${prefix}/preview/${collection}/${encodeURIComponent(String(id))}`
}

/** Live preview next to the editor, in the sizes the website is designed for. */
export const livePreview = (collection: PreviewCollection): LivePreviewConfig => ({
  url: ({ data, locale, req }) => previewUrl(collection, data?.id, locale?.code, req),
  breakpoints: [
    { name: 'phone', label: '390 × 844', width: 390, height: 844 },
    { name: 'tablet', label: '768 × 1024', width: 768, height: 1024 },
    { name: 'desktop', label: '1440 × 900', width: 1440, height: 900 },
  ],
})
