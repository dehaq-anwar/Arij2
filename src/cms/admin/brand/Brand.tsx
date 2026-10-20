import logo from '../../../assets/logo/yop-logo.png'
import logoLight from '../../../assets/logo/yop-logo-light.png'

/**
 * The association's logo in Payload's own screens (forgot/reset password, sign-out). The
 * colour version on light, the light version on dark backgrounds (switched in admin.css).
 */
export function Logo() {
  return (
    <span className="yop-logo">
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, admin only */}
      <img className="yop-logo__light-theme" src={logo.src} alt="Youth of Peace e.V." />
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, admin only */}
      <img className="yop-logo__dark-theme" src={logoLight.src} alt="Youth of Peace e.V." />
    </span>
  )
}

/** Small mark (Payload's breadcrumb "home" icon). */
export function Icon() {
  return (
    <span className="yop-brand-mark yop-brand-mark--small">
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset, admin only */}
      <img src={logoLight.src} alt="" />
    </span>
  )
}
