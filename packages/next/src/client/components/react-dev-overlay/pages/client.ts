import * as Bus from './bus'
import { parseStack } from '../internal/helpers/parseStack'
import { parseComponentStack } from '../internal/helpers/parse-component-stack'
import {
  getReactHydrationDiffSegments,
  hydrationErrorState,
  patchConsoleError,
} from '../internal/helpers/hydration-error-info'
import {
  ACTION_BEFORE_REFRESH,
  ACTION_BUILD_ERROR,
  ACTION_BUILD_OK,
  ACTION_REFRESH,
  ACTION_UNHANDLED_ERROR,
  ACTION_UNHANDLED_REJECTION,
  ACTION_VERSION_INFO,
} from '../shared'
import type { VersionInfo } from '../../../../server/dev/parse-version-info'
import {
  getDefaultHydrationErrorMessage,
  isHydrationError,
} from '../../is-hydration-error'

// Patch console.error to collect information about hydration errors
patchConsoleError()

let isRegistered = false
let stackTraceLimit: number | undefined = undefined

function handleError(error: unknown) {
  if (!error || !(error instanceof Error) || typeof error.stack !== 'string') {
    // A non-error was thrown, we don't have anything to show. :-(
    return
  }

  if (
    isHydrationError(error) &&
    !error.message.includes(
      'https://nextjs.org/docs/messages/react-hydration-error'
    )
  ) {
    const reactHydrationDiffSegments = getReactHydrationDiffSegments(
      error.message
    )
    let parsedHydrationErrorState: typeof hydrationErrorState = {}
    if (reactHydrationDiffSegments) {
      parsedHydrationErrorState = {
        ...(error as any).details,
        warning: hydrationErrorState.warning || [
          getDefaultHydrationErrorMessage(),
        ],
        notes: reactHydrationDiffSegments[0],
        reactOutputComponentDiff: reactHydrationDiffSegments[1],
      }
    } else {
      // If there's any extra information in the error message to display,
      // append it to the error message details property
      if (hydrationErrorState.warning) {
        // The patched console.error found hydration errors logged by React
        // Append the logged warning to the error message
        parsedHydrationErrorState = {
          ...(error as any).details,
          // It contains the warning, component stack, server and client tag names
          ...hydrationErrorState,
        }
      }
      error.message += `\nSee more info here: https://nextjs.org/docs/messages/react-hydration-error`
    }
    ;(error as any).details = parsedHydrationErrorState
  }

  const e = error
  const componentStackTrace =
    (error as any)._componentStack || hydrationErrorState.componentStack
  const componentStackFrames =
    typeof componentStackTrace === 'string'
      ? parseComponentStack(componentStackTrace)
      : undefined

  // Skip ModuleBuildError and ModuleNotFoundError, as it will be sent through onBuildError callback.
  // This is to avoid same error as different type showing up on client to cause flashing.
  if (e.name !== 'ModuleBuildError' && e.name !== 'ModuleNotFoundError') {
    Bus.emit({
      type: ACTION_UNHANDLED_ERROR,
      reason: error,
      frames: parseStack(e.stack!),
      componentStackFrames,
    })
  }
}

let origConsoleError = console.error
function nextJsHandleConsoleError(...args: any[]) {
  // See https://github.com/facebook/react/blob/d50323eb845c5fde0d720cae888bf35dedd05506/packages/react-reconciler/src/ReactFiberErrorLogger.js#L78
  const error = process.env.NODE_ENV !== 'production' ? args[1] : args[0]
  handleError(error)
  origConsoleError.apply(window.console, args)
}

function onUnhandledError(event: ErrorEvent) {
  const error = event?.error
  handleError(error)
}

function onUnhandledRejection(ev: PromiseRejectionEvent) {
  const reason = ev?.reason
  if (
    !reason ||
    !(reason instanceof Error) ||
    typeof reason.stack !== 'string'
  ) {
    // A non-error was thrown, we don't have anything to show. :-(
    return
  }

  const e = reason
  Bus.emit({
    type: ACTION_UNHANDLED_REJECTION,
    reason: reason,
    frames: parseStack(e.stack!),
  })
}

export function register() {
  if (isRegistered) {
    return
  }
  isRegistered = true

  try {
    const limit = Error.stackTraceLimit
    Error.stackTraceLimit = 50
    stackTraceLimit = limit
  } catch {}

  window.addEventListener('error', onUnhandledError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
  window.console.error = nextJsHandleConsoleError
}

export function unregister() {
  if (!isRegistered) {
    return
  }
  isRegistered = false

  if (stackTraceLimit !== undefined) {
    try {
      Error.stackTraceLimit = stackTraceLimit
    } catch {}
    stackTraceLimit = undefined
  }

  window.removeEventListener('error', onUnhandledError)
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
  window.console.error = origConsoleError
}

export function onBuildOk() {
  Bus.emit({ type: ACTION_BUILD_OK })
}

export function onBuildError(message: string) {
  Bus.emit({ type: ACTION_BUILD_ERROR, message })
}

export function onRefresh() {
  Bus.emit({ type: ACTION_REFRESH })
}

export function onBeforeRefresh() {
  Bus.emit({ type: ACTION_BEFORE_REFRESH })
}

export function onVersionInfo(versionInfo: VersionInfo) {
  Bus.emit({ type: ACTION_VERSION_INFO, versionInfo })
}

export { getErrorByType } from '../internal/helpers/getErrorByType'
export { getServerError } from '../internal/helpers/nodeStackFrames'
export { default as ReactDevOverlay } from './ReactDevOverlay'
