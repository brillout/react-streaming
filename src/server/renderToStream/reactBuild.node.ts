export { renderToPipeableStream }
export { renderToReadableStream }
export { getRenderToReadableStream }

import ReactDOMServerNode from 'react-dom/server.node'
import { loadEdgeBuild } from './renderToWebStream.js'

const { renderToPipeableStream, renderToReadableStream } = ReactDOMServerNode

async function getRenderToReadableStream() {
  // React 19.0 and 19.1's 'react-dom/server.node' doesn't have renderToReadableStream()
  return renderToReadableStream ?? (await loadEdgeBuild())
}
