import type {
  ResolvedMetadata,
  ResolvedScreenMetadata,
  ScreenMetadata,
} from '../types/metadata-interface'

import React from 'react'
import { Meta, MetaFilter, MultiMeta } from './meta'
import { ViewPortKeys } from '../constants'
import type { Viewport } from '../types/extra-types'

function renderViewport(viewport: ScreenMetadata['viewport']) {
  let resolved: string | null = null

  if (viewport && typeof viewport === 'object') {
    resolved = ''
    for (const viewportKey_ in ViewPortKeys) {
      const viewportKey = viewportKey_ as keyof Viewport
      if (viewportKey in viewport) {
        let value = viewport[viewportKey]
        if (typeof value === 'boolean') value = value ? 'yes' : 'no'
        if (resolved) resolved += ', '
        resolved += `${ViewPortKeys[viewportKey]}=${value}`
      }
    }
  }
  return resolved
}

export function ScreenMetadata({
  screenMetadata,
}: {
  screenMetadata: ResolvedScreenMetadata
}) {
  const viewport = renderViewport(screenMetadata.viewport)
  return MetaFilter([
    Meta({ name: 'viewport', content: viewport }),
    ...(screenMetadata.themeColor
      ? screenMetadata.themeColor.map((themeColor) =>
          Meta({
            name: 'theme-color',
            content: themeColor.color,
            media: themeColor.media,
          })
        )
      : []),
    Meta({ name: 'color-scheme', content: screenMetadata.colorScheme }),
  ])
}

export function BasicMetadata({ metadata }: { metadata: ResolvedMetadata }) {
  return MetaFilter([
    <meta charSet="utf-8" />,
    metadata.title !== null && metadata.title.absolute ? (
      <title>{metadata.title.absolute}</title>
    ) : null,
    Meta({ name: 'description', content: metadata.description }),
    Meta({ name: 'application-name', content: metadata.applicationName }),
    ...(metadata.authors
      ? metadata.authors.map((author) => [
          author.url ? (
            <link rel="author" href={author.url.toString()} />
          ) : null,
          Meta({ name: 'author', content: author.name }),
        ])
      : []),
    metadata.manifest ? (
      <link rel="manifest" href={metadata.manifest.toString()} />
    ) : null,
    Meta({ name: 'generator', content: metadata.generator }),
    Meta({ name: 'keywords', content: metadata.keywords?.join(',') }),
    Meta({ name: 'referrer', content: metadata.referrer }),
    Meta({ name: 'creator', content: metadata.creator }),
    Meta({ name: 'publisher', content: metadata.publisher }),
    Meta({ name: 'robots', content: metadata.robots?.basic }),
    Meta({ name: 'googlebot', content: metadata.robots?.googleBot }),
    Meta({ name: 'abstract', content: metadata.abstract }),
    ...(metadata.archives
      ? metadata.archives.map((archive) => (
          <link rel="archives" href={archive} />
        ))
      : []),
    ...(metadata.assets
      ? metadata.assets.map((asset) => <link rel="assets" href={asset} />)
      : []),
    ...(metadata.bookmarks
      ? metadata.bookmarks.map((bookmark) => (
          <link rel="bookmarks" href={bookmark} />
        ))
      : []),
    Meta({ name: 'category', content: metadata.category }),
    Meta({ name: 'classification', content: metadata.classification }),
    ...(metadata.other
      ? Object.entries(metadata.other).map(([name, content]) =>
          Meta({
            name,
            content: Array.isArray(content) ? content.join(',') : content,
          })
        )
      : []),
  ])
}

export function ItunesMeta({ itunes }: { itunes: ResolvedMetadata['itunes'] }) {
  if (!itunes) return null
  const { appId, appArgument } = itunes
  let content = `app-id=${appId}`
  if (appArgument) {
    content += `, app-argument=${appArgument}`
  }
  return <meta name="apple-itunes-app" content={content} />
}

const formatDetectionKeys = [
  'telephone',
  'date',
  'address',
  'email',
  'url',
] as const
export function FormatDetectionMeta({
  formatDetection,
}: {
  formatDetection: ResolvedMetadata['formatDetection']
}) {
  if (!formatDetection) return null
  let content = ''
  for (const key of formatDetectionKeys) {
    if (key in formatDetection) {
      if (content) content += ', '
      content += `${key}=no`
    }
  }
  return <meta name="format-detection" content={content} />
}

export function AppleWebAppMeta({
  appleWebApp,
}: {
  appleWebApp: ResolvedMetadata['appleWebApp']
}) {
  if (!appleWebApp) return null

  const { capable, title, startupImage, statusBarStyle } = appleWebApp

  return MetaFilter([
    capable
      ? Meta({ name: 'apple-mobile-web-app-capable', content: 'yes' })
      : null,
    Meta({ name: 'apple-mobile-web-app-title', content: title }),
    startupImage
      ? startupImage.map((image) => (
          <link
            href={image.url}
            media={image.media}
            rel="apple-touch-startup-image"
          />
        ))
      : null,
    statusBarStyle
      ? Meta({
          name: 'apple-mobile-web-app-status-bar-style',
          content: statusBarStyle,
        })
      : null,
  ])
}

export function VerificationMeta({
  verification,
}: {
  verification: ResolvedMetadata['verification']
}) {
  if (!verification) return null

  return MetaFilter([
    MultiMeta({
      namePrefix: 'google-site-verification',
      contents: verification.google,
    }),
    MultiMeta({ namePrefix: 'y_key', contents: verification.yahoo }),
    MultiMeta({
      namePrefix: 'yandex-verification',
      contents: verification.yandex,
    }),
    MultiMeta({ namePrefix: 'me', contents: verification.me }),
    ...(verification.other
      ? Object.entries(verification.other).map(([key, value]) =>
          MultiMeta({ namePrefix: key, contents: value })
        )
      : []),
  ])
}
