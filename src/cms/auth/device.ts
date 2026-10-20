/**
 * A rough description of the device behind a sign-in, for the session list and new-device
 * notices: browser family, operating system and phone/tablet/computer. Deliberately coarse
 * (no versions, no fingerprinting) and without a user-agent library.
 */
export type DeviceInfo = {
  browser: string
  os: string
  deviceClass: 'mobile' | 'tablet' | 'desktop'
}

export function describeDevice(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? ''
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Other'
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Other'
  const deviceClass = /iPad|Tablet/.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|Android/.test(ua)
      ? 'mobile'
      : 'desktop'
  return { browser, os, deviceClass }
}

/** Name of the cookie that recognises a device across sign-ins (admin host only). */
export const DEVICE_COOKIE = 'yop-device'
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60
