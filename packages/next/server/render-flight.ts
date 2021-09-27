import { parentPort } from 'worker_threads'
import { Writable } from 'stream'
import { pipeToNodeWritable } from 'react-server-dom-webpack/writer.node.server'

import { loadComponents } from './load-components'

// const componentMap = {
//   // Generated by Webpack. E.g:
//   'index': require('pages/index.server')
// }

// const reactClientManifest = {
//   // TODO: Embedded during Webpack compilation?
// }

// parentPort.on('message', message => {
//   const { id, name, params } = message

//   const writable = new Writable({
//     _write(chunk, encoding, callback) {
//       parentPort.postMessage({
//         id,
//         chunk,
//       }, [chunk.buffer])
//       callback()
//     }
//   })

//   pipeToNodeWritable(
//     <Root name={name} params={params} />,
//     writable,
//     reactClientManifest,
//   )
// })

export async function render(
  distDir: string,
  pathname: string,
  query: any
): Promise<string> {
  const { Component, reactFlightManifest } = await loadComponents(
    distDir,
    pathname,
    false,
    true
  )

  let res = ''
  let resolve: (s: string) => void
  const p = new Promise<string>((r) => (resolve = r))

  const writable = new Writable({
    writev(chunks, callback) {
      for (let { chunk } of chunks) {
        res += chunk.toString()
      }
      callback()
    },
    final() {
      resolve(res)
    },
  })

  console.log(JSON.stringify(reactFlightManifest, null, 2))

  pipeToNodeWritable((Component as any)(), writable, reactFlightManifest)

  console.log('[debug] render-flight:', pathname)

  return await p
}
