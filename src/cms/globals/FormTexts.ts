import type { GlobalConfig, Payload } from 'payload'

import { routing } from '@/i18n/routing'

import { allow } from '../access/roles'
import { hiddenWithoutContent } from '../collections/content-access'
import { revalidateGlobal } from '../hooks/revalidate'
import { groups, label } from '../lib/labels'
import { formText } from './shared'

/**
 * The wording inside the two forms: the declarations applicants tick and the consent texts. It
 * is stored with every application and message as the record of what the person agreed to, so
 * every change is kept as a version. Until CC-2 these texts were part of the "Membership" and
 * "Contact" page globals; they were moved here unchanged (ensureFormTexts below).
 */
export const FormTexts: GlobalConfig = {
  slug: 'form-texts',
  label: label('Formulartexte', 'Form texts', 'نصوص النماذج'),
  admin: {
    group: groups.pages,
    hidden: hiddenWithoutContent,
    description: label(
      'Wortlaut der Erklärungen und Einwilligungen in den Formularen. Er wird mit jedem Antrag und jeder Nachricht gespeichert. Änderungen bitte rechtlich prüfen lassen; frühere Fassungen bleiben unter „Versionen“ erhalten.',
      'Wording of the declarations and consents in the forms. It is stored with every application and message. Please have changes legally reviewed; earlier wordings remain under "Versions".',
      'نص الإقرارات والموافقات في النماذج، ويُحفظ مع كل طلب ورسالة. يُرجى مراجعة أي تغيير قانونيًا، وتبقى الصيغ السابقة في «الإصدارات».',
    ),
  },
  versions: { max: 100 },
  access: { read: () => true, update: allow('content.write') },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'membership',
      type: 'group',
      label: label('Mitgliedsantrag', 'Membership application', 'طلب العضوية'),
      fields: [
        formText(
          'principles',
          label('Grundsätze und Ziele', 'Principles and aims', 'المبادئ والأهداف'),
        ),
        formText('fees', label('Beiträge', 'Fees', 'الاشتراكات')),
        formText(
          'guardian',
          label(
            'Hinweis für Antragstellende unter 18',
            'Note for applicants under 18',
            'ملاحظة لمن هم دون 18 عامًا',
          ),
        ),
        formText(
          'consent',
          label('Einwilligung (Datenschutz)', 'Consent (privacy)', 'الموافقة (الخصوصية)'),
        ),
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: label('Kontaktformular', 'Contact form', 'نموذج التواصل'),
      fields: [
        formText(
          'consent',
          label('Einwilligung (Datenschutz)', 'Consent (privacy)', 'الموافقة (الخصوصية)'),
        ),
      ],
    },
  ],
}

type MembershipForm = {
  principles?: string | null
  fees?: string | null
  guardian?: string | null
  consent?: string | null
}

/**
 * Moves the form texts out of the old page globals, unchanged and in every language, the first
 * time the new version starts (only if the old texts were ever saved; nothing is overwritten).
 */
export async function ensureFormTexts(payload: Payload): Promise<boolean> {
  const current = (await payload.findGlobal({
    slug: 'form-texts',
    depth: 0,
    overrideAccess: true,
  })) as { updatedAt?: string | null }
  if (current.updatedAt) return false
  const read = async (locale: (typeof routing.locales)[number]) => {
    const [membership, contact] = await Promise.all([
      payload.findGlobal({
        slug: 'membership-page',
        locale,
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
      }),
      payload.findGlobal({
        slug: 'contact-page',
        locale,
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
      }),
    ])
    return {
      updatedAt: membership.updatedAt || contact.updatedAt,
      membership: (membership.form ?? {}) as MembershipForm,
      contact: { consent: contact.form?.consent ?? null },
    }
  }
  const german = await read('de')
  if (!german.updatedAt) return false
  for (const locale of routing.locales) {
    const own = locale === 'de' ? german : await read(locale)
    await payload.updateGlobal({
      slug: 'form-texts',
      locale,
      data: {
        membership: {
          principles: own.membership.principles ?? null,
          fees: own.membership.fees ?? null,
          guardian: own.membership.guardian ?? null,
          consent: own.membership.consent ?? null,
        },
        contact: own.contact,
      },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
  }
  return true
}
