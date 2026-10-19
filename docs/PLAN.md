# Youth of Peace e.V. — Website Plan (Phase 1)

Status: **approved on 2026-10-18**. The answers to the open questions are recorded in §18; where §18 differs from an earlier section, §18 wins.

Contents

1. What I read and what it changes
2. Stack and pinned versions
3. Architecture
4. Routes
5. File tree
6. Data models (Payload)
7. i18n and RTL
8. Design tokens (measured from the logo)
9. Motion architecture
10. Forms and privacy
11. Security
12. Accessibility and performance
13. Docker and deployment
14. Verification per phase
15. Decisions I made (override any of them)
16. Open questions
17. Phase deliverables
18. Answers and decisions log
19. Phase 2 implementation notes
20. Phase 3 implementation notes

---

## 1. What I read and what it changes

Sources: the logo PNG, `Satzung_Youth_of_Peace__e_V_2026.pdf` (11 pages), `VR_201778.pdf` (register notice).

| Finding | Source | Effect on the plan |
|---|---|---|
| Ordinary member: any natural person **aged 16 or older** who is willing to promote the association's aims | Satzung §3(1) | Form requires an age confirmation |
| Applications may be submitted **in writing or online**. The **Schriftführer** decides on admission; the **Gesamtvorstand** decides on rejections | §3(2) | An online form is a valid channel. Applications get a status workflow, and board members get a `board` user role |
| The association admits only people who commit to the principles in §2 (free democratic basic order, no membership in extremist, racist or xenophobic organisations) | §2 | Required declaration checkbox in the form |
| Fees (entrance fee + annual fee) are set by the **Beitragsordnung**, payable annually in advance by 31 January | §4 | Fee text is a placeholder until the Beitragsordnung is supplied |
| Written invitations go to the **last address the member gave in writing** | §7(3) | Postal address is required |
| Dial-in data for virtual general meetings is sent **by e-mail** | §7(16) | E-mail address is required |
| §7(8) mentions **Fördermitglieder** (supporting members), but §3 only defines ordinary members | §3, §7(8) | Open question Q4c |
| The association states it pursues charitable purposes under §§ 51–68 AO | §2 | This is the Satzung's wording, **not** confirmation from the tax office. The donation section keeps `[PLACEHOLDER: tax status]` and makes no tax claims |
| Cooperation with the parent organisation Youth of Peace (Yemen) | §2 | Fits the "Yemen to Germany" story. Copy remains a placeholder |
| Seat moved to Erlangen (Amtsgericht Fürth, VR 201778), entered 09.06.2026. Earlier register: Amtsgericht Kiel | VR notice | Only "VR 201778, Amtsgericht Fürth" is used. The notice also names a c/o person and a private address. **I will not use or commit either.** Both PDFs stay out of the repo, which is public |
| The logo is two flat colours: turquoise **#1B9C9B** and navy **#04324E**. The Satzung shows an older filled logo version | logo PNG, Satzung | Tokens in §8. Open question Q2 |

## 2. Stack and pinned versions

Rule: every version below was published **on or before 2026-10-04** (14 days before today, 2026-10-18). I checked publish dates against the npm registry.

| Package | Version | Published | Note |
|---|---|---|---|
| Node.js (Docker + `.nvmrc`) | 24.21.0 LTS | 2026-09-07 | Active LTS |
| next | 16.3.8 | 2026-09-30 | 16.4.2 is too new. Payload 3.90.2 supports `>=16.3.3 <17` |
| react, react-dom | 19.3.0 | 2026-09-09 | Falls back to the 19.2.x line if the Payload admin needs it (checked in Phase 2) |
| payload + @payloadcms/{next,ui,db-postgres,richtext-lexical,storage-s3,translations,email-nodemailer} | 3.90.2 | 2026-09-23 | 3.91.0 is too new. Payload 4 is beta, so it's excluded |
| graphql | 16.14.2 | 2026-06-09 | Payload's peer range is `^16.8.1`, so 17.x is excluded |
| next-intl | 4.14.9 | 2026-10-02 | |
| gsap | 3.15.0 | 2026-04-13 | All plugins incl. SplitText ship in the free package |
| @gsap/react | 2.1.2 | 2025-01-15 | `useGSAP` |
| lenis | 1.3.26 | 2026-08-05 | 1.3.27 is too new |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | 2026-07-16 | Has logical-property utilities |
| typescript | 5.9.3 | 2025-09-30 | Not 7.0.2: TS 7 is the new native compiler, and Payload's own template still pins 5.7.3 |
| eslint | 9.39.5 | 2026-07-10 | Not 10.x. Payload's template uses ESLint 9 and the plugin ecosystem is proven on it |
| eslint-config-next | 16.3.8 | 2026-09-30 | |
| prettier | 3.9.9 | 2026-09-23 | |
| zod | 4.6.5 | 2026-09-13 | Server-side validation |
| sharp | 0.35.5 | 2026-09-27 | Image processing for Payload |
| @fontsource-variable/ibm-plex-sans, @fontsource/ibm-plex-sans-arabic | 5.3.0 | 2026-07-19 | Used only to obtain the woff2 files. They are copied into `src/fonts` |
| vitest | 5.0.3 | 2026-09-30 | |
| @playwright/test | 1.63.0 | 2026-09-04 | Checked against the pre-installed Chromium in Phase 2 |
| @axe-core/playwright | 4.13.0 | 2026-08-11 | |
| @lhci/cli | 0.15.1 | 2025-06-25 | Lighthouse CI |
| Docker: postgres | 18.6-alpine3.24 | image 2026-09-21 | |
| Docker: S3 emulator (dev only) | SeaweedFS, release tag pinned in Phase 2 | — | `minio/minio` no longer exists on Docker Hub |
| Docker: caddy (prod) | 2.x, exact tag pinned in Phase 2 | — | TLS and reverse proxy |

How the 14-day rule is enforced:

- `.npmrc` sets `save-exact=true` and `engine-strict=true`. Exact versions only: no `^` or `~`.
- Installs run with `npm install --before=<today−14d>`. This applies the cutoff to **transitive** dependencies as well, not just the direct ones.
- `package-lock.json` is committed. Docker and CI install with `npm ci`.
- `scripts/check-release-age.mjs` checks every lockfile entry against registry publish dates. It runs in CI and before every phase sign-off.

## 3. Architecture

```
Browser ──► Caddy (TLS, HSTS, logs) ──► Next.js 16 (one Node process)
                                         ├─ (frontend)/[locale]/…  static HTML per locale, revalidated on CMS change
                                         ├─ (payload)/admin        Payload admin UI
                                         ├─ (payload)/api          Payload REST (GraphQL disabled)
                                         └─ Server Actions         membership + contact forms
                                              │
                         ┌────────────────────┼────────────────────┐
                    PostgreSQL           S3-compatible        SMTP (optional)
              (content, submissions,    storage (media)      notifications without
               rate-limit buckets)                           personal data
```

- **One app.** Payload 3 runs inside Next.js. Site and admin live in separate route groups, each with its own root layout.
- **Rendering.** Every public page is generated statically for each locale (`generateStaticParams` + `setRequestLocale`). Payload `afterChange`/`afterDelete` hooks call `revalidateTag`, so edits go live in seconds without a rebuild.
- **Data access.** Server components read through the Payload **Local API**: no HTTP hop, typed via `payload-types.ts`. All queries live in `src/lib/cms/queries.ts` and are tagged for revalidation.
- **Media.** Stored through `@payloadcms/storage-s3`. Files are served through Payload's access-controlled route, so the bucket stays private and the CSP stays same-origin. `next/image` handles optimisation and caching.
- **Forms.** Server Actions with progressive enhancement: they work without JavaScript. They write through the Local API after validation.

## 4. Routes

Localised paths come from next-intl `pathnames`. German is the default locale and has no prefix.

| Page | de (default) | en | ar |
|---|---|---|---|
| Home | `/` | `/en` | `/ar` |
| About | `/ueber-uns` | `/en/about` | `/ar/about` |
| Projects | `/projekte` | `/en/projects` | `/ar/projects` |
| Project detail | `/projekte/[slug]` | `/en/projects/[slug]` | `/ar/projects/[slug]` |
| News | `/aktuelles` | `/en/news` | `/ar/news` |
| News detail | `/aktuelles/[slug]` | `/en/news/[slug]` | `/ar/news/[slug]` |
| Membership | `/mitglied-werden` | `/en/membership` | `/ar/membership` |
| Support | `/unterstuetzen` | `/en/support` | `/ar/support` |
| Contact | `/kontakt` | `/en/contact` | `/ar/contact` |
| Impressum | `/impressum` | `/en/legal-notice` | `/ar/legal-notice` |
| Privacy | `/datenschutz` | `/en/privacy` | `/ar/privacy` |
| 404 | any unknown path, in the language of its prefix |||
| Admin | `/admin` (not localised, `noindex`) |||
| API | `/api/*` (Payload REST) |||
| SEO | `/sitemap.xml` (with hreflang alternates), `/robots.txt` |||

- **Arabic paths use Latin slugs.** Arabic URLs are percent-encoded when shared (`/ar/%D8%B9%D9%86…`), which makes them hard to read, type, or say aloud. The page content is fully Arabic.
- **One shared slug per project/news item.** The slug is Latin, auto-generated from the German title, and editable. This makes the language switcher and hreflang a 1:1 mapping.
- **Language switcher.** It links to the same page in the other locale. On detail pages it links to the same document (same slug).

## 5. File tree

```
.
├── .github/workflows/ci.yml        # lint · typecheck · test · build · release-age check
├── docker/
│   ├── Dockerfile                  # multi-stage, Next standalone output, non-root user
│   ├── Caddyfile                   # prod: TLS, headers, access-log retention
│   └── seaweedfs/                  # dev-only S3 emulator config
├── docker-compose.yml              # dev: postgres + S3 emulator
├── docker-compose.prod.yml         # prod: app + postgres + caddy
├── .env.example                    # every variable, no real values
├── .npmrc                          # save-exact, engine-strict
├── .nvmrc                          # 24.21.0
├── next.config.ts                  # withPayload + next-intl plugin + security headers + images
├── tsconfig.json                   # strict, noUncheckedIndexedAccess
├── eslint.config.mjs
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── lighthouserc.json               # Phase 6
├── README.md                       # German + English (Phase 6)
├── CONTRIBUTING.md                 # the current Arabic README content moves here, unchanged
├── docs/
│   ├── PLAN.md                     # this document
│   ├── privacy-notes.md            # technical data-flow facts for whoever writes the privacy policy
│   └── content-guide.md            # editor handbook (Phase 6)
├── scripts/
│   ├── check-release-age.mjs       # fails if any locked package is < 14 days old
│   ├── check-contrast.mjs          # WCAG contrast of every token pair, both themes
│   ├── check-logical-css.mjs       # fails on physical classes (ml-*, pr-*, left-*, text-right…)
│   ├── check-placeholders.mjs      # lists remaining [PLACEHOLDER: …] before go-live
│   └── seed.ts                     # first admin from env + globals filled with placeholders only
├── public/
│   ├── logo/                       # SVG logo files once supplied
│   └── icon.svg, apple-icon.png, favicon.ico
├── tests/
│   ├── unit/                       # validation, rate limit, honeypot, direction helpers
│   └── e2e/                        # routing, switcher, RTL mirroring, forms, axe per page × locale × theme
└── src/
    ├── payload.config.ts
    ├── payload-types.ts            # generated
    ├── proxy.ts                    # next-intl locale routing (Next 16's name for middleware)
    ├── app/
    │   ├── (frontend)/[locale]/
    │   │   ├── layout.tsx          # <html lang dir>, fonts, SmoothScroll, Header, Footer
    │   │   ├── page.tsx            # Home
    │   │   ├── about/page.tsx
    │   │   ├── projects/page.tsx
    │   │   ├── projects/[slug]/page.tsx
    │   │   ├── news/page.tsx
    │   │   ├── news/[slug]/page.tsx
    │   │   ├── membership/page.tsx
    │   │   ├── support/page.tsx
    │   │   ├── contact/page.tsx
    │   │   ├── legal-notice/page.tsx
    │   │   ├── privacy/page.tsx
    │   │   ├── not-found.tsx       # localised 404
    │   │   └── [...rest]/page.tsx  # sends unknown paths to the localised 404
    │   ├── (payload)/
    │   │   ├── layout.tsx
    │   │   ├── custom.scss
    │   │   ├── admin/[[...segments]]/{page,not-found}.tsx
    │   │   ├── admin/importMap.js
    │   │   └── api/[...slug]/route.ts
    │   ├── sitemap.ts
    │   └── robots.ts
    ├── i18n/
    │   ├── routing.ts              # locales, default, pathnames, localePrefix 'as-needed'
    │   ├── navigation.ts           # typed Link, redirect, usePathname, getPathname
    │   ├── request.ts
    │   └── messages/{de,en,ar}.json  # UI microcopy only (labels, errors, aria text, 404)
    ├── cms/
    │   ├── collections/            # Users, Media, Projects, News, TeamMembers, FocusAreas,
    │   │                           # Statistics, Partners, MembershipApplications,
    │   │                           # ContactMessages, RateLimitBuckets
    │   ├── globals/                # SiteSettings, HomePage, AboutPage, MembershipPage,
    │   │                           # SupportPage, ContactPage, LegalNotice, PrivacyPolicy
    │   ├── fields/                 # slug, seo, internalLink, richText (restricted feature set)
    │   ├── access/                 # roles, publishedOrLoggedIn
    │   ├── hooks/                  # revalidate, password policy
    │   └── jobs/                   # retention (scheduled deletion of old submissions)
    ├── lib/
    │   ├── cms/                    # getPayload, queries (Local API + cache tags)
    │   ├── motion/                 # gsap.ts (plugin registration), direction.ts, presets.ts
    │   ├── forms/                  # schemas (zod), actions, rate-limit, honeypot, notify
    │   ├── seo.ts                  # metadata, canonical, hreflang alternates
    │   └── format.ts               # Intl number/date formatting per locale
    ├── components/
    │   ├── layout/                 # Header, MobileNav, Footer, LanguageSwitcher, SkipLink
    │   ├── sections/               # Hero, Mission, FocusAreas, Stats, LatestNews, CallToAction,
    │   │                           # Timeline, Values, Board
    │   ├── cards/                  # ProjectCard, NewsCard
    │   ├── forms/                  # MembershipForm, ContactForm, Field, ConsentCheckbox,
    │   │                           # Honeypot, ErrorSummary
    │   ├── ui/                     # Button, Container, Heading, RichText, Placeholder,
    │   │                           # EmptyState, TranslationNotice
    │   ├── motion/                 # SmoothScroll, Reveal, Stagger
    │   └── reactbits/              # SplitText, Waves, CountUp, SpotlightCard, LICENSE.md
    ├── styles/
    │   ├── globals.css             # @import "tailwindcss"; @theme mapping
    │   └── tokens.css              # semantic colour variables, light + dark
    └── fonts/                      # IBM Plex Sans (variable) + IBM Plex Sans Arabic, OFL.txt
```

## 6. Data models (Payload)

**Localisation config:** locales `de` (default), `en`, `ar` (`rtl: true`, so Arabic fields are edited right-to-left). The admin UI itself is available in German, English and Arabic.

**Localisation rule:** every human-language text field is localised (marked **L** below). Identifiers are not localised: slug, e-mail, URL, IBAN, numbers, dates. Personal and organisation names are localised but optional per locale, so a name can be written in Arabic script on `/ar`.

**Placeholders:** the seed script fills globals with `[PLACEHOLDER: …]` text in all three locales. Collections start **empty**: no sample projects, news, people or numbers. Empty sections render a neutral empty state or are hidden.

### Collections

**Users** (auth, admin only)
- `name`, `email`, `password`, `role`: `admin` | `editor` | `board`
- Access: only `admin` creates or deletes users and changes roles. No public sign-up. The first admin is created by `seed.ts` from env variables.
- Auth: `maxLoginAttempts: 5`, `lockTime: 15 min`, session 2 h, cookie `Secure` + `HttpOnly` + `SameSite=Strict`. Password minimum is 12 characters, checked by a hook.

**Media** (upload → S3)
- `alt` **L**, required unless `decorative` is checked. Decorative images render `alt=""`, so editors are never pushed into writing junk alt text.
- `caption` **L**, `credit` (photographer/rights holder), focal point
- Sizes: 480 / 768 / 1280 / 1920 px, plus OG 1200×630
- Allowed types: JPEG, PNG, WebP, AVIF. **No SVG uploads**, because SVG can carry scripts. Maximum 10 MB.
- The original is re-encoded through sharp. This **strips EXIF/GPS metadata**, so event photos can't leak locations.

**Projects** (drafts + versions)
- `title` **L**, `slug` (unique, shared across locales), `excerpt` **L** (≤ 300 characters)
- `status`: planned | ongoing | completed; `startDate`, `endDate?`, `location` **L**
- `focusAreas` → FocusAreas (many), `coverImage` → Media
- `body` **L**: Lexical rich text with a restricted feature set (headings, lists, quote, link, image). **No embeds** (YouTube, maps), because they are third-party requests.
- `gallery` → Media[], `partners` → Partners[]
- `seo` group: `metaTitle` **L**, `metaDescription` **L**, `ogImage`
- `publishedAt`
- Public read access: published documents only.

**News** (drafts + versions)
- `title` **L**, `slug`, `excerpt` **L**, `publishedAt` (required), `coverImage`, `body` **L**, `relatedProjects` → Projects[], `seo`

**FocusAreas**
- `title` **L**, `summary` **L**, `icon` (select from a fixed icon set), `order`
- Seed: the four titles you listed (youth empowerment, peacebuilding, integration, youth entrepreneurship). I translate them into de/ar for you to check. Summaries start as placeholders. See Q6.

**TeamMembers** (board on the About page)
- `name` **L**, `position` **L** (e.g. "1. Vorsitzende/r"), `group`: board | team, `photo?`, `bio?` **L**, `order`
- `publishConsent` (checkbox) + `consentDate`. A person is shown **only** when consent is recorded.

**Statistics** (the only source for counters)
- `label` **L**, `value` (number), `prefix?` / `suffix?` **L**, `asOf` (date, required), `source` (internal note on where the figure comes from, required), `showOnHome`, `order`
- The stats section renders only if at least one entry exists. There are no default numbers.

**Partners**
- `name` **L**, `logo?`, `url?`, `description?` **L**, `order`, `permissionConfirmed` (required before a partner is shown)

**MembershipApplications** (never publicly readable)
- Fields derived from the Satzung (confirm in Q4):

  | Field | Required | Why (Satzung) |
  |---|---|---|
  | `firstName`, `lastName` | yes | §3(1): membership is for natural persons |
  | `ageConfirmed16` (or `dateOfBirth`, see Q4a) | yes | §3(1): minimum age 16 |
  | `street`, `postalCode`, `city`, `country` | yes | §7(3): written invitations go to the member's address |
  | `email` | yes | §7(16): dial-in data is sent by e-mail |
  | `declarationPrinciples` (checkbox) | yes | §2 + §3(1): commitment to the principles, willingness to promote the aims |
  | `feeAcknowledged` (checkbox) | yes | §4: fees per Beitragsordnung, due by 31 January |
  | `privacyConsent` + `consentedAt` + `privacyPolicyVersion` | yes | GDPR record of consent |
  | `membershipType` | only if Q4c = yes | §7(8) mentions supporting members |
  | `guardianConsent` group | only if Q4b = yes | applicants aged 16–17 |

- **Not collected:** phone, gender, nationality, religion, bank details (IBAN/SEPA), or free-text motivation.
- Admin-only fields: `status` (received | accepted | rejected), `decidedBy`, `decisionDate`, `internalNotes`, `locale`, `submittedAt`.
- Access: no public create or read. The Server Action writes via the Local API. `board` and `admin` can read and update; only `admin` can delete.

**ContactMessages** (never publicly readable)
- `name`, `email`, `topic` (general | membership | volunteering | partnership | press | other), `message` (≤ 5000 characters), `privacyConsent` + `consentedAt`, `locale`, `submittedAt`, `status` (new | answered)
- Deleted automatically after `[PLACEHOLDER: retention days]` by a scheduled job.

**RateLimitBuckets** (hidden from the admin UI)
- `key` = HMAC-SHA256(IP + form name, daily-rotating secret), `windowStart`, `count`, `expiresAt`
- Raw IPs are never stored and never linked to a submission. Expired rows are deleted.

### Globals

| Global | Fields (L = localised) |
|---|---|
| **SiteSettings** | `name` "Youth of Peace e.V."; `seat` "Erlangen"; `registerCourt` "Amtsgericht Fürth"; `registerNumber` "VR 201778"; `founded` 2013 / `foundedIn` **L** ("Jemen", "Yemen", "اليمن"); `tagline` **L**, `address`, `email`, `phone`, `chairman` → all `[PLACEHOLDER]`; `socialLinks[]` (plain links, no widgets); `defaultSeo` **L** |
| **HomePage** | `hero` {`headline` **L**, `subline` **L**, `primaryCta`/`secondaryCta` (label **L** + internal target)}; `mission` **L** (one sentence, ≤ 200 characters); `focusAreasIntro` **L**; `statsHeading` **L**; `newsHeading` **L**; `cta` {`heading` **L**, `text` **L**} |
| **AboutPage** | `intro` **L**; `story[]` {`year`, `title` **L**, `body` **L**} for 2013 Yemen → Germany; `values[]` {`title` **L**, `description` **L**}; `boardIntro` **L** |
| **MembershipPage** | `intro` **L**, `whoCanJoin` **L**, `fees` **L** `[PLACEHOLDER: Beitragsordnung]`, `process` **L**, `formIntro` **L**, `successMessage` **L** |
| **SupportPage** | `volunteer` {`heading` **L**, `text` **L**}; `partner` {`heading` **L**, `text` **L**}; `donate` {`heading` **L**, `text` **L**, `bankDetails` {holder, IBAN, BIC, bank} `[PLACEHOLDER]`, `taxStatusNote` **L** = `[PLACEHOLDER: tax status]`}. No donation figures, no online payment widget |
| **ContactPage** | `intro` **L**, show/hide toggles for address, e-mail and phone, `officeHours?` **L**, `formIntro` **L**, `successMessage` **L** |
| **LegalNotice** (Impressum) | `content` **L** (rich text, seeded `[PLACEHOLDER: Impressum per § 5 DDG]`), `lastUpdated` |
| **PrivacyPolicy** | `content` **L** (seeded `[PLACEHOLDER: Datenschutzerklärung]`), `version` (stored with each form consent), `lastUpdated` |

I will not write legal text. `docs/privacy-notes.md` will list only **technical facts** about the implementation (data flows, storage, retention, cookies: none) as input for whoever drafts the policy.

### Untranslated content

Payload falls back to German when a locale is empty. When that happens, the page:
- marks the fallback block `lang="de" dir="ltr"` so screen readers and RTL layout stay correct
- shows a short notice in the visitor's language that this item is not yet translated
- lists hreflang alternates only for locales that actually have a translation

## 7. i18n and RTL

- **next-intl routing:** `localePrefix: 'as-needed'`, `localeDetection: false`, `localeCookie: false`. Result: **zero cookies for visitors** and no surprise redirects. Language choice is explicit, via the switcher.
- `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
- **Logical CSS only.** Tailwind v4 logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`, `rounded-s`). `check-logical-css.mjs` fails lint on physical classes. Directional icons (arrows, chevrons) flip with `rtl:-scale-x-100`.
- **Fonts, self-hosted** via `next/font/local`: IBM Plex Sans (variable, Latin) and IBM Plex Sans Arabic (400/500/700). Both are from the same type family, so the metrics match across scripts. Only the current locale's font is preloaded, with `font-display: swap`. Arabic gets a taller line height via a `:lang(ar)` token.
- **Arabic text is split by words, never by characters.** Splitting characters breaks Arabic letter joining.
- **SEO:** `alternates.languages` for de/en/ar plus `x-default` (German), on every page and in the sitemap.
- **Switcher:** each language name is written in its own language and marked up accordingly (`Deutsch`, `English`, `<span lang="ar">العربية</span>`). It uses `hreflang` on the links. No flags.

## 8. Design tokens (measured from the logo)

Brand colours, measured: turquoise **#1B9C9B** and navy **#04324E** from the logo PNG; sky **#8BB7E0** and sky-light **#CFE1F1** from the Satzung letterhead (confirmed as brand colours, Q3).

**Contrast problem:** the brand turquoise reaches only **3.35:1 on white**. That fails WCAG AA for body text, and white text on a turquoise button fails too. The tokens therefore separate a *brand* turquoise (decorative) from a *text-safe* accent. Final values (Phase 2), all checked by `scripts/check-contrast.mjs` (54 pairs, part of `npm run lint`):

| Token | Light | Contrast | Dark | Contrast |
|---|---|---|---|---|
| `canvas` | #FFFFFF | — | #03243A | — |
| `surface` | #E8F4F6 | — | #06304B | — |
| `surface-sky` | #CFE1F1 | — | #0B3A5C | — |
| `ink` (text) | #04324E | 13.36 / 11.90 / 9.99 | #E6F2F4 | 13.95 / 11.99 / 10.36 |
| `ink-muted` | #3E5A6B | 7.29 / 6.49 / 5.45 | #A7C1CD | 8.47 / 7.28 / 6.29 |
| `accent` (links, buttons) | #0D6867 | 6.58 / 5.86 / 4.91 | #4CC4C2 | 7.58 / 6.52 / 5.63 |
| `accent-hover` | #0A5453 | 8.73 / 7.77 / 6.52 | #7FD6D4 | 9.47 / 8.14 / 7.03 |
| `on-accent` (button text) | #FFFFFF | 6.58 on accent | #03243A | 7.58 on accent |
| `line-strong` (form borders) | #5E7D8C | 4.39 / 3.91 / 3.28 | #6A90A4 | 4.66 / 4.01 / 3.46 |
| `focus` (2px ring + offset) | #0D6867 | ≥ 4.91 | #4CC4C2 | ≥ 5.63 |
| `danger` | #B3261E | 6.54 / 5.82 / 4.88 | #F2B8B5 | 9.34 / 8.03 / 6.93 |
| `success` | #1E6B45 | 6.47 / 5.76 / 4.84 | #7FD8A6 | 9.32 / 8.01 / 6.92 |
| `brand` (decorative, icons, ≥ 24px text) | #1B9C9B | 3.35 on canvas only | #1B9C9B | 4.76 |
| `sky`, `sky-light`, `line` | decorative only | — | decorative only | — |

Contrast triples are on canvas / surface / surface-sky. The accent was darkened from the first draft (#0F6F6E) because that value reached only 4.46:1 on the light blue.

- Tailwind's default palette is removed, so markup can only use these tokens.
- **Theme follows the OS setting** (`prefers-color-scheme`). There is no toggle, so nothing is stored on the visitor's device. A toggle can be added later.

## 9. Motion architecture

**One loop.** Lenis runs with `autoRaf: false` and is driven by `gsap.ticker`. `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.lagSmoothing(0)` keep the two in sync. The canvas background also subscribes to `gsap.ticker`. No component starts its own `requestAnimationFrame`.

**Reduced motion** (checked live through `matchMedia`, so a change takes effect without reload):
- Lenis is not created; scrolling is native.
- Every animation runs inside `gsap.matchMedia()`. In the reduced branch, elements jump straight to their final state.
- Counters show the final value, and the canvas background is not rendered.
- No parallax and no pinning, anywhere on the site, in either mode.

**Cleanup.** Every animated component uses `useGSAP(fn, { scope })`, so its GSAP context is reverted on unmount, which covers route changes. On navigation, `SmoothScroll` resets the scroll position, respects `#hash` targets, and calls `ScrollTrigger.refresh()` once the new page is painted. The Lenis instance is destroyed on provider unmount.

**RTL mirroring.** `src/lib/motion/direction.ts` exports `dirX(dir, n)`, which negates `n` in RTL. All presets (`fadeUp`, `slideInStart`, `stagger`) live in `presets.ts` and take `dir`. A lint check flags raw `x:`/`xPercent:` literals outside `presets.ts`.

**No invisible content without JavaScript.** Server HTML is fully visible. A tiny inline script adds `class="js"` before first paint, and the hidden "pre-reveal" state applies only under `.js` and `prefers-reduced-motion: no-preference`.

**LCP protection.** The hero headline is the likely LCP element, so it is **not hidden until hydration** (on mobile that would sink the Performance score). The intro animates the subline, the CTAs and the background. If Lighthouse shows the headline's split-text effect delaying LCP, the headline switches to a CSS first-paint animation and GSAP keeps the rest.

**Animation inventory** (all short: ≤ 0.8 s, `power2.out`, played once):
- Hero intro
- Section fade/slide-up on entering the viewport
- Card stagger (0.08 s)
- Counters
- Card hover spotlight (only on devices with a fine pointer)

**React Bits components** (four, copied into `src/components/reactbits`, typed, using our tokens):

| Component | Use | Adaptation |
|---|---|---|
| SplitText | Hero headline | Word split only (Arabic-safe). `aria-label` on the wrapper and `aria-hidden` on the pieces (GSAP SplitText `aria: 'auto'`). Directional offsets via `dirX` |
| Waves | Hero background | Canvas 2D: no WebGL, no extra dependency. Thin turquoise lines echo the logo's line art. Driven by `gsap.ticker`, paused when off-screen or the tab is hidden, lower density on small screens, `aria-hidden` |
| CountUp | Statistics | Re-implemented on GSAP (the original uses the `motion` library, and I won't add a second animation library). Server HTML already contains the final value; the animated digits are `aria-hidden` next to a screen-reader-only final value; `Intl.NumberFormat` per locale |
| SpotlightCard | Project/news cards | CSS custom properties, no dependency. Only under `(hover: hover) and (pointer: fine)`. Focus styling is independent of the effect |

**Licences:**
- GSAP is free, including all plugins, under its standard licence. Fine for this site.
- React Bits is **MIT + Commons Clause**. Using the components "as part of an application, website, or product" is allowed if the copyright notice is kept (in `reactbits/LICENSE.md`). It forbids "redistributing the components themselves". **This repository is public**, so the copied source would be downloadable on GitHub, which is a grey area. See Q1.

## 10. Forms and privacy

**Server Actions + zod.** Validation on the server is authoritative. The forms work without JavaScript.

**Spam protection without reCAPTCHA:**
- A **honeypot** field: off-screen, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden`.
- An HMAC-signed **timestamp token** rejects submissions faster than 3 s or older than 24 h.
- Bots receive a fake success response, so they learn nothing.

**Rate limiting** in Postgres (no Redis):
- Per form: 5 submissions per 10 minutes, 20 per day, per hashed IP.
- The client IP is read only from the trusted proxy's `X-Forwarded-For`.
- The same limiter guards the Payload login route.

**Consent:**
- The consent checkbox is unchecked by default, required, and links to the privacy page in the current language.
- The consent timestamp and the privacy-policy version are stored with each submission.

**Accessible forms:**
- Labels on every field; `aria-describedby` for hints and errors; `aria-invalid`.
- On failure, an error summary receives focus.
- Success is announced in a live region.

**Data location and e-mail:**
- Submissions are stored **only in our Postgres** (EU region).
- The optional notification e-mail to the association contains **no personal data**: only "new application received" and an admin link.
- Whether applicants get a confirmation e-mail is decided in Phase 5.

**Retention:** a Payload scheduled job deletes contact messages and rejected applications after `[PLACEHOLDER]` days (Q7).

**No cookies for visitors:**
- next-intl's cookie is disabled, there is no analytics, and the theme is not stored.
- The only cookie is Payload's auth cookie, set **after an editor logs into /admin** (strictly necessary, HttpOnly, Secure, SameSite=Strict).
- `docs/privacy-notes.md` records this as the technical basis for "no banner needed". That reasoning is input for your legal review, not legal advice.

**No runtime third-party requests:**
- Fonts are self-hosted, and there are no CDNs, embeds, maps, social widgets or payment widgets.
- Payload's `code`/`json` fields are **not used**: their editor (Monaco) loads from a CDN by default. I'll verify what Payload 3.90 actually does in Phase 5.

## 11. Security

**Headers** (`next.config.ts`, mirrored in Caddy):
- **CSP:** `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`
- **HSTS:** `max-age=31536000; includeSubDomains`. No `preload` until you decide; it is hard to undo.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- The `/admin` CSP is verified separately in Phase 5.

**Why no nonce-based CSP?** In Next.js, a per-request nonce forces **every page to render dynamically**. That gives up static HTML and caching, and hurts Lighthouse. The `'unsafe-inline'` residual risk is low here: no third-party scripts, and no user-supplied HTML (rich text renders as React elements, never `dangerouslySetInnerHTML`). If you prefer maximum CSP strictness over static pages, I'll switch to nonces.

**Payload:**
- GraphQL disabled; CORS and CSRF restricted to our own origin.
- `PAYLOAD_SECRET` is ≥ 32 random bytes from the environment.
- Login lockout, short sessions and the password rule (§6); no public registration.
- **2FA:** Payload has no built-in TOTP. In Phase 5 I'll evaluate a maintained plugin against the version rules. If none qualifies, I'll document an optional Caddy IP allowlist or basic auth in front of `/admin`.

**Operations:**
- Container runs as non-root, `npm ci` with `--omit=dev` in the runtime image, Next standalone output.
- Postgres is not exposed to the internet.
- `.env*` is gitignored and `.env.example` holds placeholders only.
- `npm audit --omit=dev` and the release-age check run in CI.

## 12. Accessibility and performance

**Accessibility (WCAG 2.1 AA):**
- Landmarks, a skip link, one `h1` per page and correct heading order.
- `lang` attributes on mixed-language snippets.
- A visible focus ring from tokens.
- Mobile menu: focus trap, Esc closes it, `aria-expanded`.
- Touch targets ≥ 44px; reflow at 320px; 200% text zoom.

**Performance:**
- Static HTML, with client JavaScript only in small islands (motion, forms, menu).
- No WebGL.
- `next/image` with AVIF/WebP and correct `sizes`; only the hero image gets `priority`.
- Subset fonts, preloaded per locale.

**Audits (Phase 6):**
- axe through Playwright on every page × 3 locales × 2 themes.
- Lighthouse CI, mobile profile: Performance ≥ 90, Accessibility ≥ 95.
- Manual keyboard and screen-reader pass (NVDA/VoiceOver checklist).

## 13. Docker and deployment

- **Dockerfile:** multi-stage (deps → build → runner) on `node:24.21.0-alpine`, exact tag. Standalone output, non-root user, healthcheck.
- **docker-compose.yml (dev):** Postgres 18.6 + SeaweedFS (S3 API). The app runs with `npm run dev` on the host for fast refresh; a containerised variant is available too.
- **docker-compose.prod.yml:** app + Postgres + Caddy (automatic TLS), named volumes, a `pg_dump` backup routine to `[PLACEHOLDER: backup target]`.
- **Migrations:** Payload Postgres migrations are committed and run on container start. The production database never uses schema `push`.
- **Hosting:** EU region, `[PLACEHOLDER: hosting + S3 provider]`. German or EU VPS and object storage providers all fit. Each needs a data processing agreement (AV-Vertrag).

## 14. Verification per phase

Every phase ends with real command output for:
- `npm run lint`: ESLint + logical-CSS check + contrast check
- `npm run typecheck`: `tsc --noEmit`
- `npm run build`
- `npm run test`: vitest
- `npm run check:deps`: release-age check

From Phase 3 on, also `npm run test:e2e` (Playwright + axe), with the app running against Postgres. Docker 29.8 and Postgres tooling are available in this environment. If the Docker daemon is unavailable here, I'll run Postgres natively for the checks and say so.

## 15. Decisions I made (override any of them)

1. Next 16.3.8 + Payload 3.90.2: the newest pair that is ≥ 14 days old and officially compatible.
2. TypeScript 5.9.3 and ESLint 9.39.5 instead of TS 7 / ESLint 10.
3. Localised paths: German slugs for de; English slugs for en and ar.
4. One shared Latin slug per project/news item.
5. Untranslated items show German content, correctly marked, with a notice. hreflang lists only translated locales.
6. No language auto-detection and no locale cookie, so visitors get zero cookies.
7. The theme follows the OS setting; no toggle.
8. Static CSP with `'unsafe-inline'`, so pages stay static and fast (vs. nonces).
9. IBM Plex Sans + IBM Plex Sans Arabic.
10. GraphQL off; no Payload `code`/`json` fields.
11. UI microcopy (labels, errors) lives in next-intl JSON files; all editorial content lives in the CMS.
12. SeaweedFS as the dev S3 emulator; Postgres 18.
13. Donations: bank-transfer details only. No payment widget, no figures, no tax claims.
14. No third-party embeds. If video or maps are needed later, they get a click-to-load consent step.
15. Notification e-mails carry no personal data.
16. Uploaded images are re-encoded to strip EXIF/GPS.
17. The current `README.md` (Arabic contributing guide) moves unchanged to `CONTRIBUTING.md` in Phase 6, when the German/English README is written.

## 16. Open questions

Each question is marked with the phase that needs the answer. Until then, placeholders are used.

- **Q1 (Phase 2): React Bits and the public repo.** The licence forbids redistributing the components themselves, and this repo is public. Options:
  - (a) make the repo private (recommended)
  - (b) accept the grey area
  - (c) skip React Bits and write equivalent effects from scratch on GSAP
- **Q2 (Phase 3): Logo.** Is the attached line-art dove the current logo? The Satzung shows an older filled version. Please supply **SVG** (or AI/EPS/PDF). It is needed for crisp rendering at every size, a dark-mode variant, and an optional line-drawing intro of the dove.
- **Q3 (Phase 2): Light blue.** Is it a brand colour? If so, give the hex value. Otherwise I'll derive light tints from the turquoise and navy (the current `--surface` #E8F4F6).
- **Q4 (Phase 5): Membership form.** Please confirm the fields in §6, and answer:
  - (a) Age: a "**I am at least 16**" checkbox (less data) or date of birth?
  - (b) Do applicants aged 16–17 need guardian consent? This is a legal question for your board or advisor.
  - (c) Should the form offer **Fördermitgliedschaft**? §7(8) mentions it, but §3 doesn't define it.
  - (d) Fee amounts from the Beitragsordnung.
- **Q5 (Phase 4): Copy.** May I draft the mission sentence, values and About text from the Satzung §2 wording, clearly marked as drafts for your approval? Or should everything stay `[PLACEHOLDER]`?
- **Q6 (Phase 4): Focus areas.** You listed four. Satzung §2 also names volunteering and intergenerational exchange, media literacy and journalism training, and cooperation with the Yemen parent organisation. "Youth entrepreneurship" does not appear in §2. Keep the four, or adjust?
- **Q7 (Phase 5): Retention and notifications.** Retention periods for contact messages and rejected applications, and which address receives notifications (e.g. the Schriftführer's).
- **Q8 (Phase 4): Arabic digits.** Western (0–9) or Arabic-Indic (٠–٩)?

## 17. Phase deliverables

| Phase | Deliverable | Done when |
|---|---|---|
| 2 | Next + Payload + Postgres + S3 running in Docker; next-intl routing for de/en/ar with RTL; design tokens + contrast check; fonts self-hosted; CI skeleton; release-age check | build/lint/typecheck pass; `/`, `/en`, `/ar` and `/admin` respond; output shown |
| 3 | Locale layout, header/footer, mobile nav, language switcher, skip link; Lenis + GSAP shared ticker, presets, reduced motion, route-change cleanup | e2e: switcher keeps the equivalent page; `dir=rtl` on /ar; animations mirror; no leaked ScrollTriggers after navigation |
| 4 | All 11 page types + 404 in 3 languages; all collections/globals wired; seed with placeholders only; revalidation hooks; React Bits components | every route renders in every locale; empty states verified; no invented content (placeholder scan) |
| 5 | Membership + contact forms, honeypot, rate limit, consent records, retention job, security headers, admin hardening, privacy-notes.md | unit + e2e tests for validation, rate limiting, honeypot; header scan output |
| 6 | axe + Lighthouse mobile audits with fixes; README (DE + EN) incl. deployment, backups, editor guide | Lighthouse Performance ≥ 90, Accessibility ≥ 95 on key pages; reports attached |

## 18. Answers and decisions log

Answered 2026-10-18 ("yes to all"). Where "yes" could not choose between two options, the interpretation is stated and is easy to change.

| # | Answer | Consequence |
|---|---|---|
| Q1 | Yes: (a) make the repository private | **Action for the owner:** GitHub → Settings → General → Danger Zone → Change visibility → Private. React Bits code is committed only after the repo is private (planned for Phase 4) |
| Q2 | The line-art dove is the current logo; an SVG will be supplied | The PNG is used until the SVG arrives. The line-drawing intro waits for the SVG |
| Q3 | Light blue is a brand colour | Brand light blues come from the Satzung letterhead: **#8BB7E0** (sky) and **#CFE1F1** (sky-light). They are checked for contrast in Phase 2 |
| Q4a | Interpreted as the first option: an "I am at least 16" checkbox | No date of birth is collected |
| Q4b | Guardian consent is required for applicants aged 16–17 | The form asks "Are you under 18?". If yes, it requires the guardian's name and e-mail. *How* consent is obtained (e-mail confirmation link vs. signed form) is designed in Phase 5; which way of consenting is legally sufficient is for the board to confirm |
| Q4c | Offer Fördermitgliedschaft | `membershipType`: ordinary or supporting. Note for the board: §3 of the Satzung does not define supporting members yet |
| Q4d | Not answered (needs amounts) | Fees remain `[PLACEHOLDER: Beitragsordnung]` |
| Q5 | Drafting copy from Satzung §2 is allowed | Drafts are clearly marked `[ENTWURF]` / `[DRAFT]` / `[مسودة]` for approval |
| Q6 | Keep the four focus areas | Youth empowerment, peacebuilding, integration, youth entrepreneurship |
| Q7 | Not answered (needs numbers and an address) | Retention periods and notification address remain placeholders |
| Q8 | Interpreted as the first option: Western digits (0–9) | Arabic number formatting uses `ar-u-nu-latn`; switching to Arabic-Indic is a one-line change |
| — | An Arabic copy of the plan is wanted | `docs/PLAN.ar.md` |

Further answers, 2026-10-18 (after Phase 3):

| # | Answer | Consequence |
|---|---|---|
| Q2 | Use the existing logo image | The supplied PNG is final; no SVG is expected. The line-drawing intro of the dove is dropped |
| Q4d | Do not state fee amounts | The membership page says only what Satzung §4 says (entrance fee and annual fee under the Beitragsordnung, payable in advance by 31 January), without amounts |
| Q7 | Retention: six months; notifications to info@yop-ye.org | Contact messages and rejected applications are deleted after 6 months (Phase 5). `info@yop-ye.org` receives notifications and, as the association's general address, is shown as the public contact e-mail |
| Q1 | (Repository still public on 2026-10-18) | React Bits code is added once the repository is private; the four effects have prepared slots |

## 19. Phase 2 implementation notes

Deviations from the plan and findings made while building Phase 2:

| Topic | What happened | Consequence |
|---|---|---|
| ESLint | 9.39.5 is now flagged "no longer supported" by ESLint. ESLint 10 is not supported yet by the plugins inside `eslint-config-next` 16.3.8 (react, jsx-a11y, import) | Stay on 9.39.5 until Next's lint config supports 10. Development tool only, not shipped |
| Security advisories | `npm audit` found 22 issues in production dependencies, rooted in 4 packages | **undici** 7.29.0 → 7.29.1 and **dompurify** 3.4.15 → 3.4.16 forced via `overrides` (both fixes ≥ 14 days old). **braces** (no fix exists) and **esbuild 0.18** (dev server never used) reviewed and accepted until 2026-11-30 in `scripts/audit-allowlist.json`; `npm run check:audit` fails on anything new or expired |
| npm install scripts | npm 11.19 blocks package install scripts unless approved | None are needed (all native binaries ship prebuilt); left blocked |
| Docker base | `libc6-compat` dropped: every native package ships a musl build | Smaller image, one network fetch less |
| Docker builds behind a TLS-inspecting proxy | Optional BuildKit secret `extra_ca` for the `npm ci` step | Not used in normal builds; never stored in a layer |
| GitHub Actions | Pinned by commit SHA: `actions/checkout` v7.0.1, `actions/setup-node` v7.0.0 (v7.1.0 is too new) | |
| Payload log levels | `loggingLevels` matches errors by class name, which the production bundle minifies, so it has no effect there. Anonymous `GET /api/users` (403) is logged as ERROR | Revisit in Phase 5 together with rate limiting and logging |
| RTL | In Arabic text, "Youth of Peace e.V." rendered as ".Youth of Peace e.V" | `OrgName` component isolates the name with `<bdi>`; the Arabic page title uses Unicode isolates. Covered by a unit test |
| 404 page | Unknown paths currently show Next's default 404 without `lang`/`dir` | Localised 404 in all three languages is Phase 4 as planned |

## 20. Phase 3 implementation notes

| Topic | What happened | Consequence |
|---|---|---|
| Logo | Until the SVG arrives, the dove mark is cropped from the supplied PNG; the name is real HTML text (sharp, readable by screen readers, legible in dark mode). Favicon and app icons are generated from the mark | Replace `src/assets/logo/yop-mark.png` and the icons once the SVG is supplied. The mark is never mirrored in RTL |
| 404 pages | Next.js 16.3.8 answers `notFound()` with status **404** and an empty shell; the browser then renders the localized 404 page (header, footer, `lang`/`dir`). Reproduced in a minimal stock Next.js app, so this is framework behaviour, not this project's code. `global-not-found` and a pass-through root layout were tried and do not change it | 404 status and the visible page are correct with JavaScript. Without JavaScript the 404 page is blank. Re-check when Next.js is upgraded |
| Standalone server binding | With `HOSTNAME=127.0.0.1`, next-intl's internal rewrites look external to Next and every German URL without prefix loops (307 to itself). With `0.0.0.0` (the Docker default) everything works, also behind a reverse proxy with a public `Host` header | Always bind the standalone server to `0.0.0.0`; restrict access with the network/firewall instead. Documented in `docs/development.md`; the e2e server binds `0.0.0.0` |
| Language switcher | next-intl links to the default locale with a `/de` prefix (to refresh its locale cookie, which this site doesn't use) | Switcher hrefs come from `getPathname()`, the same source as the hreflang alternates, so German links are canonical (`/ueber-uns`). Covered by e2e |
| Locale layout | `dynamicParams = false` in the root `[locale]` layout is inherited by child segments and blocked the catch-all 404 route | Removed; the layout validates the locale with `notFound()` |
| Mobile header | Screenshots showed the membership button in the phone header (a `hidden` class lost against the button's own `inline-flex`) | Fixed with a wrapper; e2e now checks the phone header (no button, name on one line, no horizontal scroll) |
| Next.js dev | `next dev` writes `AGENTS.md`/`CLAUDE.md` into the repository | Disabled with `agentRules: false` |
| Motion | Lenis runs on GSAP's ticker (one loop); reveals start hidden only when JavaScript runs and motion is allowed, with a 4 s safety fallback; horizontal offsets go through `dirX()` and a lint check enforces it | e2e verifies reduced motion, no-JS visibility, RTL mirroring and that no ScrollTriggers/tweens are left behind after navigation |
| Placeholders | `npm run check:placeholders` lists every `[PLACEHOLDER: …]` left; `--strict` fails (launch gate) | 28 at the end of Phase 3 |


## 21. Phase 4 implementation notes

| Topic | What happened | Consequence |
|---|---|---|
| Rendering and cache | Pages are rendered on their first visit and cached; nothing is prerendered at build time, so `npm run build` needs no database (verified with an unreachable `DATABASE_URL`). Every CMS change marks all pages stale. The first version called `revalidatePath('/[locale]', 'layout')`, which silently did nothing: cache tags come from the file path, which includes the `(frontend)` route group. The e2e test for it failed, so it was caught | Now `revalidatePath('/', 'layout')`. e2e checks that changed page texts and new/deleted projects appear immediately |
| Read-only container | By default Next.js writes rendered pages into `.next/server`, which is read-only in the production container | `experimental.isrFlushToDisk: false`: the cache lives in memory; after a restart each page is rendered again once. Smoke test of the image (read-only, empty database): migrations run on first start, all pages answer 200, CMS changes appear, no write errors |
| Environment variables | `NEXT_PUBLIC_*` values are frozen into the build, also in server code; a Docker image built without `.env` would have lost the server URL and the indexing switch | Renamed to `SERVER_URL` and `ALLOW_INDEXING`, read at runtime. **Rename them in existing `.env` files** |
| Database enum | A select field named `status` in projects collided with the `_status` enum of drafts (`enum_projects_status`) and broke the migration | The field is called `stage` (planned / ongoing / completed) |
| Translations | Untranslated projects/news show the German text, marked `lang="de"` and with a notice. Their canonical URL is the German page; hreflang and the sitemap list only languages that really have the text | Checked by e2e (Arabic fallback, English translation, alternates, sitemap) |
| Visibility rules | Drafts, people without consent, partners without permission and the internal source of statistics are filtered by the collections' access rules, so the REST API gives visitors exactly what the pages show | e2e checks pages and API |
| Seed content | `npm run seed` fills the CMS with placeholders and marked drafts only; it never overwrites existing content. Pages work with an empty CMS too | Seeding production: run it once against the new database before the first visit (or restart the app afterwards: the script cannot refresh the running app's cache). Documented in Phase 6 |
| Test data | Projects, a post, a statistic, people and partners named "E2E …" exist only in a separate database whose name must end in `_e2e`; it is rebuilt on every e2e run. CI runs PostgreSQL 18.6 as a service | 131 e2e tests (103 in Phase 3) |
| Rich text | Rendered as React elements (never raw HTML). Alignment and indentation from the editor are ignored (they are physical left/right); placeholder and draft paragraphs are framed; links to projects/news use the localized paths | |
| Donations | Bank details only as entered in the CMS (placeholder until then), IBAN grouped and always left-to-right; the tax-status text only from the CMS, with a warning in its field description | e2e checks that no page claims tax deductibility or donation receipts |
| Contact | `info@yop-ye.org` (SiteSettings) on the contact page and in the footer; address placeholder; phone hidden unless enabled. Both forms are placeholders until Phase 5 | |
| Search engines | `robots.txt` disallows everything and pages carry `noindex` until `ALLOW_INDEXING=true` at launch; `sitemap.xml` is generated per request | |
| First admin account | On an empty database, Payload's "create first user" screen/endpoint is open to anyone until the first account exists | Phase 5: create the first admin with a command on the server instead, and keep `/admin` unreachable until then |
| Images | No media in the e2e tests (CI has no S3). Image output (`next/image` from `/api/media/file/…`) is checked with real images in Phase 6 | |
| React Bits | Still waiting for the repository to become private | Slots marked in the hero, statistics and cards |
| Placeholders | `npm run check:placeholders` now finds 89 in the source (seed texts and code fallbacks, each in three languages). The launch gate on the CMS content itself follows in Phase 6 | |

## 22. Visual redesign: direction C "Horizont" (2026-10-19)

The association asked for a complete visual redesign (same site, same data, same CMS). Three directions were shown as interactive mockups (A "Chronik" editorial, B "Raster" institutional, C "Horizont" immersive light); the association chose **C**. Restore point before the redesign: commit `6ff58e9`.

### Decisions by the association

| Topic | Decision | Implementation |
|---|---|---|
| Direction | C "Horizont": night sections with drifting light, day sections for reading, "night turns to day" while scrolling | Tokens, components and all pages rebuilt; no page or function removed |
| Logo | The association supplied the logo as PSD (dove with two figures, navy + turquoise) | Mark taken from the PSD layer (`src/assets/logo/yop-logo.png`); a variant with the navy figure in white for night backgrounds; favicon and app icons regenerated; the PSD is kept as source. The previous line-art mark is in git history. **Confirmed 2026-10-19: this is the original, official logo** |
| Little text | "The image with the project title only; a sub-page per project with some information" | Project cards show image + title only; the home page shows name, tagline, a two-line journey, projects, focus areas (icon + name), a closing call; longer texts live on the sub-pages |
| Tagline | "شباب يسعى إلى السلام" | New CMS field `site-settings.tagline` (home hero, About header, footer). German "Jugend, die nach Frieden strebt" and English "Youth striving for peace" are translations, **confirmed 2026-10-19** |
| Images | Five images now, replaced by the association later together with their texts | Seed creates five project slots (`projekt-1` … `projekt-5`) with **abstract** artwork generated in the brand colours (never photo-like: nothing may look like an invented event or person), placeholder titles and texts. Created only while there are no projects; replaced in the CMS |

### Design system

| Part | Choice |
|---|---|
| Colours | Brand colours unchanged; added night `#021B2B`, raised night `#06283C`, glow `#7FE0D6`/`#A6EDE6`, day canvas `#F2F7FA`. 74 contrast pairs (both themes, night and day) checked by `npm run lint` |
| Type | Readex Pro (OFL, self-hosted, one variable family for Latin and Arabic, replaces IBM Plex). Fluid scale: display / title / heading / lead. Arabic is never letter-spaced; Latin headlines on Arabic pages keep `dir="ltr"` |
| Layout | Wider container (84rem), rounded cards (1.75rem), pill buttons (primary, secondary, light, glass), fixed header that turns from light-on-night to frosted glass over day sections |
| Motion | Headlines rise in letter by letter (Arabic word by word, so letters stay joined) with CSS from the first paint; drifting light (CSS transforms); scroll reveals and staggers (GSAP); journey scene pinned and scrubbed (GSAP ScrollTrigger); pointer light on cards; magnetic main button; animated mobile menu; page transition on client navigation. Everything has a static version for reduced motion and without JavaScript. No new libraries |

### Technical changes

| Topic | What happened | Consequence |
|---|---|---|
| Schema | Home page: `mission`, `focusIntro`, `cta.text`, `hero.subline` removed; `journey.from/to` added. About page: `mission` added (moved from home). Site settings: `tagline`. Projects: `stage` optional (unknown for placeholder slots). | Migration `20261019_095903_redesign_c` (generated, reviewed). Only seed content was affected |
| Media without S3 | The S3 plugin is enabled only when `S3_BUCKET` is set (`alwaysInsertFields` keeps the schema identical); otherwise uploads go to `MEDIA_DIR` | End-to-end tests and CI now include real image uploads |
| Seed uploads | Uploads in the seed silently went missing after the first one: the storage plugin keeps per-upload state in the request `context`, and the seed passed one shared context object | Media is created without a shared context; dev data recreated |
| `npm run seed -- force` | `payload run` passes on positional arguments only; `--force` never arrived | The switch is now `force` (documented) |
| Performance | Intros start at 1 % opacity (counts as painted, so they don't delay LCP); the first visible project image loads with priority; list pages use CSS intros instead of scroll reveals. `experimental.inlineCss` was tried and rejected (larger HTML, more blocking time) | Lighthouse mobile in this container, which shares its CPU (noisy): performance 84–95 across pages and runs, accessibility 99–100, best practices 100; SEO 69 only because of the intentional `noindex` before launch. The remaining lever (loading GSAP lazily) belongs to the Phase 6 audit |
| Tests | 131 → 136 end-to-end tests (placeholder slots with loaded images, header tone, journey under reduced motion, Latin headline direction on Arabic pages); 66 → 69 unit tests | |

## 23. Phase 5 implementation notes: forms, privacy, security (2026-10-19)

The association confirmed on 2026-10-19 that the logo taken from the PSD is the original, official logo and that the German and English translations of the tagline are correct (§22 updated).

| Topic | What happened | Consequence |
|---|---|---|
| Membership form | The fields of §6 only: name, e-mail, postal address (for written invitations, Satzung § 7), ordinary or supporting membership (Q4c), "at least 16" (Q4a), declarations on principles/aims (§§ 2–3) and fees (§ 4, no amounts), consent | No date of birth, phone, gender, nationality, religion, bank details or free text |
| Guardian consent (Q4b) | "I am under 18" shows two more required fields: the guardian's name and e-mail (CSS only, so it also works without JavaScript). The website sends nothing to the guardian: the association obtains the consent itself and records its date in the CMS. An application cannot be set to "accepted" before that date is recorded (also enforced for API updates). If "under 18" is unticked, guardian details are discarded on the server | **For the board:** decide which form of consent is sufficient (e.g. a signed form) |
| Confirmation e-mail to applicants | Not sent (the open point from §10). The page confirms receipt instead. An automatic e-mail to an unverified address could be abused to send mail to third parties | The association replies personally |
| Wording of declarations and consent | Editable in the CMS (membership page and contact page, "Texte im …formular"), seeded as drafts marked `[ENTWURF]` / `[DRAFT]` / `[مسودة]` and shown with the draft label. The exact wording a person saw is stored with their submission | **Have it legally reviewed** before launch |
| Consent record | Stored with each submission: consent given, time, privacy-policy version (field "Version" of the privacy page in the CMS, still empty) and the wording | Fill in the version together with the real privacy policy |
| Validation | §10 named zod. Implemented as small, unit-tested validators instead (two forms), so no new dependency | Server-side validation is authoritative; input is normalised (Unicode NFC, control and direction-override characters removed) |
| Spam protection | Honeypot field; signed timestamp (faster than 3 s or older than 24 h is refused); bots receive a normal-looking success message and nothing is stored | Pages with a form (`/mitglied-werden`, `/kontakt` and their translations) are rendered per request, because the timestamp must be fresh |
| Rate limiting | PostgreSQL, one atomic statement per window: each form 5 per 10 minutes and 20 per day; CMS sign-in and password reset 20 per 10 minutes and 100 per day (on top of the account lock after 5 wrong passwords). The key is an HMAC of the address with a random secret that lives only in memory and is replaced daily: stronger than the "daily-rotating secret" of §6, because it cannot be recomputed from the server's secrets | A restart resets the counters. The address is the last `X-Forwarded-For` entry; the app must be reachable only through the reverse proxy |
| Notifications | An e-mail to `NOTIFY_EMAIL` (info@yop-ye.org) with a link to the entry and **no personal data** (unit test). SMTP via `@payloadcms/email-nodemailer` 3.90.2. Its `nodemailer` 9.1.1 has five advisories (two high: denial of service in address parsing), fixed in 10.0.9; `nodemailer` is therefore pinned to 10.0.14 through `overrides` (16 days old; the only breaking change of 10.0 is Node ≥ 20; Payload 3.91 moves to nodemailer 10 as well). Sending was verified against a local SMTP test server. Without SMTP settings nothing is sent and nothing is logged: Payload's own fallback would write whole e-mails, including password-reset links, into the log | Configure SMTP for production (`.env.example`) |
| Retention (Q7: six months) | Payload job queue (new tables `payload_jobs*`), checked every 10 minutes; the task `retention` runs nightly at 03:00 and deletes contact messages six months after arrival, rejected applications six months after the decision, and expired rate-limit counters. The decision date and deciding account are recorded automatically | **For the board:** accepted applications and undecided ones are not deleted automatically (member records / pending decision) |
| Who sees submissions | Roles **board** and **admin**; not editors, not the public API (`create` is closed to everyone; the forms write on the server). Only administrators delete applications | Collections "Mitgliedsanträge" and "Kontaktnachrichten" in the new admin group "Eingänge" |
| Security headers | As §11, on every response (pages, API, CMS, files), plus `X-Robots-Tag: noindex` for the CMS. The CMS works under the same CSP (end-to-end test: no CSP violations, no external requests). `upgrade-insecure-requests` is left to the reverse proxy (Phase 6), because in the app it would break plain-HTTP test servers | The header scan is part of the end-to-end tests |
| Gravatar in the CMS | The end-to-end test of the CMS found that Payload shows account pictures from Gravatar by default: every editor's browser would send a hash of each account's e-mail address to a third party (the CSP blocked it) | Switched off (`admin.avatar: 'default'`, a neutral icon); the test keeps it that way |
| Code editor CDN (§10) | Verified in Payload 3.90.2: its code and JSON field editor (Monaco) loads from `cdn.jsdelivr.net`. The site uses no such fields, and the CSP blocks the CDN anyway, so it fails closed | Do not add code/JSON fields |
| First administrator | Payload's "create first user" screen and endpoint are closed (Phase 4 note). The first admin is created on the server: `npm run create-admin -- <email> "<name>"` | The screen still appears on an empty database but cannot create an account |
| Passwords | The rule of §6 (at least 12 characters) is now enforced for new accounts, changes and resets | |
| Two-factor sign-in | Evaluated: the only maintained candidate is `payload-totp` 3.0.6, a community plugin with a single maintainer that hooks into sign-in. Not added (supply-chain risk in the login path) | **Decision for the association:** (a) keep password + lock + rate limit, (b) protect `/admin` additionally in the reverse proxy (basic auth or an IP allowlist, Phase 6), or (c) adopt the plugin after a code review |
| Logging | Refused requests (403, 404, validation) were logged as errors in production, because Payload's setting for this matches minified class names (Phase 2 note). A logger hook now logs every 4xx as INFO with status and message only. `LOG_LEVEL` sets the level. Form handlers never log submitted values; database errors are logged with their code only | |
| Technical privacy facts | `docs/privacy-notes.md`: data, storage, access, retention, cookies (none for visitors), headers. Input for the privacy policy, not legal text | |
| Tests | End-to-end 136 → 152; new: forms (stored data and consent record, error summary and focus, honeypot, timing, rate limit, no JavaScript, Arabic, guardian rule, privacy of the API), security (headers, CSP, no sign-up, sign-in limit, password length, CMS without external requests or CSP violations). Unit 69 → 83 (token, validation, rate-limit keys, retention dates, notification content) | |
