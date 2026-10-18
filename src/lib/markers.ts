/** Content the association still has to supply. */
export const isPlaceholder = (text: string) => text.trimStart().startsWith('[PLACEHOLDER')

/** Drafted text that still needs the association's approval. */
export const isDraft = (text: string) => /^\s*\[(ENTWURF|DRAFT|مسودة)\]/.test(text)
