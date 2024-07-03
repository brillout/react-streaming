<p align="center">
  <a href="/../../#readme">
    <img src="https://raw.githubusercontent.com/brillout/react-streaming/master/images/logo.svg" height="145" alt="React Streaming"/>
  </a>
</p>

# `react-streaming`

React Streaming. Full-fledged & Easy.

Follow: [Twitter > @brillout](https://twitter.com/brillout)  

> Unfamiliar with React Streaming? Check out [Dan's article about SSR and Streaming](https://github.com/reactwg/react-18/discussions/37).

> ⚠️
> While `react-streaming` is stable in itself (it's used in production and has good CI test coverage), note that React's SSR streaming support is still early and that the React team is working on high-level APIs that will make parts of `react-streaming` obsolete, see [@sebmarkbage comment at "RFC: injectToStream"](https://github.com/reactjs/rfcs/pull/219#issuecomment-1115398084).

<b>Contents</b>

- [Intro](#intro)
- [Why Streaming](#why-streaming)
- Usage
  - [Get Started](#get-started)
  - [Options](#options)
  - [Bots](#Bots)
  - [Error Handling](#error-handling)
  - [`useAsync()`](#useasync)
- Usage (Library Authors)
  - [Overview](#overview)
  - [`useAsync()` (Library Authors)](#useasync-library-authors)
  - [`injectToStream()`](#injecttostream)
  - [`doNotClose()`](#donotclose)
  - [`hasStreamEnded()`](#hasstreamended)

## Intro

**Features (for React users)**

- Unlocks `<Suspense>` for SSR apps.
- `useAsync()`: easily fetch data for SSR apps.
- Two SEO strategies: `conservative` or `google-speed`.
- Seamless support for Node.js (serverless) platforms (Vercel, AWS EC2, ...) and Edge platforms (Cloudflare Workers, Deno Deploy, Netlify Edge, Vercel Edge, ...).
- Easy error handling.

**Features (for library authors)**

- `useAsync()`: add data fetching capabilities to your library. High-level and easy to use.
- `injectToStream()`: inject chunks to the stream for your library. Low-level and difficult to use, but highly flexible.

**Easy**

```jsx
import { renderToStream } from 'react-streaming/server'
const {
  pipe, // Node.js (Vercel, AWS EC2, ...)
  readable // Edge (Cloudflare Workers, Deno Deploy, Netlify Edge, Vercel Edge, ...)
} = await renderToStream(<Page />)
```

<br/>

## Why Streaming

React 18's new SSR streaming architecture unlocks many capabilities:

- Easily fetch data for SSR apps.
- Fundamentally improved mobile performance. (Mobile users can progressively load the page as data is fetched, before even a single line of JavaScript is loaded. Especially important for users with a low-end device and poor internet connection.)
- Progressive Hydration. (Page is interactive before even the page has finished loading.)

Problem: the current React Streaming architecture is low-level and difficult to use.

Solution: `react-streaming`.

> `react-streaming` makes it easy to build the libraries of tomorrow, for example:
>  - Use [Telefunc](https://telefunc.com) to fetch data for your Next.js or [Vike](https://vike.dev) app. (Instead of Next.js's `getServerSideProps()` / `Vike`'s `data()`.)
>  - Better GraphQL tools, e.g. [Vilay](https://github.com/XiNiHa/vilay).

<br/>

## Usage

### Get Started

1. Install

   ```shell
   npm install react-streaming
   ```

2. Server-side

   ```jsx
   import { renderToStream } from 'react-streaming/server'
   const {
     pipe, // Defined if running in Node.js, otherwise `null`
     readable // Defined if running on Edge (e.g. Cloudflare Workers), otherwise `null`
   } = await renderToStream(<Page />)
   ```

That's it.

### Options

```jsx
const options = {
  // ...
}
await renderToStream(<Page />, options)
```

- `options.disable?: boolean`: Disable streaming.
  > `<Page>` is still rendered to a stream, but the promise `const promise = renderToStream()` resolves only after the stream has finished. (This effectively disables streaming from a user perspective, while unlocking React 18 Streaming capabilities such as SSR `<Supsense>`.)
- `options.seoStrategy?: 'conservative' | 'google-speed'`

  - `conservative` (default): Disable streaming if the HTTP request originates from a bot. (Ensuring bots to always see the whole HTML.)
  - `google-speed`: Don't disable streaming for the Google Bot.
    - Pro: Google may ([to be researched](https://github.com/brillout/react-streaming/issues/39)) rank your website higher because the initial HTTP response is faster.
    - Con: Google may ([to be researched](https://github.com/brillout/react-streaming/issues/39)) not await the HTML stream (see [Bots](#Bots)).
  - Custom SEO strategy: use `options.disable`. For example:

    ```jsx
    // Always stream, even for bots:
    const disable = false

    // Disable streaming for bots, except for the Google Bot and some other bot:
    const disable =
      isBot(userAgent) &&
      !['googlebot', 'some-other-bot'].some(n => userAgent.toLowerCase().includes(n))

    await renderToStream(<Page />, { disable })
    ```

- `options.userAgent?: string`: The HTTP [User-Agent request header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent). (Needed for `options.seoStrategy`.)
- `options.webStream?: boolean`: In Node.js, use a Web Stream instead of a Node.js Stream. ([Node.js 18 released Web Streams support](https://nodejs.org/en/blog/announcements/v18-release-announce/#web-streams-api-experimental).)
- `options.streamOptions`: Options passed to React's [`renderToReadableStream()`](https://react.dev/reference/react-dom/server/renderToReadableStream#parameters) and [`renderToPipeableStream()`](https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters). Use this to pass `nonce`, bootstrap scripts, etc. It excludes error handling options, use [Error Handling](#error-handling) instead.
- `options.timeout?: number | null` (seconds): Timeout after which the rendering stream is aborted, see [Abort](#abort). Defaults to 20 seconds. Set to `null` to disable automatic timeout (we recommend to then implement a manual timeout as explained at [Abort](#abort)).
- `options.onTimeout?: () => void`: Callback when the timeout is reached.
- `options.onBoundaryError?: (err: unknown) => void`: Called when a `<Suspense>` boundary fails. See [Error Handling](#error-handling).
-  ```tsx
   const { streamEnd } = await renderToStream(<Page />)
   // ✅ Page Shell succesfully rendered.
   const success: boolean = await streamEnd
   // Stream ended.
   if (success) {
     // ✅ <Page> succesfully rendered
   } else {
     // ❌ A <Suspense> boundary failed.
   }
   ```
   Note that `streamEnd` never rejects.
   > ⚠️
   > Read [Error Handling](#error-handling) before using `streamEnd`. In particular, do not use `success` to change the behavior of your app/stream (because React automatically takes care of gracefully handling `<Suspense>` failures).


### Bots

By default, `react-streaming` disables streaming for bots and crawlers, such as:
- The [Google Bot](https://developers.google.com/search/docs/crawling-indexing/googlebot), which crawls the HTML of your pages to be able to show a preview of your website on Google's result pages.
- The bot of social sites (Twitter/Instagram/WhatsApp...), which crawl the HTML of your pages to be able to show a preview of your website when it's shared on Twitter/Instagram/WhatsApp/...

> [!NOTE]  
> These bots explore your website by navigating the HTML of your pages. It isn't clear what bots do when they encounter an HTML stream ([to be researched](https://github.com/brillout/react-streaming/issues/39)); it's therefore safer to provide bots with a fully rendered HTML at once that contains all the content of your page (i.e. disable HTML streaming) instead of hoping that bots will await the HTML stream.

For `react-streaming` to be able to determine whether a request comes from a bot or a real user, you need to provide <a href="https://github.com/brillout/react-streaming#:~:text=disable%20%7D)-,options.userAgent,-%3F%3A%20string%3A%20The%20HTTP">`options.userAgent`</a>.

> [!NOTE]  
> If you use [Vike](https://vike.dev) with [`vike-react`](https://github.com/vikejs/vike-react), you can simply set [`renderPage({ headersOriginal })`](https://vike.dev/renderPage#:~:text=the%20HTTP%20Headers-,headersOriginal,-%3A%20req.headers%2C) instead. (The [User-Agent request header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent) will then automatically be passed to `react-streaming`).

You can implement a custom strategy, see <a href="https://github.com/brillout/react-streaming#:~:text=%3CSupsense%3E.)-,options.seoStrategy,-%3F%3A%20%27conservative%27%20%7C%20%27google%2Dspeed">`options.seoStrategy`</a>.


### Error Handling

The promise `await renderToStream()` resolves after the page shell is rendered. This means that if an error occurs while rendering the page shell, then the promise rejects with that error.

> :book: The page shell is the set of all components before `<Suspense>` boundaries.

```jsx
try {
  await renderToStream(<Page />)
  // ✅ Page shell succesfully rendered and is ready in the stream buffer.
} catch(err) {
  // ❌ Something went wrong while rendering the page shell.
}
```

The stream returned by `await renderToStream()` doesn't emit errors.

> :book: If an error occurs during the stream, then that means that a `<Suspense>` boundary failed.
> Instead of emiting a stream error, React swallows the error on the server-side and retries to resolve the `<Suspense>` boundary on the client-side.
> If the `<Suspense>` fails again on the client-side, then the client-side throws the error.
>
> This means that errors occuring during the stream are handled by React and there is nothing for you to do on the server-side. That said, you may want to gracefully handle the error on the client-side e.g. with [`react-error-boundary`](https://www.npmjs.com/package/react-error-boundary).
>
> You can use `options.onBoundaryError()` for error tracking purposes.

#### Abort

After a default [timeout](#options) of 20 seconds `react-streaming` aborts the rendering stream, as recommended by React [here](https://react.dev/reference/react-dom/server/renderToPipeableStream#aborting-server-rendering) and [there](https://react.dev/reference/react-dom/server/renderToReadableStream#aborting-server-rendering).

When the timeout is reached `react-streaming` ends the stream and tells React to stop rendering. Note that there isn't any thrown error: React merely stops server-side rendering and continues on the client-side, see explanation at [Error Handling](#error-handling).

You can also manually abort:

```tsx
const { abort } = await renderToStream(<Page />, { timeout: null })
abort()
```

### `useAsync()`

```jsx
import { useAsync } from 'react-streaming'

function Page({ movieId }) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Movie id={movieId}/>
    </Suspense>
  )
}

async function fetchMovie(id) {
  const response = await fetch(`https://star-wars.brillout.com/api/films/${id}.json`)
  return response.json()
}

// This component is isomorphic: it works on both the client-side and server-side. The
// data fetched during SSR is automatically passed and re-used on the client-side.
function Movie({ id }) {
  const key = [
    'star-wars-movies',
    id // Re-run `fetchMovie()` if `id` changes
  ]
  const movie = useAsync(key, () => fetchMovie(id))
  return (
    <ul>
      <li>
        Title: {movie.title}
      </li>
      <li>
        Release Date: {movie.release_date}
      </li>
    </ul>
  )
}
```

See [`useAsync()` (Library Authors)](#useasync-library-authors) for more information.

<br/>


## Usage (Library Authors)

### Overview

`react-streaming` enables you to suspend the React rendering and await for something to happen. (Usually data fetching.)
The novelty here is that it's isomorphic:

- It works on the client-side as well as on the server-side (while Serve-Side Rendering).
- For hydration, data is passed from the server to the client. (So that data isn't loaded twice.)

You have the choice between:

- `useAsync()`: High-level and easy.
- `injectToStream()`: Low-level and highly flexible (`useAsync()` is based on it). Easy & recommended for injecting script and style tags. Complex for data fetching (if possible, use `useAsync()` instead).


### `useAsync()` (Library Authors)

> This section is a low-level description of `useAsync()`. For a high-level description, see [`useAsync()`](#useasync) instead.

```jsx
import { useAsync } from 'react-streaming'

function SomeComponent() {
  const someAsyncFunc = async function () {
    const value = 'someData'
    return value
  }
  const key = ['some', 'invalidating', 'values']
  // useAsync() suspends rendering until the promise returned by someAsyncFunc() resolves
  const value = useAsync(key, someAsyncFunc)
  assert(value === 'someData')
}
```

When `<SomeComponent>` is rendered on the server-side (SSR), it injects the
resolved value into the stream and the client-side picks up the injected value. This means that the
client-side doesn't call `someAsyncFunc()`: instead, the client-side re-uses the value resolved on
the server-side.

If you want `someAsyncFunc()` to be re-run, then change `key`. The `someAsyncFunc()` is only re-run if when the component is un-mounted and re-mounted, or if `key` changes. For example, changing the state of your component (e.g. with `useState()`) will *not* re-run `someAsyncFunc()` if you provide the same `key`.

Usually the key is set to `['name-of-the-function', ...functionArguments]`.

> You can think of `key` to serve a similar purpose to [React Queries's key](https://tanstack.com/query/v4/docs/guides/query-keys), and to the `deps` argument of React's [`useEffect(fn, deps)`](https://reactjs.org/docs/hooks-effect.html#tip-optimizing-performance-by-skipping-effects).


### `injectToStream()`

```ts
type Chunk = string | Buffer
type Options = { flush?: boolean }
injectToStream(chunk: Chunk  | Promise<Chunk>, options?: Options)`
```

The `injectToStream()` function enables you to inject chunks to the stream.

There are two ways to access `injectToStream()`:
 1. With `renderToStream()`:
    ```jsx
    import { renderToStream } from 'react-streaming/server'
    const stream = await renderToStream(<Page />)
    const { injectToStream } = stream
    ```
 2. With `useStream()`:
    ```js
    import { useStream } from 'react-streaming'

    function SomeComponent() {
      const stream = useStream()
      if (stream === null) {
        // No stream available. This is the case:
        // - On the client-side.
        // - When `option.disable === true`.
        // - When react-streaming is not installed.
      }
      const { injectToStream } = stream
    }
    ```

Usage examples:

```jsx
// Inject JavaScript (e.g. for progressive hydration)
injectToStream('<script type="module" src="/main.js"></script>', { flush: true })

// Inject CSS (e.g. for CSS-in-JS)
injectToStream('<styles>.some-component { color: blue }</styles>', { flush: true })

// Pass data to client
injectToStream(`<script type="application/json">${JSON.stringify(someData)}</script>`)
```

For a full example of using `injectToStream()`, have a look at `useAsync()`'s implementation.

If setting `options.flush` to `true`, then the stream will be flushed after `chunk` has been written to the stream. This is only applicable for Node.js streams and only if you are using a compression library that makes a `flush()` method available. For example, [`compression` adds a `res.flush()` method](https://www.npmjs.com/package/compression#resflush). The option is ignored if there isn't a `flush()` method available.


### `doNotClose()`

Typical usage:

```js
const makeClosableAgain = stream.doNotClose()
// Ensure chunk is injected before the stream ends
injectToStream(chunk)
makeClosableAgain()
```

Like [`injectToStream()`](#injecttostream), there are two ways to access it:

```jsx
import { renderToStream } from 'react-streaming/server'
const stream = await renderToStream(<Page />)
const { doNotClose } = stream
```
```js
import { useStream } from 'react-streaming'
function SomeComponent() {
  const stream = useStream()
  const { doNotClose } = stream
}
```


### `hasStreamEnded()`

Check whether the stream has ended.

Like [`injectToStream()`](#injecttostream), there are two ways to access it:

```jsx
import { renderToStream } from 'react-streaming/server'
const stream = await renderToStream(<Page />)
const { hasStreamEnded } = stream
```
```js
import { useStream } from 'react-streaming'
function SomeComponent() {
  const stream = useStream()
  const { hasStreamEnded } = stream
}
```
