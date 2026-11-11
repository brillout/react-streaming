export * from './index.js'

import {
  renderToPipeableStream,
  getRenderToReadableStream,
  renderToReadableStream,
} from './renderToStream/reactBuild.node.js'

// Node.js Stream
import { nodeStreamRenderer } from './renderToStream/renderToNodeStream.js'
import { renderToNodeStream_set } from './renderToStream.js'
renderToNodeStream_set(nodeStreamRenderer(renderToPipeableStream))

// Web Stream
import { webStreamRenderer } from './renderToStream/renderToWebStream.js'
import { renderToWebStream_set } from './renderToStream.js'
renderToWebStream_set(webStreamRenderer(getRenderToReadableStream), renderToReadableStream)
