import type { AsyncLocalStorage } from 'async_hooks'

export interface StaticGenerationStore {
  readonly isStaticGeneration: boolean
  readonly pathname: string
  readonly incrementalCache?: import('../../server/lib/incremental-cache').IncrementalCache
  readonly isRevalidate?: boolean

  revalidate?: number
  forceDynamic?: boolean
  fetchRevalidate?: boolean | number
  forceStatic?: boolean
  pendingRevalidates?: Promise<any>[]
}

export type StaticGenerationAsyncStorage =
  AsyncLocalStorage<StaticGenerationStore>

// AsyncLocalStorage is polyfilled in runtimes without AsyncLocalStorage.
export const staticGenerationAsyncStorage: StaticGenerationAsyncStorage = new (
  globalThis as any
).AsyncLocalStorage()
