export { renderToStream, disable }
export type { InjectToStream }

// We don't import from ./utils.ts because utils/debug.js contains a !isBrowser() assertion
import { assertUsage } from '../utils/assert'
import { isBrowser } from '../utils/isBrowser'
assertUsage(
  !isBrowser(),
  "The file node_modules/react-streaming/dist/esm/server/index.js is loaded in the browser but it shouldn't. Make sure to never `import { something } from 'react-streaming/server'` in code that runs on the client-side. Also make sure your bundler picks the right node_modules/react-streaming/package.json#exports entries.",
)

import { renderToStream, disable } from './renderToStream'
import type { InjectToStream } from './renderToStream/orchestrateChunks'
