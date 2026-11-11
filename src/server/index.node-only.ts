export * from './index.js'

// Node.js Stream

import { renderToPipeableStream } from './renderToStream/reactBuild.node.js'
import { nodeStreamRenderer } from './renderToStream/renderToNodeStream.js'
import { renderToNodeStream_set } from './renderToStream.js'
renderToNodeStream_set(nodeStreamRenderer(renderToPipeableStream))
