import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { AboutPage, ContactPage, HomePage, MembershipPage, SupportPage } from '@/payload-types'

import { startPayload } from './database'

/**
 * The page builder on a real database (CC-2): the five fixed pages are built from their former
 * texts without losing or changing anything, in all three languages; the form texts move
 * unchanged; the rules that keep pages within the design hold for every way in.
 */
let payload: Payload
let stop: () => Promise<void>
const locales = ['de', 'en', 'ar'] as const
type Locale = (typeof locales)[number]
type Row = Record<string, unknown> & { blockType: string }

beforeAll(async () => {
  const started = await startPayload('pages')
  payload = started.payload
  stop = started.stop
  const { seed } = await import('@/cms/seed/seed')
  await seed(payload)
}, 120_000)
afterAll(async () => stop?.())

const page = async (systemKey: string, locale: Locale) => {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { systemKey: { equals: systemKey } },
    locale,
    fallbackLocale: false,
    depth: 0,
  })
  return docs[0] as unknown as { id: number; title: string; layout: Row[]; _status: string }
}
const legacy = <T>(slug: string, locale: Locale) =>
  payload.findGlobal({
    slug: slug as 'home-page',
    locale,
    fallbackLocale: false,
    depth: 0,
  }) as unknown as Promise<T>
const block = (layout: Row[], type: string) => layout.find((row) => row.blockType === type)!

describe('the fixed pages, built from their former texts', () => {
  it('exist once each, published, in the same order of blocks in every language', async () => {
    const { docs } = await payload.find({ collection: 'pages', depth: 0, limit: 20 })
    expect(docs.map((doc) => doc.systemKey).sort()).toEqual(
      ['about', 'contact', 'home', 'membership', 'support'].sort(),
    )
    for (const key of ['home', 'about', 'membership', 'support', 'contact']) {
      const [de, en, ar] = await Promise.all(locales.map((locale) => page(key, locale)))
      expect(de!._status, key).toBe('published')
      const types = (p: typeof de) => p!.layout.map((row) => `${row.blockType}:${row.id}`)
      expect(types(en), key).toEqual(types(de))
      expect(types(ar), key).toEqual(types(de))
    }
    const { ensureSystemPages } = await import('@/cms/pages/system-pages')
    expect(await ensureSystemPages(payload)).toEqual([])
  })

  it('carry every text of every language unchanged', async () => {
    for (const locale of locales) {
      const home = await legacy<HomePage>('home-page', locale)
      const homePage = (await page('home', locale)).layout
      expect(block(homePage, 'hero').headline).toBe(home.hero?.headline)
      expect(block(homePage, 'journey')).toMatchObject(home.journey!)
      expect(block(homePage, 'stats').heading).toBe(home.statsHeading)
      expect(block(homePage, 'callToAction').heading).toBe(home.cta?.heading)

      const about = await legacy<AboutPage>('about-page', locale)
      const aboutPage = (await page('about', locale)).layout
      expect(block(aboutPage, 'statement')).toMatchObject({
        statement: about.mission,
        body: about.intro,
      })
      expect(
        (block(aboutPage, 'timeline').entries as Row[]).map(({ year, title, text }) => ({
          year,
          title,
          text,
        })),
      ).toEqual(about.story!.map(({ year, title, text }) => ({ year, title, text })))
      expect(
        (block(aboutPage, 'values').items as Row[]).map(({ title, description }) => ({
          title,
          description,
        })),
      ).toEqual(about.values!.map(({ title, description }) => ({ title, description })))
      expect(block(aboutPage, 'board').intro).toBe(about.boardIntro)

      const membership = await legacy<MembershipPage>('membership-page', locale)
      const membershipPage = (await page('membership', locale)).layout
      const cards = block(membershipPage, 'cards')
      expect(cards.intro).toEqual(membership.intro)
      expect((cards.items as Row[]).map((item) => item.text)).toEqual([
        membership.whoCanJoin,
        membership.fees,
        membership.process,
      ])
      expect(block(membershipPage, 'membershipForm').note).toBe(membership.formNote)

      const support = await legacy<SupportPage>('support-page', locale)
      const supportPage = (await page('support', locale)).layout
      const ways = block(supportPage, 'cards')
      expect(ways.intro).toEqual(support.intro)
      expect((ways.items as Row[]).map(({ heading, text }) => ({ heading, text }))).toEqual([
        { heading: support.volunteer?.heading, text: support.volunteer?.text },
        { heading: support.partner?.heading, text: support.partner?.text },
      ])
      expect(block(supportPage, 'donation')).toMatchObject({
        heading: support.donate?.heading,
        body: support.donate?.text,
        reference: support.donate?.reference,
        taxStatusNote: support.donate?.taxStatusNote,
      })

      const contact = await legacy<ContactPage>('contact-page', locale)
      const contactPage = (await page('contact', locale)).layout
      expect(block(contactPage, 'contactForm')).toMatchObject({
        intro: contact.intro,
        officeHours: contact.officeHours,
        showEmail: contact.showEmail,
        showPhone: contact.showPhone,
        showAddress: contact.showAddress,
      })
    }
  })

  it('moves the wording of the forms unchanged, in every language', async () => {
    for (const locale of locales) {
      const [texts, membership, contact] = await Promise.all([
        payload.findGlobal({ slug: 'form-texts', locale, fallbackLocale: false, depth: 0 }),
        legacy<MembershipPage>('membership-page', locale),
        legacy<ContactPage>('contact-page', locale),
      ])
      expect(texts.membership).toEqual({
        principles: membership.form?.principles,
        fees: membership.form?.fees,
        guardian: membership.form?.guardian,
        consent: membership.form?.consent,
      })
      expect(texts.contact?.consent).toBe(contact.form?.consent)
    }
  })

  it('keeps the former page texts as they were, and read-only through the API', async () => {
    const before = await legacy<AboutPage>('about-page', 'de')
    const { ensureSystemPages } = await import('@/cms/pages/system-pages')
    await ensureSystemPages(payload)
    expect(await legacy<AboutPage>('about-page', 'de')).toEqual(before)
    const config = payload.config.globals.find((global) => global.slug === 'about-page')!
    expect(await (config.access.update as () => boolean)()).toBe(false)
  })
})

describe('rules that keep pages within the design', () => {
  const header = { blockType: 'header' }
  const attempt = (data: Record<string, unknown>, id?: number) =>
    (id
      ? payload.update({ collection: 'pages', id, data, locale: 'de' })
      : payload.create({ collection: 'pages', data: data as never, locale: 'de' })
    ).then(
      () => 'saved',
      (error: Error) => error.message + JSON.stringify((error as { data?: unknown }).data ?? ''),
    )

  it('a page opens with one page header; the home stage only on the home page', async () => {
    expect(await attempt({ title: 'Ohne Kopf', layout: [{ blockType: 'stats' }] })).toMatch(
      /Seitenkopf/,
    )
    expect(
      await attempt({ title: 'Zwei Köpfe', layout: [header, { blockType: 'header' }] }),
    ).toMatch(/nur einen Seitenkopf/)
    expect(
      await attempt({
        title: 'Bühne',
        layout: [{ blockType: 'hero', headline: 'X', buttons: [] }],
      }),
    ).toMatch(/Startseite vorbehalten/)
    expect(await attempt({ title: 'Sommerfest', layout: [header] })).toBe('saved')
  })

  it('the forms stay on their own page, once', async () => {
    const membership = await page('membership', 'de')
    const withoutForm = membership.layout.filter((row) => row.blockType !== 'membershipForm')
    expect(await attempt({ layout: withoutForm }, membership.id)).toMatch(/Formular bleiben/)
    expect(
      await attempt({
        title: 'Zweites Formular',
        layout: [header, { blockType: 'contactForm' }],
      }),
    ).toMatch(/eigenen Seiten/)
  })

  it('fixed pages keep their address and cannot be deleted', async () => {
    const about = await page('about', 'de')
    await payload.update({
      collection: 'pages',
      id: about.id,
      data: { slug: 'neu', systemKey: null },
    })
    expect((await payload.findByID({ collection: 'pages', id: about.id, depth: 0 })).slug).toBe(
      'about',
    )
    await expect(payload.delete({ collection: 'pages', id: about.id })).rejects.toThrow(
      /nicht gelöscht/,
    )
    // A custom page cannot make itself a fixed one.
    const created = await payload.create({
      collection: 'pages',
      data: { title: 'Eigen', slug: 'eigen', systemKey: 'home', layout: [header] } as never,
    })
    expect(created.systemKey).toBeNull()
  })

  it('addresses: reserved slugs are refused; links only to safe targets', async () => {
    for (const slug of ['kontakt', 'projects', 'admin', 'api', 'ueber-uns', 'en']) {
      expect(await attempt({ title: 'Reserviert', slug, layout: [header] }), slug).toMatch(
        /reserviert/,
      )
    }
    const band = (url: string) => ({
      title: 'Link',
      slug: `link-${Math.random().toString(36).slice(2, 8)}`,
      layout: [
        header,
        { blockType: 'nightBand', heading: 'X', buttons: [{ label: 'X', kind: 'url', url }] },
      ],
    })
    expect(await attempt(band('javascript:alert(1)'))).toMatch(/https:\/\//)
    expect(await attempt(band('data:text/html,x'))).toMatch(/https:\/\//)
    expect(await attempt(band('https://example.org/x'))).toBe('saved')

    const text = (url: string) => ({
      title: 'Text',
      slug: `text-${Math.random().toString(36).slice(2, 8)}`,
      layout: [
        header,
        {
          blockType: 'text',
          surface: 'canvas',
          body: {
            root: {
              type: 'root',
              version: 1,
              direction: 'ltr',
              format: '',
              indent: 0,
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  children: [
                    {
                      type: 'link',
                      version: 3,
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      fields: { linkType: 'custom', url, newTab: false },
                      children: [
                        {
                          type: 'text',
                          version: 1,
                          text: 'Link',
                          format: 0,
                          mode: 'normal',
                          style: '',
                          detail: 0,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    })
    expect(await attempt(text('javascript:alert(1)'))).not.toBe('saved')
    expect(await attempt(text('/kontakt'))).toBe('saved')
  })
})
