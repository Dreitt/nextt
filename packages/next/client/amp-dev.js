/* globals __webpack_hash__ */
import fetch from 'unfetch'
import EventSourcePolyfill from './event-source-polyfill'
import { getEventSourceWrapper } from './dev-error-overlay/eventsource'
import { setupPing } from './on-demand-entries-utils'

if (!window.EventSource) {
  window.EventSource = EventSourcePolyfill
}

const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent)
let { assetPrefix, page } = data
assetPrefix = assetPrefix || ''
let mostRecentHash = null
const hotUpdatePath = assetPrefix + (assetPrefix.endsWith('/') ? '' : '/') + '_next/static/webpack/'

// Is there a newer version of this code available?
function isUpdateAvailable () {
  // __webpack_hash__ is the hash of the current compilation.
  // It's a global variable injected by Webpack.
  /* eslint-disable-next-line */
  return mostRecentHash !== __webpack_hash__
}

// Webpack disallows updates in other states.
function canApplyUpdates () {
  return module.hot.status() === 'idle'
}

// Attempt to update code on the fly, fall back to a hard reload.
async function tryApplyUpdates () {
  if (!isUpdateAvailable() || !canApplyUpdates()) {
    return
  }
  try {
    /* eslint-disable-next-line */
    const res = await fetch(`${hotUpdatePath}${__webpack_hash__}.hot-update.json`)
    const data = await res.json()
    const pageUpdated = Object.keys(data.c).some(mod => mod.indexOf(page) !== -1)
    if (pageUpdated) window.location.reload()
  } catch (err) {
    console.error('Error occurred checking for update', err)
  }
}

getEventSourceWrapper({
  path: `${assetPrefix}/_next/webpack-hmr`
}).addMessageListener(event => {
  if (event.data === '\uD83D\uDC93') {
    return
  }

  try {
    const message = JSON.parse(event.data)

    if (message.action === 'sync' || message.action === 'built') {
      if (!message.hash) {
        return
      }
      mostRecentHash = message.hash
      tryApplyUpdates()
    } else if (message.action === 'reloadPage') {
      document.location.reload(true)
    }
  } catch (ex) {
    console.warn('Invalid HMR message: ' + event.data + '\n' + ex)
  }
})

setupPing(assetPrefix, () => page)
