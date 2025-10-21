export * from './index.js'

// Node.js Stream
import { renderToNodeStream } from './renderToStream/renderToNodeStream.js'
import { renderToNodeStream_set } from './renderToStream.js'
renderToNodeStream_set(renderToNodeStream)

// Web Stream
import { renderToWebStream } from './renderToStream/renderToWebStream.js'
import { renderToWebStream_set } from './renderToStream.js'
renderToWebStream_set(renderToWebStream)
