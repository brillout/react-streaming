export * from './index.js'

// Web Stream

import { webStreamRenderer, loadEdgeBuild } from './renderToStream/renderToWebStream.js'
import { renderToWebStream_set } from './renderToStream.js'
renderToWebStream_set(webStreamRenderer(loadEdgeBuild))
