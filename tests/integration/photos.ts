import sharp from 'sharp'
import { expect } from 'vitest'

/** The EXIF pointer to the GPS block (tag 0x8825), as sharp writes it (little-endian). */
const GPS_POINTER = Buffer.from([0x25, 0x88])

/** A photo as a phone takes it: camera name, location and a rotation flag in its EXIF data. */
export async function phonePhoto(width: number, height: number) {
  const data = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } },
  })
    .withExif({
      IFD0: { Make: 'YOP-TEST-CAMERA' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '49/1 35/1 0/1' },
    })
    // Stored lying on its side; viewers turn it upright (90° clockwise).
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer()
  const { exif } = await sharp(data).metadata()
  // The tests are only meaningful if the upload really carries these data.
  expect(exif?.includes('YOP-TEST-CAMERA')).toBe(true)
  expect(exif?.includes(GPS_POINTER)).toBe(true)
  return data
}

/** Whether a stored or served image still carries EXIF data or a rotation flag. */
export async function metadataLeft(image: Buffer | string) {
  const { exif, orientation } = await sharp(image).metadata()
  return { exif: exif !== undefined, orientation }
}
