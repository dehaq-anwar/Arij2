import { readFileSync } from 'node:fs'
import path from 'node:path'

import { handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'
import { metadataLeft, phonePhoto } from './photos'

/**
 * Real images through the media collection (src/cms/collections/Media.ts): what is stored and
 * served has no camera or location data, is turned upright, is at most 2560 px, and comes in
 * the sizes the website uses. Here on the local disk; in production on S3 (media-s3.test.ts).
 */
let payload: Payload
let stop: () => Promise<void>

beforeAll(async () => {
  ;({ payload, stop } = await startPayload('media'))
}, 120_000)

afterAll(async () => {
  await stop?.()
})

describe('uploaded images', () => {
  it('drop camera and location data, stand upright and come in every size', async () => {
    // 3000 × 2000 as stored, 2000 × 3000 as seen (portrait).
    const data = await phonePhoto(3000, 2000)
    const doc = await payload.create({
      collection: 'media',
      locale: 'de',
      data: { alt: 'Testbild' },
      file: { data, mimetype: 'image/jpeg', name: 'handyfoto.jpg', size: data.length },
    })

    // Upright and capped at 2560 px on the long side.
    expect([doc.width, doc.height]).toEqual([1707, 2560])
    const expected: Record<string, [number, number]> = {
      thumbnail: [480, 720],
      card: [768, 1152],
      feature: [1280, 1920],
      // The sizes are made from the uploaded file, by width; only the original is capped.
      hero: [1920, 2880],
      og: [1200, 630],
    }
    const sizes = doc.sizes as Record<
      string,
      { width?: number; height?: number; filename?: string }
    >
    for (const [name, [width, height]] of Object.entries(expected)) {
      expect([name, sizes[name]?.width, sizes[name]?.height]).toEqual([name, width, height])
    }
    const files = [doc.filename!, ...Object.values(sizes).map((size) => size.filename!)]
    for (const filename of files) {
      const left = await metadataLeft(path.join(process.env.MEDIA_DIR!, filename))
      expect([filename, left]).toEqual([filename, { exif: false, orientation: undefined }])
    }

    // What the website requests (/api/media/file/…) is the cleaned file.
    const response = await handleEndpoints({
      config: payload.config,
      path: `/api/media/file/${doc.filename}`,
      request: new Request(`http://localhost/api/media/file/${doc.filename}`),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    const served = Buffer.from(await response.arrayBuffer())
    expect(served.equals(readFileSync(path.join(process.env.MEDIA_DIR!, doc.filename!)))).toBe(true)
  })

  it('refuses SVG files, which can carry scripts', async () => {
    const data = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
    )
    await expect(
      payload.create({
        collection: 'media',
        locale: 'de',
        data: { alt: 'Vektor' },
        file: { data, mimetype: 'image/svg+xml', name: 'bild.svg', size: data.length },
      }),
    ).rejects.toThrow()
    // Nor when it pretends to be a PNG.
    await expect(
      payload.create({
        collection: 'media',
        locale: 'de',
        data: { alt: 'Vektor' },
        file: { data, mimetype: 'image/png', name: 'bild.png', size: data.length },
      }),
    ).rejects.toThrow()
  })
})
