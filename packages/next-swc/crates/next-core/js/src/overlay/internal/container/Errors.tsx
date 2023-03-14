import * as React from 'react'

import { Issue } from '@vercel/turbopack-runtime/types/protocol'

import {
  TYPE_UNHANDLED_ERROR,
  TYPE_UNHANDLED_REJECTION,
  UnhandledError,
  UnhandledRejection,
} from '../bus'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogHeaderTabList,
  DialogProps,
} from '../components/Dialog'
import { Overlay } from '../components/Overlay'
import { Tab, TabPanel, Tabs } from '../components/Tabs'
import { getErrorByType, ReadyRuntimeError } from '../helpers/getErrorByType'
import { getErrorSource } from '../helpers/nodeStackFrames'
import { noop as css } from '../helpers/noop-template'
import { AlertOctagon, PackageX } from '../icons'
import { RuntimeErrorsDialogBody } from './RuntimeError'
import { TurbopackIssuesDialogBody } from '../container/TurbopackIssue'
import { ErrorsToast } from '../container/ErrorsToast'

export type SupportedErrorEvent = {
  id: number
  event: UnhandledError | UnhandledRejection
}
export type ErrorsProps = {
  issues: Issue[]
  errors: SupportedErrorEvent[]
}

type ReadyErrorEvent = ReadyRuntimeError

function getErrorSignature(ev: SupportedErrorEvent): string {
  const { event } = ev
  switch (event.type) {
    case TYPE_UNHANDLED_ERROR:
    case TYPE_UNHANDLED_REJECTION: {
      return `${event.reason.name}::${event.reason.message}::${event.reason.stack}`
    }
    default: {
      return ''
    }
  }
}

function useResolvedErrors(
  errors: SupportedErrorEvent[]
): [ReadyRuntimeError[], boolean] {
  const [lookups, setLookups] = React.useState(
    {} as { [eventId: string]: ReadyErrorEvent }
  )

  const [readyErrors, nextError] = React.useMemo<
    [ReadyErrorEvent[], SupportedErrorEvent | null]
  >(() => {
    const ready: ReadyErrorEvent[] = []
    let next: SupportedErrorEvent | null = null

    // Ensure errors are displayed in the order they occurred in:
    for (let idx = 0; idx < errors.length; ++idx) {
      const e = errors[idx]
      const { id } = e
      if (id in lookups) {
        ready.push(lookups[id])
        continue
      }

      // Check for duplicate errors
      if (idx > 0) {
        const prev = errors[idx - 1]
        if (getErrorSignature(prev) === getErrorSignature(e)) {
          continue
        }
      }

      next = e
      break
    }

    return [ready, next]
  }, [errors, lookups])

  const isLoading = readyErrors.length === 0 && errors.length > 1

  React.useEffect(() => {
    if (nextError == null) {
      return
    }
    let mounted = true

    getErrorByType(nextError).then(
      (resolved) => {
        // We don't care if the desired error changed while we were resolving,
        // thus we're not tracking it using a ref. Once the work has been done,
        // we'll store it.
        if (mounted) {
          setLookups((m) => ({ ...m, [resolved.id]: resolved }))
        }
      },
      () => {
        // TODO: handle this, though an edge case
      }
    )

    return () => {
      mounted = false
    }
  }, [nextError])

  // Reset component state when there are no errors to be displayed.
  // This should never happen, but let's handle it.
  React.useEffect(() => {
    if (errors.length === 0) {
      setLookups({})
    }
  }, [errors.length])

  return [readyErrors, isLoading]
}

const enum DisplayState {
  Fullscreen,
  Minimized,
  Hidden,
}

type DisplayStateAction = (e?: MouseEvent | TouchEvent) => void

type DisplayStateActions = {
  fullscreen: DisplayStateAction
  minimize: DisplayStateAction
  hide: DisplayStateAction
}

function useDisplayState(
  initialState: DisplayState
): [DisplayState, DisplayStateActions] {
  const [displayState, setDisplayState] =
    React.useState<DisplayState>(initialState)

  const actions = React.useMemo<DisplayStateActions>(
    () => ({
      fullscreen: (e) => {
        e?.preventDefault()
        setDisplayState(DisplayState.Fullscreen)
      },
      minimize: (e) => {
        e?.preventDefault()
        setDisplayState(DisplayState.Minimized)
      },
      hide: (e) => {
        e?.preventDefault()
        setDisplayState(DisplayState.Hidden)
      },
    }),
    []
  )

  return [displayState, actions]
}

const enum TabId {
  TurbopackErrors = 'turbopack-issues',
  TurbopackWarnings = 'turbopack-warnings',
  TurbopackExternal = 'turbopack-external',
  RuntimeErrors = 'runtime-errors',
}

const TAB_PRIORITY = [
  TabId.TurbopackErrors,
  TabId.RuntimeErrors,
  TabId.TurbopackWarnings,
]

function isWarning(issue: Issue) {
  return !['bug', 'fatal', 'error'].includes(issue.severity)
}

function isUserCode(issue: Issue) {
  return !issue.context || !issue.context.includes('node_modules')
}

interface TabConfig {
  id: string
  icon: any
  singularTitle: string
  pluralTitle: string
  message: any
  items: (input: { readyErrors: ReadyRuntimeError[]; issues: Issue[] }) => any[]
  autoOpen: boolean
  severity: 'error' | 'warning' | false
  as: any
}

const TABS: TabConfig[] = [
  {
    id: TabId.RuntimeErrors,
    icon: <AlertOctagon />,
    singularTitle: 'Runtime Error',
    pluralTitle: 'Runtime Errors',
    message: (
      <>Unhandled errors that happened during execution of application code.</>
    ),
    items: ({ readyErrors }) => {
      return readyErrors
    },
    severity: 'error',
    autoOpen: true,
    as: RuntimeErrorsDialogBody,
  },
  {
    id: TabId.TurbopackErrors,
    icon: <PackageX />,
    singularTitle: 'Turbopack Error',
    pluralTitle: 'Turbopack Errors',
    message: (
      <>
        Error that happened during compilation of applications code.
        <br />
        The application might work partially, but that's unlikely.
      </>
    ),
    items: ({ issues }) => {
      return issues.filter((i) => isUserCode(i) && !isWarning(i))
    },
    severity: 'error',
    autoOpen: true,
    as: TurbopackIssuesDialogBody,
  },
  {
    id: TabId.TurbopackWarnings,
    icon: <PackageX />,
    singularTitle: 'Turbopack Warning',
    pluralTitle: 'Turbopack Warnings',
    message: (
      <>
        Warnings that were found during compilation of applications code.
        <br />
        The application probably work, but these issues should still be
        addressed eventually.'
      </>
    ),
    items: ({ issues }) => {
      return issues.filter((i) => isUserCode(i) && isWarning(i))
    },
    severity: 'warning',
    autoOpen: false,
    as: TurbopackIssuesDialogBody,
  },
  {
    id: TabId.TurbopackExternal,
    icon: <PackageX />,
    singularTitle: 'Turbopack External Problem',
    pluralTitle: 'Turbopack External Problems',
    message: (
      <>
        Errors or warnings that happened during compilation of non-application
        code.
        <br />
        The application might be affected by them.
      </>
    ),
    items: ({ issues }) => {
      return issues.filter((i) => !isUserCode(i) && !isWarning(i))
    },
    severity: false,
    autoOpen: false,
    as: TurbopackIssuesDialogBody,
  },
]

function itemHash(item: object) {
  return JSON.stringify(item)
}

export function Errors({ issues, errors }: ErrorsProps) {
  const [readyErrors, _isLoading] = useResolvedErrors(errors)

  const tabs = TABS.map((tab) => ({
    id: tab.id,
    autoOpen: tab.autoOpen,
    severity: tab.severity,
    icon: tab.icon,
    message: tab.message,
    pluralTitle: tab.pluralTitle,
    singularTitle: tab.singularTitle,
    as: tab.as,
    items: tab.items({ issues, readyErrors }),
  })).filter((tab) => tab.items.length > 0)

  // Selected tab, null means it's closed
  const [selectedTab, setSelectedTab] = React.useState<string | null>(null)

  // Toast is hidden
  const [hidden, setHidden] = React.useState(false)

  // Already seen issue ids, to auto open the dialog on new errors
  const [seenIds, setSeenIds] = React.useState(() => new Set())

  React.useEffect(() => {
    const newSeenIds = new Set()
    let change = false
    let autoOpen = false
    // When the selected tab disappears we will go to another important tab or close the overlay
    if (selectedTab && !tabs.some((tab) => tab.id === selectedTab)) {
      const otherImportantTab = tabs.find((tab) => tab.autoOpen)
      if (otherImportantTab) {
        setSelectedTab(otherImportantTab.id)
      } else {
        setSelectedTab(null)
      }
    } else {
      autoOpen = true
    }
    // When there is a new item we open the overlay when autoOpen is set
    for (const tab of tabs) {
      for (const item of tab.items) {
        newSeenIds.add(itemHash(item))
        if (!seenIds.has(itemHash(item))) {
          change = true
          setHidden(false)
          if (autoOpen && tab.autoOpen) {
            setSelectedTab(tab.id)
          }
        }
      }
    }
    if (change || newSeenIds.size !== seenIds.size) setSeenIds(newSeenIds)
  }, [selectedTab, tabs, seenIds])

  // This component shouldn't be rendered with no errors, but if it is, let's
  // handle it gracefully by rendering nothing.
  if (tabs.length === 0) {
    return null
  }

  if (hidden) {
    return null
  }

  if (selectedTab === null || !tabs.some((tab) => tab.id === selectedTab)) {
    const errors = tabs.reduce(
      (sum, tab) => sum + (tab.severity === 'error' ? tab.items.length : 0),
      0
    )
    const warnings = tabs.reduce(
      (sum, tab) => sum + (tab.severity === 'warning' ? tab.items.length : 0),
      0
    )

    if (errors === 0 && warnings === 0) return null

    return (
      <ErrorsToast
        errorCount={errors}
        warningCount={warnings}
        severity={errors > 0 ? 'error' : 'warning'}
        onClick={() => setSelectedTab(tabs[0].id)}
        onClose={() => setHidden(true)}
      />
    )
  }

  return (
    <ErrorsDialog
      aria-labelledby="nextjs__container_errors_label"
      aria-describedby="nextjs__container_errors_desc"
      onClose={() => setSelectedTab(null)}
    >
      <Tabs
        defaultId={TabId.RuntimeErrors}
        selectedId={selectedTab}
        onChange={setSelectedTab}
      >
        <DialogHeader
          className="errors-header"
          close={() => setSelectedTab(null)}
        >
          <DialogHeaderTabList>
            {tabs.map((tab, i) => (
              <Tab
                key={tab.id}
                id={tab.id}
                next={tabs[(i + 1) % tabs.length].id}
                prev={tabs[(i + tabs.length - 1) % tabs.length].id}
                data-severity={tab.severity}
              >
                {tab.icon} {tab.items.length}{' '}
                {tab.items.length > 1 ? tab.pluralTitle : tab.singularTitle}
              </Tab>
            ))}
          </DialogHeaderTabList>
        </DialogHeader>
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            id={tab.id}
            as={tab.as}
            items={tab.items}
            message={tab.message}
            severity={tab.severity}
            className="errors-body"
          />
        ))}
      </Tabs>
    </ErrorsDialog>
  )
}

function ErrorsDialog({ children, ...props }: DialogProps) {
  return (
    <Overlay>
      <Dialog {...props}>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    </Overlay>
  )
}

export const styles = css`
  /** == Header == */

  .errors-header > .tab-list > .tab > svg {
    margin-right: var(--size-gap);
  }

  .errors-header > .tab-list > .tab[data-severity='error'] > svg {
    color: var(--color-error);
  }

  .errors-header > .tab-list > .tab[data-severity='warning'] > svg {
    color: var(--color-warning);
  }

  .errors-header > .tab-list > .tab {
    position: relative;
  }

  .errors-header > .tab-list > .tab[data-severity='error']::after {
    border-top-color: var(--color-error);
  }

  .errors-header > .tab-list > .tab[data-severity='warning']::after {
    border-top-color: var(--color-warning);
  }

  /** == Body == */

  .errors-body {
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
  }

  .errors-body > .title-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;

    margin-bottom: var(--size-gap);
  }

  .errors-body > .title-pagination > nav > small {
    font-size: var(--size-font-small);
    color: var(--color-text-dim);
    margin-right: var(--size-gap);
    opacity: 0.7;
  }

  .errors-body > .title-pagination > nav > small > span {
    font-family: var(--font-mono);
  }

  .errors-body > .title-pagination > h1 {
    font-size: var(--size-font-big);
    color: var(--color-text-dim);
    margin: 0;
    opacity: 0.9;
  }

  .errors-body > h2 {
    font-family: var(--font-mono);
    font-size: var(--size-font-big);
    line-height: var(--size-font-bigger);
    font-weight: bold;
    margin: 0;
    margin-bottom: var(--size-gap);
    color: var(--color-error);
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .errors-body > h2[data-severity='error'] {
    color: var(--color-error);
  }

  .errors-body > h2[data-severity='warning'] {
    color: var(--color-warning);
  }

  .errors-body > div > small {
    margin: 0;
    margin-top: var(--size-gap-half);
  }

  .errors-body > h2 > a {
    color: var(--color-error);
  }

  .errors-body > h5:not(:first-child) {
    margin-top: var(--size-gap-double);
  }

  .errors-body > h5 {
    margin-bottom: var(--size-gap);
  }
`
