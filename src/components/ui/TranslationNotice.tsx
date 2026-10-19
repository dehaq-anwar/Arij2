import { getTranslations } from 'next-intl/server'

/** Shown when an item has no translation yet and the German version is displayed instead. */
export async function TranslationNotice() {
  const t = await getTranslations('Common')
  return (
    <p role="note" className="rounded-2xl border border-brand/40 bg-surface px-5 py-4 text-ink">
      {t('notTranslated')}
    </p>
  )
}
