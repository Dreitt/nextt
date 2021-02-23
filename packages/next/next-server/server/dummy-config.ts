import Worker from 'jest-worker'
import findUp from 'next/dist/compiled/find-up'
import { init as initWebpack } from 'next/dist/compiled/webpack/webpack'
import { CONFIG_FILE } from '../lib/constants'
import { NextConfig, normalizeConfig } from './config-shared'

export async function shouldLoadWithWebpack5(
  phase: string,
  dir: string
): Promise<boolean> {
  const path = await findUp(CONFIG_FILE, {
    cwd: dir,
  })

  // No `next.config.js`, so we can load with webpack 5:
  if (!path?.length) {
    return true
  }

  // Default to webpack 4 for backwards compatibility on boot:
  initWebpack(false)
  // hook the Node.js require so that webpack requires are
  // routed to the bundled and now initialized webpack version
  require('../../build/webpack/require-hook')

  const userConfigModule = require(path)
  const userConfig: Partial<NextConfig> = normalizeConfig(
    phase,
    userConfigModule.default || userConfigModule
  )

  return userConfig.future?.webpack5 === true || !userConfig.webpack
}

export async function loadWebpackHook(phase: string, dir: string) {
  let useWebpack5 = false
  const worker: any = new Worker(__filename, { enableWorkerThreads: true })
  try {
    useWebpack5 = Boolean(await worker.shouldLoadWithWebpack5(phase, dir))
  } catch {
    // If this errors, it likely will do so again upon boot, so we just swallow
    // it here.
  } finally {
    worker.end()
  }

  initWebpack(useWebpack5)
  // hook the Node.js require so that webpack requires are
  // routed to the bundled and now initialized webpack version
  require('../../build/webpack/require-hook')
}
