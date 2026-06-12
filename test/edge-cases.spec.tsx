import { describe, expect, it } from 'vitest'
import React from 'react'
import { render } from './render'

// https://github.com/brillout/react-streaming/pull/59
describe('disable + large Suspense boundary (progressiveChunkSize)', async () => {
  // A boundary whose rendered HTML exceeds React's default progressiveChunkSize (12'800
  // bytes). React Fizz outlines completed boundaries larger than that threshold into
  // out-of-order segments, independent of timing.
  const BigLazy = React.lazy(async () => ({
    default: () => (
      <div>
        {Array.from({ length: 200 }, (_, i) => (
          <p key={i}>{`row-${i} `.repeat(10)}</p>
        ))}
      </div>
    ),
  }))
  // The boundary must be nested inside a containing element: a *root-level* Suspense
  // boundary is treated as the shell and never outlined, regardless of its size.
  const BigBoundary = () => (
    <div>
      <React.Suspense fallback={<span>fallback</span>}>
        <BigLazy />
      </React.Suspense>
    </div>
  )

  function artifacts(content: string) {
    return {
      outOfOrder: content.includes('<!--$?-->'),
      hiddenSegment: /<div hidden id="S:\d/.test(content),
      reveal: content.includes('$RC'),
      fallbackInHtml: content.includes('>fallback<'),
      contentInHtml: content.includes('row-0'),
    }
  }
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    it(`disable inlines large boundaries (no out-of-order artifacts) - ${streamType} stream`, async () => {
      const { data, streamEnd } = await render(<BigBoundary />, { streamType, disable: true })
      await streamEnd
      // Sanity check: the boundary is actually large enough to be outlined by default.
      expect(data.content.length).toBeGreaterThan(12800)
      expect(artifacts(data.content)).toEqual({
        outOfOrder: false,
        hiddenSegment: false,
        reveal: false,
        fallbackInHtml: false,
        contentInHtml: true,
      })
    })
  })
})
