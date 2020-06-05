import { normalizePagePath } from './normalize-page-path'

export type BuildManifest = {
  devFiles: string[]
  lowPriorityFiles: string[]
  pages: {
    '/_app': string[]
    [page: string]: string[]
  }
}

export function getPageFiles(
  buildManifest: BuildManifest,
  page: string
): string[] {
  const normalizedPage = normalizePagePath(page)
  const files = buildManifest.pages[normalizedPage]

  if (!files) {
    // tslint:disable-next-line
    console.warn(
      `Could not find files for ${normalizedPage} in .next/build-manifest.json`
    )
    return []
  }

  return files
}
