export { useStream }
export { StreamProvider }
export type { StreamUtils }

import React, { useContext } from 'react'
import { assertUsage, getGlobalObject } from './utils'

type StreamUtils = {
  injectToStream: (htmlChunk: string) => void
}

const globalObject = getGlobalObject('useStream.ts', {
  StreamContext: React.createContext<StreamUtils | null>(null)
})
const { StreamContext } = globalObject
const StreamProvider = StreamContext.Provider

function useStream(): StreamUtils | null {
  const streamUtils = useContext(StreamContext)
  assertUsage(streamUtils, `react-streaming isn't installed`)
  return streamUtils
}
