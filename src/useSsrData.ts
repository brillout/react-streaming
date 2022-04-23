export { SsrDataProvider }
export { useSsrData }

import React, { useContext } from 'react'
import { useStream } from './useStream'
import { isClientSide, isServerSide } from './utils'
import { parse, stringify } from '@brillout/json-s'

const Ctx = React.createContext<Data>(undefined as any)

type Data = Record<string, Entry>
type Entry =
  | { state: 'pending'; promise: Promise<unknown> }
  | { state: 'error'; error: unknown }
  | { state: 'done'; value: unknown }

function SsrDataProvider({ children }: { children: React.ReactNode }) {
  const data = {}
  return React.createElement(Ctx.Provider, { value: data }, children)
}

type SsrData = { key: string; value: unknown }
const className = 'react-streaming_ssr-data'
function getHtmlChunk(entry: SsrData): string {
  const ssrData = [entry]
  const htmlChunk = `<script class="${className}" type="application/json">${stringify(ssrData)}</script>`
  return htmlChunk
}

function getSsrData(key: string): { isAvailable: true; value: unknown } | { isAvailable: false } {
  const els = Array.from(window.document.querySelectorAll(`.${className}`))
  // console.log('querySelectorAll: ', els, els.length)
  for (const el of els) {
    assert(el.textContent)
    const data = parse(el.textContent) as SsrData[]
    for (const entry of data) {
      // console.log('entry: ', entry)
      assert(typeof entry.key === 'string')
      if (entry.key === key) {
        const { value } = entry
        return { isAvailable: true, value }
      }
    }
  }
  return { isAvailable: false }
}

function assert(condition: unknown): asserts condition {
  if (!condition) {
    // TODO
    throw new Error('Something went wrong')
  }
}

function useSsrData<T>(key: string, asyncFn: () => Promise<T>): T {
  // console.log('useSsrData', key)
  if (isClientSide()) {
    const ssrData = getSsrData(key)
    // console.log('ssrData: ', ssrData)
    if (ssrData.isAvailable) {
      return ssrData.value as T
    }
  }
  const data = useContext(Ctx)
  let entry = data[key]
  if (!entry) {
    const streamUtils = useStream()
    const promise = (async () => {
      let value: unknown
      try {
        value = await asyncFn()
      } catch (error) {
        // React seems buggy around error handling; we handle errors ourselves
        entry = data[key] = { state: 'error', error }
        return
      }
      entry = data[key] = { state: 'done', value }
      if (isServerSide()) {
        assert(streamUtils)
        streamUtils.injectToStream(getHtmlChunk({ key, value }))
      }
    })()
    entry = data[key] = { state: 'pending', promise }
  }
  if (entry.state === 'pending') {
    throw entry.promise
  }
  if (entry.state === 'error') {
    throw entry.error
  }
  if (entry.state === 'done') {
    return entry.value as T
  }
  assert(false)
}
