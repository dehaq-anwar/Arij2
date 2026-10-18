import type { GroupField } from 'payload'

import { label } from '../lib/labels'
import { pageGlobal } from './shared'

const section = (name: string, title: ReturnType<typeof label>): GroupField => ({
  name,
  type: 'group',
  label: title,
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      label: label('Überschrift', 'Heading', 'العنوان'),
    },
    { name: 'text', type: 'richText', localized: true, label: label('Text', 'Text', 'النص') },
  ],
})

export const SupportPage = pageGlobal({
  slug: 'support-page',
  label: label('Unterstützen', 'Support us', 'ادعمنا'),
  fields: [
    {
      name: 'intro',
      type: 'richText',
      localized: true,
      label: label('Einleitung', 'Introduction', 'المقدمة'),
    },
    section('volunteer', label('Ehrenamt', 'Volunteering', 'التطوع')),
    section('partner', label('Partnerschaft', 'Partnership', 'الشراكة')),
    {
      name: 'donate',
      type: 'group',
      label: label('Spenden', 'Donations', 'التبرعات'),
      fields: [
        {
          name: 'heading',
          type: 'text',
          localized: true,
          label: label('Überschrift', 'Heading', 'العنوان'),
        },
        { name: 'text', type: 'richText', localized: true, label: label('Text', 'Text', 'النص') },
        {
          type: 'row',
          fields: [
            {
              name: 'accountHolder',
              type: 'text',
              label: label('Kontoinhaber', 'Account holder', 'صاحب الحساب'),
            },
            { name: 'bankName', type: 'text', label: label('Bank', 'Bank', 'البنك') },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'iban', type: 'text', label: 'IBAN' },
            { name: 'bic', type: 'text', label: 'BIC' },
          ],
        },
        {
          name: 'reference',
          type: 'text',
          localized: true,
          label: label('Verwendungszweck', 'Payment reference', 'مرجع الدفع'),
        },
        {
          name: 'taxStatusNote',
          type: 'richText',
          localized: true,
          label: label(
            'Hinweis zum steuerlichen Status',
            'Note on tax status',
            'ملاحظة حول الوضع الضريبي',
          ),
          admin: {
            description: label(
              'Nur mit bestätigtem Status des Finanzamts ausfüllen. Keine Aussagen zur Absetzbarkeit ohne Bescheid.',
              'Fill in only with a status confirmed by the tax office. No statements on deductibility without a notice.',
              'لا يُملأ إلا بوضع مؤكد من مكتب الضرائب، ودون أي ذكر لخصم التبرعات من الضرائب بلا قرار رسمي.',
            ),
          },
        },
      ],
    },
  ],
})
