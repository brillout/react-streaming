export { useStream }
export { StreamProvider }
export type { StreamUtils }

import React, { useContext } from 'react'
import { assertUsage, getGlobalObject, isVikeReactApp } from './utils'

type StreamUtils = {
  injectToStream: (htmlChunk: string) => void
}

const globalObject = getGlobalObject('useStream.ts', {
  StreamContext: React.createContext<StreamUtils | null>(null),
})
const StreamProvider = globalObject.StreamContext.Provider

function useStream(): StreamUtils | null {
  const streamUtils = useContext(globalObject.StreamContext)
  assertUsage(
    streamUtils,
    isVikeReactApp()
      ? 'HTML Streaming is disabled: set the option https://vike.dev/stream to true'
      : "react-streaming isn't installed: make sure to use renderToStream() to render your root React component, see https://github.com/brillout/react-streaming#get-started",
  )
  return streamUtils
}
