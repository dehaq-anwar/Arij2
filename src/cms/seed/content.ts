import { paragraphs } from './lexical'

/**
 * Initial CMS content. Only facts supplied by the association, clearly marked drafts
 * ([ENTWURF] / [DRAFT] / [مسودة], approved in the plan, §18 Q5) that follow the Satzung closely,
 * and [PLACEHOLDER: …] for everything else. No projects, news, people or numbers are invented.
 */

export const locales = ['de', 'en', 'ar'] as const
export type SeedLocale = (typeof locales)[number]
type PerLocale<T> = Record<SeedLocale, T>

export const contactEmail = 'info@yop-ye.org'

/** Supplied by the association in Arabic (2026-10-19); German and English are translations. */
const tagline: PerLocale<string> = {
  de: 'Jugend, die nach Frieden strebt',
  en: 'Youth striving for peace',
  ar: 'شباب يسعى إلى السلام',
}

export const siteSettings: PerLocale<Record<string, unknown>> = {
  de: {
    tagline: tagline.de,
    description: '[PLACEHOLDER: Kurzbeschreibung der Website für Suchmaschinen]',
    contact: { address: '[PLACEHOLDER: Postanschrift]' },
  },
  en: {
    tagline: tagline.en,
    description: '[PLACEHOLDER: short site description for search engines]',
    contact: { address: '[PLACEHOLDER: postal address]' },
  },
  ar: {
    tagline: tagline.ar,
    description: '[PLACEHOLDER: وصف قصير للموقع لمحركات البحث]',
    contact: { address: '[PLACEHOLDER: العنوان البريدي]' },
  },
}

export const homePage: PerLocale<Record<string, unknown>> = {
  de: {
    hero: { headline: 'Youth of Peace e.V.' },
    journey: { from: 'Gegründet 2013 im Jemen', to: 'heute auch in Deutschland aktiv' },
    statsHeading: 'In Zahlen',
    cta: { heading: 'Mitmachen' },
  },
  en: {
    hero: { headline: 'Youth of Peace e.V.' },
    journey: { from: 'Founded in Yemen in 2013', to: 'now also active in Germany' },
    statsHeading: 'In numbers',
    cta: { heading: 'Get involved' },
  },
  ar: {
    hero: { headline: 'Youth of Peace e.V.' },
    journey: { from: 'تأسست عام 2013 في اليمن', to: 'وتنشط اليوم في ألمانيا أيضًا' },
    statsHeading: 'بالأرقام',
    cta: { heading: 'شارك معنا' },
  },
}

/** Mission (draft from Satzung § 2), shown on the About page. */
const mission: PerLocale<string> = {
  de: '[ENTWURF] Wir fördern junge Menschen, eine Kultur des Friedens und der Toleranz sowie ehrenamtliches Engagement und gesellschaftliche Teilhabe – in Deutschland und gemeinsam mit unserer Mutterorganisation im Jemen.',
  en: '[DRAFT] We support young people, a culture of peace and tolerance, and volunteering and participation in society – in Germany and together with our parent organisation in Yemen.',
  ar: '[مسودة] ندعم الشباب، ونعزّز ثقافة السلام والتسامح، والعمل التطوعي والمشاركة في المجتمع – في ألمانيا وبالتعاون مع منظمتنا الأم في اليمن.',
}

/** Satzung § 2 — the association's principles. */
const values: PerLocale<{ title: string; description: string }[]> = {
  de: [
    {
      title: 'Würde jedes Menschen',
      description:
        '[ENTWURF] Wir achten die Würde des Menschen ohne Unterscheidung nach Religion, Konfession, Sprache, Hautfarbe und Herkunft.',
    },
    {
      title: 'Demokratie und Rechtsstaat',
      description:
        '[ENTWURF] Wir sind pluralistischen, laizistischen, freiheitlichen, demokratischen und rechtsstaatlichen Prinzipien verpflichtet und bekennen uns zur freiheitlich demokratischen Grundordnung.',
    },
    {
      title: 'Unabhängigkeit',
      description:
        '[ENTWURF] Wir lehnen parteipolitische, konfessionelle und wirtschaftliche Bindungen sowie jede Form militärischer Ausbildung ab.',
    },
    {
      title: 'Gegen Extremismus',
      description: '[ENTWURF] Wir treten allen extremistischen Bestrebungen entschieden entgegen.',
    },
    { title: 'Konsens', description: '[ENTWURF] In Grundsatzfragen streben wir den Konsens an.' },
  ],
  en: [
    {
      title: 'Human dignity',
      description:
        '[DRAFT] We respect human dignity regardless of religion, denomination, language, skin colour or origin.',
    },
    {
      title: 'Democracy and the rule of law',
      description:
        "[DRAFT] We are committed to pluralist, secular, liberal, democratic principles and the rule of law, and to Germany's free democratic basic order.",
    },
    {
      title: 'Independence',
      description:
        '[DRAFT] We reject ties to political parties, religious denominations and economic interests, and all forms of military training.',
    },
    {
      title: 'Against extremism',
      description: '[DRAFT] We firmly oppose all extremist endeavours.',
    },
    { title: 'Consensus', description: '[DRAFT] On fundamental questions we seek consensus.' },
  ],
  ar: [
    {
      title: 'كرامة كل إنسان',
      description:
        '[مسودة] نحترم كرامة الإنسان دون تمييز في الدين أو المذهب أو اللغة أو لون البشرة أو الأصل.',
    },
    {
      title: 'الديمقراطية وسيادة القانون',
      description:
        '[مسودة] نلتزم بالمبادئ التعددية والعلمانية والليبرالية والديمقراطية ومبادئ دولة القانون، ونؤيد النظام الأساسي الديمقراطي الحر.',
    },
    {
      title: 'الاستقلالية',
      description:
        '[مسودة] نرفض الارتباطات الحزبية والطائفية والاقتصادية، وكل أشكال التدريب العسكري.',
    },
    { title: 'ضد التطرف', description: '[مسودة] نتصدّى بحزم لكل المساعي المتطرفة.' },
    { title: 'التوافق', description: '[مسودة] نسعى إلى التوافق في المسائل الجوهرية.' },
  ],
}

const story: PerLocale<{ year?: number; title: string; text: string }[]> = {
  de: [
    {
      year: 2013,
      title: 'Gründung im Jemen',
      text: '[PLACEHOLDER: kurze Geschichte der Gründung]',
    },
    {
      title: '[PLACEHOLDER: Beginn der Arbeit in Deutschland]',
      text: '[PLACEHOLDER: wie der Verein nach Deutschland kam]',
    },
  ],
  en: [
    { year: 2013, title: 'Founded in Yemen', text: '[PLACEHOLDER: short story of the founding]' },
    {
      title: '[PLACEHOLDER: start of the work in Germany]',
      text: '[PLACEHOLDER: how the association came to Germany]',
    },
  ],
  ar: [
    { year: 2013, title: 'التأسيس في اليمن', text: '[PLACEHOLDER: قصة قصيرة عن التأسيس]' },
    {
      title: '[PLACEHOLDER: بداية العمل في ألمانيا]',
      text: '[PLACEHOLDER: كيف انتقل عمل الجمعية إلى ألمانيا]',
    },
  ],
}

export const aboutPage: PerLocale<Record<string, unknown>> = {
  de: {
    intro: paragraphs(
      '[ENTWURF] Youth of Peace wurde 2013 im Jemen gegründet. Heute ist der Verein auch in Deutschland aktiv, mit Sitz in Erlangen. Er arbeitet mit der Mutterorganisation Youth of Peace (Jemen) und mit internationalen Partnern zusammen.',
    ),
    mission: mission.de,
    story: story.de,
    values: values.de,
    boardIntro: '[PLACEHOLDER: kurze Einleitung zum Vorstand]',
  },
  en: {
    intro: paragraphs(
      '[DRAFT] Youth of Peace was founded in Yemen in 2013. Today the association is also active in Germany, with its registered office in Erlangen. It works together with the parent organisation Youth of Peace (Yemen) and with international partners.',
    ),
    mission: mission.en,
    story: story.en,
    values: values.en,
    boardIntro: '[PLACEHOLDER: short introduction to the board]',
  },
  ar: {
    intro: paragraphs(
      '[مسودة] تأسست منظمة شباب السلام عام 2013 في اليمن. وتنشط الجمعية اليوم في ألمانيا أيضًا، ومقرها في إرلانغن. وتتعاون مع المنظمة الأم «شباب السلام» في اليمن ومع شركاء دوليين.',
    ),
    mission: mission.ar,
    story: story.ar,
    values: values.ar,
    boardIntro: '[PLACEHOLDER: مقدمة قصيرة عن مجلس الإدارة]',
  },
}

/** Satzung § 3 (membership), § 4 (fees — no amounts, by decision of the association), § 7 (8). */
export const membershipPage: PerLocale<Record<string, unknown>> = {
  de: {
    intro: paragraphs('[PLACEHOLDER: Einladung, Mitglied zu werden]'),
    whoCanJoin: paragraphs(
      '[ENTWURF] Ordentliches Mitglied kann jede natürliche Person ab 16 Jahren werden, die bereit ist, die Ziele des Vereins zu fördern und sich zu seinen Grundsätzen bekennt, insbesondere zur freiheitlich demokratischen Grundordnung.',
      '[ENTWURF] Mitglieder extremistischer Organisationen gleich welcher politischen Ausrichtung sowie rassistisch oder fremdenfeindlich organisierter Organisationen oder religiöser Gruppierungen können nicht Mitglied werden.',
      '[ENTWURF] Daneben ist eine Fördermitgliedschaft möglich. Fördermitglieder haben kein Stimmrecht in der Mitgliederversammlung.',
    ),
    fees: paragraphs(
      '[ENTWURF] Der Verein erhebt ein Eintrittsgeld und einen Jahresbeitrag; die Höhe regelt die Beitragsordnung. Der Beitrag ist jährlich im Voraus bis spätestens 31. Januar zu zahlen.',
    ),
    process: paragraphs(
      '[ENTWURF] Aufnahmeanträge können schriftlich oder online gestellt werden. Über die Aufnahme entscheidet der Schriftführer, über eine Ablehnung der Gesamtvorstand.',
      '[ENTWURF] Die Mitgliedschaft kann schriftlich mit einer Frist von vier Wochen zum Ende eines Kalenderquartals gekündigt werden.',
    ),
    formNote: '[PLACEHOLDER: Hinweis zum Online-Antrag – das Formular folgt in Phase 5]',
  },
  en: {
    intro: paragraphs('[PLACEHOLDER: invitation to become a member]'),
    whoCanJoin: paragraphs(
      '[DRAFT] Any natural person aged 16 or over who is willing to promote the aims of the association and commits to its principles, in particular to the free democratic basic order, can become an ordinary member.',
      '[DRAFT] Members of extremist organisations of any political orientation, and of racist or xenophobic organisations or religious groups, cannot become members.',
      '[DRAFT] Supporting membership is also possible. Supporting members have no vote in the general meeting.',
    ),
    fees: paragraphs(
      '[DRAFT] The association charges an entrance fee and an annual fee; the amounts are set by the fee regulations (Beitragsordnung). The fee is payable annually in advance by 31 January.',
    ),
    process: paragraphs(
      '[DRAFT] Applications can be made in writing or online. The secretary (Schriftführer) decides on admission; a rejection is decided by the full board.',
      '[DRAFT] Membership can be cancelled in writing with four weeks’ notice to the end of a calendar quarter.',
    ),
    formNote: '[PLACEHOLDER: note on the online application – the form follows in Phase 5]',
  },
  ar: {
    intro: paragraphs('[PLACEHOLDER: دعوة للانضمام إلى العضوية]'),
    whoCanJoin: paragraphs(
      '[مسودة] يمكن لكل شخص طبيعي بلغ 16 عامًا، ومستعد لدعم أهداف الجمعية ويلتزم بمبادئها، ولا سيما النظام الأساسي الديمقراطي الحر، أن يصبح عضوًا عاديًا.',
      '[مسودة] لا يمكن لأعضاء المنظمات المتطرفة أيًا كان توجهها السياسي، ولا لأعضاء المنظمات أو الجماعات الدينية ذات التنظيم العنصري أو المعادي للأجانب، أن يصبحوا أعضاء.',
      '[مسودة] تتاح أيضًا العضوية الداعمة. ولا يحق للأعضاء الداعمين التصويت في الجمعية العمومية.',
    ),
    fees: paragraphs(
      '[مسودة] تتقاضى الجمعية رسم انتساب واشتراكًا سنويًا، وتحدد لائحة الاشتراكات قيمتهما. ويُدفع الاشتراك سنويًا مقدمًا في موعد أقصاه 31 يناير.',
    ),
    process: paragraphs(
      '[مسودة] يمكن تقديم طلب العضوية كتابيًا أو عبر الإنترنت. ويقرر أمين السر القبول، ويقرر مجلس الإدارة بكامل هيئته الرفض.',
      '[مسودة] يمكن إنهاء العضوية كتابيًا بمهلة أربعة أسابيع قبل نهاية ربع السنة.',
    ),
    formNote: '[PLACEHOLDER: ملاحظة حول الطلب الإلكتروني – يُضاف النموذج في المرحلة 5]',
  },
}

const supportSection = (heading: string, text: string) => ({ heading, text: paragraphs(text) })

export const supportPage: PerLocale<Record<string, unknown>> = {
  de: {
    intro: paragraphs('[PLACEHOLDER: Einleitung – wie man den Verein unterstützen kann]'),
    volunteer: supportSection(
      'Ehrenamtlich mitarbeiten',
      '[PLACEHOLDER: Möglichkeiten für Ehrenamtliche]',
    ),
    partner: supportSection(
      'Partner werden',
      '[PLACEHOLDER: Zusammenarbeit mit Organisationen und Unternehmen]',
    ),
    donate: {
      heading: 'Spenden',
      text: paragraphs('[PLACEHOLDER: Wofür Spenden verwendet werden]'),
      reference: '[PLACEHOLDER: Verwendungszweck]',
      taxStatusNote: paragraphs('[PLACEHOLDER: steuerlicher Status]'),
    },
  },
  en: {
    intro: paragraphs('[PLACEHOLDER: introduction – how to support the association]'),
    volunteer: supportSection('Volunteer with us', '[PLACEHOLDER: opportunities for volunteers]'),
    partner: supportSection(
      'Become a partner',
      '[PLACEHOLDER: working with organisations and companies]',
    ),
    donate: {
      heading: 'Donate',
      text: paragraphs('[PLACEHOLDER: what donations are used for]'),
      reference: '[PLACEHOLDER: payment reference]',
      taxStatusNote: paragraphs('[PLACEHOLDER: tax status]'),
    },
  },
  ar: {
    intro: paragraphs('[PLACEHOLDER: مقدمة – كيف يمكن دعم الجمعية]'),
    volunteer: supportSection('تطوّع معنا', '[PLACEHOLDER: فرص التطوع]'),
    partner: supportSection('كن شريكًا', '[PLACEHOLDER: التعاون مع المنظمات والشركات]'),
    donate: {
      heading: 'تبرّع',
      text: paragraphs('[PLACEHOLDER: أوجه استخدام التبرعات]'),
      reference: '[PLACEHOLDER: مرجع الدفع]',
      taxStatusNote: paragraphs('[PLACEHOLDER: الوضع الضريبي]'),
    },
  },
}

export const contactPage: PerLocale<Record<string, unknown>> = {
  de: { intro: paragraphs('[PLACEHOLDER: Einleitung zur Kontaktaufnahme]') },
  en: { intro: paragraphs('[PLACEHOLDER: introduction to getting in touch]') },
  ar: { intro: paragraphs('[PLACEHOLDER: مقدمة للتواصل معنا]') },
}

export const legalNotice: PerLocale<Record<string, unknown>> = {
  de: {
    content: paragraphs(
      '[PLACEHOLDER: Impressum nach § 5 DDG – der Text wird vom Verein geliefert.]',
    ),
  },
  en: {
    content: paragraphs(
      '[PLACEHOLDER: legal notice (Impressum, § 5 DDG) – text to be supplied by the association.]',
    ),
  },
  ar: {
    content: paragraphs(
      '[PLACEHOLDER: الإشعار القانوني (Impressum وفق § 5 DDG) – تقدّم الجمعية نصه.]',
    ),
  },
}

export const privacyPolicy: PerLocale<Record<string, unknown>> = {
  de: {
    content: paragraphs(
      '[PLACEHOLDER: Datenschutzerklärung – der Text wird vom Verein geliefert.]',
    ),
  },
  en: {
    content: paragraphs('[PLACEHOLDER: privacy policy – text to be supplied by the association.]'),
  },
  ar: { content: paragraphs('[PLACEHOLDER: سياسة الخصوصية – تقدّم الجمعية نصها.]') },
}

/** The four focus areas named by the association (plan §18 Q6); summaries still to be written. */
export const focusAreas: {
  icon: string
  order: number
  title: PerLocale<string>
  summary: PerLocale<string>
}[] = [
  {
    icon: 'youth',
    order: 1,
    title: { de: 'Empowerment junger Menschen', en: 'Youth empowerment', ar: 'تمكين الشباب' },
    summary: {
      de: '[PLACEHOLDER: Kurzbeschreibung]',
      en: '[PLACEHOLDER: short description]',
      ar: '[PLACEHOLDER: وصف قصير]',
    },
  },
  {
    icon: 'peace',
    order: 2,
    title: { de: 'Friedensförderung', en: 'Peacebuilding', ar: 'بناء السلام' },
    summary: {
      de: '[PLACEHOLDER: Kurzbeschreibung]',
      en: '[PLACEHOLDER: short description]',
      ar: '[PLACEHOLDER: وصف قصير]',
    },
  },
  {
    icon: 'integration',
    order: 3,
    title: { de: 'Integration', en: 'Integration', ar: 'الاندماج' },
    summary: {
      de: '[PLACEHOLDER: Kurzbeschreibung]',
      en: '[PLACEHOLDER: short description]',
      ar: '[PLACEHOLDER: وصف قصير]',
    },
  },
  {
    icon: 'entrepreneurship',
    order: 4,
    title: {
      de: 'Jugendunternehmertum',
      en: 'Youth entrepreneurship',
      ar: 'ريادة الأعمال لدى الشباب',
    },
    summary: {
      de: '[PLACEHOLDER: Kurzbeschreibung]',
      en: '[PLACEHOLDER: short description]',
      ar: '[PLACEHOLDER: وصف قصير]',
    },
  },
]

/** Five project slots (plan §23): placeholder title, one-line summary and text per language. */
export const placeholderProjects = [1, 2, 3, 4, 5].map((n) => ({
  slug: `projekt-${n}`,
  title: {
    de: `[PLACEHOLDER: Projekttitel ${n}]`,
    en: `[PLACEHOLDER: Project title ${n}]`,
    ar: `[PLACEHOLDER: عنوان المشروع ${n}]`,
  } satisfies PerLocale<string>,
  excerpt: {
    de: '[PLACEHOLDER: ein Satz zum Projekt]',
    en: '[PLACEHOLDER: one sentence about the project]',
    ar: '[PLACEHOLDER: جملة واحدة عن المشروع]',
  } satisfies PerLocale<string>,
  body: {
    de: '[PLACEHOLDER: einige Informationen zum Projekt]',
    en: '[PLACEHOLDER: some information about the project]',
    ar: '[PLACEHOLDER: بعض المعلومات عن المشروع]',
  } satisfies PerLocale<string>,
}))
