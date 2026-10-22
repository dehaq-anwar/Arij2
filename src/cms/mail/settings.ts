import type { GlobalBeforeChangeHook, GlobalConfig, Payload } from 'payload'

import { can, type PermissionSubject } from '../access/permissions'
import { allow } from '../access/roles'
import { hasFreshStepUp } from '../auth/session-state'
import { refuse, STEP_UP_MESSAGE } from '../lib/errors'
import { groups, label } from '../lib/labels'

export const DEFAULT_FROM_NAME = 'Youth of Peace e.V. – Website'

/**
 * E-mail settings the association manages without code (docs/CONTROL-CENTER.md §6): the mail
 * server's address, port, user name and sender, who receives notifications and technical
 * warnings, and the domain the deliverability checks look at. The password stays on the server
 * (SMTP_PASSWORD, decision 16). Empty fields fall back to the server settings (.env), so an
 * installation configured there keeps working unchanged.
 */
export type MailSettings = {
  host: string | null
  port: number
  user: string | null
  passwordSet: boolean
  fromAddress: string | null
  fromName: string
  notifyAddress: string | null
  technicalAddress: string | null
  domain: string | null
  dkimSelector: string | null
  /** Which values come from this screen and which from the server. */
  source: { host: 'settings' | 'server' | null; fromAddress: 'settings' | 'server' | null }
}

type Stored = {
  smtp?: {
    host?: string | null
    port?: number | null
    user?: string | null
    fromAddress?: string | null
    fromName?: string | null
  }
  addresses?: { notify?: string | null; technical?: string | null }
  domain?: { name?: string | null; dkimSelector?: string | null }
}

const clean = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null)

export function resolveMailSettings(
  stored: Stored | null,
  env: Record<string, string | undefined> = process.env,
): MailSettings {
  const smtp = stored?.smtp ?? {}
  const host = clean(smtp.host) ?? clean(env.SMTP_HOST)
  const fromAddress = clean(smtp.fromAddress) ?? clean(env.SMTP_FROM)
  const port = Number(smtp.port || env.SMTP_PORT || 587)
  return {
    host,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587,
    user: clean(smtp.user) ?? clean(env.SMTP_USER),
    passwordSet: Boolean(env.SMTP_PASSWORD),
    fromAddress,
    fromName: clean(smtp.fromName) ?? DEFAULT_FROM_NAME,
    notifyAddress: clean(stored?.addresses?.notify) ?? clean(env.NOTIFY_EMAIL),
    technicalAddress: clean(stored?.addresses?.technical),
    domain: clean(stored?.domain?.name) ?? fromAddress?.split('@')[1] ?? null,
    dkimSelector: clean(stored?.domain?.dkimSelector),
    source: {
      host: clean(smtp.host) ? 'settings' : host ? 'server' : null,
      fromAddress: clean(smtp.fromAddress) ? 'settings' : fromAddress ? 'server' : null,
    },
  }
}

let cached: { at: number; value: MailSettings } | null = null
const CACHE_MS = 30_000

/** The settings in effect; read at most every 30 seconds (and right after a change). */
export async function mailSettings(payload: Payload): Promise<MailSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value
  let stored: Stored | null = null
  try {
    stored = (await payload.findGlobal({
      slug: 'email-settings',
      overrideAccess: true,
      depth: 0,
    })) as Stored
  } catch {
    // Database not migrated yet (scripts, first start): the server settings apply.
  }
  cached = { at: Date.now(), value: resolveMailSettings(stored) }
  return cached.value
}

export const forgetMailSettings = () => {
  cached = null
}

/** Changing where e-mails go is a sensitive action: only with a fresh code. */
const requireCode: GlobalBeforeChangeHook = async ({ data, req }) => {
  if (req.user && !(await hasFreshStepUp(req))) throw refuse(req, STEP_UP_MESSAGE)
  return data
}

const email = (value: unknown) =>
  !value || (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    ? true
    : 'E-Mail-Adresse prüfen / Check the e-mail address / تحقق من عنوان البريد'

const hostName = (value: unknown) =>
  !value || (typeof value === 'string' && /^[a-z0-9.-]+$/i.test(value.trim()))
    ? true
    : 'Nur ein Hostname, z. B. smtp.example.org / A host name only / اسم خادم فقط'

export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  label: label('E-Mail-Einstellungen', 'E-mail settings', 'إعدادات البريد'),
  admin: {
    group: groups.admin,
    hidden: ({ user }) => !can(user as PermissionSubject, 'email.manage'),
    description: label(
      'Leere Felder übernehmen die Werte vom Server (.env). Das Passwort des Mailservers steht nur auf dem Server (SMTP_PASSWORD). Änderungen brauchen einen Code und stehen im Audit-Log.',
      'Empty fields use the server settings (.env). The mail server password is kept on the server only (SMTP_PASSWORD). Changes need a code and are recorded in the audit log.',
      'الحقول الفارغة تأخذ القيم من إعدادات الخادم (\u2066.env\u2069). كلمة مرور خادم البريد محفوظة على الخادم فقط (SMTP_PASSWORD). تتطلب التغييرات رمزًا وتُسجَّل في سجل العمليات.',
    ),
  },
  access: { read: allow('email.manage'), update: allow('email.manage') },
  hooks: {
    beforeChange: [requireCode],
    afterChange: [
      ({ doc }) => {
        forgetMailSettings()
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'ui',
      name: 'stepUp',
      admin: { components: { Field: '/cms/admin/mail/SettingsStepUp#SettingsStepUp' } },
    },
    {
      name: 'smtp',
      type: 'group',
      label: label('Mailserver (SMTP)', 'Mail server (SMTP)', 'خادم البريد (SMTP)'),
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'host',
              type: 'text',
              validate: hostName,
              label: label('Server', 'Server', 'الخادم'),
              admin: { placeholder: 'smtp.example.org', width: '60%' },
            },
            {
              name: 'port',
              type: 'number',
              min: 1,
              max: 65535,
              label: label('Port', 'Port', 'المنفذ'),
              admin: {
                width: '40%',
                description: label(
                  '465 = TLS, sonst STARTTLS (Pflicht).',
                  '465 = TLS, otherwise STARTTLS (required).',
                  'المنفذ 465 يعني TLS، وأي منفذ آخر يتطلب STARTTLS.',
                ),
              },
            },
          ],
        },
        {
          name: 'user',
          type: 'text',
          label: label('Benutzername', 'User name', 'اسم المستخدم'),
          admin: { autoComplete: 'off' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'fromAddress',
              type: 'text',
              validate: email,
              label: label('Absenderadresse', 'Sender address', 'عنوان المرسل'),
              admin: { width: '50%' },
            },
            {
              name: 'fromName',
              type: 'text',
              label: label('Absendername', 'Sender name', 'اسم المرسل'),
              admin: { width: '50%', placeholder: DEFAULT_FROM_NAME },
            },
          ],
        },
      ],
    },
    {
      name: 'addresses',
      type: 'group',
      label: label('Empfänger', 'Recipients', 'المستلمون'),
      fields: [
        {
          name: 'notify',
          type: 'text',
          validate: email,
          label: label(
            'Neue Anträge und Nachrichten',
            'New applications and messages',
            'الطلبات والرسائل الجديدة',
          ),
          admin: {
            description: label(
              'Erhält nur einen Hinweis mit Link, keine Angaben zur Person.',
              'Receives a notice with a link only, no personal data.',
              'يتلقى إشعارًا برابط فقط، دون بيانات شخصية.',
            ),
          },
        },
        {
          name: 'technical',
          type: 'text',
          validate: email,
          label: label('Technische Warnungen', 'Technical warnings', 'التنبيهات التقنية'),
          admin: {
            description: label(
              'Sicherung oder Prüfung fehlgeschlagen, Dienst ausgefallen, Zertifikat läuft ab, Speicher fast voll. Leer: nur in der Glocke.',
              'Backup or drill failed, service down, certificate expiring, disk almost full. Empty: in the bell only.',
              'فشل النسخ الاحتياطي أو الاختبار، توقف خدمة، قرب انتهاء الشهادة، امتلاء القرص. فارغ: في الجرس فقط.',
            ),
          },
        },
      ],
    },
    {
      name: 'domain',
      type: 'group',
      label: label('Domain-Prüfung', 'Domain check', 'فحص النطاق'),
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              validate: hostName,
              label: label('Domain', 'Domain', 'النطاق'),
              admin: {
                width: '50%',
                placeholder: 'yop-ye.org',
                description: label(
                  'Leer: die Domain der Absenderadresse.',
                  'Empty: the sender address’s domain.',
                  'فارغ: نطاق عنوان المرسل.',
                ),
              },
            },
            {
              name: 'dkimSelector',
              type: 'text',
              validate: (value: unknown) =>
                !value || (typeof value === 'string' && /^[a-z0-9._-]+$/i.test(value.trim()))
                  ? true
                  : 'Selektor prüfen / Check the selector / تحقق من المحدِّد',
              label: label('DKIM-Selektor', 'DKIM selector', 'محدِّد DKIM'),
              admin: {
                width: '50%',
                description: label(
                  'Nennt der Mail-Anbieter, z. B. „default“ oder „mail“.',
                  'Given by the mail provider, e.g. “default” or “mail”.',
                  'يحدده مزود البريد، مثل «default» أو «mail».',
                ),
              },
            },
          ],
        },
      ],
    },
  ],
}
