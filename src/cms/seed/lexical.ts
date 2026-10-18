/** Minimal Lexical editor state with plain paragraphs (for seeding rich-text fields). */
export type LexicalState = {
  [k: string]: unknown
  root: {
    type: 'root'
    children: { type: string; version: number; [k: string]: unknown }[]
    direction: 'ltr' | 'rtl' | null
    format: ''
    indent: 0
    version: 1
  }
}

export function paragraphs(...texts: string[]): LexicalState {
  return {
    root: {
      type: 'root',
      direction: null,
      format: '',
      indent: 0,
      version: 1,
      children: texts.map((text) => ({
        type: 'paragraph',
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      })),
    },
  }
}
