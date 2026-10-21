import type { AdminLabel } from '../lib/labels'
import { label } from '../lib/labels'

/**
 * The legal bases of Art. 6(1) GDPR, as the collection `legal-bases` is first filled (migration
 * 20261021). German and English follow the regulation's wording (EUR-Lex was not reachable from
 * the build environment, so the texts are to be compared with the official text,
 * https://eur-lex.europa.eu/eli/reg/2016/679/oj, before production). There is no official
 * Arabic version of the GDPR: the Arabic text is an unofficial translation and says so.
 *
 * The explanations help to choose; they are not legal advice. Which basis fits a purpose is the
 * association's decision, recorded when it approves the purpose (processing-purposes).
 */
export const LEGAL_BASIS_CODES = ['a', 'b', 'c', 'd', 'e', 'f'] as const
export type LegalBasisCode = (typeof LEGAL_BASIS_CODES)[number]

export type LegalBasisText = {
  code: LegalBasisCode
  title: AdminLabel
  article: AdminLabel
  wording: AdminLabel
  explanation: AdminLabel
}

const article = (code: LegalBasisCode): AdminLabel =>
  label(
    `Art. 6 Abs. 1 lit. ${code} DSGVO`,
    `Art. 6(1)(${code}) GDPR`,
    `المادة 6، الفقرة 1، البند (${code}) من اللائحة العامة لحماية البيانات`,
  )

export const LEGAL_BASES: LegalBasisText[] = [
  {
    code: 'a',
    title: label('Einwilligung', 'Consent', 'الموافقة'),
    article: article('a'),
    wording: label(
      'Die betroffene Person hat ihre Einwilligung zu der Verarbeitung der sie betreffenden personenbezogenen Daten für einen oder mehrere bestimmte Zwecke gegeben.',
      'The data subject has given consent to the processing of his or her personal data for one or more specific purposes.',
      'أعطى صاحب البيانات موافقته على معالجة بياناته الشخصية لغرض محدد واحد أو أكثر. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Nur wenn die Personen freiwillig, informiert und für genau diesen Zweck eingewilligt haben und der Verein das nachweisen kann. Eine Einwilligung kann jederzeit widerrufen werden; danach ist die Verarbeitung für diesen Zweck nicht mehr zulässig. Beispiel: ein Newsletter an Personen, die ihn bestellt haben.',
      'Only if the people consented freely, informed and for exactly this purpose, and the association can prove it. Consent can be withdrawn at any time; after that, processing for this purpose is no longer allowed. Example: a newsletter to people who signed up for it.',
      'فقط إذا وافق الأشخاص بحرية وعن علم ولهذا الغرض تحديدًا، وكان بإمكان الجمعية إثبات ذلك. يمكن سحب الموافقة في أي وقت، وبعدها لا تعود المعالجة لهذا الغرض جائزة. مثال: نشرة إخبارية لمن اشترك فيها.',
    ),
  },
  {
    code: 'b',
    title: label(
      'Vertrag oder vorvertragliche Maßnahmen',
      'Contract or steps before a contract',
      'العقد أو الإجراءات السابقة للتعاقد',
    ),
    article: article('b'),
    wording: label(
      'Die Verarbeitung ist für die Erfüllung eines Vertrags, dessen Vertragspartei die betroffene Person ist, oder zur Durchführung vorvertraglicher Maßnahmen erforderlich, die auf Anfrage der betroffenen Person erfolgen.',
      'Processing is necessary for the performance of a contract to which the data subject is party or in order to take steps at the request of the data subject prior to entering into a contract.',
      'المعالجة ضرورية لتنفيذ عقد يكون صاحب البيانات طرفًا فيه، أو لاتخاذ إجراءات بناءً على طلبه قبل إبرام العقد. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Für das, was zur Durchführung der Mitgliedschaft nach der Satzung oder zur Bearbeitung eines Mitgliedsantrags wirklich erforderlich ist. Bei Vereinen wird die Verwaltung der Mitgliedschaft häufig hierauf gestützt. Beispiel: Einladung der Mitglieder zur Mitgliederversammlung, wie die Satzung sie vorsieht.',
      'For what is really necessary to carry out the membership under the statutes or to handle a membership application. Associations often base the administration of their membership on it. Example: inviting members to the general meeting as the statutes require.',
      'لما هو ضروري فعلًا لتنفيذ العضوية وفق النظام الأساسي أو لمعالجة طلب عضوية. كثيرًا ما تستند الجمعيات إليه في إدارة العضوية. مثال: دعوة الأعضاء إلى الجمعية العمومية كما ينص النظام الأساسي.',
    ),
  },
  {
    code: 'c',
    title: label('Rechtliche Verpflichtung', 'Legal obligation', 'الالتزام القانوني'),
    article: article('c'),
    wording: label(
      'Die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich, der der Verantwortliche unterliegt.',
      'Processing is necessary for compliance with a legal obligation to which the controller is subject.',
      'المعالجة ضرورية للامتثال لالتزام قانوني يخضع له المسؤول عن المعالجة. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Wenn ein Gesetz den Verein zu genau dieser Verarbeitung verpflichtet, etwa zu Aufbewahrung oder Auskunft gegenüber einer Behörde. Die Vorschrift sollte in der Begründung des Zwecks genannt werden.',
      'When a law obliges the association to exactly this processing, for example to keep records or to inform an authority. The provision should be named in the purpose’s justification.',
      'عندما يُلزم قانونٌ الجمعيةَ بهذه المعالجة تحديدًا، مثل الحفظ أو تقديم معلومات لجهة رسمية. ينبغي ذكر النص القانوني في تبرير الغرض.',
    ),
  },
  {
    code: 'd',
    title: label('Lebenswichtige Interessen', 'Vital interests', 'المصالح الحيوية'),
    article: article('d'),
    wording: label(
      'Die Verarbeitung ist erforderlich, um lebenswichtige Interessen der betroffenen Person oder einer anderen natürlichen Person zu schützen.',
      'Processing is necessary in order to protect the vital interests of the data subject or of another natural person.',
      'المعالجة ضرورية لحماية المصالح الحيوية لصاحب البيانات أو لشخص طبيعي آخر. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Nur um Leben oder Gesundheit eines Menschen zu schützen, etwa in einem Notfall. Für Exporte im Vereinsalltag in der Regel nicht passend.',
      'Only to protect someone’s life or health, for example in an emergency. As a rule not suitable for everyday exports of an association.',
      'فقط لحماية حياة إنسان أو صحته، كما في حالات الطوارئ. لا يناسب عادةً عمليات التصدير في عمل الجمعية اليومي.',
    ),
  },
  {
    code: 'e',
    title: label(
      'Öffentliches Interesse oder öffentliche Gewalt',
      'Public interest or official authority',
      'المصلحة العامة أو السلطة الرسمية',
    ),
    article: article('e'),
    wording: label(
      'Die Verarbeitung ist für die Wahrnehmung einer Aufgabe erforderlich, die im öffentlichen Interesse liegt oder in Ausübung öffentlicher Gewalt erfolgt, die dem Verantwortlichen übertragen wurde.',
      'Processing is necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller.',
      'المعالجة ضرورية لأداء مهمة تُنفَّذ للمصلحة العامة أو في ممارسة سلطة رسمية مخوَّلة للمسؤول عن المعالجة. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Für Aufgaben, die dem Verein durch Gesetz im öffentlichen Interesse oder als öffentliche Gewalt übertragen sind. Für einen privaten Verein in der Regel nicht passend.',
      'For tasks a law assigns to the association in the public interest or as official authority. As a rule not suitable for a private association.',
      'للمهام التي يسندها القانون إلى الجمعية للمصلحة العامة أو كسلطة رسمية. لا يناسب عادةً جمعية خاصة.',
    ),
  },
  {
    code: 'f',
    title: label('Berechtigte Interessen', 'Legitimate interests', 'المصالح المشروعة'),
    article: article('f'),
    wording: label(
      'Die Verarbeitung ist zur Wahrung der berechtigten Interessen des Verantwortlichen oder eines Dritten erforderlich, sofern nicht die Interessen oder Grundrechte und Grundfreiheiten der betroffenen Person, die den Schutz personenbezogener Daten erfordern, überwiegen, insbesondere dann, wenn es sich bei der betroffenen Person um ein Kind handelt.',
      'Processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.',
      'المعالجة ضرورية لأغراض المصالح المشروعة التي يسعى إليها المسؤول عن المعالجة أو طرف ثالث، إلا إذا رجحت عليها مصالح صاحب البيانات أو حقوقه وحرياته الأساسية التي تتطلب حماية البيانات الشخصية، ولا سيما إذا كان صاحب البيانات طفلًا. (ترجمة غير رسمية)',
    ),
    explanation: label(
      'Wenn der Verein ein berechtigtes Interesse hat und die Interessen der betroffenen Personen nicht überwiegen. Dafür ist eine Abwägung nötig, die in der Begründung des Zwecks festgehalten wird; bei Kindern ist besondere Zurückhaltung geboten.',
      'When the association has a legitimate interest and the interests of the people concerned do not override it. This needs a balancing test, recorded in the purpose’s justification; particular restraint applies to children.',
      'عندما تكون للجمعية مصلحة مشروعة ولا ترجح عليها مصالح الأشخاص المعنيين. يتطلب ذلك موازنة تُدوَّن في تبرير الغرض، مع حذر خاص فيما يتعلق بالأطفال.',
    ),
  },
]

/** Shown with the list: the explanations are aids, not legal advice. */
export const LEGAL_BASES_NOTE = label(
  'Erläuterungen ohne Gewähr, keine Rechtsberatung. Welche Rechtsgrundlage zu einem Zweck passt, entscheidet der Verein, wenn er den Zweck beschließt.',
  'Explanations without guarantee, not legal advice. Which legal basis fits a purpose is decided by the association when it approves the purpose.',
  'شروح دون ضمان، وليست استشارة قانونية. تقرر الجمعية أي أساس قانوني يناسب الغرض عند إقرارها للغرض.',
)
