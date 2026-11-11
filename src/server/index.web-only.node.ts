export * from './index.js'
export { renderToStream }

import { createRenderToStream } from './renderToStream.js'
import { webStreamRenderer } from './renderToStream/renderToWebStream.js'
import { getRenderToReadableStream } from './renderToStream/reactBuild.node.js'

// Web Streams only, rendered by React's Node build so that it shares React's renderer with ./index.node-and-web.ts
const renderToStream = createRenderToStream({
  renderToNodeStream: null,
  renderToWebStream: webStreamRenderer(getRenderToReadableStream),
})
