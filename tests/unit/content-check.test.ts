import { describe, expect, it } from 'vitest'

import { findUnfinished } from '@/lib/content-check'

describe('the launch gate on the content', () => {
  it('finds placeholders and draft texts at any depth, in every language', () => {
    const page = {
      id: 3,
      title: { de: 'Über uns', en: '[PLACEHOLDER: title]', ar: 'من نحن' },
      blocks: [
        { blockType: 'text', body: { root: { children: [{ text: '[ENTWURF] Satzungstext' }] } } },
        { blockType: 'cards', items: [{ label: { ar: '[مسودة] نص' } }] },
      ],
      slug: 'placeholder-ok',
    }
    expect(findUnfinished('pages/3', page)).toEqual([
      { where: 'pages/3', path: 'title.en', kind: 'placeholder', text: '[PLACEHOLDER: title]' },
      {
        where: 'pages/3',
        path: 'blocks.0.body.root.children.0.text',
        kind: 'draft',
        text: '[ENTWURF] Satzungstext',
      },
      { where: 'pages/3', path: 'blocks.1.items.0.label.ar', kind: 'draft', text: '[مسودة] نص' },
    ])
  })

  it('finds nothing in finished content', () => {
    expect(findUnfinished('news/1', { title: { de: 'Sommerfest', en: 'Summer party' } })).toEqual(
      [],
    )
  })
})
