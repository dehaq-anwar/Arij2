import type {
  CollectionBeforeValidateHook,
  CollectionConfig,
  TextFieldSingleValidation,
} from 'payload'
import { ValidationError } from 'payload'

import { routing } from '@/i18n/routing'

import { allow } from '../access/roles'
import { linkFields } from '../blocks/fields'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { groups, label, localizedMessage } from '../lib/labels'
import { hiddenWithoutContent } from './content-access'

/**
 * Forwarding of old addresses (CC-2), e.g. after a page was renamed: /alte-seite → a page of the
 * website, a page of the page builder, or another site. Applied only where the website would
 * otherwise answer "not found", so an existing page can never be hidden by a redirect.
 */

/** "/Alte-Seite/" → "/alte-seite": one form, so that every spelling is found. */
export function normalizePath(path: string): string {
  const trimmed = path.trim().split(/[?#]/)[0] ?? ''
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const single = withSlash.replace(/\/{2,}/g, '/')
  const noTrailing = single.length > 1 ? single.replace(/\/+$/, '') : single
  try {
    return decodeURIComponent(noTrailing).toLowerCase()
  } catch {
    return noTrailing.toLowerCase()
  }
}

const PATH = /^\/[\p{L}\p{N}\-._~/%]*$/u

const validateFrom: TextFieldSingleValidation = (value, { req }) => {
  const path = typeof value === 'string' ? normalizePath(value) : ''
  if (path.length > 1 && path.length <= 300 && PATH.test(path)) {
    if (FIXED_PATHS.has(path)) {
      return localizedMessage(
        label(
          'Diese Adresse gehört zu einer Seite der Website; eine Weiterleitung würde dort nie greifen.',
          'This address belongs to a page of the website; a redirect would never apply there.',
          'هذا العنوان لصفحة موجودة في الموقع، ولن يعمل التحويل عليه أبدًا.',
        ),
        req,
      )
    }
    if (/^\/(?:admin|api|_next|preview)(?:\/|$)/.test(path)) {
      return localizedMessage(
        label(
          'Adressen des Control Centers können nicht umgeleitet werden.',
          'Addresses of the Control Center cannot be redirected.',
          'لا يمكن تحويل عناوين مركز التحكم.',
        ),
        req,
      )
    }
    return true
  }
  return localizedMessage(
    label(
      'Bitte den Pfad der alten Adresse eingeben, beginnend mit „/“ (z. B. /alte-seite oder /en/old-page).',
      'Please enter the path of the old address, starting with "/" (e.g. /old-page or /en/old-page).',
      'يرجى إدخال مسار العنوان القديم مبدوءًا بـ «/» (مثل ‎/old-page‎ أو ‎/en/old-page‎).',
    ),
    req,
  )
}

type RedirectData = {
  id: number
  from?: string
  to?: { kind?: string; route?: string; url?: string; page?: unknown }
}

/**
 * Where a redirect leads as a path on this website, if it does (for the loop check): a full
 * address of the website itself. Fixed pages and pages of the page builder exist, so a redirect
 * never applies to them, and unpublished ones are not redirected to (BlockButton.resolveLink).
 */
const internalPathOf = (to: RedirectData['to']) => {
  if (to?.kind !== 'url' || !to.url || !process.env.SERVER_URL) return null
  try {
    const target = new URL(to.url)
    return target.host === new URL(process.env.SERVER_URL).host
      ? normalizePath(target.pathname)
      : null
  } catch {
    return null
  }
}

/** The addresses of the website's fixed pages in every language ("/kontakt", "/en/contact"). */
const FIXED_PATHS = new Set(
  routing.locales.flatMap((locale) =>
    Object.entries(routing.pathnames)
      .filter(([internal]) => !internal.includes('['))
      .map(([, localized]) => {
        const path = typeof localized === 'string' ? localized : localized[locale]
        const prefixed =
          locale === routing.defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`
        return normalizePath(prefixed)
      }),
  ),
)

/**
 * A redirect must not lead back to itself, directly or through other redirects (at most ten
 * steps are followed); the form is stored in its normalized spelling.
 */
const checkRedirect: CollectionBeforeValidateHook<RedirectData> = async ({
  data,
  req,
  originalDoc,
}) => {
  if (!data) return data
  const from = normalizePath(String(data.from ?? originalDoc?.from ?? ''))
  const result = { ...data, from }
  let next = internalPathOf(data.to ?? originalDoc?.to)
  const seen = new Set([from])
  for (let step = 0; next && step < 10; step++) {
    if (seen.has(next)) {
      throw new ValidationError(
        {
          collection: 'redirects',
          errors: [
            {
              path: 'to',
              message: localizedMessage(
                label(
                  'Diese Weiterleitung würde im Kreis führen.',
                  'This redirect would lead in a circle.',
                  'هذا التحويل سيؤدي إلى حلقة مغلقة.',
                ),
                req,
              ),
            },
          ],
        },
        req.t,
      )
    }
    seen.add(next)
    const { docs } = await req.payload.find({
      collection: 'redirects',
      where: { from: { equals: next } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const followed = docs[0] as RedirectData | undefined
    next = followed && followed.id !== originalDoc?.id ? internalPathOf(followed.to) : null
  }
  return result
}

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: {
    singular: label('Weiterleitung', 'Redirect', 'تحويل'),
    plural: label('Weiterleitungen', 'Redirects', 'التحويلات'),
  },
  admin: {
    useAsTitle: 'from',
    defaultColumns: ['from', 'permanent', 'updatedAt'],
    group: groups.settings,
    hidden: hiddenWithoutContent,
    description: label(
      'Leitet alte Adressen weiter, z. B. nach dem Umbenennen einer Seite. Greift nur, wo es sonst keine Seite gibt.',
      'Forwards old addresses, e.g. after a page was renamed. Applies only where there is no page otherwise.',
      'يحوّل العناوين القديمة، مثلًا بعد تغيير اسم صفحة. لا يعمل إلا حيث لا توجد صفحة.',
    ),
  },
  access: {
    read: allow('content.read'),
    create: allow('content.write'),
    update: allow('content.write'),
    delete: allow('content.write'),
  },
  hooks: {
    beforeValidate: [checkRedirect],
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: 300,
      label: label('Alte Adresse', 'Old address', 'العنوان القديم'),
      admin: {
        placeholder: '/alte-seite',
        description: label(
          'Nur der Pfad, mit Sprache, wenn nötig: /alte-seite, /en/old-page, /ar/old-page.',
          'The path only, with the language if needed: /old-page, /en/old-page, /ar/old-page.',
          'المسار فقط، مع اللغة عند الحاجة: ‎/old-page‎ أو ‎/en/old-page‎ أو ‎/ar/old-page‎.',
        ),
      },
      validate: validateFrom,
    },
    {
      name: 'to',
      type: 'group',
      label: label('Neues Ziel', 'New target', 'الوجهة الجديدة'),
      fields: linkFields().map((field) =>
        field.type === 'row'
          ? {
              ...field,
              fields: field.fields.filter((f) => !('name' in f && f.name === 'label')),
            }
          : field,
      ),
    },
    {
      name: 'permanent',
      type: 'checkbox',
      defaultValue: true,
      label: label(
        'Dauerhaft (für Suchmaschinen)',
        'Permanent (for search engines)',
        'دائم (لمحركات البحث)',
      ),
      admin: {
        position: 'sidebar',
        description: label(
          'Dauerhaft: Suchmaschinen übernehmen die neue Adresse. Vorübergehend: nur für eine Zeit.',
          'Permanent: search engines take over the new address. Temporary: only for a while.',
          'دائم: تعتمد محركات البحث العنوان الجديد. مؤقت: لفترة فقط.',
        ),
      },
    },
  ],
}
