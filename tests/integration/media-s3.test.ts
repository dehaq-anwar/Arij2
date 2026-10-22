import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './database'
import { metadataLeft, phonePhoto } from './photos'

/**
 * Images as production stores them: in an S3 bucket (here SeaweedFS, the image of
 * docker-compose.yml), served to the website through /api/media/file/…, and removed from the
 * bucket with the image. CI pulls the image first; without Docker or the image the test is
 * skipped locally.
 */
const root = path.resolve(import.meta.dirname, '../..')
const compose = readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
const image = compose.match(/image: (chrislusf\/seaweedfs:\S+)/)?.[1] ?? ''

const docker = (...args: string[]) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 60_000 })
  return { ok: result.status === 0, out: result.stdout.trim() }
}
const ready = Boolean(image) && docker('image', 'inspect', image).ok
if (process.env.CI && !ready) throw new Error(`S3 test image missing in CI: ${image}`)

const bucket = 'yop-media-test'
let container = ''
let payload: Payload
let stop: () => Promise<void>

beforeAll(async () => {
  if (!ready) return
  const key = 'integration'
  const secret = randomBytes(16).toString('hex')
  const identities = JSON.stringify({
    identities: [
      {
        name: 'test',
        credentials: [{ accessKey: key, secretKey: secret }],
        actions: ['Admin', 'Read', 'List', 'Write'],
      },
    ],
  })
  // As in docker-compose.yml, with a random port on this machine only.
  const started = docker(
    'run',
    '-d',
    '--rm',
    '-p',
    '127.0.0.1::8333',
    '-e',
    `S3_IDENTITIES=${identities}`,
    '--entrypoint',
    '/bin/sh',
    image,
    '-c',
    'printf "%s" "$S3_IDENTITIES" > /tmp/s3.json && exec weed server -dir=/data -s3 ' +
      '-s3.port=8333 -s3.config=/tmp/s3.json -master.volumeSizeLimitMB=64 -volume.max=0',
  )
  expect(started.ok).toBe(true)
  container = started.out
  // Master, volume server and S3 gateway all up, then the bucket.
  const up =
    'wget -q -O /dev/null http://127.0.0.1:9333/cluster/status && ' +
    'wget -q -O /dev/null http://127.0.0.1:8080/status && nc -z 127.0.0.1 8333'
  for (let i = 0; i < 60 && !docker('exec', container, 'sh', '-c', up).ok; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  expect(
    docker(
      'exec',
      container,
      'sh',
      '-c',
      `echo "s3.bucket.create -name ${bucket}" | weed shell -master=127.0.0.1:9333`,
    ).ok,
  ).toBe(true)
  const port = docker('port', container, '8333/tcp').out.split(':').pop()
  ;({ payload, stop } = await startPayload('medias3', {
    S3_BUCKET: bucket,
    S3_ENDPOINT: `http://127.0.0.1:${port}`,
    S3_REGION: 'eu-central-1',
    S3_ACCESS_KEY_ID: key,
    S3_SECRET_ACCESS_KEY: secret,
    S3_FORCE_PATH_STYLE: 'true',
  }))
}, 180_000)

afterAll(async () => {
  await stop?.()
  if (container) docker('rm', '-f', container)
})

const get = (filename: string) =>
  handleEndpoints({
    config: payload.config,
    path: `/api/media/file/${filename}`,
    request: new Request(`http://localhost/api/media/file/${filename}`),
  })

describe.skipIf(!ready)('images on S3', () => {
  it('are stored in the bucket only, served clean, and removed with the image', async () => {
    const data = await phonePhoto(1600, 1200)
    const doc = await payload.create({
      collection: 'media',
      locale: 'de',
      data: { alt: 'Testbild' },
      file: { data, mimetype: 'image/jpeg', name: 'handyfoto.jpg', size: data.length },
    })
    // Nothing on the app's disk: the production container's file system is read-only.
    expect(readdirSync(process.env.MEDIA_DIR!)).toEqual([])

    const files = [
      doc.filename!,
      ...Object.values(doc.sizes ?? {}).map((size) => size?.filename as string),
    ]
    expect(files).toHaveLength(6)
    for (const filename of files) {
      const response = await get(filename)
      expect([filename, response.status]).toEqual([filename, 200])
      expect(response.headers.get('content-type')).toBe('image/jpeg')
      const left = await metadataLeft(Buffer.from(await response.arrayBuffer()))
      expect([filename, left]).toEqual([filename, { exif: false, orientation: undefined }])
    }

    await payload.delete({ collection: 'media', id: doc.id })
    for (const filename of files) {
      expect([filename, (await get(filename)).status]).toEqual([filename, 404])
    }
  })
})
