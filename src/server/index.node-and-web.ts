export * from './index.js'
export { renderToStream }

import { createRenderToStream } from './renderToStream.js'
import { renderToNodeStream } from './renderToStream/renderToNodeStream.js'
import { webStreamRenderer } from './renderToStream/renderToWebStream.js'
import { getRenderToReadableStream } from './renderToStream/reactBuild.node.js'

// Node.js Streams and Web Streams, both rendered by React's Node build: React doesn't support two renderers rendering the same context provider ("Detected multiple renderers concurrently rendering the same context provider")
const renderToStream = createRenderToStream({
  renderToNodeStream,
  renderToWebStream: webStreamRenderer(getRenderToReadableStream),
})
