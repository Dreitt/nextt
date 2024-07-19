import type { ResolvedMetadata } from '../types/metadata-interface'
import type { Icon, IconDescriptor } from '../types/metadata-types'
import type { FieldResolverExtraArgs } from '../types/resolvers'
import type { StaticMetadata } from '../types/icons'
import { resolveAsArrayOrUndefined } from '../generate/utils'
import { isStringOrURL } from './resolve-url'
import { IconKeys } from '../constants'

export function resolveIcon(icon: Icon): IconDescriptor {
  if (isStringOrURL(icon)) return { url: icon }
  else if (Array.isArray(icon)) return icon
  return icon
}

export const resolveIcons: FieldResolverExtraArgs<'icons', [StaticMetadata | null]> = (
  icons,
  rootSegmentStaticMetadata
) => {
  if (!icons) {
    return null
  }

  // if there's favicon, always add it into icon list
  const firstIconOfRootSegment = rootSegmentStaticMetadata?.icon?.[0]
  let favicon: IconDescriptor | undefined
  if (firstIconOfRootSegment?.url === '/favicon.ico' && firstIconOfRootSegment?.type === 'image/x-icon') {
    favicon = firstIconOfRootSegment
  }

  const resolved: ResolvedMetadata['icons'] = {
    icon: [],
    apple: [],
  }
  if (Array.isArray(icons)) {
    resolved.icon = icons.map(resolveIcon).filter(Boolean)
  } else if (isStringOrURL(icons)) {
    resolved.icon = [resolveIcon(icons)]
  } else {
    for (const key of IconKeys) {
      const values = resolveAsArrayOrUndefined(icons[key])
      if (values) {
        const resolvedIcons = values.map(resolveIcon)
        if (resolved[key]) {
          resolved[key].push(...resolvedIcons)
        } else {
          resolved[key] = resolvedIcons
        }
      }
    }
  }
  return resolved
}
