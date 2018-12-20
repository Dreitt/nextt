import { join, dirname } from 'path'
import nanoid from 'nanoid'
import loadConfig from 'next-server/next-config'
import { PHASE_PRODUCTION_BUILD, BUILD_MANIFEST, REACT_LOADABLE_MANIFEST } from 'next-server/constants'

import getBaseWebpackConfig from './webpack-config'
import {generateBuildId} from './generate-build-id'
import {writeBuildId} from './write-build-id'
import {isWriteable} from './is-writeable'
import {runCompiler, CompilerResult} from './compiler'
import globModule from 'glob'
import mkdirpModule from 'mkdirp'
import rimrafModule from 'rimraf'
import {promisify} from 'util'
import fsModule from 'fs'

const glob = promisify(globModule)
const mkdirp = promisify(mkdirpModule)
const writeFile = promisify(fsModule.writeFile)
const rimraf = promisify(rimrafModule)

function collectPages (directory: string, pageExtensions: string[]): Promise<string[]> {
  return glob(`**/*.+(${pageExtensions.join('|')})`, {cwd: directory})
}

export default async function build (dir: string, conf = null, target: string = 'server'): Promise<void> {
  if (!await isWriteable(dir)) {
    throw new Error('> Build directory is not writeable. https://err.sh/zeit/next.js/build-dir-not-writeable')
  }

  const config = loadConfig(PHASE_PRODUCTION_BUILD, dir, conf)
  const buildId = await generateBuildId(config.generateBuildId, nanoid)
  const distDir = join(dir, config.distDir)
  const pagesDir = join(dir, 'pages')

  const pagePaths = await collectPages(pagesDir, config.pageExtensions)
  type Result = {[page: string]: string}
  const pages: Result = pagePaths.reduce((result: Result, pagePath): Result => {
    let page = `/${pagePath.replace(new RegExp(`\\.+(${config.pageExtensions.join('|')})$`), '').replace(/\\/g, '/')}`.replace(/\/index$/, '')
    page = page === '' ? '/' : page
    result[page] = pagePath
    return result
  }, {})

  let entrypoints
  let tmpServerless: any
  if (target === 'serverless') {
    tmpServerless = join(distDir, 'tmp')
    const buildManifest = join(distDir, BUILD_MANIFEST)
    const reactLoadableManifest = join(distDir, REACT_LOADABLE_MANIFEST)
    await mkdirp(tmpServerless)

    const serverlessEntrypoints: any = {}
    await Promise.all(Object.keys(pages).map(async (page) => {
      const relativePagePath = pages[page]
      const absolutePagePath = join(pagesDir, relativePagePath)
      const source = `
        import {parse} from 'url'
        import {renderToHTML} from 'next-server/dist/server/render';
        import buildManifest from '${buildManifest}';
        import reactLoadableManifest from '${reactLoadableManifest}';
        import Document from 'next/dist/pages/_document';
        import Error from 'next/dist/pages/_error';
        import App from 'next/dist/pages/_app';
        import Component from '${absolutePagePath}';
        module.exports = async (req, res) => {
          try {
            const parsedUrl = parse(req.url, true)
            try {
              const result = await renderToHTML(req, res, "${page}", parsedUrl.query, {
                App,
                Document,
                Component,
                buildManifest,
                reactLoadableManifest,
                buildId: "${buildId}"
              })
              return result
            } catch (err) {
              if (err.code === 'ENOENT') {
                res.statusCode = 404
                const result = await renderToHTML(req, res, "/_error", parsedUrl.query, {
                  App,
                  Document,
                  Component: Error,
                  buildManifest,
                  reactLoadableManifest,
                  buildId: "${buildId}"
                })
                return result
              } else {
                console.error(err)
                res.statusCode = 500
                const result = await renderToHTML(req, res, "/_error", parsedUrl.query, {
                  App,
                  Document,
                  Component: Error,
                  buildManifest,
                  reactLoadableManifest,
                  buildId: "${buildId}"
                })
                return result
              }
            }
          } catch(err) {
            console.error(err)
            res.statusCode = 500
            res.end('Internal Server Error')
          }
        }
      `

      const bundleFile = page === '/' ? '/index.js' : `${page}.js`
      const tmpFile = join(tmpServerless, bundleFile)
      await mkdirp(dirname(tmpFile))
      await writeFile(tmpFile, source, 'utf8')
      serverlessEntrypoints[join('serverless', bundleFile)] = tmpFile
    }))

    entrypoints = serverlessEntrypoints
  }

  const configs: any = await Promise.all([
    getBaseWebpackConfig(dir, { buildId, isServer: false, config, target }),
    getBaseWebpackConfig(dir, { buildId, isServer: true, config, target, entrypoints })
  ])

  let result: CompilerResult = {warnings: [], errors: []}
  if (target === 'lambdas' || target === 'serverless') {
    const clientResult = await runCompiler([configs[0]])
    const serverResult = await runCompiler([configs[1]])
    result = {warnings: [...clientResult.warnings, ...serverResult.warnings], errors: [...clientResult.errors, ...serverResult.errors]}
  } else {
    result = await runCompiler(configs)
  }

  // Clean up temporary files
  if (tmpServerless) {
    await rimraf(tmpServerless)
  }

  if (result.warnings.length > 0) {
    console.warn('> Emitted warnings from webpack')
    console.warn(...result.warnings)
  }

  if (result.errors.length > 0) {
    console.error(...result.errors)
    throw new Error('> Build failed because of webpack errors')
  }
  await writeBuildId(distDir, buildId)
}
