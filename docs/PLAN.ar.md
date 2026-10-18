<div dir="rtl">

# خطة موقع جمعية شباب السلام (Youth of Peace e.V.) — المرحلة الأولى

هذه ترجمة لملف PLAN.md؛ عند أي اختلاف يُعتمد الملف الإنجليزي.

الحالة: **اعتُمدت في 2026-10-18**. أجوبة الأسئلة المفتوحة مدوّنة في القسم 18؛ وحيثما اختلف القسم 18 عن قسم سابق، يُعتمد القسم 18.

المحتويات

1. ما قرأتُه وما يغيّره
2. حزمة التقنيات والإصدارات المثبّتة
3. البنية المعمارية
4. المسارات
5. شجرة الملفات
6. نماذج البيانات (Payload)
7. تعدد اللغات (i18n) والاتجاه من اليمين إلى اليسار (RTL)
8. رموز التصميم (مقيسة من الشعار)
9. بنية الحركة
10. النماذج والخصوصية
11. الأمان
12. إمكانية الوصول والأداء
13. Docker والنشر
14. التحقق في كل مرحلة
15. القرارات التي اتخذتُها (يمكنكم إلغاء أيٍّ منها)
16. الأسئلة المفتوحة
17. مخرجات المراحل
18. سجل الإجابات والقرارات
19. ملاحظات تنفيذ المرحلة 2
20. ملاحظات تنفيذ المرحلة 3

---

## 1. ما قرأتُه وما يغيّره

المصادر: ملف الشعار بصيغة PNG، و`Satzung_Youth_of_Peace__e_V_2026.pdf` (11 صفحة)، و`VR_201778.pdf` (إشعار القيد في سجل الجمعيات).

| الملاحظة | المصدر | الأثر على الخطة |
|---|---|---|
| العضو العادي: كل شخص طبيعي **بلغ 16 عامًا أو أكثر** ومستعد للعمل على تعزيز أهداف الجمعية | النظام الأساسي (Satzung)، المادة 3(1) | يتطلب النموذج تأكيدًا للسن |
| يجوز تقديم طلبات العضوية **كتابيًا أو عبر الإنترنت**. يقرر **أمين السر (Schriftführer)** القبول، ويقرر **مجلس الإدارة بكامل هيئته (Gesamtvorstand)** الرفض | المادة 3(2) | النموذج الإلكتروني قناة صالحة. تُزوَّد الطلبات بمسار عمل لتتبّع حالتها، ويحصل أعضاء مجلس الإدارة على دور المستخدم `board` |
| لا تقبل الجمعية إلا الأشخاص الذين يلتزمون بالمبادئ الواردة في المادة 2 (المبادئ الأساسية للنظام الديمقراطي الحر، وعدم الانتماء إلى منظمات متطرفة أو عنصرية أو معادية للأجانب) | المادة 2 | خانة إقرار إلزامية في النموذج |
| تحدد **لائحة الاشتراكات (Beitragsordnung)** الرسوم (رسم الانتساب + الاشتراك السنوي)، وتُدفع سنويًا مقدّمًا في موعد أقصاه 31 يناير | المادة 4 | يبقى نص الرسوم نصًا مؤقتًا (placeholder) إلى أن تُقدَّم لائحة الاشتراكات |
| تُرسَل الدعوات الكتابية إلى **آخر عنوان أبلغ به العضو كتابيًا** | المادة 7(3) | العنوان البريدي إلزامي |
| تُرسَل بيانات الدخول إلى اجتماعات الجمعية العمومية الافتراضية **بالبريد الإلكتروني** | المادة 7(16) | عنوان البريد الإلكتروني إلزامي |
| تذكر المادة 7(8) **الأعضاء الداعمين (Fördermitglieder)**، لكن المادة 3 لا تعرّف إلا الأعضاء العاديين | المادة 3، المادة 7(8) | السؤال المفتوح Q4c |
| تذكر الجمعية أنها تسعى إلى تحقيق أغراض ذات نفع عام وفق المواد 51–68 من القانون الضريبي العام (§§ 51–68 AO) | المادة 2 | هذه صياغة النظام الأساسي، و**ليست** تأكيدًا من مكتب الضرائب. يحتفظ قسم التبرعات بـ `[PLACEHOLDER: tax status]` ولا يقدّم أي ادعاءات ضريبية |
| التعاون مع المنظمة الأم Youth of Peace (اليمن) | المادة 2 | ينسجم ذلك مع قصة «من اليمن إلى ألمانيا». ويبقى النص مؤقتًا |
| نُقل المقر إلى إرلانغن — لدى المحكمة الابتدائية (Amtsgericht) في فورت، برقم القيد VR 201778 — وقُيِّد ذلك في 09.06.2026. السجل السابق: المحكمة الابتدائية في كيل (Amtsgericht Kiel) | إشعار السجل (VR) | لا يُستخدم إلا "VR 201778, Amtsgericht Fürth". ويذكر الإشعار أيضًا شخصًا تُوجَّه المراسلات بواسطته (c/o) وعنوانًا خاصًا. **لن أستخدم أيًّا منهما ولن أودعه في المستودع.** ويبقى ملفّا PDF كلاهما خارج المستودع، فهو مستودع عام |
| يتكون الشعار من لونين مسطّحين: الفيروزي **#1B9C9B** والكحلي **#04324E**. ويُظهر النظام الأساسي نسخة أقدم من الشعار بأشكال مملوءة | ملف الشعار PNG، النظام الأساسي | رموز التصميم (tokens) في القسم 8. السؤال المفتوح Q2 |

## 2. حزمة التقنيات والإصدارات المثبّتة

القاعدة: نُشر كل إصدار أدناه **في 2026-10-04 أو قبله** (أي قبل 14 يومًا من اليوم، 2026-10-18). وقد تحققتُ من تواريخ النشر في سجل npm.

| الحزمة | الإصدار | تاريخ النشر | ملاحظة |
|---|---|---|---|
| Node.js (Docker + `.nvmrc`) | 24.21.0 LTS | 2026-09-07 | إصدار LTS في مرحلة الدعم النشط (Active LTS) |
| next | 16.3.8 | 2026-09-30 | الإصدار 16.4.2 أحدث من اللازم. يدعم Payload 3.90.2 النطاق `>=16.3.3 <17` |
| react, react-dom | 19.3.0 | 2026-09-09 | يُرجَع إلى سلسلة 19.2.x إذا احتاجت إليها واجهة إدارة Payload (يُتحقَّق من ذلك في المرحلة 2) |
| payload + @payloadcms/{next,ui,db-postgres,richtext-lexical,storage-s3,translations,email-nodemailer} | 3.90.2 | 2026-09-23 | الإصدار 3.91.0 أحدث من اللازم. وPayload 4 ما زال تجريبيًا (beta)، لذا استُبعد |
| graphql | 16.14.2 | 2026-06-09 | نطاق التبعية النظيرة (peer) في Payload هو `^16.8.1`، لذا استُبعدت 17.x |
| next-intl | 4.14.9 | 2026-10-02 | |
| gsap | 3.15.0 | 2026-04-13 | جميع الإضافات، بما فيها SplitText، متضمَّنة في الحزمة المجانية |
| @gsap/react | 2.1.2 | 2025-01-15 | `useGSAP` |
| lenis | 1.3.26 | 2026-08-05 | الإصدار 1.3.27 أحدث من اللازم |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | 2026-07-16 | يوفّر أدوات (utilities) للخصائص المنطقية |
| typescript | 5.9.3 | 2025-09-30 | ليس 7.0.2: فـ TS 7 هو المترجم الأصلي (native) الجديد، وقالب Payload نفسه ما زال يثبّت 5.7.3 |
| eslint | 9.39.5 | 2026-07-10 | ليس 10.x. يستخدم قالب Payload الإصدار ESLint 9، ومنظومة الإضافات مجرَّبة عليه |
| eslint-config-next | 16.3.8 | 2026-09-30 | |
| prettier | 3.9.9 | 2026-09-23 | |
| zod | 4.6.5 | 2026-09-13 | التحقق من صحة البيانات على الخادم |
| sharp | 0.35.5 | 2026-09-27 | معالجة الصور في Payload |
| @fontsource-variable/ibm-plex-sans, @fontsource/ibm-plex-sans-arabic | 5.3.0 | 2026-07-19 | تُستخدم فقط للحصول على ملفات woff2. وتُنسخ هذه الملفات إلى `src/fonts` |
| vitest | 5.0.3 | 2026-09-30 | |
| @playwright/test | 1.63.0 | 2026-09-04 | يُتحقَّق في المرحلة 2 من توافقه مع Chromium المثبَّت مسبقًا |
| @axe-core/playwright | 4.13.0 | 2026-08-11 | |
| @lhci/cli | 0.15.1 | 2025-06-25 | Lighthouse CI |
| Docker: postgres | 18.6-alpine3.24 | الصورة: 2026-09-21 | |
| Docker: محاكي S3 (للتطوير فقط) | SeaweedFS، ويُثبَّت وسم الإصدار في المرحلة 2 | — | لم يعد `minio/minio` موجودًا على Docker Hub |
| Docker: caddy (للإنتاج) | 2.x، ويُثبَّت الوسم الدقيق في المرحلة 2 | — | TLS ووكيل عكسي (reverse proxy) |

كيف تُطبَّق قاعدة الأيام الـ14:

- يضبط `.npmrc` القيمتين `save-exact=true` و`engine-strict=true`. إصدارات دقيقة فقط: لا `^` ولا `~`.
- يُجرى التثبيت بالأمر `npm install --before=<today−14d>`. وبهذا يسري الحد الزمني على التبعيات **غير المباشرة (transitive)** أيضًا، لا على المباشرة وحدها.
- يُودَع `package-lock.json` في المستودع. ويُثبِّت Docker وCI الحزم بالأمر `npm ci`.
- يطابق `scripts/check-release-age.mjs` كل مُدخل في ملف القفل (lockfile) مع تواريخ النشر في السجل. ويعمل في CI وقبل اعتماد كل مرحلة.

## 3. البنية المعمارية

</div>

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

<div dir="rtl">

- **تطبيق واحد.** يعمل Payload 3 داخل Next.js. ويقع الموقع وواجهة الإدارة في مجموعتَي مسارات (route groups) منفصلتين، لكلٍّ منهما تخطيط جذري (root layout) خاص به.
- **العرض (Rendering).** تُولَّد كل صفحة عامة توليدًا ثابتًا لكل لغة (`generateStaticParams` + `setRequestLocale`). وتستدعي خطافات `afterChange`/`afterDelete` في Payload الدالة `revalidateTag`، فتظهر التعديلات على الموقع خلال ثوانٍ دون إعادة بناء.
- **الوصول إلى البيانات.** تقرأ مكوّنات الخادم (server components) البيانات عبر **Local API** في Payload: دون أي طلب HTTP وسيط، ومع أنواع بيانات (types) مُعرَّفة عبر `payload-types.ts`. وتوجد جميع الاستعلامات في `src/lib/cms/queries.ts`، وهي موسومة لإعادة التحقق (revalidation).
- **الوسائط.** تُخزَّن عبر `@payloadcms/storage-s3`. وتُقدَّم الملفات عبر مسار Payload الخاضع للتحكم في الوصول، فتبقى حاوية التخزين (bucket) خاصة، وتبقى سياسة CSP مقتصرة على المصدر نفسه (same-origin). ويتولى `next/image` التحسين والتخزين المؤقت.
- **النماذج.** إجراءات خادم (Server Actions) مع تحسين تدريجي (progressive enhancement): تعمل دون JavaScript. وتكتب البيانات عبر Local API بعد التحقق من صحتها.

## 4. المسارات

تأتي المسارات المترجمة من إعداد `pathnames` في next-intl. الألمانية هي اللغة الافتراضية، ولا بادئة لها.

| الصفحة | de (الافتراضية) | en | ar |
|---|---|---|---|
| الرئيسية | `/` | `/en` | `/ar` |
| من نحن | `/ueber-uns` | `/en/about` | `/ar/about` |
| المشاريع | `/projekte` | `/en/projects` | `/ar/projects` |
| تفاصيل المشروع | `/projekte/[slug]` | `/en/projects/[slug]` | `/ar/projects/[slug]` |
| الأخبار | `/aktuelles` | `/en/news` | `/ar/news` |
| تفاصيل الخبر | `/aktuelles/[slug]` | `/en/news/[slug]` | `/ar/news/[slug]` |
| العضوية | `/mitglied-werden` | `/en/membership` | `/ar/membership` |
| الدعم | `/unterstuetzen` | `/en/support` | `/ar/support` |
| التواصل | `/kontakt` | `/en/contact` | `/ar/contact` |
| بيانات الناشر (Impressum) | `/impressum` | `/en/legal-notice` | `/ar/legal-notice` |
| الخصوصية | `/datenschutz` | `/en/privacy` | `/ar/privacy` |
| 404 | أي مسار غير معروف، بلغة البادئة الخاصة به |||
| الإدارة | `/admin` (غير مترجَم، `noindex`) |||
| واجهة API | `/api/*` (Payload REST) |||
| تحسين محركات البحث (SEO) | `/sitemap.xml` (مع بدائل hreflang)، `/robots.txt` |||

- **المسارات العربية تستخدم معرّفات نصية (slugs) لاتينية.** عند مشاركة عناوين URL العربية تُرمَّز بترميز النسبة المئوية (`/ar/%D8%B9%D9%86…`)، مما يجعل قراءتها أو كتابتها أو نطقها صعبًا. أما محتوى الصفحة فعربي بالكامل.
- **معرّف (slug) واحد مشترك لكل مشروع/خبر.** المعرّف لاتيني، يُولَّد تلقائيًا من العنوان الألماني، ويمكن تعديله. وبذلك يصبح الربط في مبدّل اللغة وفي hreflang ربطًا واحدًا لواحد (1:1).
- **مبدّل اللغة.** يربط بالصفحة نفسها في اللغة الأخرى. وفي صفحات التفاصيل يربط بالمستند نفسه (المعرّف نفسه).

## 5. شجرة الملفات

</div>

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

<div dir="rtl">

## 6. نماذج البيانات (Payload)

**إعدادات تعدد اللغات:** اللغات `de` (الافتراضية) و`en` و`ar` (`rtl: true`، فتُحرَّر الحقول العربية من اليمين إلى اليسار). وواجهة الإدارة نفسها متاحة بالألمانية والإنجليزية والعربية.

**قاعدة تعدد اللغات:** كل حقل نصي بلغة بشرية يكون متعدد اللغات (مُعلَّم أدناه بـ **L**). أما المعرّفات فليست متعددة اللغات: المعرّف النصي (slug)، والبريد الإلكتروني، وURL، وIBAN، والأرقام، والتواريخ. وأسماء الأشخاص والمنظمات متعددة اللغات لكنها اختيارية في كل لغة، فيمكن كتابة الاسم بالحروف العربية في `/ar`.

**النصوص المؤقتة (placeholders):** يملأ سكربت التعبئة الأولية (seed) العناصر العامة (globals) بنص `[PLACEHOLDER: …]` في اللغات الثلاث جميعها. وتبدأ المجموعات (collections) **فارغة**: لا مشاريع ولا أخبار ولا أشخاص ولا أرقام تجريبية. وتُعرَض الأقسام الفارغة بحالة فراغ محايدة أو تُخفى.

### المجموعات (Collections)

**Users** (المصادقة، في واجهة الإدارة فقط)
- `name`، `email`، `password`، `role`: `admin` | `editor` | `board`
- الصلاحيات: لا ينشئ المستخدمين أو يحذفهم أو يغيّر الأدوار إلا `admin`. لا يوجد تسجيل عام. ويُنشئ `seed.ts` أول مدير من متغيرات البيئة (env).
- المصادقة: `maxLoginAttempts: 5`، `lockTime: 15 min`، وجلسة مدتها ساعتان (2 h)، وملف تعريف الارتباط (cookie) بالخصائص `Secure` + `HttpOnly` + `SameSite=Strict`. والحد الأدنى لطول كلمة المرور 12 حرفًا، ويتحقق منه خطاف (hook).

**Media** (الرفع إلى S3)
- الحقل `alt` **L** إلزامي ما لم يُحدَّد خيار `decorative`. وتُعرَض الصور الزخرفية بـ `alt=""`، فلا يُدفَع المحررون أبدًا إلى كتابة نص بديل لا قيمة له.
- الحقلان `caption` **L** و`credit` (المصوّر/صاحب الحقوق)، ونقطة التركيز (focal point)
- المقاسات: 480 / 768 / 1280 / 1920 px، إضافة إلى مقاس OG بأبعاد 1200×630
- الأنواع المسموح بها: JPEG، PNG، WebP، AVIF. **لا يُسمح برفع ملفات SVG**، لأن SVG قد يحمل سكربتات. الحد الأقصى 10 MB.
- يُعاد ترميز الملف الأصلي عبر sharp. وهذا **يزيل البيانات الوصفية EXIF/GPS**، فلا يمكن لصور الفعاليات أن تكشف المواقع.

**Projects** (مسودات + إصدارات)
- `title` **L**، `slug` (فريد، ومشترك بين اللغات)، `excerpt` **L** (≤ 300 حرف)
- `status`: مخطَّط له | جارٍ | مكتمل؛ `startDate`، `endDate?`، `location` **L**
- `focusAreas` → FocusAreas (متعدد)، `coverImage` → Media
- الحقل `body` **L**: نص منسَّق (rich text) بمحرر Lexical مع مجموعة ميزات محدودة (عناوين، قوائم، اقتباس، رابط، صورة). **لا محتوى مُضمَّن** (YouTube، الخرائط)، لأنه يستلزم طلبات إلى أطراف ثالثة.
- `gallery` → Media[]، `partners` → Partners[]
- المجموعة `seo`: `metaTitle` **L**، `metaDescription` **L**، `ogImage`
- `publishedAt`
- صلاحية القراءة العامة: للمستندات المنشورة فقط.

**News** (مسودات + إصدارات)
- `title` **L**، `slug`، `excerpt` **L**، `publishedAt` (إلزامي)، `coverImage`، `body` **L**، `relatedProjects` → Projects[]، `seo`

**FocusAreas**
- `title` **L**، `summary` **L**، `icon` (اختيار من مجموعة أيقونات ثابتة)، `order`
- التعبئة الأولية: العناوين الأربعة التي ذكرتموها (تمكين الشباب، بناء السلام، الاندماج، ريادة الأعمال لدى الشباب). أترجمها إلى de/ar لتراجعوها. وتبدأ الملخصات نصوصًا مؤقتة. انظر Q6.

**TeamMembers** (مجلس الإدارة في صفحة «من نحن»)
- `name` **L**، `position` **L** (مثلًا "1. Vorsitzende/r")، `group`: مجلس الإدارة | الفريق، `photo?`، `bio?` **L**، `order`
- الحقلان `publishConsent` (خانة اختيار) + `consentDate`. لا يُعرَض الشخص **إلا** إذا سُجِّلت موافقته.

**Statistics** (المصدر الوحيد للعدّادات)
- `label` **L**، `value` (رقم)، `prefix?` / `suffix?` **L**، `asOf` (تاريخ، إلزامي)، `source` (ملاحظة داخلية عن مصدر الرقم، إلزامية)، `showOnHome`، `order`
- لا يُعرَض قسم الإحصاءات إلا إذا وُجد مُدخل واحد على الأقل. ولا توجد أرقام افتراضية.

**Partners**
- `name` **L**، `logo?`، `url?`، `description?` **L**، `order`، `permissionConfirmed` (إلزامي قبل عرض أي شريك)

**MembershipApplications** (لا تُتاح للقراءة العامة أبدًا)
- حقول مستمدة من النظام الأساسي (يُرجى تأكيدها في Q4):

  | الحقل | إلزامي | السبب (النظام الأساسي) |
  |---|---|---|
  | `firstName`، `lastName` | نعم | المادة 3(1): العضوية للأشخاص الطبيعيين |
  | `ageConfirmed16` (أو `dateOfBirth`، انظر Q4a) | نعم | المادة 3(1): الحد الأدنى للسن 16 |
  | `street`، `postalCode`، `city`، `country` | نعم | المادة 7(3): تُرسَل الدعوات الكتابية إلى عنوان العضو |
  | `email` | نعم | المادة 7(16): تُرسَل بيانات الدخول بالبريد الإلكتروني |
  | `declarationPrinciples` (خانة اختيار) | نعم | المادة 2 + المادة 3(1): الالتزام بالمبادئ، والاستعداد لتعزيز الأهداف |
  | `feeAcknowledged` (خانة اختيار) | نعم | المادة 4: الرسوم وفق لائحة الاشتراكات، وتستحق في موعد أقصاه 31 يناير |
  | `privacyConsent` + `consentedAt` + `privacyPolicyVersion` | نعم | سجل الموافقة وفق اللائحة العامة لحماية البيانات (GDPR) |
  | `membershipType` | فقط إذا كانت Q4c = نعم | المادة 7(8) تذكر الأعضاء الداعمين |
  | المجموعة `guardianConsent` | فقط إذا كانت Q4b = نعم | المتقدمون بعمر 16–17 عامًا |

- **لا يُجمَع:** الهاتف، والجنس، والجنسية، والدين، والبيانات المصرفية (IBAN/SEPA)، ولا نص حر عن دافع الانضمام.
- حقول للإدارة فقط: `status` (مستلَم | مقبول | مرفوض)، `decidedBy`، `decisionDate`، `internalNotes`، `locale`، `submittedAt`.
- الصلاحيات: لا إنشاء ولا قراءة للعموم. يكتب إجراء الخادم (Server Action) عبر Local API. ويمكن لـ `board` و`admin` القراءة والتحديث؛ ولا يملك الحذف إلا `admin`.

**ContactMessages** (لا تُتاح للقراءة العامة أبدًا)
- `name`، `email`، `topic` (عام | العضوية | التطوع | الشراكة | الصحافة | أخرى)، `message` (≤ 5000 حرف)، `privacyConsent` + `consentedAt`، `locale`، `submittedAt`، `status` (جديدة | تم الرد عليها)
- تُحذف تلقائيًا بعد `[PLACEHOLDER: retention days]` بواسطة مهمة مجدولة.

**RateLimitBuckets** (مخفية في واجهة الإدارة)
- `key` = HMAC-SHA256(عنوان IP + اسم النموذج، سرّ يتجدد يوميًا)، `windowStart`، `count`، `expiresAt`
- لا تُخزَّن عناوين IP الخام أبدًا، ولا تُربط أبدًا بأي طلب مُرسَل. وتُحذف الصفوف منتهية الصلاحية.

### العناصر العامة (Globals)

| العنصر العام | الحقول (L = متعدد اللغات) |
|---|---|
| **SiteSettings** | `name` "Youth of Peace e.V."؛ `seat` "Erlangen"؛ `registerCourt` "Amtsgericht Fürth"؛ `registerNumber` "VR 201778"؛ `founded` 2013 / `foundedIn` **L** ("Jemen"، "Yemen"، "اليمن")؛ `tagline` **L**، `address`، `email`، `phone`، `chairman`: جميعها `[PLACEHOLDER]`؛ `socialLinks[]` (روابط بسيطة، دون أدوات مُضمَّنة)؛ `defaultSeo` **L** |
| **HomePage** | `hero` {`headline` **L**، `subline` **L**، `primaryCta`/`secondaryCta` (تسمية **L** + وجهة داخلية)}؛ `mission` **L** (جملة واحدة، ≤ 200 حرف)؛ `focusAreasIntro` **L**؛ `statsHeading` **L**؛ `newsHeading` **L**؛ `cta` {`heading` **L**، `text` **L**} |
| **AboutPage** | `intro` **L**؛ `story[]` {`year`، `title` **L**، `body` **L**} لقصة 2013 من اليمن إلى ألمانيا؛ `values[]` {`title` **L**، `description` **L**}؛ `boardIntro` **L** |
| **MembershipPage** | `intro` **L**، `whoCanJoin` **L**، `fees` **L** `[PLACEHOLDER: Beitragsordnung]`، `process` **L**، `formIntro` **L**، `successMessage` **L** |
| **SupportPage** | `volunteer` {`heading` **L**، `text` **L**}؛ `partner` {`heading` **L**، `text` **L**}؛ `donate` {`heading` **L**، `text` **L**، `bankDetails` {صاحب الحساب، IBAN، BIC، البنك} `[PLACEHOLDER]`، `taxStatusNote` **L** = `[PLACEHOLDER: tax status]`}. لا أرقام للتبرعات، ولا أداة دفع إلكتروني مضمَّنة |
| **ContactPage** | `intro` **L**، مفاتيح إظهار/إخفاء للعنوان والبريد الإلكتروني والهاتف، `officeHours?` **L**، `formIntro` **L**، `successMessage` **L** |
| **LegalNotice** (بيانات الناشر) | `content` **L** (نص منسَّق، قيمته الأولية `[PLACEHOLDER: Impressum per § 5 DDG]`، أي بيانات الناشر وفق المادة 5 من قانون الخدمات الرقمية)، `lastUpdated` |
| **PrivacyPolicy** | `content` **L** (قيمته الأولية `[PLACEHOLDER: Datenschutzerklärung]`، أي نص سياسة الخصوصية)، `version` (يُخزَّن مع كل موافقة في النماذج)، `lastUpdated` |

لن أكتب نصوصًا قانونية. سيقتصر `docs/privacy-notes.md` على **الحقائق التقنية** المتعلقة بالتنفيذ (تدفقات البيانات، والتخزين، ومدة الاحتفاظ، وملفات تعريف الارتباط: لا يوجد) بوصفها مُدخلًا لمن يتولى صياغة سياسة الخصوصية.

### المحتوى غير المترجَم

يرجع Payload إلى الألمانية عندما يكون محتوى لغة ما فارغًا. وعندئذٍ تقوم الصفحة بما يلي:
- تَسِم الكتلة البديلة (المعروضة بالألمانية) بـ `lang="de" dir="ltr"`، لكي تبقى قارئات الشاشة وتخطيط RTL صحيحة
- تعرض إشعارًا قصيرًا بلغة الزائر بأن هذا العنصر لم يُترجَم بعد
- لا تُدرج بدائل hreflang إلا للغات التي تتوفر لها ترجمة فعلًا

## 7. تعدد اللغات (i18n) والاتجاه من اليمين إلى اليسار (RTL)

- **التوجيه في next-intl:** `localePrefix: 'as-needed'`، `localeDetection: false`، `localeCookie: false`. النتيجة: **صفر ملفات تعريف ارتباط للزوار**، ولا عمليات إعادة توجيه مفاجئة. واختيار اللغة صريح، عبر مبدّل اللغة.
- `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
- **الاقتصار على CSS المنطقي.** أدوات Tailwind v4 المنطقية (`ms-`، `me-`، `ps-`، `pe-`، `start-`، `end-`، `text-start`، `border-s`، `rounded-s`). يُفشِل `check-logical-css.mjs` فحص lint عند وجود فئات فيزيائية (physical classes). وتنقلب الأيقونات الاتجاهية (الأسهم، وعلامات الشيفرون) عبر `rtl:-scale-x-100`.
- **خطوط مستضافة ذاتيًا** عبر `next/font/local`: IBM Plex Sans (متغيّر، لاتيني) وIBM Plex Sans Arabic (400/500/700). كلاهما من العائلة الخطية نفسها، فتتطابق المقاييس بين أنظمة الكتابة. ولا يُحمَّل مسبقًا إلا خط اللغة الحالية، مع `font-display: swap`. وتحصل العربية على ارتفاع سطر أكبر عبر رمز تصميم (token) لـ `:lang(ar)`.
- **يُقسَّم النص العربي على مستوى الكلمات، لا الحروف أبدًا.** فتقسيم الحروف يكسر اتصال الحروف العربية.
- **تحسين محركات البحث (SEO):** `alternates.languages` لـ de/en/ar إضافة إلى `x-default` (الألمانية)، في كل صفحة وفي خريطة الموقع (sitemap).
- **مبدّل اللغة:** يُكتب اسم كل لغة بلغتها نفسها ويُوسَم بما يناسبها (`Deutsch`، `English`، `<span lang="ar">العربية</span>`). ويستخدم `hreflang` على الروابط. ولا أعلام.

## 8. رموز التصميم (مقيسة من الشعار)

ألوان الهوية، مقيسة: الفيروزي **#1B9C9B** والكحلي **#04324E** من ملف الشعار (PNG)؛ والأزرق السماوي **#8BB7E0** والسماوي الفاتح **#CFE1F1** من ترويسة النظام الأساسي (تأكد أنها من ألوان الهوية، س3).

**مشكلة التباين:** لا يبلغ فيروزي الهوية سوى **3.35:1 على الأبيض**. وهذا لا يستوفي معيار WCAG AA لنص المتن، ولا يستوفيه النص الأبيض على زر فيروزي. لذلك تفصل الرموز بين فيروزي *الهوية* (للزخرفة) ولون *تمييز آمن للنصوص*. القيم النهائية (المرحلة 2)، وكلها يفحصها `scripts/check-contrast.mjs` (54 زوجًا، ضمن `npm run lint`):

| الرمز | الوضع الفاتح | التباين | الوضع الداكن | التباين |
|---|---|---|---|---|
| `canvas` | #FFFFFF | — | #03243A | — |
| `surface` | #E8F4F6 | — | #06304B | — |
| `surface-sky` | #CFE1F1 | — | #0B3A5C | — |
| `ink` (النص) | #04324E | 13.36 / 11.90 / 9.99 | #E6F2F4 | 13.95 / 11.99 / 10.36 |
| `ink-muted` | #3E5A6B | 7.29 / 6.49 / 5.45 | #A7C1CD | 8.47 / 7.28 / 6.29 |
| `accent` (الروابط والأزرار) | #0D6867 | 6.58 / 5.86 / 4.91 | #4CC4C2 | 7.58 / 6.52 / 5.63 |
| `accent-hover` | #0A5453 | 8.73 / 7.77 / 6.52 | #7FD6D4 | 9.47 / 8.14 / 7.03 |
| `on-accent` (نص الأزرار) | #FFFFFF | 6.58 على accent | #03243A | 7.58 على accent |
| `line-strong` (حدود حقول النماذج) | #5E7D8C | 4.39 / 3.91 / 3.28 | #6A90A4 | 4.66 / 4.01 / 3.46 |
| `focus` (حلقة 2px مع إزاحة) | #0D6867 | ≥ 4.91 | #4CC4C2 | ≥ 5.63 |
| `danger` | #B3261E | 6.54 / 5.82 / 4.88 | #F2B8B5 | 9.34 / 8.03 / 6.93 |
| `success` | #1E6B45 | 6.47 / 5.76 / 4.84 | #7FD8A6 | 9.32 / 8.01 / 6.92 |
| `brand` (زخرفة، أيقونات، نص ≥ 24px) | #1B9C9B | 3.35 على canvas فقط | #1B9C9B | 4.76 |
| `sky` و`sky-light` و`line` | للزخرفة فقط | — | للزخرفة فقط | — |

القيم الثلاث للتباين هي على canvas / surface / surface-sky بالترتيب. جرى تغميق لون التمييز عن المسودة الأولى (#0F6F6E) لأن تلك القيمة لم تبلغ سوى 4.46:1 على الأزرق الفاتح.

- أُزيلت لوحة الألوان الافتراضية في Tailwind، فلا يمكن في الشيفرة استخدام غير هذه الرموز.
- **يتبع المظهر إعداد نظام التشغيل** (`prefers-color-scheme`). لا يوجد زر تبديل، فلا يُخزَّن شيء على جهاز الزائر. يمكن إضافة زر لاحقًا.

## 9. بنية الحركة

**حلقة واحدة.** يعمل Lenis مع `autoRaf: false`، ويقوده `gsap.ticker`. ويُبقي `lenis.on('scroll', ScrollTrigger.update)` و`gsap.ticker.lagSmoothing(0)` الاثنين متزامنَين. وتشترك خلفية canvas كذلك في `gsap.ticker`. ولا يبدأ أي مكوّن حلقة `requestAnimationFrame` خاصة به.

**تقليل الحركة** (يُفحَص مباشرةً عبر `matchMedia`، فيسري أي تغيير دون إعادة تحميل):
- لا يُنشأ Lenis؛ ويكون التمرير أصليًا (native).
- تعمل كل حركة داخل `gsap.matchMedia()`. وفي فرع الحركة المخفَّضة تنتقل العناصر مباشرة إلى حالتها النهائية.
- تعرض العدّادات القيمة النهائية، ولا تُرسَم خلفية canvas.
- لا تأثير اختلاف المنظر (parallax) ولا تثبيت (pinning)، في أي مكان من الموقع، وفي كلا الوضعين.

**التنظيف.** يستخدم كل مكوّن متحرك `useGSAP(fn, { scope })`، فيُعاد سياق GSAP الخاص به إلى حالته الأصلية عند إزالة المكوّن (unmount)، وهذا يشمل تغيّر المسار. وعند التنقل، يعيد `SmoothScroll` ضبط موضع التمرير، ويراعي أهداف `#hash`، ويستدعي `ScrollTrigger.refresh()` بعد رسم الصفحة الجديدة. ويُدمَّر مثيل Lenis عند إزالة المزوِّد (provider).

**الانعكاس في RTL.** يُصدِّر `src/lib/motion/direction.ts` الدالة `dirX(dir, n)`، التي تعكس إشارة `n` في RTL. وتوجد جميع الإعدادات المسبقة (`fadeUp`، `slideInStart`، `stagger`) في `presets.ts`، وتأخذ `dir`. ويُنبّه فحصُ lint إلى القيم الحرفية الخام `x:`/`xPercent:` خارج `presets.ts`.

**لا محتوى غير مرئي عند غياب JavaScript.** يكون HTML القادم من الخادم مرئيًا بالكامل. ويضيف سكربت مضمَّن صغير `class="js"` قبل الرسم الأول، ولا تُطبَّق حالة «ما قبل الظهور» (pre-reveal) المخفية إلا في ظل `.js` و`prefers-reduced-motion: no-preference`.

**حماية LCP.** العنوان الرئيسي في القسم الافتتاحي (hero) هو على الأرجح عنصر LCP، لذا **لا يُخفى حتى اكتمال الترطيب (hydration)** (فذلك سيُهبط درجة Performance على الجوال). وتحرّك المقدمةُ العنوانَ الفرعي وأزرار الدعوة إلى الإجراء (CTAs) والخلفية. وإذا أظهر Lighthouse أن تأثير تقسيم النص (split-text) في العنوان يؤخر LCP، يتحول العنوان إلى حركة CSS عند الرسم الأول، ويتولى GSAP الباقي.

**قائمة الحركات** (جميعها قصيرة: ≤ 0.8 ثانية، `power2.out`، وتُشغَّل مرة واحدة):
- مقدمة القسم الافتتاحي (hero)
- ظهور الأقسام بالتلاشي/الانزلاق إلى الأعلى عند دخولها منطقة العرض
- ظهور البطاقات بالتتابع (0.08 ثانية)
- العدّادات
- إضاءة موضعية (spotlight) على البطاقة عند مرور المؤشر (فقط على الأجهزة ذات المؤشر الدقيق)

**مكونات React Bits** (أربعة مكونات، منسوخة إلى `src/components/reactbits`، مُعرَّفة الأنواع (typed)، وتستخدم رموز التصميم الخاصة بنا):

| المكوّن | الاستخدام | التكييف |
|---|---|---|
| SplitText | العنوان الرئيسي في القسم الافتتاحي | تقسيم على مستوى الكلمات فقط (آمن للعربية). `aria-label` على العنصر المغلِّف و`aria-hidden` على الأجزاء (GSAP SplitText `aria: 'auto'`). الإزاحات الاتجاهية عبر `dirX` |
| Waves | خلفية القسم الافتتاحي | Canvas 2D: دون WebGL، ودون تبعية إضافية. خطوط فيروزية رفيعة تحاكي الرسم الخطي في الشعار. يقوده `gsap.ticker`، ويتوقف مؤقتًا عندما يكون خارج الشاشة أو يكون التبويب مخفيًا، وبكثافة أقل على الشاشات الصغيرة، `aria-hidden` |
| CountUp | الإحصاءات | يُعاد تنفيذه على GSAP (الأصل يستخدم مكتبة `motion`، ولن أضيف مكتبة حركة ثانية). يحتوي HTML القادم من الخادم القيمة النهائية مسبقًا؛ والأرقام المتحركة `aria-hidden` بجوار قيمة نهائية مخصصة لقارئات الشاشة فقط؛ و`Intl.NumberFormat` لكل لغة |
| SpotlightCard | بطاقات المشاريع/الأخبار | خصائص CSS مخصّصة (custom properties)، دون تبعية. فقط في ظل `(hover: hover) and (pointer: fine)`. وتنسيق التركيز مستقل عن التأثير |

**التراخيص:**
- يُتاح GSAP مجانًا، بما في ذلك جميع إضافاته، بموجب ترخيصه القياسي. وهذا مناسب لهذا الموقع.
- ترخيص React Bits هو **MIT + Commons Clause**. يُسمح باستخدام المكونات «كجزء من تطبيق أو موقع ويب أو منتج» ("as part of an application, website, or product") شريطة الإبقاء على إشعار حقوق النشر (في `reactbits/LICENSE.md`). ويحظر الترخيص «إعادة توزيع المكونات نفسها» ("redistributing the components themselves"). **هذا المستودع عام**، فسيكون الكود المنسوخ قابلًا للتنزيل على GitHub، وهذه منطقة رمادية. انظر Q1.

## 10. النماذج والخصوصية

**إجراءات الخادم (Server Actions) + zod.** التحقق على الخادم هو المرجع الحاسم. وتعمل النماذج دون JavaScript.

**الحماية من الرسائل المزعجة دون reCAPTCHA:**
- حقل **مصيدة (honeypot)**: خارج الشاشة، `tabindex="-1"`، `autocomplete="off"`، `aria-hidden`.
- **رمز ختم زمني (timestamp token)** موقَّع بـ HMAC يرفض عمليات الإرسال الأسرع من 3 ثوانٍ أو الأقدم من 24 ساعة.
- تتلقى البرامج الآلية (bots) استجابة نجاح زائفة، فلا تعرف شيئًا.

**تحديد معدل الطلبات (rate limiting)** في Postgres (دون Redis):
- لكل نموذج: 5 عمليات إرسال كل 10 دقائق، و20 في اليوم، لكل عنوان IP مُجزَّأ (hashed).
- لا يُقرأ عنوان IP الخاص بالعميل إلا من `X-Forwarded-For` الصادر عن الوكيل الموثوق.
- ويحمي المحدِّد نفسه مسار تسجيل الدخول في Payload.

**الموافقة:**
- خانة الموافقة غير محدَّدة افتراضيًا، وإلزامية، وتتضمن رابطًا إلى صفحة الخصوصية باللغة الحالية.
- يُخزَّن وقت الموافقة وإصدار سياسة الخصوصية مع كل عملية إرسال.

**نماذج سهلة الوصول:**
- تسميات (labels) لكل حقل؛ `aria-describedby` للتلميحات والأخطاء؛ `aria-invalid`.
- عند الفشل، ينتقل التركيز إلى ملخص الأخطاء.
- يُعلَن النجاح في منطقة حيّة (live region).

**موقع البيانات والبريد الإلكتروني:**
- تُخزَّن البيانات المرسَلة **في قاعدة Postgres الخاصة بنا فقط** (منطقة الاتحاد الأوروبي).
- رسالة الإشعار الاختيارية المرسَلة إلى الجمعية بالبريد الإلكتروني **لا تحتوي على أي بيانات شخصية**: فقط «وصل طلب جديد» ورابط إلى واجهة الإدارة.
- يُحسَم في المرحلة 5 ما إذا كان المتقدمون سيتلقون رسالة تأكيد بالبريد الإلكتروني.

**الاحتفاظ بالبيانات:** تحذف مهمة مجدولة في Payload رسائل التواصل والطلبات المرفوضة بعد `[PLACEHOLDER]` يومًا (Q7).

**لا ملفات تعريف ارتباط للزوار:**
- ملف تعريف الارتباط الخاص بـ next-intl معطَّل، ولا توجد أدوات تحليلات، ولا يُخزَّن المظهر.
- ملف تعريف الارتباط الوحيد هو ملف المصادقة الخاص بـ Payload، ويُضبط **بعد تسجيل دخول محرر إلى /admin** (ضروري حتمًا، HttpOnly، Secure، SameSite=Strict).
- يوثّق `docs/privacy-notes.md` ذلك بوصفه الأساس التقني لعبارة «لا حاجة إلى شريط موافقة (banner)». وهذا التعليل مُدخل لمراجعتكم القانونية، وليس استشارة قانونية.

**لا طلبات إلى أطراف ثالثة أثناء التشغيل:**
- الخطوط مستضافة ذاتيًا، ولا توجد شبكات توصيل محتوى (CDN)، ولا محتوى مُضمَّن، ولا خرائط، ولا أدوات شبكات اجتماعية أو أدوات دفع مضمَّنة.
- حقول `code`/`json` في Payload **غير مستخدمة**: فمحررها (Monaco) يُحمَّل من CDN افتراضيًا. وسأتحقق في المرحلة 5 مما يفعله Payload 3.90 فعليًا.

## 11. الأمان

**الترويسات (Headers)** (`next.config.ts`، مع نسخة مطابقة في Caddy):
- **سياسة CSP:** `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`
- **سياسة HSTS:** `max-age=31536000; includeSubDomains`. لا `preload` إلى أن تقرروا؛ إذ يصعب التراجع عنه.
- `X-Frame-Options: DENY`، `X-Content-Type-Options: nosniff`، `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- يُتحقَّق من سياسة CSP الخاصة بـ `/admin` على حدة في المرحلة 5.

**لماذا لا نعتمد CSP قائمة على nonce؟** في Next.js، يفرض استخدام nonce لكل طلب **عرضَ كل صفحة ديناميكيًا**. وهذا يعني التخلي عن HTML الثابت والتخزين المؤقت، ويضر بنتائج Lighthouse. والخطر المتبقي من `'unsafe-inline'` منخفض هنا: لا سكربتات من أطراف ثالثة، ولا HTML يقدّمه المستخدمون (يُعرَض النص المنسَّق كعناصر React، ولا يُستخدم `dangerouslySetInnerHTML` أبدًا). وإذا فضّلتم أقصى درجات الصرامة في CSP على الصفحات الثابتة، فسأنتقل إلى nonces.

**في Payload:**
- يُعطَّل GraphQL؛ ويُقصَر CORS وCSRF على مصدرنا (origin) فقط.
- يتكون `PAYLOAD_SECRET` من ≥ 32 بايتًا عشوائيًا تُؤخذ من البيئة.
- قفل تسجيل الدخول، وجلسات قصيرة، وقاعدة كلمة المرور (القسم 6)؛ ولا تسجيل عام.
- **المصادقة الثنائية (2FA):** لا يتضمن Payload دعمًا مدمجًا لـ TOTP. في المرحلة 5 سأقيّم إضافةً (plugin) تخضع للصيانة وفق قواعد الإصدارات. وإن لم تستوفِ أي إضافة الشروط، فسأوثّق حلًّا اختياريًا: قائمة سماح بعناوين IP في Caddy أو مصادقة أساسية (basic auth) أمام `/admin`.

**التشغيل:**
- تعمل الحاوية بمستخدم غير جذري (non-root)، مع `npm ci` و`--omit=dev` في صورة التشغيل، ومخرجات Next المستقلة (standalone).
- لا يكون Postgres مكشوفًا على الإنترنت.
- يُستثنى `.env*` عبر gitignore، ولا يحوي `.env.example` إلا قيمًا مؤقتة.
- يعمل `npm audit --omit=dev` وفحص عمر الإصدارات في CI.

## 12. إمكانية الوصول والأداء

**إمكانية الوصول (WCAG 2.1 AA):**
- معالم الصفحة (landmarks)، ورابط تخطٍّ (skip link)، و`h1` واحد لكل صفحة، وترتيب صحيح للعناوين.
- خصائص `lang` على المقاطع متعددة اللغات.
- حلقة تركيز مرئية مأخوذة من رموز التصميم.
- قائمة الجوال: حصر التركيز (focus trap)، ويغلقها مفتاح Esc، و`aria-expanded`.
- أهداف لمس ≥ 44px؛ إعادة تدفق المحتوى (reflow) عند 320px؛ تكبير النص 200%.

**الأداء:**
- محتوى HTML ثابت، مع JavaScript على جهة العميل في جُزُر صغيرة فقط (الحركة، النماذج، القائمة).
- لا WebGL.
- استخدام `next/image` مع AVIF/WebP و`sizes` صحيحة؛ ولا تحصل على `priority` إلا صورة القسم الافتتاحي.
- خطوط مُجتزأة (subset)، تُحمَّل مسبقًا حسب اللغة.

**التدقيقات (المرحلة 6):**
- تدقيق axe عبر Playwright على كل صفحة × 3 لغات × 2 مظهر.
- تدقيق Lighthouse CI بملف تعريف الجوال: الأداء (Performance) ≥ 90، وإمكانية الوصول (Accessibility) ≥ 95.
- مراجعة يدوية بلوحة المفاتيح وقارئ الشاشة (قائمة تحقق NVDA/VoiceOver).

## 13. Docker والنشر

- **ملف Dockerfile:** متعدد المراحل (deps → build → runner) على `node:24.21.0-alpine`، بوسم دقيق. مخرجات مستقلة (standalone)، ومستخدم غير جذري، وفحص سلامة (healthcheck).
- **ملف docker-compose.yml (للتطوير):** Postgres 18.6 + SeaweedFS (بواجهة S3 API). يعمل التطبيق بالأمر `npm run dev` على الجهاز المضيف من أجل تحديث سريع؛ وتتوفر أيضًا نسخة تعمل داخل حاوية.
- **ملف docker-compose.prod.yml:** التطبيق + Postgres + Caddy (TLS تلقائي)، ووحدات تخزين مسمّاة (named volumes)، وروتين نسخ احتياطي عبر `pg_dump` إلى `[PLACEHOLDER: backup target]`.
- **الترحيلات (Migrations):** تُودَع ترحيلات Payload الخاصة بـ Postgres في المستودع، وتُشغَّل عند بدء الحاوية. ولا تستخدم قاعدة بيانات الإنتاج `push` للمخطط (schema) أبدًا.
- **الاستضافة:** منطقة الاتحاد الأوروبي، `[PLACEHOLDER: hosting + S3 provider]`. وجميع مزوّدي الخوادم الافتراضية الخاصة (VPS) وتخزين الكائنات (object storage) في ألمانيا أو الاتحاد الأوروبي مناسبون. ويحتاج كلٌّ منهم إلى اتفاقية معالجة البيانات بالتكليف (AV-Vertrag).

## 14. التحقق في كل مرحلة

تنتهي كل مرحلة بمخرجات فعلية للأوامر التالية:
- `npm run lint`: ESLint + فحص CSS المنطقي + فحص التباين
- `npm run typecheck`: `tsc --noEmit`
- `npm run build`
- `npm run test`: vitest
- `npm run check:deps`: فحص عمر الإصدارات

واعتبارًا من المرحلة 3، يُضاف أيضًا `npm run test:e2e` (Playwright + axe)، مع تشغيل التطبيق على Postgres. ويتوفر في هذه البيئة Docker 29.8 وأدوات Postgres. وإذا لم تتوفر خدمة Docker الخلفية (daemon) هنا، فسأشغّل Postgres مباشرة على النظام لإجراء الفحوص وأذكر ذلك.

## 15. القرارات التي اتخذتُها (يمكنكم إلغاء أيٍّ منها)

1. اعتماد Next 16.3.8 + Payload 3.90.2: أحدث زوج مضى على نشره ≥ 14 يومًا ومتوافق رسميًا.
2. اعتماد TypeScript 5.9.3 وESLint 9.39.5 بدلًا من TS 7 / ESLint 10.
3. مسارات مترجمة: معرّفات (slugs) ألمانية لـ de؛ ومعرّفات إنجليزية لـ en وar.
4. معرّف لاتيني واحد مشترك لكل مشروع/خبر.
5. تعرض العناصر غير المترجمة المحتوى الألماني، مُعلَّمًا بشكل صحيح، مع إشعار. ولا يُدرج hreflang إلا اللغات المترجمة.
6. لا كشف تلقائي للغة، ولا ملف تعريف ارتباط للغة، فلا يتلقى الزوار أي ملف تعريف ارتباط.
7. يتبع المظهر إعداد نظام التشغيل؛ دون مفتاح تبديل.
8. سياسة CSP ثابتة مع `'unsafe-inline'`، لتبقى الصفحات ثابتة وسريعة (مقارنةً بـ nonces).
9. الخطّان IBM Plex Sans + IBM Plex Sans Arabic.
10. تعطيل GraphQL؛ ولا حقول `code`/`json` في Payload.
11. نصوص الواجهة القصيرة (التسميات، رسائل الخطأ) في ملفات JSON الخاصة بـ next-intl؛ وكل المحتوى التحريري في نظام إدارة المحتوى (CMS).
12. استخدام SeaweedFS محاكيًا لـ S3 في بيئة التطوير؛ وPostgres 18.
13. التبرعات: بيانات التحويل المصرفي فقط. لا أداة دفع، ولا أرقام، ولا ادعاءات ضريبية.
14. لا محتوى مُضمَّنًا من أطراف ثالثة. وإذا احتجنا لاحقًا إلى فيديو أو خرائط، فستُسبَق بخطوة موافقة لا يُحمَّل فيها المحتوى إلا بالنقر (click-to-load).
15. لا تحمل رسائل الإشعار بالبريد الإلكتروني أي بيانات شخصية.
16. يُعاد ترميز الصور المرفوعة لإزالة بيانات EXIF/GPS.
17. يُنقل ملف `README.md` الحالي (دليل المساهمة بالعربية) دون تغيير إلى `CONTRIBUTING.md` في المرحلة 6، عند كتابة README بالألمانية/الإنجليزية.

## 16. الأسئلة المفتوحة

كل سؤال موسوم بالمرحلة التي تحتاج إلى إجابته. وحتى ذلك الحين تُستخدم نصوص مؤقتة.

- **السؤال Q1 (المرحلة 2): React Bits والمستودع العام.** يحظر الترخيص إعادة توزيع المكونات نفسها، وهذا المستودع عام. الخيارات:
  - (a) جعل المستودع خاصًا (موصى به)
  - (b) قبول المنطقة الرمادية
  - (c) الاستغناء عن React Bits وكتابة تأثيرات مكافئة من الصفر على GSAP
- **السؤال Q2 (المرحلة 3): الشعار.** هل الحمامة المرسومة بالخطوط في الملف المرفق هي الشعار الحالي؟ يُظهر النظام الأساسي نسخة أقدم بأشكال مملوءة. يُرجى تزويدنا بملف **SVG** (أو AI/EPS/PDF). فهو لازم لعرض حادّ الوضوح بكل المقاسات، ولنسخة للوضع الداكن، ولمقدمة اختيارية تُرسَم فيها الحمامة بالخطوط.
- **السؤال Q3 (المرحلة 2): الأزرق الفاتح.** هل هو من ألوان الهوية؟ إن كان كذلك، فيُرجى ذكر قيمته السداسية العشرية (hex). وإلا فسأشتق درجات فاتحة من الفيروزي والكحلي (مثل `--surface` الحالي #E8F4F6).
- **السؤال Q4 (المرحلة 5): نموذج العضوية.** يُرجى تأكيد الحقول الواردة في القسم 6، والإجابة عمّا يلي:
  - (a) السن: خانة اختيار «**عمري 16 عامًا على الأقل**» (بيانات أقل) أم تاريخ الميلاد؟
  - (b) هل يحتاج المتقدمون بعمر 16–17 عامًا إلى موافقة وليّ الأمر؟ هذا سؤال قانوني لمجلس إدارتكم أو لمستشاركم.
  - (c) هل ينبغي أن يتيح النموذج **العضوية الداعمة (Fördermitgliedschaft)**؟ تذكرها المادة 7(8)، لكن المادة 3 لا تعرّفها.
  - (d) مبالغ الرسوم من لائحة الاشتراكات.
- **السؤال Q5 (المرحلة 4): النصوص.** هل تأذنون لي بصياغة جملة الرسالة والقيم ونص صفحة «من نحن» انطلاقًا من صياغة المادة 2 من النظام الأساسي، مع تعليمها بوضوح كمسودات بانتظار موافقتكم؟ أم يبقى كل شيء `[PLACEHOLDER]`؟
- **السؤال Q6 (المرحلة 4): مجالات التركيز.** ذكرتم أربعة مجالات. وتذكر المادة 2 من النظام الأساسي أيضًا العمل التطوعي والتبادل بين الأجيال، والتثقيف الإعلامي والتدريب الصحفي، والتعاون مع المنظمة الأم في اليمن. ولا ترد «ريادة الأعمال لدى الشباب» في المادة 2. هل نُبقي على الأربعة أم نعدّلها؟
- **السؤال Q7 (المرحلة 5): الاحتفاظ بالبيانات والإشعارات.** مُدد الاحتفاظ برسائل التواصل والطلبات المرفوضة، والعنوان الذي يتلقى الإشعارات (مثلًا عنوان أمين السر).
- **السؤال Q8 (المرحلة 4): الأرقام في العربية.** الأرقام الغربية (0–9) أم الهندية-العربية (٠–٩)؟

## 17. مخرجات المراحل

| المرحلة | المُخرَج | تُعَدّ منجزة عندما |
|---|---|---|
| 2 | تشغيل Next + Payload + Postgres + S3 في Docker؛ توجيه next-intl لـ de/en/ar مع RTL؛ رموز التصميم + فحص التباين؛ خطوط مستضافة ذاتيًا؛ هيكل أولي لـ CI؛ فحص عمر الإصدارات | نجاح build/lint/typecheck؛ استجابة `/` و`/en` و`/ar` و`/admin`؛ عرض المخرجات |
| 3 | تخطيط اللغات، الترويسة/التذييل، قائمة التنقل للجوال، مبدّل اللغة، رابط التخطي؛ ticker مشترك بين Lenis وGSAP، الإعدادات المسبقة، تقليل الحركة، التنظيف عند تغيّر المسار | اختبارات e2e: يحافظ المبدّل على الصفحة المكافئة؛ `dir=rtl` في /ar؛ الحركات تنعكس؛ لا ScrollTriggers متسرّبة بعد التنقل |
| 4 | جميع أنواع الصفحات الـ11 + صفحة 404 بـ 3 لغات؛ ربط جميع المجموعات/العناصر العامة؛ تعبئة أولية بنصوص مؤقتة فقط؛ خطافات إعادة التحقق؛ مكونات React Bits | يُعرَض كل مسار بكل لغة؛ التحقق من حالات الفراغ؛ لا محتوى مختلَق (فحص النصوص المؤقتة) |
| 5 | نموذجا العضوية + التواصل، المصيدة (honeypot)، تحديد المعدل، سجلات الموافقة، مهمة الاحتفاظ بالبيانات، ترويسات الأمان، تحصين واجهة الإدارة، privacy-notes.md | اختبارات وحدة + e2e للتحقق من الصحة وتحديد المعدل والمصيدة؛ مخرجات فحص الترويسات |
| 6 | تدقيقات axe + Lighthouse للجوال مع الإصلاحات؛ README (DE + EN) يشمل النشر والنسخ الاحتياطي ودليل المحررين | Lighthouse: الأداء (Performance) ≥ 90، وإمكانية الوصول (Accessibility) ≥ 95 في الصفحات الأساسية؛ مع إرفاق التقارير |

## 18. سجل الإجابات والقرارات

أُجيب عنها في 2026-10-18 («نعم للجميع»). وحيثما لم تكفِ «نعم» للاختيار بين خيارين، ذُكر التفسير المعتمد، ويسهل تغييره.

| # | الإجابة | النتيجة المترتبة |
|---|---|---|
| Q1 | نعم: (a) جعل المستودع خاصًا | **إجراء مطلوب من المالك:** GitHub → Settings → General → Danger Zone → Change visibility → Private. لا يُودَع كود React Bits في المستودع إلا بعد أن يصبح المستودع خاصًا (مخطَّط له في المرحلة 4) |
| Q2 | الحمامة المرسومة بالخطوط هي الشعار الحالي؛ وسيُقدَّم ملف SVG | يُستخدم ملف PNG إلى أن يصل ملف SVG. وتنتظر المقدمةُ المرسومة بالخطوط وصولَ ملف SVG |
| Q3 | الأزرق الفاتح من ألوان الهوية | تُؤخذ درجات الأزرق الفاتح الخاصة بالهوية من ترويسة النظام الأساسي: **#8BB7E0** (sky) و**#CFE1F1** (sky-light). ويُفحَص تباينها في المرحلة 2 |
| Q4a | فُسِّرت على أنها الخيار الأول: خانة اختيار «عمري 16 عامًا على الأقل» | لا يُجمَع تاريخ الميلاد |
| Q4b | موافقة وليّ الأمر مطلوبة للمتقدمين بعمر 16–17 عامًا | يسأل النموذج: «هل عمرك أقل من 18 عامًا؟». فإن كانت الإجابة نعم، يطلب اسم وليّ الأمر وبريده الإلكتروني. أما *كيفية* الحصول على الموافقة (رابط تأكيد بالبريد الإلكتروني أم استمارة موقَّعة) فتُصمَّم في المرحلة 5؛ وأيّ طريقة للموافقة تكفي قانونيًا يحدده مجلس الإدارة |
| Q4c | إتاحة العضوية الداعمة | `membershipType`: عادية أو داعمة. ملاحظة لمجلس الإدارة: المادة 3 من النظام الأساسي لا تعرّف الأعضاء الداعمين بعد |
| Q4d | لم يُجَب عنه (يحتاج إلى المبالغ) | تبقى الرسوم `[PLACEHOLDER: Beitragsordnung]` |
| Q5 | يُسمح بصياغة النصوص انطلاقًا من المادة 2 من النظام الأساسي | تُعلَّم المسودات بوضوح بـ `[ENTWURF]` / `[DRAFT]` / `[مسودة]` بانتظار الموافقة |
| Q6 | الإبقاء على مجالات التركيز الأربعة | تمكين الشباب، بناء السلام، الاندماج، ريادة الأعمال لدى الشباب |
| Q7 | لم يُجَب عنه (يحتاج إلى أرقام وعنوان) | تبقى مُدد الاحتفاظ وعنوان الإشعارات نصوصًا مؤقتة |
| Q8 | فُسِّرت على أنها الخيار الأول: الأرقام الغربية (0–9) | يستخدم تنسيق الأرقام في العربية `ar-u-nu-latn`؛ والتحويل إلى الأرقام الهندية-العربية تغيير في سطر واحد |
| — | مطلوبة نسخة عربية من الخطة | `docs/PLAN.ar.md` |

## 19. ملاحظات تنفيذ المرحلة 2

انحرافات عن الخطة واكتشافات أثناء بناء المرحلة 2:

| الموضوع | ما حدث | النتيجة |
|---|---|---|
| ESLint | يصف ESLint الإصدار 9.39.5 الآن بأنه «لم يعد مدعومًا». والإصدار 10 لا تدعمه بعدُ الإضافات داخل `eslint-config-next` 16.3.8 (react وjsx-a11y وimport) | نبقى على 9.39.5 إلى أن تدعم إعدادات Next الإصدار 10. أداة تطوير فقط ولا تُشحن مع الموقع |
| التنبيهات الأمنية | وجد `npm audit` اثنتين وعشرين مشكلة في اعتماديات الإنتاج، مصدرها 4 حزم | فُرض **undici** 7.29.1 بدل 7.29.0 و**dompurify** 3.4.16 بدل 3.4.15 عبر `overrides` (عمر الإصلاحين ≥ 14 يومًا). أما **braces** (لا يوجد إصلاح) و**esbuild 0.18** (خادم التطوير الخاص به لا يُستخدم) فرُوجعا وقُبلا حتى 2026-11-30 في `scripts/audit-allowlist.json`؛ ويفشل `npm run check:audit` عند أي تنبيه جديد أو قبول منتهٍ |
| نصوص التثبيت في npm | يمنع npm 11.19 نصوص تثبيت الحزم ما لم تُعتمد | لا حاجة إلى أي منها (كل الملفات الثنائية تأتي جاهزة)، فبقيت ممنوعة |
| صورة Docker الأساسية | حُذفت `libc6-compat`: كل حزمة أصلية تأتي بنسخة musl | صورة أصغر وجلب شبكي أقل |
| بناء Docker خلف وسيط يفحص TLS | سرّ BuildKit اختياري `extra_ca` لخطوة `npm ci` | لا يُستخدم في البناء العادي، ولا يُخزَّن أبدًا في طبقة من الصورة |
| GitHub Actions | مثبّتة ببصمة الإيداع (SHA): `actions/checkout` v7.0.1 و`actions/setup-node` v7.0.0 (الإصدار v7.1.0 أحدث من اللازم) | |
| مستويات السجل في Payload | يطابق `loggingLevels` الأخطاء باسم الصنف، وهذا الاسم يُختصر في نسخة الإنتاج، فلا أثر للإعداد هناك. يُسجَّل طلب `GET /api/users` المجهول (403) كخطأ ERROR | يُعاد النظر فيه في المرحلة 5 مع تحديد معدل الطلبات والسجلات |
| الاتجاه من اليمين لليسار | في النص العربي ظهر «Youth of Peace e.V.» بالشكل «.Youth of Peace e.V» | يعزل المكوّن `OrgName` الاسمَ بالوسم `<bdi>`، ويستخدم عنوان الصفحة العربية محارف العزل في Unicode. يغطي ذلك اختبار وحدة |
| صفحة 404 | المسارات غير المعروفة تعرض حاليًا صفحة 404 الافتراضية من Next دون `lang`/`dir` | صفحة 404 مترجمة باللغات الثلاث في المرحلة 4 كما هو مخطط |

## 20. ملاحظات تنفيذ المرحلة 3

| الموضوع | ما حدث | النتيجة |
|---|---|---|
| الشعار | إلى أن يصل ملف SVG، قُصَّت علامة الحمامة من ملف PNG المرسل، والاسم نص HTML حقيقي (حاد، تقرؤه برامج قراءة الشاشة، وواضح في الوضع الداكن). وأيقونة المتصفح وأيقونات التطبيق مولّدة من العلامة | تُستبدل `src/assets/logo/yop-mark.png` والأيقونات عند وصول SVG. ولا تُعكس العلامة أبدًا في اتجاه RTL |
| صفحات 404 | يستجيب Next.js 16.3.8 لـ `notFound()` بالحالة **404** وغلاف فارغ، ثم يعرض المتصفح صفحة 404 المترجمة (الترويسة والتذييل و`lang`/`dir`). أُعيد إنتاج ذلك في تطبيق Next.js أساسي مصغّر، فهو سلوك الإطار لا شيفرة هذا المشروع. جُرّب `global-not-found` وتخطيط جذري تمريري ولم يغيّرا شيئًا | الحالة 404 والصفحة الظاهرة صحيحتان مع JavaScript. ومن دون JavaScript تظهر صفحة 404 فارغة. يُعاد الفحص عند ترقية Next.js |
| ربط الخادم المستقل | مع `HOSTNAME=127.0.0.1` تبدو إعادات الكتابة الداخلية في next-intl خارجيةً لـ Next، فيدور كل رابط ألماني بلا بادئة في حلقة (307 إلى نفسه). ومع `0.0.0.0` (الافتراضي في Docker) يعمل كل شيء، حتى خلف وسيط عكسي بترويسة `Host` عامة | يُربط الخادم المستقل دائمًا بـ `0.0.0.0`، ويُقيَّد الوصول بالشبكة أو الجدار الناري. موثّق في `docs/development.md`، وخادم اختبارات e2e يرتبط بـ `0.0.0.0` |
| مبدّل اللغة | تضيف next-intl البادئة `/de` لروابط اللغة الافتراضية (لتحديث ملف تعريف الارتباط الخاص باللغة، وهذا الموقع لا يستخدمه) | تُبنى روابط المبدّل من `getPathname()`، المصدر نفسه لبدائل hreflang، فتكون الروابط الألمانية قياسية (`/ueber-uns`). يغطيها اختبار e2e |
| تخطيط اللغة | الإعداد `dynamicParams = false` في تخطيط `[locale]` الجذري تَرِثه المقاطع الفرعية، فحجب مسار 404 الشامل | أُزيل؛ والتخطيط يتحقق من اللغة بـ `notFound()` |
| ترويسة الجوال | أظهرت اللقطات زر العضوية في ترويسة الهاتف (الصنف `hidden` خسر أمام `inline-flex` الخاص بالزر) | أُصلح بغلاف، وصار اختبار e2e يفحص ترويسة الهاتف (لا زر، الاسم في سطر واحد، لا تمرير أفقي) |
| بيئة تطوير Next.js | يكتب `next dev` الملفين `AGENTS.md`/`CLAUDE.md` في المستودع | عُطّل ذلك بـ `agentRules: false` |
| الحركة | يعمل Lenis على مؤقت GSAP (حلقة واحدة)؛ ولا تبدأ عناصر الظهور مخفية إلا إذا عمل JavaScript وكانت الحركة مسموحة، مع حلّ احتياطي بعد 4 ثوانٍ؛ وتمر الإزاحات الأفقية عبر `dirX()` ويفرض ذلك فحص آلي | تتحقق اختبارات e2e من تقليل الحركة، وظهور المحتوى دون JavaScript، والانعكاس في RTL، وعدم بقاء ScrollTriggers أو حركات بعد التنقل |
| النصوص المؤقتة | يسرد `npm run check:placeholders` كل `[PLACEHOLDER: …]` متبقٍّ، ومع `--strict` يفشل (بوابة قبل الإطلاق) | 28 في نهاية المرحلة 3 |

</div>
