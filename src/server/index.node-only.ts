export * from './index.js'

// Node.js Stream

// This entry isn't loaded by non-Node.js environments.
//  - Cloudflare Workers doesn't support Node.js streams, i.e. the stream module require('stream')
//  - The module react-dom/server.node contains require('stream')
//  - Using a dynamic import() is problematic for nitedani's standaloner

import { renderToPipeableStream } from './renderToStream/reactBuild.node.js'
import { nodeStreamRenderer } from './renderToStream/renderToNodeStream.js'
import { renderToNodeStream_set } from './renderToStream.js'
renderToNodeStream_set(nodeStreamRenderer(renderToPipeableStream))
