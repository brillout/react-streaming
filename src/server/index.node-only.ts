export * from './index.js'
export { renderToStream }

// Node.js Stream

// This entry isn't loaded by non-Node.js environments.
//  - Cloudflare Workers doesn't support Node.js streams, i.e. the stream module require('stream')
//  - The module react-dom/server.node contains require('stream')
//  - Using a dynamic import() is problematic for nitedani's standaloner

import { createRenderToStream } from './renderToStream.js'
import { renderToNodeStream } from './renderToStream/renderToNodeStream.js'
const renderToStream = createRenderToStream({
  renderToNodeStream,
  renderToWebStream: null,
})
