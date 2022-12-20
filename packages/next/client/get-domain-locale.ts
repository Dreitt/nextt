import type { DomainLocale } from '../server/config'
import type { normalizeLocalePath as NormalizeFn } from './normalize-locale-path'
import type { detectDomainLocale as DetectFn } from './detect-domain-locale'

const basePath = (process.env.__NEXT_ROUTER_BASEPATH as string) || ''

export function getDomainLocale(
  path: string,
  locale?: string | false,
  locales?: string[],
  domainLocales?: DomainLocale[]
) {
  if (process.env.__NEXT_I18N_SUPPORT) {
    const normalizeLocalePath: typeof NormalizeFn =
      require('./normalize-locale-path').normalizeLocalePath
    const detectDomainLocale: typeof DetectFn =
      require('./detect-domain-locale').detectDomainLocale

    const target = locale || normalizeLocalePath(path, locales).detectedLocale
    const domain = detectDomainLocale(domainLocales, undefined, target)
    if (domain) {
      const thisPath =
        path === '/'
          ? Boolean(process.env.__NEXT_TRAILING_SLASH)
            ? path
            : ''
          : path
      const proto = `http${domain.http ? '' : 's'}://`
      const finalLocale = target === domain.defaultLocale ? '' : `/${target}`
      return `${proto}${domain.domain}${basePath}${finalLocale}${thisPath}`
    }
    return false
  } else {
    return false
  }
}
