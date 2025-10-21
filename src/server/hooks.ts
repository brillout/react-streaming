export { useAsync } from './useAsync.js'
export { useStream } from './useStream.js'
export { useStreamOptional } from './useStream.js'

// We don't import from ./utils.ts because utils/debug.js contains a !isBrowser() assertion
import { assertUsage } from '../utils/assert.js'
import { isBrowser } from '../utils/isBrowser.js'
assertUsage(
  !isBrowser(),
  "The file node_modules/react-streaming/dist/server/hooks.js is loaded in the browser but it shouldn't. Make sure to never `import { something } from 'react-streaming/server'` in code that runs on the client-side. Also make sure your bundler picks the right node_modules/react-streaming/package.json#exports entries.",
)
