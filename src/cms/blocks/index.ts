import type { Block } from 'payload'

import { label } from '../lib/labels'
import {
  buttonsField,
  headingField,
  iconField,
  imageField,
  optionalHeading,
  plainText,
  richTextField,
} from './fields'

/**
 * The blocks of the page builder. Each one is a section of the website's design system
 * (src/components/blocks): editors choose and order them and fill in their texts and images;
 * layout, colours, type sizes and motion come from the design and cannot be changed per page.
 */

const groups = {
  opening: label('Seitenanfang', 'Page opening', 'بداية الصفحة'),
  text: label('Text und Bild', 'Text and images', 'نصوص وصور'),
  calls: label('Aufrufe', 'Calls to action', 'دعوات للمشاركة'),
  cms: label('Inhalte aus dem CMS', 'Content from the CMS', 'محتوى من النظام'),
  forms: label('Formulare', 'Forms', 'النماذج'),
}

// Served on the Control Center's host only (public/admin/blocks, scripts/block-thumbnails.mjs).
const thumbnail = (slug: string) => `/admin/blocks/${slug}.svg`

// Rows are named by their block and number only: Payload's optional free name for each block
// ("Untitled" when empty) is not needed and was mistaken for a missing heading.
const block = (config: Block & { slug: string }, group: keyof typeof groups): Block => ({
  ...config,
  admin: {
    group: groups[group],
    images: { thumbnail: thumbnail(config.slug) },
    disableBlockName: true,
    ...config.admin,
  },
})

const showTagline = {
  name: 'showTagline',
  type: 'checkbox' as const,
  defaultValue: false,
  label: label(
    'Leitsatz aus den Website-Einstellungen zeigen',
    'Show the tagline from the site settings',
    'إظهار الشعار النصي من إعدادات الموقع',
  ),
}

export const PageHeaderBlock = block(
  {
    slug: 'header',
    interfaceName: 'HeaderBlock',
    labels: {
      singular: label('Seitenkopf', 'Page header', 'رأس الصفحة'),
      plural: label('Seitenköpfe', 'Page headers', 'رؤوس الصفحات'),
    },
    fields: [
      {
        name: 'title',
        type: 'text',
        localized: true,
        maxLength: 120,
        label: label('Titel', 'Title', 'العنوان'),
        admin: {
          description: label(
            'Leer lassen, um den Titel der Seite zu zeigen.',
            'Leave empty to show the title of the page.',
            'اتركه فارغًا لإظهار عنوان الصفحة.',
          ),
        },
      },
      plainText('lead', label('Einleitung', 'Lead', 'المقدمة'), { maxLength: 300 }),
      showTagline,
    ],
  },
  'opening',
)

export const HomeHeroBlock = block(
  {
    slug: 'hero',
    interfaceName: 'HeroBlock',
    labels: {
      singular: label('Startbühne', 'Home stage', 'واجهة الصفحة الرئيسية'),
      plural: label('Startbühnen', 'Home stages', 'واجهات الصفحة الرئيسية'),
    },
    fields: [
      {
        name: 'headline',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 80,
        label: label('Überschrift', 'Headline', 'العنوان الرئيسي'),
        admin: {
          description: label(
            'Die große Bühne der Startseite (nur dort möglich).',
            'The large stage of the home page (only possible there).',
            'الواجهة الكبيرة للصفحة الرئيسية (متاحة هناك فقط).',
          ),
        },
      },
      { ...showTagline, defaultValue: true },
      buttonsField({ max: 2 }),
    ],
  },
  'opening',
)

export const MediaHeaderBlock = block(
  {
    slug: 'mediaHeader',
    interfaceName: 'MediaHeaderBlock',
    labels: {
      singular: label('Seitenkopf mit Bild', 'Header with image', 'رأس الصفحة بصورة'),
      plural: label('Seitenköpfe mit Bild', 'Headers with image', 'رؤوس صفحات بصور'),
    },
    fields: [
      imageField('image', label('Bild', 'Image', 'الصورة'), { required: true }),
      {
        name: 'title',
        type: 'text',
        localized: true,
        maxLength: 120,
        label: label('Titel', 'Title', 'العنوان'),
        admin: {
          description: label(
            'Leer lassen, um den Titel der Seite zu zeigen.',
            'Leave empty to show the title of the page.',
            'اتركه فارغًا لإظهار عنوان الصفحة.',
          ),
        },
      },
      plainText('lead', label('Einleitung', 'Lead', 'المقدمة'), { maxLength: 300 }),
    ],
  },
  'opening',
)

export const TextBlock = block(
  {
    slug: 'text',
    interfaceName: 'TextBlock',
    labels: {
      singular: label('Text', 'Text', 'نص'),
      plural: label('Texte', 'Texts', 'نصوص'),
    },
    fields: [
      headingField(),
      richTextField('body', label('Text', 'Text', 'النص'), { required: true }),
      {
        name: 'surface',
        type: 'select',
        defaultValue: 'canvas',
        required: true,
        label: label('Hintergrund', 'Background', 'الخلفية'),
        options: [
          { value: 'canvas', label: label('Hell', 'Light', 'فاتح') },
          { value: 'sky', label: label('Himmelblau', 'Sky blue', 'سماوي') },
        ],
      },
    ],
  },
  'text',
)

export const CardsBlock = block(
  {
    slug: 'cards',
    interfaceName: 'CardsBlock',
    labels: {
      singular: label('Karten', 'Cards', 'بطاقات'),
      plural: label('Kartenbereiche', 'Card sections', 'أقسام بطاقات'),
    },
    fields: [
      headingField(),
      richTextField('intro', label('Einleitung', 'Introduction', 'المقدمة')),
      {
        name: 'numbered',
        type: 'checkbox',
        defaultValue: false,
        label: label('Nummeriert (01, 02, …)', 'Numbered (01, 02, …)', 'مرقّمة (01، 02، …)'),
      },
      {
        name: 'items',
        type: 'array',
        required: true,
        minRows: 1,
        maxRows: 6,
        label: label('Karten', 'Cards', 'البطاقات'),
        labels: {
          singular: label('Karte', 'Card', 'بطاقة'),
          plural: label('Karten', 'Cards', 'البطاقات'),
        },
        fields: [
          headingField({ maxLength: 80 }),
          richTextField('text', label('Text', 'Text', 'النص')),
          iconField,
          {
            ...buttonsField({ max: 1 }),
            label: label('Schaltfläche (optional)', 'Button (optional)', 'زر (اختياري)'),
            admin: { initCollapsed: true },
          },
        ],
      },
    ],
  },
  'text',
)

export const ImageTextBlock = block(
  {
    slug: 'imageText',
    interfaceName: 'ImageTextBlock',
    labels: {
      singular: label('Bild und Text', 'Image and text', 'صورة ونص'),
      plural: label('Bild und Text', 'Image and text', 'صورة ونص'),
    },
    fields: [
      imageField('image', label('Bild', 'Image', 'الصورة'), { required: true }),
      headingField(),
      richTextField('body', label('Text', 'Text', 'النص'), { required: true }),
      {
        name: 'imagePosition',
        type: 'select',
        required: true,
        defaultValue: 'start',
        label: label('Bild steht', 'Image position', 'موضع الصورة'),
        admin: {
          description: label(
            '„Am Anfang“ ist im Deutschen links, im Arabischen rechts.',
            '"At the start" is on the left in German and English, on the right in Arabic.',
            '«في البداية» يعني اليسار في الألمانية والإنجليزية واليمين في العربية.',
          ),
        },
        options: [
          { value: 'start', label: label('Am Anfang', 'At the start', 'في البداية') },
          { value: 'end', label: label('Am Ende', 'At the end', 'في النهاية') },
        ],
      },
    ],
  },
  'text',
)

export const QuoteBlock = block(
  {
    slug: 'quote',
    interfaceName: 'QuoteBlock',
    labels: {
      singular: label('Zitat', 'Quote', 'اقتباس'),
      plural: label('Zitate', 'Quotes', 'اقتباسات'),
    },
    fields: [
      plainText('quote', label('Zitat', 'Quote', 'الاقتباس'), { maxLength: 400, required: true }),
      {
        name: 'attribution',
        type: 'text',
        localized: true,
        maxLength: 120,
        label: label('Von wem', 'By whom', 'القائل'),
        admin: {
          description: label(
            'Personen nur mit ihrer Einwilligung nennen.',
            'Name people only with their consent.',
            'لا تذكر أشخاصًا إلا بموافقتهم.',
          ),
        },
      },
    ],
  },
  'text',
)

export const FaqBlock = block(
  {
    slug: 'faq',
    interfaceName: 'FaqBlock',
    labels: {
      singular: label('Fragen und Antworten', 'Questions and answers', 'أسئلة وأجوبة'),
      plural: label('Fragen und Antworten', 'Questions and answers', 'أسئلة وأجوبة'),
    },
    fields: [
      headingField(),
      {
        name: 'items',
        type: 'array',
        required: true,
        minRows: 1,
        maxRows: 20,
        label: label('Fragen', 'Questions', 'الأسئلة'),
        labels: {
          singular: label('Frage', 'Question', 'سؤال'),
          plural: label('Fragen', 'Questions', 'الأسئلة'),
        },
        fields: [
          {
            name: 'question',
            type: 'text',
            localized: true,
            required: true,
            maxLength: 200,
            label: label('Frage', 'Question', 'السؤال'),
          },
          richTextField('answer', label('Antwort', 'Answer', 'الجواب'), { required: true }),
        ],
      },
    ],
  },
  'text',
)

export const GalleryBlock = block(
  {
    slug: 'gallery',
    interfaceName: 'GalleryBlock',
    labels: {
      singular: label('Bildergalerie', 'Gallery', 'معرض صور'),
      plural: label('Bildergalerien', 'Galleries', 'معارض صور'),
    },
    fields: [
      headingField(),
      {
        name: 'images',
        type: 'upload',
        relationTo: 'media',
        hasMany: true,
        required: true,
        minRows: 2,
        maxRows: 12,
        label: label('Bilder', 'Images', 'الصور'),
      },
    ],
  },
  'text',
)

export const StatementBlock = block(
  {
    slug: 'statement',
    interfaceName: 'StatementBlock',
    labels: {
      singular: label('Leitgedanke', 'Statement', 'فكرة محورية'),
      plural: label('Leitgedanken', 'Statements', 'أفكار محورية'),
    },
    fields: [
      plainText(
        'statement',
        label('Leitgedanke in einem Satz', 'Statement in one sentence', 'الفكرة في جملة واحدة'),
        {
          maxLength: 240,
        },
      ),
      richTextField('body', label('Text', 'Text', 'النص')),
    ],
  },
  'text',
)

export const TimelineBlock = block(
  {
    slug: 'timeline',
    interfaceName: 'TimelineBlock',
    labels: {
      singular: label('Zeitleiste', 'Timeline', 'خط زمني'),
      plural: label('Zeitleisten', 'Timelines', 'خطوط زمنية'),
    },
    fields: [
      optionalHeading,
      {
        name: 'entries',
        type: 'array',
        required: true,
        minRows: 1,
        maxRows: 20,
        label: label('Stationen', 'Stations', 'المحطات'),
        labels: {
          singular: label('Station', 'Station', 'محطة'),
          plural: label('Stationen', 'Stations', 'المحطات'),
        },
        fields: [
          {
            name: 'year',
            type: 'number',
            min: 1900,
            max: 2200,
            label: label('Jahr', 'Year', 'السنة'),
          },
          {
            name: 'title',
            type: 'text',
            required: true,
            localized: true,
            maxLength: 120,
            label: label('Titel', 'Title', 'العنوان'),
          },
          plainText('text', label('Text', 'Text', 'النص'), { maxLength: 400 }),
        ],
      },
    ],
  },
  'text',
)

export const ValuesBlock = block(
  {
    slug: 'values',
    interfaceName: 'ValuesBlock',
    labels: {
      singular: label('Werte', 'Values', 'القيم'),
      plural: label('Wertebereiche', 'Value sections', 'أقسام القيم'),
    },
    fields: [
      optionalHeading,
      {
        name: 'items',
        type: 'array',
        required: true,
        minRows: 1,
        maxRows: 12,
        label: label('Werte', 'Values', 'القيم'),
        labels: {
          singular: label('Wert', 'Value', 'قيمة'),
          plural: label('Werte', 'Values', 'القيم'),
        },
        fields: [
          {
            name: 'title',
            type: 'text',
            required: true,
            localized: true,
            maxLength: 120,
            label: label('Titel', 'Title', 'العنوان'),
          },
          plainText('description', label('Beschreibung', 'Description', 'الوصف'), {
            maxLength: 400,
          }),
        ],
      },
    ],
  },
  'text',
)

export const JourneyBlock = block(
  {
    slug: 'journey',
    interfaceName: 'JourneyBlock',
    labels: {
      singular: label('Weg (Scroll-Szene)', 'Journey (scroll scene)', 'المسار (مشهد التمرير)'),
      plural: label('Wege', 'Journeys', 'مسارات'),
    },
    fields: [
      {
        name: 'from',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 60,
        label: label('Erste Zeile', 'First line', 'السطر الأول'),
        admin: {
          description: label(
            'Zwei kurze Zeilen: Beim Scrollen wird es vom ersten zum zweiten Satz „Tag“.',
            'Two short lines: while scrolling, night turns to day from the first to the second.',
            'سطران قصيران: مع التمرير يتحول الليل إلى نهار من السطر الأول إلى الثاني.',
          ),
        },
      },
      {
        name: 'to',
        type: 'text',
        localized: true,
        required: true,
        maxLength: 60,
        label: label('Zweite Zeile', 'Second line', 'السطر الثاني'),
      },
    ],
  },
  'text',
)

export const NightBandBlock = block(
  {
    slug: 'nightBand',
    interfaceName: 'NightBandBlock',
    labels: {
      singular: label('Nachtband', 'Night band', 'شريط ليلي'),
      plural: label('Nachtbänder', 'Night bands', 'أشرطة ليلية'),
    },
    fields: [
      headingField({ required: true }),
      richTextField('body', label('Text', 'Text', 'النص')),
      buttonsField({ max: 3 }),
    ],
  },
  'calls',
)

export const CallToActionBlock = block(
  {
    slug: 'callToAction',
    interfaceName: 'CallToActionBlock',
    labels: {
      singular: label('Aufruf zum Mitmachen', 'Call to action', 'دعوة للمشاركة'),
      plural: label('Aufrufe zum Mitmachen', 'Calls to action', 'دعوات للمشاركة'),
    },
    fields: [headingField(), buttonsField({ min: 1, max: 3 })],
  },
  'calls',
)

export const DonationBlock = block(
  {
    slug: 'donation',
    interfaceName: 'DonationBlock',
    labels: {
      singular: label('Spenden', 'Donations', 'التبرعات'),
      plural: label('Spendenbereiche', 'Donation sections', 'أقسام التبرعات'),
    },
    fields: [
      headingField(),
      richTextField('body', label('Text', 'Text', 'النص')),
      {
        type: 'row',
        fields: [
          {
            name: 'accountHolder',
            type: 'text',
            maxLength: 120,
            label: label('Kontoinhaber', 'Account holder', 'صاحب الحساب'),
          },
          { name: 'bankName', type: 'text', maxLength: 120, label: label('Bank', 'Bank', 'البنك') },
        ],
      },
      {
        type: 'row',
        fields: [
          { name: 'iban', type: 'text', maxLength: 42, label: 'IBAN' },
          { name: 'bic', type: 'text', maxLength: 11, label: 'BIC' },
        ],
      },
      {
        name: 'reference',
        type: 'text',
        localized: true,
        maxLength: 140,
        label: label('Verwendungszweck', 'Payment reference', 'مرجع الدفع'),
      },
      {
        ...richTextField(
          'taxStatusNote',
          label(
            'Hinweis zum steuerlichen Status',
            'Note on tax status',
            'ملاحظة حول الوضع الضريبي',
          ),
        ),
        admin: {
          description: label(
            'Nur mit bestätigtem Status des Finanzamts ausfüllen. Keine Aussagen zur Absetzbarkeit ohne Bescheid.',
            'Fill in only with a status confirmed by the tax office. No statements on deductibility without a notice.',
            'لا يُملأ إلا بوضع مؤكد من مكتب الضرائب، ودون أي ذكر لخصم التبرعات من الضرائب بلا قرار رسمي.',
          ),
        },
      } as Block['fields'][number],
    ],
  },
  'calls',
)

export const ProjectsBlock = block(
  {
    slug: 'projects',
    interfaceName: 'ProjectsBlock',
    labels: {
      singular: label('Projekte', 'Projects', 'المشاريع'),
      plural: label('Projektbereiche', 'Project sections', 'أقسام المشاريع'),
    },
    fields: [
      headingField({
        description: label(
          'Zeigt die neuesten veröffentlichten Projekte als Bilder. Leer lassen für „Projekte“.',
          'Shows the latest published projects as images. Leave empty for "Projects".',
          'يعرض أحدث المشاريع المنشورة كصور. اتركه فارغًا لعنوان «المشاريع».',
        ),
      }),
    ],
  },
  'cms',
)

export const NewsBlock = block(
  {
    slug: 'news',
    interfaceName: 'NewsBlock',
    labels: {
      singular: label('Aktuelles', 'News', 'الأخبار'),
      plural: label('Nachrichtenbereiche', 'News sections', 'أقسام الأخبار'),
    },
    fields: [
      optionalHeading,
      {
        name: 'count',
        type: 'select',
        required: true,
        defaultValue: '3',
        label: label('Anzahl', 'Number', 'العدد'),
        options: [
          { value: '3', label: '3' },
          { value: '6', label: '6' },
        ],
      },
    ],
  },
  'cms',
)

export const EventsBlock = block(
  {
    slug: 'events',
    interfaceName: 'EventsBlock',
    labels: {
      singular: label('Nächste Veranstaltungen', 'Upcoming events', 'الفعاليات القادمة'),
      plural: label('Veranstaltungsbereiche', 'Event sections', 'أقسام الفعاليات'),
    },
    fields: [
      headingField({
        description: label(
          'Zeigt die nächsten veröffentlichten Veranstaltungen; ohne kommende Termine erscheint der Bereich nicht.',
          'Shows the next published events; without upcoming dates the section does not appear.',
          'يعرض الفعاليات المنشورة القادمة، ولا يظهر القسم إن لم توجد مواعيد قادمة.',
        ),
      }),
      {
        name: 'count',
        type: 'select',
        required: true,
        defaultValue: '2',
        label: label('Anzahl', 'Number', 'العدد'),
        options: [
          { value: '2', label: '2' },
          { value: '4', label: '4' },
        ],
      },
    ],
  },
  'cms',
)

export const FocusAreasBlock = block(
  {
    slug: 'focusAreas',
    interfaceName: 'FocusAreasBlock',
    labels: {
      singular: label('Schwerpunkte', 'Focus areas', 'مجالات العمل'),
      plural: label('Schwerpunktbereiche', 'Focus area sections', 'أقسام مجالات العمل'),
    },
    fields: [
      optionalHeading,
      {
        name: 'variant',
        type: 'select',
        required: true,
        defaultValue: 'names',
        label: label('Darstellung', 'Display', 'طريقة العرض'),
        options: [
          { value: 'names', label: label('Symbol und Name', 'Icon and name', 'الأيقونة والاسم') },
          {
            value: 'details',
            label: label('Mit Beschreibung', 'With description', 'مع الوصف'),
          },
        ],
      },
    ],
  },
  'cms',
)

export const StatsBlock = block(
  {
    slug: 'stats',
    interfaceName: 'StatsBlock',
    labels: {
      singular: label('Kennzahlen', 'Statistics', 'الأرقام'),
      plural: label('Kennzahlenbereiche', 'Statistics sections', 'أقسام الأرقام'),
    },
    fields: [
      headingField({
        description: label(
          'Der Bereich erscheint nur, wenn Kennzahlen gepflegt sind.',
          'The section only appears when statistics exist.',
          'يظهر هذا القسم فقط عند وجود أرقام.',
        ),
      }),
    ],
  },
  'cms',
)

export const BoardBlock = block(
  {
    slug: 'board',
    interfaceName: 'BoardBlock',
    labels: {
      singular: label('Vorstand', 'Board', 'مجلس الإدارة'),
      plural: label('Vorstandsbereiche', 'Board sections', 'أقسام مجلس الإدارة'),
    },
    fields: [
      optionalHeading,
      plainText('intro', label('Einleitung', 'Introduction', 'المقدمة'), { maxLength: 600 }),
    ],
  },
  'cms',
)

export const PartnersBlock = block(
  {
    slug: 'partners',
    interfaceName: 'PartnersBlock',
    labels: {
      singular: label('Partner', 'Partners', 'الشركاء'),
      plural: label('Partnerbereiche', 'Partner sections', 'أقسام الشركاء'),
    },
    fields: [optionalHeading],
  },
  'cms',
)

export const MembershipFormBlock = block(
  {
    slug: 'membershipForm',
    interfaceName: 'MembershipFormBlock',
    labels: {
      singular: label('Mitgliedsantrag', 'Membership form', 'نموذج العضوية'),
      plural: label('Mitgliedsanträge', 'Membership forms', 'نماذج العضوية'),
    },
    fields: [
      headingField({
        description: label(
          'Das Antragsformular selbst. Die Erklärungen im Formular stehen unter „Formulartexte“.',
          'The application form itself. The declarations in the form are under "Form texts".',
          'نموذج الطلب نفسه. الإقرارات داخل النموذج موجودة في «نصوص النماذج».',
        ),
      }),
      plainText(
        'note',
        label('Hinweis zum Antrag', 'Note about the application', 'ملاحظة حول الطلب'),
        {
          maxLength: 1000,
        },
      ),
    ],
  },
  'forms',
)

export const ContactFormBlock = block(
  {
    slug: 'contactForm',
    interfaceName: 'ContactFormBlock',
    labels: {
      singular: label('Kontakt und Formular', 'Contact and form', 'التواصل والنموذج'),
      plural: label('Kontakt und Formular', 'Contact and form', 'التواصل والنموذج'),
    },
    fields: [
      {
        ...richTextField('intro', label('Einleitung', 'Introduction', 'المقدمة')),
        admin: {
          description: label(
            'E-Mail, Telefon und Anschrift kommen aus den Website-Einstellungen; das Kontaktformular steht daneben.',
            'E-mail, phone and address come from the site settings; the contact form is next to them.',
            'البريد والهاتف والعنوان من إعدادات الموقع، ونموذج التواصل بجانبها.',
          ),
        },
      } as Block['fields'][number],
      plainText('officeHours', label('Erreichbarkeit', 'Availability', 'أوقات التواصل'), {
        maxLength: 400,
      }),
      {
        type: 'row',
        fields: [
          {
            name: 'showEmail',
            type: 'checkbox',
            defaultValue: true,
            label: label('E-Mail zeigen', 'Show e-mail', 'إظهار البريد'),
          },
          {
            name: 'showPhone',
            type: 'checkbox',
            defaultValue: false,
            label: label('Telefon zeigen', 'Show phone', 'إظهار الهاتف'),
          },
          {
            name: 'showAddress',
            type: 'checkbox',
            defaultValue: true,
            label: label('Anschrift zeigen', 'Show address', 'إظهار العنوان'),
          },
        ],
      },
    ],
  },
  'forms',
)

export const OPENING_BLOCKS = ['header', 'hero', 'mediaHeader'] as const
export const FORM_BLOCKS = { membershipForm: 'membership', contactForm: 'contact' } as const

export const PAGE_BLOCKS: Block[] = [
  PageHeaderBlock,
  HomeHeroBlock,
  MediaHeaderBlock,
  TextBlock,
  CardsBlock,
  ImageTextBlock,
  StatementBlock,
  QuoteBlock,
  FaqBlock,
  GalleryBlock,
  TimelineBlock,
  ValuesBlock,
  JourneyBlock,
  NightBandBlock,
  CallToActionBlock,
  DonationBlock,
  ProjectsBlock,
  NewsBlock,
  EventsBlock,
  FocusAreasBlock,
  StatsBlock,
  BoardBlock,
  PartnersBlock,
  MembershipFormBlock,
  ContactFormBlock,
]
