import { expect, it } from 'vitest'
import React from 'react'
import { render } from './render'
import { renderToStream } from '../src/server/index.web-only.node'

// react-streaming/server.web on Node.js must render with the same React build as react-streaming/server
it('both server entries in one process', async () => {
  const Ctx = React.createContext('default')
  const loaded = new Promise<string>((resolve) => setTimeout(() => resolve('loaded'), 50))
  const Child = () => <span>{`${React.use(Ctx)} ${React.use(loaded)}`}</span>
  const element = (
    <Ctx.Provider value="provided">
      <React.Suspense fallback="loading">
        <Child />
      </React.Suspense>
    </Ctx.Provider>
  )
  const [node, web] = await Promise.all([
    render(element, { streamType: 'node' }),
    renderToStream(element, { disable: false }),
  ])
  expect(await new Response(web.readable).text()).toContain('<span>provided loaded</span>')
  expect(await web.streamEnd).toBe(true)
  expect(await node!.streamEnd).toBe(true)
  expect(node!.data.content).toContain('<span>provided loaded</span>')
})
