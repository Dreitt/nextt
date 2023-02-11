import { Normalizer } from '../../normalizers/normalizer'
import { FileReader } from './helpers/file-reader/file-reader'
import { PagesRouteMatcher } from '../../route-matchers/pages-route-matcher'
import { RouteMatcherProvider } from '../route-matcher-provider'
import { AbsoluteFilenameNormalizer } from '../../normalizers/absolute-filename-normalizer'
import { Normalizers } from '../../normalizers/normalizers'
import { wrapNormalizerFn } from '../../normalizers/wrap-normalizer-fn'
import { normalizePagePath } from '../../../../shared/lib/page-path/normalize-page-path'
import { PrefixingNormalizer } from '../../normalizers/prefixing-normalizer'
import { RouteKind } from '../../route-kind'
import path from 'path'

export class DevPagesRouteMatcherProvider
  implements RouteMatcherProvider<PagesRouteMatcher>
{
  private readonly expression: RegExp
  private readonly normalizers: {
    page: Normalizer
    pathname: Normalizer
    bundlePath: Normalizer
  }

  constructor(
    private readonly pagesDir: string,
    private readonly extensions: ReadonlyArray<string>,
    private readonly reader: FileReader
  ) {
    // Match any route file that ends with `/${filename}.${extension}` under the
    // pages directory.
    this.expression = new RegExp(`\\.(?:${extensions.join('|')})$`)

    const pageNormalizer = new AbsoluteFilenameNormalizer(pagesDir, extensions)

    this.normalizers = {
      page: pageNormalizer,
      pathname: pageNormalizer,
      bundlePath: new Normalizers([
        pageNormalizer,
        // If the bundle path would have ended in a `/`, add a `index` to it.
        wrapNormalizerFn(normalizePagePath),
        // Prefix the bundle path with `pages/`.
        new PrefixingNormalizer('pages'),
      ]),
    }
  }

  private test(filename: string): boolean {
    // If the file does not end in the correct extension it's not a match.
    if (!this.expression.test(filename)) return false

    // Pages routes must exist in the pages directory without the `/api/`
    // prefix. The pathnames being tested here though are the full filenames,
    // so we need to include the pages directory.

    // TODO: could path separator normalization be needed here?
    if (filename.startsWith(`${this.pagesDir}/api/`)) return false

    for (const extension of this.extensions) {
      // We can also match if we have `pages/api.${extension}`, so check to
      // see if it's a match.
      if (filename === path.join(this.pagesDir, `api.${extension}`)) {
        return false
      }
    }

    return true
  }

  public async matchers(): Promise<ReadonlyArray<PagesRouteMatcher>> {
    // Read the files in the pages directory...
    const files = await this.reader.read(this.pagesDir)

    const matchers: Array<PagesRouteMatcher> = []
    for (const filename of files) {
      // If the file isn't a match for this matcher, then skip it.
      if (!this.test(filename)) continue

      const pathname = this.normalizers.pathname.normalize(filename)
      const page = this.normalizers.page.normalize(filename)
      const bundlePath = this.normalizers.bundlePath.normalize(filename)

      matchers.push(
        new PagesRouteMatcher({
          kind: RouteKind.PAGES,
          pathname,
          page,
          bundlePath,
          filename,
        })
      )
    }

    return matchers
  }
}
