import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePath = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath }))

const { revalidateAfterChange, revalidateGlobal } = await import('@/cms/hooks/revalidate')

const req = { context: {}, payload: { logger: { warn: vi.fn() } } } as unknown as PayloadRequest
const change = (doc: object, previousDoc?: object) =>
  revalidateAfterChange({ doc, previousDoc, req } as never)

describe('marking cached pages as stale', () => {
  beforeEach(() => revalidatePath.mockClear())

  it('not for a draft that was never published (create screen, autosave)', () => {
    change({ _status: 'draft' })
    change({ _status: 'draft' }, { _status: 'draft' })
    revalidateGlobal({ doc: { _status: 'draft' }, previousDoc: {}, req } as never)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('for publishing, unpublishing and documents without drafts', () => {
    change({ _status: 'published' }, { _status: 'draft' })
    change({ _status: 'draft' }, { _status: 'published' })
    change({ title: 'Partner' }, { title: 'Partner alt' })
    revalidateGlobal({ doc: { title: 'Fußzeile' }, previousDoc: {}, req } as never)
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('not for scripts outside Next.js', () => {
    revalidateAfterChange({
      doc: { _status: 'published' },
      previousDoc: {},
      req: { ...req, context: { disableRevalidate: true } },
    } as never)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
