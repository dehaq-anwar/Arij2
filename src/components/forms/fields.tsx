'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import { HONEYPOT } from '@/lib/forms/types'

const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-sm font-medium text-danger">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 size-4 flex-none"
        fill="currentColor"
      >
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4.2h1.8v5.6H9.1V5.7Zm.9 9a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
      </svg>
      {error}
    </p>
  )
}

type TextFieldProps = {
  id: string
  name: string
  label: ReactNode
  error?: string
  hint?: ReactNode
  defaultValue?: string
  type?: 'text' | 'email'
  autoComplete?: string
  maxLength?: number
  multiline?: boolean
  className?: string
}

export function TextField({
  id,
  name,
  label,
  error,
  hint,
  defaultValue,
  type = 'text',
  autoComplete,
  maxLength,
  multiline = false,
  className = '',
}: TextFieldProps) {
  const props = {
    id,
    name,
    defaultValue,
    maxLength,
    autoComplete,
    required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(hint !== undefined && `${id}-hint`, error && `${id}-error`),
    className: 'field-input mt-2',
  } as const
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {hint !== undefined ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      <ErrorText id={`${id}-error`} error={error} />
      {multiline ? (
        <textarea {...props} rows={7} />
      ) : (
        // E-mail addresses are always written left to right, also on Arabic pages.
        <input {...props} type={type} dir={type === 'email' ? 'ltr' : undefined} />
      )}
    </div>
  )
}

export function SelectField({
  id,
  name,
  label,
  error,
  options,
  defaultValue,
}: {
  id: string
  name: string
  label: ReactNode
  error?: string
  options: { value: string; label: string }[]
  defaultValue?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <ErrorText id={`${id}-error`} error={error} />
      <div className="relative mt-2">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && `${id}-error`)}
          className="field-input"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m5 8 5 5 5-5" />
        </svg>
      </div>
    </div>
  )
}

export function CheckboxField({
  id,
  name,
  label,
  error,
  defaultChecked,
  required = true,
  children,
}: {
  id: string
  name: string
  label: ReactNode
  error?: string
  defaultChecked?: boolean
  required?: boolean
  /** Shown below the label and linked to the checkbox (e.g. the privacy-policy link). */
  children?: ReactNode
}) {
  return (
    <div>
      <ErrorText id={`${id}-error`} error={error} />
      <div className="flex items-start gap-3 py-1.5">
        <input
          type="checkbox"
          id={id}
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            error && `${id}-error`,
            children !== undefined && `${id}-more`,
          )}
          className="field-check"
        />
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer leading-relaxed">
            {label}
          </label>
          {children !== undefined ? (
            <div id={`${id}-more`} className="mt-1 text-sm">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function RadioCards({
  id,
  name,
  legend,
  error,
  options,
  defaultValue,
}: {
  id: string
  name: string
  legend: ReactNode
  error?: string
  options: { value: string; label: string }[]
  defaultValue?: string
}) {
  return (
    <fieldset aria-describedby={describedBy(error && `${id}-error`)}>
      <legend className="font-medium">{legend}</legend>
      <ErrorText id={`${id}-error`} error={error} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            data-invalid={error ? '' : undefined}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line-strong px-4 py-3 transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-sky hover:border-ink-muted data-[invalid]:border-danger"
          >
            <input
              type="radio"
              id={`${id}-${o.value}`}
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              required
              className="field-check mt-0"
            />
            <span className="font-medium">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** A field people never see (hidden visually and from assistive technology); bots fill it in. */
export function Honeypot({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        {label}
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}

/** Error summary at the top of the form; receives focus after every failed submission. */
export function ErrorSummary({
  id,
  heading,
  items,
  notice,
  stamp,
}: {
  id: string
  heading: string
  items: { href: string; text: string }[]
  notice?: string
  /** Changes with every response, so focus moves here again after each attempt. */
  stamp: unknown
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [stamp])
  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-labelledby={`${id}-heading`}
      className="mb-10 rounded-2xl border-2 border-danger bg-surface p-5 outline-none focus-visible:outline-2 sm:p-6"
    >
      <h3 id={`${id}-heading`} className="text-lg font-semibold">
        {heading}
      </h3>
      {notice ? <p className="mt-2">{notice}</p> : null}
      {items.length ? (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="font-medium text-danger underline">
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SubmitButton({
  children,
  pendingLabel,
}: {
  children: ReactNode
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-accent px-8 py-3.5 font-semibold text-on-accent transition-colors duration-300 hover:bg-accent-hover disabled:cursor-progress disabled:opacity-80"
    >
      {pending ? pendingLabel : children}
    </button>
  )
}

/** Replaces the form after sending; announced and focused. */
export function SuccessPanel({ heading, text }: { heading: string; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div ref={ref} tabIndex={-1} className="py-6 text-center outline-none sm:py-10">
      <span
        aria-hidden="true"
        className="mx-auto grid size-16 place-items-center rounded-full bg-surface-sky text-accent"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h3 className="mt-6 text-2xl font-semibold">{heading}</h3>
      <p className="mx-auto mt-3 max-w-md text-lg text-ink-muted">{text}</p>
    </div>
  )
}
