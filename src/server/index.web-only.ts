export * from './index.js'
export { renderToStream }

import { createRenderToStream } from './renderToStream.js'
import { webStreamRenderer, loadEdgeBuild } from './renderToStream/renderToWebStream.js'

// Web Streams only, rendered by React's edge build (e.g. Cloudflare Workers)
const renderToStream = createRenderToStream({
  renderToNodeStream: null,
  renderToWebStream: webStreamRenderer(loadEdgeBuild),
})
