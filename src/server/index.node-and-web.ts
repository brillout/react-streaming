export * from './index.js'

// Node.js Stream
import { renderToNodeStream } from './renderToStream/renderToNodeStream.js'
import { renderToNodeStream_set } from './renderToStream.js'
renderToNodeStream_set(renderToNodeStream)

// Web Stream
import { renderToWebStream, renderToReadableStream_set } from './renderToStream/renderToWebStream.js'
import { renderToWebStream_set } from './renderToStream.js'
import ReactDOMServerNode from 'react-dom/server.node'
renderToWebStream_set(renderToWebStream)
renderToReadableStream_set(ReactDOMServerNode.renderToReadableStream)
