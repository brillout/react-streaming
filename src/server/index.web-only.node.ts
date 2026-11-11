export * from './index.js'

// Web Stream, rendered by React's Node build so that it shares React's renderer with ./index.node-and-web.ts

import { renderToWebStream } from './renderToStream/renderToWebStream.js'
import { renderToWebStream_set } from './renderToStream.js'
import ReactDOMServerNode from 'react-dom/server.node'
renderToWebStream_set(renderToWebStream, ReactDOMServerNode.renderToReadableStream)
