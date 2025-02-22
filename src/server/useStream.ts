export { useStream }
export { useStreamOptional }
export { StreamProvider }

import pc from '@brillout/picocolors'
import React, { useContext } from 'react'
import type { StreamReturnUtils } from './renderToStream'
import { assertUsage, getGlobalObject, isVikeReactApp } from './utils'

const globalObject = getGlobalObject('useStream.ts', {
  StreamContext: React.createContext<StreamReturnUtils | null>(null),
})
const StreamProvider = globalObject.StreamContext.Provider

function useStream():
  | StreamReturnUtils
  // useStream() return `null` on the client-side
  | null {
  const streamUtils = useContext(globalObject.StreamContext)
  assertUsage(streamUtils, getErrMsg())
  return streamUtils
}

function useStreamOptional(): StreamReturnUtils | null {
  const streamUtils = useContext(globalObject.StreamContext)
  return streamUtils
}

function getErrMsg() {
  if (isVikeReactApp()) {
    return `HTML streaming (https://vike.dev/streaming) disabled: set the setting ${pc.code(
      'stream',
    )} (https://vike.dev/stream) to ${pc.code('true')}.`
  } else {
    return `react-streaming (https://github.com/brillout/react-streaming) isn't installed: make sure to use ${pc.code(
      'renderToStream()',
    )} to render your root React component, see https://github.com/brillout/react-streaming#get-started`
  }
}
