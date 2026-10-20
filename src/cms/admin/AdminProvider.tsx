'use client'

import type { ReactNode } from 'react'

import './styles/admin.css'

/** Loads the Control Center's styles on every admin screen. */
export function AdminProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>
}
