import { Container } from '@/components/ui/Container'
import { Placeholder } from '@/components/ui/Placeholder'

/** Temporary page body until the page is built from CMS content in Phase 4. */
export function PlaceholderPage({ title, text }: { title: string; text: string }) {
  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-brand-navy sm:text-4xl dark:text-ink">{title}</h1>
      <div className="mt-6 max-w-prose">
        <Placeholder>{text}</Placeholder>
      </div>
    </Container>
  )
}
