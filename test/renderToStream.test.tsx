import { describe, expect, it } from 'vitest'
import React from 'react'
import { Page } from './Page'
import { render } from './render'

describe('renderToStream()', async () => {
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`basic - ${streamType} Stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd } = await render(<div>hello</div>, { streamType, disable })
        await streamEnd
        expect(data.content).toBe('<div>hello</div>')
      })
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`injectToStream - basic - ${streamType} stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd, injectToStream, doNotClose } = await render(<>hi</>, { streamType, disable })
        const makeClosableAgain = doNotClose()
        injectToStream('<script type="module" src="/main.js"></script>')
        makeClosableAgain()
        await streamEnd
        expect(data.content).toBe('hi<script type="module" src="/main.js"></script>')
      })
    })
  })
  ;(['node', 'web'] as const).forEach((streamType: 'node' | 'web') => {
    ;[true, false].forEach((disable) => {
      it(`injectToStream - useAsync() - ${streamType} stream${disable ? ' - disabled' : ''}`, async () => {
        const { data, streamEnd, injectToStream } = await render(<Page />, { streamType, disable })
        injectToStream('<script type="module" src="/main.js"></script>')

        if (disable) {
          await streamEnd
        } else {
          // When streaming is enabled, injection happens asynchronously
          let timeoutResolved = false
          setTimeout(() => {
            expect(data.content.endsWith('<script type="module" src="/main.js"></script>')).toBe(true)
            timeoutResolved = true
          }, 5)

          expect(timeoutResolved).toBe(false)
          await streamEnd
          expect(timeoutResolved).toBe(true)
        }

        try {
          await injectToStream('someChunk')
          expect(1).toBe(2)
        } catch (err) {
          expect(err.message).include('Cannot inject the following chunk because the stream has already ended')
        }

        //  Begin:
        //  ```html
        //  <h1>Welcome</h1>This page is:<ul>'
        //  ```
        //
        //  // Suspense fallback for LazyComponent
        //  ```html
        //  <li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li>
        //  ```
        //
        //  ```html
        //  <li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li>
        //  ```
        //
        //  // Suspense fallback for ErrorOnServer (client-only component)
        //  ```html
        //  <li><!--$!--><template data-msg="..." data-stck="..."></template><p>loading on server</p><!--/$--></li>
        //  ```
        //
        //  ```html
        //  </ul>
        //  ```
        //
        //  // Injection:
        //  ```html
        //  <script type="module" src="/main.js"></script>
        //  ```
        //
        //  // Injection useAsync()
        //  ```html
        //  <script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script>
        //  ```
        //
        //  // Suspense resolving LazyComponent
        //  ```html
        //  <div hidden id="S:0"><p>Hello, I was lazy.</p></div><script><!--...--></script>
        //  ```

        // Generic assertions that work for all combinations
        expect(data.content).toContain('<h1>Welcome</h1>This page is:<ul>')
        if (!disable) {
          // When streaming is enabled, we see the streaming markers
          expect(data.content).toContain('<!--$?--><template id="B:0"></template><p>Loading...</p><!--/$-->')
        } else {
          // When streaming is disabled, Suspense resolves fully before rendering completes
          expect(data.content).toContain('<!--$--><p>Hello, I was lazy.</p><!--/$-->')
        }
        expect(data.content).toContain('<li>Rendered to HTML.</li>')
        expect(data.content).toContain('<li>Interactive. <button type="button">Counter <!-- -->0</button></li>')
        // ErrorOnServer component should render fallback on server
        expect(data.content).toContain('<p>loading on server</p>')
        expect(data.content).toContain('Error: Only renders on client')
        expect(data.content).toContain('<script type="module" src="/main.js"></script>')
        if (!disable) {
          expect(data.content).toContain(
            '<script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script>',
          )
          expect(data.content).toContain('<div hidden id="S:0"><p>Hello, I was lazy.</p></div>')
          expect(data.content).toContain('$RC("B:0","S:0")')
        }

        // Detailed snapshots for each combination
        testSnapshots(data.content, streamType, disable)
      })
    })
  })
})

function testSnapshots(content: string, streamType: 'node' | 'web', disable: boolean) {
  // Normalize file paths for CI compatibility - replace absolute path up to the last /react-streaming/
  const normalizedContent = content.replace(/\([^)]*\/react-streaming\//g, '(/FS-ROOT/react-streaming/')

  if (streamType === 'node' && disable === false) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react-stack-bottom-frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:8723:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:4621:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5056:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5704:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5530:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:6080:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5318:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5704:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5530:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:23:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:10:47)"></template><p>loading on server</p><!--/$--></li></ul><script type="module" src="/main.js"></script><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script><div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>$RC=function(b,c,e){c=document.getElementById(c);c.parentNode.removeChild(c);var a=document.getElementById(b);if(a){b=a.previousSibling;if(e)b.data="$!",a.setAttribute("data-dgst",e);else{e=b.parentNode;a=b.nextSibling;var f=0;do{if(a&&8===a.nodeType){var d=a.data;if("/$"===d)if(0===f)break;else f--;else"$"!==d&&"$?"!==d&&"$!"!==d||f++}d=a.nextSibling;e.removeChild(a);a=d}while(a);for(;c.firstChild;)e.insertBefore(c.firstChild,a);b.data="$"}b._reactRetry&&b._reactRetry()}};$RC("B:0","S:0")</script>"
    `,
    )
  } else if (streamType === 'node' && disable === true) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$--><p>Hello, I was lazy.</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react-stack-bottom-frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:8723:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:4621:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5056:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5704:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5530:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:6080:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5318:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5704:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.node.development.js:5530:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:23:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:10:47)"></template><p>loading on server</p><!--/$--></li></ul><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script><script type="module" src="/main.js"></script>"
    `,
    )
  } else if (streamType === 'web' && disable === false) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react-stack-bottom-frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:8798:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:4722:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5157:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5805:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5631:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6181:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5419:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5805:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5631:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:23:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:10:47)"></template><p>loading on server</p><!--/$--></li></ul><script type="module" src="/main.js"></script><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script><div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>$RC=function(b,c,e){c=document.getElementById(c);c.parentNode.removeChild(c);var a=document.getElementById(b);if(a){b=a.previousSibling;if(e)b.data="$!",a.setAttribute("data-dgst",e);else{e=b.parentNode;a=b.nextSibling;var f=0;do{if(a&&8===a.nodeType){var d=a.data;if("/$"===d)if(0===f)break;else f--;else"$"!==d&&"$?"!==d&&"$!"!==d||f++}d=a.nextSibling;e.removeChild(a);a=d}while(a);for(;c.firstChild;)e.insertBefore(c.firstChild,a);b.data="$"}b._reactRetry&&b._reactRetry()}};$RC("B:0","S:0")</script>"
    `,
    )
  } else if (streamType === 'web' && disable === true) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$--><p>Hello, I was lazy.</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react-stack-bottom-frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:8798:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:4722:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5157:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5805:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5631:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6181:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5419:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5805:22)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5631:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:23:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:10:47)"></template><p>loading on server</p><!--/$--></li></ul><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":":R7:"}</script><script type="module" src="/main.js"></script>"
    `,
    )
  }
}
