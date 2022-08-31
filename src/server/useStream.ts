export { useStream }
export { StreamProvider }
export type { StreamUtils }

import React, { useContext } from 'react'
import { assert } from './utils'

type StreamUtils = {
  injectToStream: (htmlChunk: string) => void
}
const StreamContext = React.createContext<StreamUtils | null>(null)
const StreamProvider = StreamContext.Provider

function useStream(): StreamUtils | null {
  const streamUtils = useContext(StreamContext)
  assert(streamUtils)
  return streamUtils
}
