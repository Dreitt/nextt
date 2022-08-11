import { useState } from 'react'
import Client from './client.client'

const random = ~~(Math.random() * 10000)

export default function Shared() {
  let isServerComponent
  try {
    useState()
    isServerComponent = false
  } catch (e) {
    isServerComponent = true
  }

  return (
    <>
      <Client />,{' '}
      {(isServerComponent ? 'shared:server' : 'shared:client') + ':' + random}
    </>
  )
}
