import { notFound } from 'next/navigation'

// Any unknown path below a locale renders that locale's 404 page (with header, footer, lang, dir).
export default function CatchAll() {
  notFound()
}
