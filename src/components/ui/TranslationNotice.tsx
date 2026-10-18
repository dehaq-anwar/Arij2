import { getTranslations } from 'next-intl/server'

/** Shown when an item has no translation yet and the German version is displayed instead. */
export async function TranslationNotice() {
  const t = await getTranslations('Common')
  return (
    <p role="note" className="rounded-md border border-line-strong bg-surface px-4 py-3 text-ink">
      {t('notTranslated')}
    </p>
  )
}
