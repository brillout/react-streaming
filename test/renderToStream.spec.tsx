import { describe, expect, it } from 'vitest'
import React from 'react'
import { Page } from './Page'
import { render } from './render'
import partRegex from '@brillout/part-regex'

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
        expect(data.content).toContain('<h1>Welcome</h1>This page is:<ul>')

        //  Suspense fallback for LazyComponent
        if (!disable) {
          // When streaming is enabled, we see the streaming markers
          expect(data.content).toContain('<!--$?--><template id="B:0"></template><p>Loading...</p><!--/$-->')
        } else {
          // When streaming is disabled, Suspense resolves fully before rendering completes
          expect(data.content).toContain('<!--$--><p>Hello, I was lazy.</p><!--/$-->')
        }

        //  Other page content
        expect(data.content).toContain('<li>Rendered to HTML.</li>')
        expect(data.content).toContain('<li>Interactive. <button type="button">Counter <!-- -->0</button></li>')

        //  Suspense fallback for ErrorOnServer (client-only component)
        expect(data.content).toContain('<p>loading on server</p>')
        expect(data.content).toContain('Error: Only renders on client')

        //  Injection:
        expect(data.content).toContain('<script type="module" src="/main.js"></script>')

        if (!disable) {
          //  Injection useAsync()
          expect(data.content).toMatch(
            partRegex`<script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":"${/[^"]*/}"}</script>`,
          )

          //  Suspense resolving LazyComponent
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
  // Normalize file paths for CI compatibility - replace absolute path up to the last /react-streaming/ (including node_modules cases)
  const normalizedContent = content.replace(
    /\(([^)]*)(\/|node_modules\/)react-streaming\//g,
    '(/FS-ROOT/react-streaming/',
  )

  if (streamType === 'node' && disable === false) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react_stack_bottom_frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:10288:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:5298:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:5733:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6675:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6614:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:7152:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6158:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6675:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6614:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:25:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:12:47)"></template><p>loading on server</p><!--/$--></li></ul><script>requestAnimationFrame(function(){$RT=performance.now()});</script><script type="module" src="/main.js"></script><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":"_R_7_"}</script><div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
      $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
    `,
    )
  } else if (streamType === 'node' && disable === true) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$--><p>Hello, I was lazy.</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react_stack_bottom_frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:10288:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:5298:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:5733:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6675:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6614:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:7152:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6158:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6675:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.node.development.js:6614:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:25:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:12:47)"></template><p>loading on server</p><!--/$--></li></ul><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":"_R_7_"}</script><script type="module" src="/main.js"></script>"
    `,
    )
  } else if (streamType === 'web' && disable === false) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$?--><template id="B:0"></template><p>Loading...</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react_stack_bottom_frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:10313:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5399:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5834:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6776:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6715:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:7253:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6259:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6776:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6715:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:25:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:12:47)"></template><p>loading on server</p><!--/$--></li></ul><script>requestAnimationFrame(function(){$RT=performance.now()});</script><script type="module" src="/main.js"></script><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":"_R_7_"}</script><div hidden id="S:0"><p>Hello, I was lazy.</p></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
      $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
    `,
    )
  } else if (streamType === 'web' && disable === true) {
    expect(normalizedContent).toMatchInlineSnapshot(
      `
      "<h1>Welcome</h1>This page is:<ul><li><!--$--><p>Hello, I was lazy.</p><!--/$--></li><li>Rendered to HTML.</li><li>Interactive. <button type="button">Counter <!-- -->0</button></li><li><!--$!--><template data-msg="Switched to client rendering because the server rendering errored:

      Only renders on client" data-stck="Switched to client rendering because the server rendering errored:

      Error: Only renders on client
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:53:11)
          at Object.react_stack_bottom_frame (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:10313:18)
          at renderWithHooks (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5399:19)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:5834:23)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6776:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6715:11)
          at renderNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:7253:18)
          at renderElement (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6259:22)
          at retryNode (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6776:21)
          at renderNodeDestructive (/FS-ROOT/react-streaming/node_modules/.pnpm/react-dom@19.2.3_react@19.2.3/node_modules/react-dom/cjs/react-dom-server.edge.development.js:6715:11)" data-cstck="
          at ErrorOnServer (/FS-ROOT/react-streaming/test/Page.tsx:25:11)
          at Suspense (&lt;anonymous&gt;)
          at li (&lt;anonymous&gt;)
          at ul (&lt;anonymous&gt;)
          at Page (&lt;anonymous&gt;)
          at ReactStreamingProviderSuspenseData (/FS-ROOT/react-streaming/src/server/useAsync/useSuspenseData.ts:12:47)"></template><p>loading on server</p><!--/$--></li></ul><script class="react-streaming_initData" type="application/json">{"key":"\\"hello-component-key\\"","value":"Hello, I was lazy.","elementId":"_R_7_"}</script><script type="module" src="/main.js"></script>"
    `,
    )
  }
}
