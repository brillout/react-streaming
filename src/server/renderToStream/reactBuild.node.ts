export { getRenderToReadableStream }

import ReactDOMServerNode from 'react-dom/server.node'
import { loadEdgeBuild } from './renderToWebStream.js'

async function getRenderToReadableStream() {
  // React 19.0 and 19.1's 'react-dom/server.node' doesn't have renderToReadableStream()
  return ReactDOMServerNode.renderToReadableStream ?? (await loadEdgeBuild())
}
