export * from './index'

// This entry isn't loaded by non-Node.js environments.
//  - Cloudflare Workers doesn't support Node.js streams, i.e. the stream module require('stream')
//  - Using a dynamic import() is problematic for nitedani's standaloner
//  - The module react-dom/server.node contains require('stream')
import { renderToNodeStream } from './renderToStream/renderToNodeStream'
import { renderToNodeStream_set } from './renderToStream'
renderToNodeStream_set(renderToNodeStream)
