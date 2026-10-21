import { Reveal } from '@/components/motion/Reveal'
import { Stagger } from '@/components/motion/Stagger'
import { CardSteps } from '@/components/sections/ContentSection'
import { NightBand } from '@/components/sections/NightBand'
import { BankDetails } from '@/components/sections/SupportSections'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { FocusIcon } from '@/components/ui/FocusIcon'
import { MarkedText } from '@/components/ui/MarkedText'
import { RichText } from '@/components/ui/RichText'
import type { Locale } from '@/i18n/routing'
import type {
  CardsBlock,
  DonationBlock,
  FaqBlock,
  GalleryBlock,
  ImageTextBlock,
  NightBandBlock,
  QuoteBlock,
  TextBlock,
} from '@/payload-types'

import { BlockButtons } from './BlockButton'

/**
 * Sections of the page builder that the website did not have before CC-2. They use only the
 * design system's surfaces, type scale and spacing, and logical directions (start/end), so they
 * look the same in German, English and Arabic.
 */

type WithAnchor<T> = { block: T; anchor: string; locale: Locale }

export function TextSection({ block, anchor, locale }: WithAnchor<TextBlock>) {
  return (
    <section
      aria-labelledby={block.heading ? `${anchor}-heading` : undefined}
      className={`${block.surface === 'sky' ? 'bg-surface-sky/60' : 'bg-canvas'} py-20 sm:py-28`}
    >
      <Container>
        <div className="max-w-3xl">
          {block.heading ? (
            <Reveal variant="slide-start">
              <h2 id={`${anchor}-heading`} className="text-heading mb-8">
                {block.heading}
              </h2>
            </Reveal>
          ) : null}
          <RichText data={block.body} locale={locale} className="text-lg text-ink" />
        </div>
      </Container>
    </section>
  )
}

export function CardsSection({ block, anchor, locale }: WithAnchor<CardsBlock>) {
  return (
    <section
      aria-labelledby={block.heading ? `${anchor}-heading` : undefined}
      className="bg-canvas py-20 sm:py-28"
    >
      <Container>
        {block.heading ? (
          <Reveal variant="slide-start">
            <h2 id={`${anchor}-heading`} className="text-heading mb-10">
              {block.heading}
            </h2>
          </Reveal>
        ) : null}
        <RichText data={block.intro} locale={locale} className="text-lead mb-14 text-ink" />
        <CardSteps
          locale={locale}
          numbered={Boolean(block.numbered)}
          cards={(block.items ?? []).map((item, i) => ({
            id: `${anchor}-${item.id ?? i}`,
            heading: item.heading,
            text: item.text,
            icon: item.icon ? <FocusIcon icon={item.icon} className="size-7" /> : undefined,
            footer: item.buttons?.length ? (
              <BlockButtons buttons={item.buttons.slice(0, 1)} surface="day" quiet />
            ) : undefined,
          }))}
        />
      </Container>
    </section>
  )
}

export function ImageTextSection({ block, anchor, locale }: WithAnchor<ImageTextBlock>) {
  const imageEnd = block.imagePosition === 'end'
  return (
    <section
      aria-labelledby={block.heading ? `${anchor}-heading` : undefined}
      className="bg-canvas py-20 sm:py-28"
    >
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div
          className={`card-media relative aspect-[4/3] overflow-hidden rounded-card bg-surface-sky ${imageEnd ? 'lg:order-last' : ''}`}
        >
          <CmsImage media={block.image} fill sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
        <div>
          {block.heading ? (
            <Reveal variant="slide-start">
              <h2 id={`${anchor}-heading`} className="text-heading mb-6">
                {block.heading}
              </h2>
            </Reveal>
          ) : null}
          <RichText data={block.body} locale={locale} className="text-lg text-ink-muted" />
        </div>
      </Container>
    </section>
  )
}

export function QuoteSection({ block }: WithAnchor<QuoteBlock>) {
  if (!block.quote?.trim()) return null
  return (
    <section className="bg-surface-sky/60 py-20 sm:py-28">
      <Container>
        <Reveal>
          <figure className="mx-auto max-w-4xl text-center">
            <blockquote>
              <MarkedText text={block.quote} className="text-heading text-ink" />
            </blockquote>
            {block.attribution ? (
              <figcaption className="mt-8 text-lg text-ink-muted">
                <bdi>{block.attribution}</bdi>
              </figcaption>
            ) : null}
          </figure>
        </Reveal>
      </Container>
    </section>
  )
}

export function FaqSection({ block, anchor, locale }: WithAnchor<FaqBlock>) {
  const items = (block.items ?? []).filter((item) => item.question?.trim())
  if (!items.length) return null
  return (
    <section
      aria-labelledby={block.heading ? `${anchor}-heading` : undefined}
      className="bg-canvas py-20 sm:py-28"
    >
      <Container>
        {block.heading ? (
          <Reveal variant="slide-start">
            <h2 id={`${anchor}-heading`} className="text-heading mb-10">
              {block.heading}
            </h2>
          </Reveal>
        ) : null}
        <div className="max-w-4xl divide-y divide-line border-y border-line">
          {items.map((item, i) => (
            <details key={item.id ?? i} className="faq group py-2">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-3 text-xl font-semibold">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sky text-accent transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <RichText data={item.answer} locale={locale} className="pb-6 text-ink-muted" />
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}

export function GallerySection({ block, anchor }: WithAnchor<GalleryBlock>) {
  const images = (block.images ?? []).filter((image) => typeof image === 'object' && image?.url)
  if (!images.length) return null
  return (
    <section
      aria-labelledby={block.heading ? `${anchor}-heading` : undefined}
      className="bg-canvas py-20 sm:py-28"
    >
      <Container>
        {block.heading ? (
          <Reveal variant="slide-start">
            <h2 id={`${anchor}-heading`} className="text-heading mb-10">
              {block.heading}
            </h2>
          </Reveal>
        ) : null}
        <Stagger as="ul" className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
          {images.map((image, i) => (
            <li
              key={typeof image === 'object' ? image.id : i}
              data-stagger-item
              className="card-media relative aspect-square overflow-hidden rounded-card bg-surface-sky"
            >
              <CmsImage media={image} fill sizes="(min-width: 1024px) 33vw, 50vw" />
            </li>
          ))}
        </Stagger>
      </Container>
    </section>
  )
}

export function NightBandSection({ block, anchor, locale }: WithAnchor<NightBandBlock>) {
  return (
    <NightBand id={anchor} heading={block.heading}>
      <RichText
        data={block.body}
        locale={locale}
        className="mt-6 max-w-3xl text-lg text-on-night-muted"
      />
      <BlockButtons buttons={block.buttons} surface="night" className="mt-10" />
    </NightBand>
  )
}

/**
 * Donations: only what the association enters. No statement on tax deductibility or donation
 * receipts unless confirmed by the tax office (taxStatusNote, plan §8).
 */
export function DonationSection({ block, anchor, locale }: WithAnchor<DonationBlock>) {
  return (
    <NightBand id={anchor} heading={block.heading}>
      <RichText data={block.body} locale={locale} className="mt-6 text-lg text-on-night-muted" />
      <BankDetails donate={block} />
      <RichText
        data={block.taxStatusNote}
        locale={locale}
        className="mt-8 text-sm text-on-night-muted"
      />
    </NightBand>
  )
}
