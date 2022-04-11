import type {
  PageRuntime,
  NextConfigComplete,
  NextConfig,
} from '../server/config-shared'
import type { webpack5 } from 'next/dist/compiled/webpack/webpack'
import fs from 'fs'
import chalk from 'next/dist/compiled/chalk'
import { posix, join } from 'path'
import { stringify } from 'querystring'
import {
  API_ROUTE,
  PAGES_DIR_ALIAS,
  ROOT_ALIAS,
  ROOT_DIR_ALIAS,
} from '../lib/constants'
import { MIDDLEWARE_ROUTE } from '../lib/constants'
import { normalizePagePath } from '../server/normalize-page-path'
import { warn } from './output/log'
import { MiddlewareLoaderOptions } from './webpack/loaders/next-middleware-loader'
import { ClientPagesLoaderOptions } from './webpack/loaders/next-client-pages-loader'
import { parse } from '../build/swc'
import {
  isServerComponentPage,
  isClientComponentPage,
  isCustomErrorPage,
  isReservedPage,
  getRawPageExtensions,
} from './utils'
import { ssrEntries } from './webpack/plugins/middleware-plugin'
import {
  CLIENT_STATIC_FILES_RUNTIME_MAIN,
  CLIENT_STATIC_FILES_RUNTIME_MAIN_ROOT,
  CLIENT_STATIC_FILES_RUNTIME_AMP,
  MIDDLEWARE_RUNTIME_WEBPACK,
  MIDDLEWARE_SSR_RUNTIME_WEBPACK,
  CLIENT_STATIC_FILES_RUNTIME_REACT_REFRESH,
} from '../shared/lib/constants'

type ObjectValue<T> = T extends { [key: string]: infer V } ? V : never
export type PagesMapping = {
  [page: string]: string
}

export function getPageFromPath(
  pagePath: string,
  extensions: string[],
  isRoot?: boolean
) {
  const rawExtensions = getRawPageExtensions(extensions)
  const pickedExtensions = pagePath.includes('/_app.server.')
    ? rawExtensions
    : extensions
  let page = pagePath.replace(
    new RegExp(`\\.+(${pickedExtensions.join('|')})$`),
    ''
  )
  page = page.replace(/\\/g, '/')

  if (!isRoot) {
    page = page.replace(/\/index$/, '')
  }
  return page === '' ? '/' : page
}

export function createPagesMapping(
  pagePaths: string[],
  extensions: string[],
  {
    isDev,
    isRoot,
    hasServerComponents,
  }: {
    isDev: boolean
    isRoot?: boolean
    hasServerComponents: boolean
  }
): PagesMapping {
  const previousPages: PagesMapping = {}
  const pathAlias = isRoot ? ROOT_DIR_ALIAS : PAGES_DIR_ALIAS

  // Do not process .d.ts files inside the `pages` folder
  pagePaths = extensions.includes('ts')
    ? pagePaths.filter((pagePath) => !pagePath.endsWith('.d.ts'))
    : pagePaths

  const pages: PagesMapping = pagePaths.reduce(
    (result: PagesMapping, pagePath): PagesMapping => {
      const pageKey = getPageFromPath(pagePath, extensions, isRoot)

      if (hasServerComponents && /\.client$/.test(pageKey)) {
        // Assume that if there's a Client Component, that there is
        // a matching Server Component that will map to the page.
        return result
      }

      if (pageKey in result) {
        warn(
          `Duplicate page detected. ${chalk.cyan(
            join('pages', previousPages[pageKey])
          )} and ${chalk.cyan(
            join('pages', pagePath)
          )} both resolve to ${chalk.cyan(pageKey)}.`
        )
      } else {
        previousPages[pageKey] = pagePath
      }

      if (pageKey === 'root') {
        result['root'] = join(ROOT_ALIAS, pagePath).replace(/\\/g, '/')
      } else {
        result[pageKey] = join(pathAlias, pagePath).replace(/\\/g, '/')
      }
      return result
    },
    {}
  )

  // we alias these in development and allow webpack to
  // allow falling back to the correct source file so
  // that HMR can work properly when a file is added/removed
  if (isRoot) {
    if (isDev) {
      pages['root'] = `${ROOT_ALIAS}/root`
    } else {
      pages['root'] = pages['root'] || 'next/dist/pages/root'
    }
  } else {
    if (isDev) {
      if (hasServerComponents) {
        pages['/_app.server'] = `${PAGES_DIR_ALIAS}/_app.server`
      }
      pages['/_app'] = `${PAGES_DIR_ALIAS}/_app`
      pages['/_error'] = `${PAGES_DIR_ALIAS}/_error`
      pages['/_document'] = `${PAGES_DIR_ALIAS}/_document`
    } else {
      if (hasServerComponents) {
        pages['/_app.server'] =
          pages['/_app.server'] || 'next/dist/pages/_app.server'
      }
      pages['/_app'] = pages['/_app'] || 'next/dist/pages/_app'
      pages['/_error'] = pages['/_error'] || 'next/dist/pages/_error'
      pages['/_document'] = pages['/_document'] || 'next/dist/pages/_document'
    }
  }

  return pages
}

type Entrypoints = {
  client: webpack5.EntryObject
  server: webpack5.EntryObject
  edgeServer: webpack5.EntryObject
}

const cachedPageRuntimeConfig = new Map<string, [number, PageRuntime]>()

// @TODO: We should limit the maximum concurrency of this function as there
// could be thousands of pages existing.
export async function getPageRuntime(
  pageFilePath: string,
  nextConfig: Partial<NextConfig>,
  isDev?: boolean
): Promise<PageRuntime> {
  if (!nextConfig.experimental?.reactRoot) return undefined

  const globalRuntime = nextConfig.experimental?.runtime
  const cached = cachedPageRuntimeConfig.get(pageFilePath)
  if (cached) {
    return cached[1]
  }

  let pageContent: string
  try {
    pageContent = await fs.promises.readFile(pageFilePath, {
      encoding: 'utf8',
    })
  } catch (err) {
    if (!isDev) throw err
    return undefined
  }

  // When gSSP or gSP is used, this page requires an execution runtime. If the
  // page config is not present, we fallback to the global runtime. Related
  // discussion:
  // https://github.com/vercel/next.js/discussions/34179
  let isRuntimeRequired: boolean = false
  let pageRuntime: PageRuntime = undefined

  // Since these configurations should always be static analyzable, we can
  // skip these cases that "runtime" and "gSP", "gSSP" are not included in the
  // source code.
  if (/runtime|getStaticProps|getServerSideProps/.test(pageContent)) {
    try {
      const { body } = await parse(pageContent, {
        filename: pageFilePath,
        isModule: 'unknown',
      })

      for (const node of body) {
        const { type, declaration } = node
        if (type === 'ExportDeclaration') {
          // Match `export const config`
          const valueNode = declaration?.declarations?.[0]
          if (valueNode?.id?.value === 'config') {
            const props = valueNode.init.properties
            const runtimeKeyValue = props.find(
              (prop: any) => prop.key.value === 'runtime'
            )
            const runtime = runtimeKeyValue?.value?.value
            pageRuntime =
              runtime === 'edge' || runtime === 'nodejs' ? runtime : pageRuntime
          } else if (declaration?.type === 'FunctionDeclaration') {
            // Match `export function getStaticProps | getServerSideProps`
            const identifier = declaration.identifier?.value
            if (
              identifier === 'getStaticProps' ||
              identifier === 'getServerSideProps'
            ) {
              isRuntimeRequired = true
            }
          }
        } else if (type === 'ExportNamedDeclaration') {
          // Match `export { getStaticProps | getServerSideProps } <from '../..'>`
          const { specifiers } = node
          for (const specifier of specifiers) {
            const { orig } = specifier
            const hasDataFetchingExports =
              specifier.type === 'ExportSpecifier' &&
              orig?.type === 'Identifier' &&
              (orig?.value === 'getStaticProps' ||
                orig?.value === 'getServerSideProps')
            if (hasDataFetchingExports) {
              isRuntimeRequired = true
              break
            }
          }
        }
      }
    } catch (err) {}
  }

  if (!pageRuntime) {
    if (isRuntimeRequired) {
      pageRuntime = globalRuntime
    }
  }

  cachedPageRuntimeConfig.set(pageFilePath, [Date.now(), pageRuntime])
  return pageRuntime
}

export function invalidatePageRuntimeCache(
  pageFilePath: string,
  safeTime: number
) {
  const cached = cachedPageRuntimeConfig.get(pageFilePath)
  if (cached && cached[0] < safeTime) {
    cachedPageRuntimeConfig.delete(pageFilePath)
  }
}

export async function createEntrypoints(
  pages: PagesMapping,
  buildId: string,
  config: NextConfigComplete,
  pagesDir: string,
  isDev?: boolean,
  rootDir?: string,
  rootPaths?: PagesMapping
): Promise<Entrypoints> {
  const client: webpack5.EntryObject = {}
  const server: webpack5.EntryObject = {}
  const edgeServer: webpack5.EntryObject = {}

  const getEntryHandler =
    (mapping: PagesMapping, isRoot: boolean) => async (page: string) => {
      const absolutePagePath = mapping[page]
      const bundleFile = normalizePagePath(page)
      const isApiRoute = page.match(API_ROUTE)

      const clientBundlePath = posix.join('pages', bundleFile)
      const serverBundlePath = posix.join(
        isRoot ? (bundleFile === '/root' ? './' : 'root') : 'pages',
        bundleFile
      )

      const isReserved = isReservedPage(page)
      const isCustomError = isCustomErrorPage(page)
      const isServerComponent = isServerComponentPage(config, absolutePagePath)
      const isClientComponent = isClientComponentPage(config, absolutePagePath)

      // Handle paths that have aliases
      const pageFilePath = (() => {
        if (absolutePagePath.startsWith(PAGES_DIR_ALIAS)) {
          return absolutePagePath.replace(PAGES_DIR_ALIAS, pagesDir)
        }

        if (absolutePagePath.startsWith(ROOT_DIR_ALIAS) && rootDir) {
          return absolutePagePath.replace(ROOT_DIR_ALIAS, rootDir)
        }

        if (absolutePagePath.startsWith(ROOT_ALIAS) && rootDir) {
          return absolutePagePath.replace(ROOT_ALIAS, join(rootDir, '..'))
        }

        return require.resolve(absolutePagePath)
      })()
      const pageRuntime = await getPageRuntime(pageFilePath, config, isDev)
      const isEdgeRuntime = pageRuntime === 'edge'

      if (page.match(MIDDLEWARE_ROUTE)) {
        const loaderOpts: MiddlewareLoaderOptions = {
          absolutePagePath: pages[page],
          page,
        }

        client[clientBundlePath] = `next-middleware-loader?${stringify(
          loaderOpts
        )}!`
        return
      }

      if (isEdgeRuntime && !isReserved && !isCustomError && !isApiRoute) {
        ssrEntries.set(clientBundlePath, {
          requireFlightManifest: isServerComponent,
        })
        edgeServer[serverBundlePath] = finalizeEntrypoint({
          name: '[name].js',
          value: `next-middleware-ssr-loader?${stringify({
            dev: false,
            page,
            buildId,
            stringifiedConfig: JSON.stringify(config),
            absolute500Path: pages['/500'] || '',
            absolutePagePath,
            absoluteAppPath: pages['/_app'],
            absoluteDocumentPath: pages['/_document'],
            absoluteErrorPath: pages['/_error'],
            isServerComponent,
          } as any)}!`,
          isServer: false,
          isEdgeServer: true,
        })
      }

      if (!isEdgeRuntime || isReserved || isCustomError) {
        server[serverBundlePath] = isClientComponent
          ? [
              `next-flight-client-entrypoint-loader?${stringify({
                absolutePagePath,
              })}!`,
            ]
          : [absolutePagePath]
      }

      if (isApiRoute) {
        if (!isEdgeRuntime || isReserved || isCustomError) {
          server[serverBundlePath] = [absolutePagePath]
        }
      }

      if (page === '/_document' || page === '/_app.server') {
        return
      }

      if (!isApiRoute) {
        const pageLoaderOpts: ClientPagesLoaderOptions = {
          page,
          absolutePagePath,
        }
        const pageLoader = `next-client-pages-loader?${stringify(
          pageLoaderOpts
        )}!`

        // Make sure next/router is a dependency of _app or else chunk splitting
        // might cause the router to not be able to load causing hydration
        // to fail

        client[clientBundlePath] =
          page === '/_app'
            ? [pageLoader, require.resolve('../client/router')]
            : pageLoader
      }
    }

  if (rootDir && rootPaths) {
    const entryHandler = getEntryHandler(rootPaths, true)
    await Promise.all(Object.keys(rootPaths).map(entryHandler))
  }
  const entryHandler = getEntryHandler(pages, false)
  await Promise.all(Object.keys(pages).map(entryHandler))

  return {
    client,
    server,
    edgeServer,
  }
}

export function finalizeEntrypoint({
  name,
  value,
  isServer,
  isMiddleware,
  isEdgeServer,
}: {
  isServer: boolean
  name: string
  value: ObjectValue<webpack5.EntryObject>
  isMiddleware?: boolean
  isEdgeServer?: boolean
}): ObjectValue<webpack5.EntryObject> {
  const entry =
    typeof value !== 'object' || Array.isArray(value)
      ? { import: value }
      : value

  if (isServer) {
    const isApi = name.startsWith('pages/api/')
    return {
      publicPath: isApi ? '' : undefined,
      runtime: isApi ? 'webpack-api-runtime' : 'webpack-runtime',
      layer: isApi ? 'api' : undefined,
      ...entry,
    }
  }

  if (isEdgeServer) {
    const ssrMiddlewareEntry = {
      library: {
        name: ['_ENTRIES', `middleware_[name]`],
        type: 'assign',
      },
      runtime: MIDDLEWARE_SSR_RUNTIME_WEBPACK,
      asyncChunks: false,
      ...entry,
    }
    return ssrMiddlewareEntry
  }
  if (isMiddleware) {
    const middlewareEntry = {
      filename: 'server/[name].js',
      layer: 'middleware',
      library: {
        name: ['_ENTRIES', `middleware_[name]`],
        type: 'assign',
      },
      runtime: MIDDLEWARE_RUNTIME_WEBPACK,
      asyncChunks: false,
      ...entry,
    }
    return middlewareEntry
  }

  if (
    name !== 'polyfills' &&
    name !== CLIENT_STATIC_FILES_RUNTIME_MAIN &&
    name !== CLIENT_STATIC_FILES_RUNTIME_MAIN_ROOT &&
    name !== CLIENT_STATIC_FILES_RUNTIME_AMP &&
    name !== CLIENT_STATIC_FILES_RUNTIME_REACT_REFRESH
  ) {
    return {
      dependOn:
        name.startsWith('pages/') && name !== 'pages/_app'
          ? 'pages/_app'
          : 'main',
      ...entry,
    }
  }

  return entry
}
