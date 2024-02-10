export * from './index'

// Node.js Stream
import { renderToNodeStream } from './renderToStream/renderToNodeStream'
import { renderToNodeStream_set } from './renderToStream'
renderToNodeStream_set(renderToNodeStream)

// Web Stream
import { renderToWebStream } from './renderToStream/renderToWebStream'
import { renderToWebStream_set } from './renderToStream'
renderToWebStream_set(renderToWebStream)
