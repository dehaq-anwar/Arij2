/** Content the association still has to supply. */
export const isPlaceholder = (text: string) => text.trimStart().startsWith('[PLACEHOLDER')

/** Drafted text that still needs the association's approval. */
export const isDraft = (text: string) => /^\s*\[(ENTWURF|DRAFT|مسودة)\]/.test(text)

/** "[PLACEHOLDER: Projekttitel 1]" → "Projekttitel 1" (for places where a frame would not fit). */
export const placeholderLabel = (text: string) =>
  text.replace(/^\s*\[PLACEHOLDER:?\s*/, '').replace(/\]\s*$/, '')

/** "[ENTWURF] Text" → "Text" (the draft is then marked with a label instead). */
export const draftLabel = (text: string) => text.replace(/^\s*\[(ENTWURF|DRAFT|مسودة)\]\s*/, '')
