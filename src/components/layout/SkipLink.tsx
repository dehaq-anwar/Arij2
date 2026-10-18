import { getTranslations } from 'next-intl/server'

export async function SkipLink() {
  const t = await getTranslations('Common')
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-accent px-4 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 hover:text-on-accent"
    >
      {t('skipToContent')}
    </a>
  )
}
