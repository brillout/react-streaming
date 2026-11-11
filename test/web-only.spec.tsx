import { expect, it } from 'vitest'
import React from 'react'
import { renderToStream } from '../src/server/index.web-only'
import './onConsoleError'

// Without the Node.js entry (e.g. Cloudflare Workers), Web Streams are rendered by 'react-dom/server.edge'
it('web-only entry', async () => {
  const { readable, streamEnd } = await renderToStream(<div>hello</div>, { disable: false })
  expect(await new Response(readable).text()).toBe('<div>hello</div>')
  expect(await streamEnd).toBe(true)
})
