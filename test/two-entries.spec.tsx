import { expect, it } from 'vitest'
import React from 'react'
import { render } from './render'
import '../src/server/index.web-only'

// The web-only entry imported after the Node.js entry must not switch Web Streams back to 'react-dom/server.edge'
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
    render(element, { streamType: 'web' }),
  ])
  for (const { data, streamEnd } of [node!, web!]) {
    expect(await streamEnd).toBe(true)
    expect(data.content).toContain('<span>provided loaded</span>')
  }
})
