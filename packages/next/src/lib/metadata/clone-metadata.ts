import type { ResolvedMetadata } from './types/metadata-interface'

const SYM_URL = Symbol('METADATA_URL')

function replacer(_key: string, val: any) {
  // clone URL as string but recover it as URL
  if (val instanceof URL) {
    return { _type: SYM_URL, value: val.href }
  }
  return val
}

function reviver(_key: string, val: any) {
  if (typeof val === 'object' && val !== null && val._type === SYM_URL) {
    return new URL(val.value)
  }
  return val
}

export function cloneMetadata(metadata: ResolvedMetadata): ResolvedMetadata {
  const jsonString = JSON.stringify(metadata, replacer)
  return JSON.parse(jsonString, reviver)
}
