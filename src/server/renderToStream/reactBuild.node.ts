export { renderToPipeableStream }
export { renderToReadableStream }
export { getRenderToReadableStream }

// Import this module only from Node.js entries:
//  - Cloudflare Workers doesn't support Node.js streams, i.e. the stream module require('stream')
//  - The module react-dom/server.node contains require('stream')
//  - Using a dynamic import() is problematic for nitedani's standaloner
import ReactDOMServerNode from 'react-dom/server.node'
import { loadEdgeBuild } from './renderToWebStream.js'

const { renderToPipeableStream, renderToReadableStream } = ReactDOMServerNode

async function getRenderToReadableStream() {
  // React 19.0 and 19.1's 'react-dom/server.node' doesn't have renderToReadableStream()
  return renderToReadableStream ?? (await loadEdgeBuild())
}
