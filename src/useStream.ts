import React, { useContext } from 'react'
import { isClientSide } from './utils'

export { useStream }
export { StreamProvider }

type StreamUtils = {
  injectToStream: (htmlChunk: string) => void
}
const StreamContext = React.createContext<StreamUtils | null>(null)
const StreamProvider = StreamContext.Provider

function useStream() {
  if (isClientSide()) {
    return null
  }
  const streamUtils = useContext(StreamContext)
  return streamUtils
}
