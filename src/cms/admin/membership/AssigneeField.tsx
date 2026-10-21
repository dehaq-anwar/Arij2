'use client'

import { SelectInput, useDocumentInfo, useField } from '@payloadcms/ui'
import type { RelationshipFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

import { useAdminText } from '../client'

type Person = { id: number; name: string }

const idOf = (value: unknown): number | null => {
  const raw = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
  const id = Number(raw)
  return raw == null || raw === '' || !Number.isInteger(id) ? null : id
}

/**
 * "Assigned to" on applications and contact messages: a menu of the people who can work on the
 * inbox, loaded from the server (src/cms/membership/assignees.ts) with names only, so it works
 * for people who may not open the accounts list. The server checks the choice again.
 */
export const AssigneeField: RelationshipFieldClientComponent = ({ field, path, readOnly }) => {
  const { t } = useAdminText()
  const { collectionSlug } = useDocumentInfo()
  const { value, setValue, showError, errorMessage, disabled } = useField<unknown>({ path })
  const current = idOf(value)
  // Only the person assigned when the record was opened may need to be looked up.
  const [initial] = useState(current)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [former, setFormer] = useState<Person | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const query = initial === null ? '' : `?current=${initial}`
    fetch(`/api/${collectionSlug}/assignees${query}`, { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: { people: Person[]; former: Person | null }) => {
        if (cancelled) return
        setPeople(data.people)
        setFormer(data.former)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [collectionSlug, initial])

  const options = [
    ...(people ?? []).map((person) => ({ label: person.name, value: String(person.id) })),
    ...(former && former.id === current
      ? [{ label: `${former.name} (${t.assigneeNoAccess})`, value: String(former.id) }]
      : []),
  ]

  return (
    <SelectInput
      path={path}
      name={field.name}
      label={field.label}
      description={failed ? t.assigneeUnavailable : field.admin?.description}
      required={field.required}
      readOnly={readOnly || disabled || failed || people === null}
      showError={showError}
      Error={showError && errorMessage ? <p className="yop-field-error">{errorMessage}</p> : null}
      isClearable
      placeholder={people === null && !failed ? t.assigneeLoading : t.assigneeNobody}
      options={options}
      value={current === null ? '' : String(current)}
      onChange={(option) => {
        const picked = Array.isArray(option) ? option[0] : option
        setValue(picked?.value ? Number(picked.value) : null)
      }}
    />
  )
}
