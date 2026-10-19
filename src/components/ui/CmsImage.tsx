import Image from 'next/image'

import type { Media } from '@/payload-types'

type Props = {
  media: Media | number | null | undefined
  sizes: string
  className?: string
  preload?: boolean
  /** Fill the (positioned) parent, cropped around the focal point set in the CMS. */
  fill?: boolean
}

/** Same-origin path for next/image (Payload may return absolute URLs). */
const toPath = (url: string) => {
  const parsed = new URL(url, 'http://local')
  return parsed.pathname + parsed.search
}

/** CMS image with its alt text; decorative images get alt="" so screen readers skip them. */
export function CmsImage({ media, sizes, className = '', preload = false, fill = false }: Props) {
  if (!media || typeof media === 'number' || !media.url) return null
  const alt = media.decorative ? '' : (media.alt ?? '')
  const focus = `${media.focalX ?? 50}% ${media.focalY ?? 50}%`
  return fill ? (
    <Image
      src={toPath(media.url)}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={`object-cover ${className}`}
      style={{ objectPosition: focus }}
    />
  ) : (
    <Image
      src={toPath(media.url)}
      alt={alt}
      width={media.width ?? 1200}
      height={media.height ?? 800}
      sizes={sizes}
      preload={preload}
      className={className}
    />
  )
}
