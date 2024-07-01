export { useStream }
export { StreamProvider }
export type { StreamUtils }

import pc from '@brillout/picocolors'
import React, { useContext } from 'react'
import type { InjectToStream } from './index.node-and-web'
import { assertUsage, getGlobalObject, isVikeReactApp } from './utils'

type StreamUtils = {
  injectToStream: InjectToStream
}

const globalObject = getGlobalObject('useStream.ts', {
  StreamContext: React.createContext<StreamUtils | null>(null),
})
const StreamProvider = globalObject.StreamContext.Provider

function useStream(): StreamUtils | null {
  const streamUtils = useContext(globalObject.StreamContext)
  assertUsage(streamUtils, getErrMsg())
  return streamUtils
}

function getErrMsg() {
  if (isVikeReactApp()) {
    return `HTML streaming (https://vike.dev/streaming) disabled: set the setting ${pc.code(
      'stream',
    )} (https://vike.dev/stream) to ${pc.code('true')}.'`
  } else {
    return `react-streaming (https://github.com/brillout/react-streaming) isn't installed: make sure to use ${pc.code(
      'renderToStream()',
    )} to render your root React component, see https://github.com/brillout/react-streaming#get-started`
  }
}
