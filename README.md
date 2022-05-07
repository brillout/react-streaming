<p align="center">
  <a href="/../../#readme">
    <img src="https://raw.githubusercontent.com/brillout/react-streaming/master/images/logo.svg" height="145" alt="React Streaming"/>
  </a>
</p>

# `react-streaming`

> React 18 Streaming. Full-fledged & Easy.

Follow: [Twitter > @brillout](https://twitter.com/brillout)
<br/>
Chat: <a href="https://discord.com/invite/H23tjRxFvx">Discord > Vike<img src="/images/hash.svg" height="17" width="23" valign="text-bottom" alt="hash"/>react-streaming</a>

<b>Contents</b>

- [Intro](#intro)
- [Why Streaming](#why-streaming)
- [Get Started](#get-started)
  - [Options](#options)
  - [Error Handling](#error-handling)
  - [Bonus: `useAsync()`](#bonus-useasync)
- [Get Started (Library Authors)](#get-started-library-authors)
  - [`useAsync()`](#useasync)
  - [`useSsrData()`](#usessrdata)
  - [`injectToStream()`](#injecttostream)

## Intro

Features (for React users):

- Unlocks `<Suspsense>` for SSR apps.
- Unlocks React libraries of tomorrow. (Such as using [Telefunc](https://telefunc.com/) for SSR data fetching.)
- Seamless support for Node.js (serverless) platforms (Vercel, AWS EC2, ...) and Edge platforms (Cloudflare Workers, Netlify Edge, Deno Deploy, ...).
- Two SEO strategies: `conservative` or `google-speed`.
- Easy error handling.
- **Bonus**: new `useAsync()` hook.

Features (for library authors):

- `useSsrData()`: Define isomorphic data.
- `injectToStream()`: Inject chunks to the stream.

Easy:

```jsx
import { renderToStream } from 'react-streaming/server'
const {
  pipe, // Node.js (Vercel, AWS EC2, ...)
  readable // Edge (Coudflare Workers, Netlify Edge, Deno Deploy, ...)
} = await renderToStream(<Page />)
```

## Why Streaming

React 18's new SSR streaming architecture unlocks many capabilities:

- Data Fetching:
  - Use RPC to fetch data in a seamless way, e.g. with [Telefunc](https://telefunc.com). (Data fetching SSR hooks will be a thing of the past: no more Next.js `getServerSideProps()` nor [`vite-plugin-ssr`](https://vite-plugin-ssr.com/)'s `onBeforeRender()`.)
  - Expect your GraphQL tools to significantly improve, both on performance and DX. (Also expect new tools such as [Vilay](https://github.com/XiNiHa/vilay).)
- Fundamentally improved mobile performance. (Mobile users can progressively load the page as data is fetched, before even a single line of JavaScript is loaded. Especially important for low-end or poorly-connected devices.)
- Progressive Hydration. (Page is interactive before even the page has finished loading.)

The problem: The current React 18 Streaming architecture is low-level and its ergonomics are cumbersome. (E.g. there is no standard way for library authors to take advantage of the new streaming architecture.)

The solution: `react-streaming`.

<br/>

## Get Started

1. Install

   ```shell
   npm install react-streaming
   ```

2. Server-side

   ```jsx
   import { renderToStream } from 'react-streaming/server'
   const {
     pipe, // Defined if running in Node.js, otherwise `null`
     readable // Defined if running on the Edge (.e.g. Coudflare Workers), otherwise `null`
   } = await renderToStream(<Page />, options)
   ```

3. Client-side
   ```jsx
   import { ReactStreaming } from 'react-streaming/client'
   // Wrap your root component `<Page>` (aka `<App>`) with `<ReactStreaming>`
   const page = (
     <ReactStreaming>
       <Page />
     </ReactStreaming>
   )
   ```

### Options

- `options.disable?: boolean`: Disable streaming.
  > `<Page>` is still rendered to a stream, but the promise `const promise = renderToStream()` resolves only after the stream has finished. (This effectively disables streaming from a user perspective, while unlocking React 18 Streaming capabilities such as SSR `<Supsense>`.)
- `options.seoStrategy?: 'conservative' | 'google-speed'`

  - `conservative` (default): Disable streaming if the HTTP request originates from a bot. (Ensuring bots to always see the whole HTML.)
  - `google-speed`: Don't disable streaming for the Google Bot.
    - Pro: Google ranks your website higher because the initial HTTP response is faster. (To be researched.)
    - Con: Google will likely not wait for the whole HTML, and therefore not see it. (To be tested.)
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

- `options.userAgent?: string`: The HTTP User-Agent request header. (Needed for `options.seoStrategy`.)
- `options.webStream?: boolean`: Use Web Streams instead of Node.js Streams in Node.js. ([Node.js 18 released Web Streams support](https://nodejs.org/en/blog/announcements/v18-release-announce/#web-streams-api-experimental).)

### Error Handling

The promise `await renderToStream()` resolves after the page shell is rendered. This means that if an error occurs while rendering the page shell, then the promise rejects with that error.

> :book: The page shell is the set of all components outside of `<Suspsense>` boundaries.

```js
try {
  await renderToStream(<Page />)
  // ✅ Page shell succesfully rendered and is ready in the stream buffer.
} catch(err) {
  // ❌ Something went wrong while rendering the page shell.
}
```

The stream returned by `await renderToStream()` nevers emits an error.

> :book: If an error occurs during the stream, then that means that a `<Suspsense>` boundary failed.
> Instead of emiting a stream error, React swallows the error on the server-side and retries to resolve the `<Suspsense>` boundary on the client-side.
> If the `<Suspsense>` fails again on the client-side, then the client-side throws the error.
>
> This means that stream errros are handled by React and there is nothing for you to do on the server-side. That said, you may want to gracefully handle the error on the client-side e.g. with [`react-error-boundary`](https://www.npmjs.com/package/react-error-boundary).

### Bonus: `useAsync()`

```jsx
import { useAsync } from 'react-streaming'

function StarWarsMovies() {
  return (
    <div>
      <p>List of Star Wars movies:</p>
      <Suspense fallback={<p>Loading...</p>}>
        <MovieList />
      </Suspense>
    </div>
  )
}

// This component is isomorphic: it works on both the client-side and server-side.
// The data fetched while SSR is automatically passed and re-used on the client for hydration.
function MovieList() {
  const movies = useAsync(async () => {
    const response = await fetch('https://star-wars.brillout.com/api/films.json')
    return response.json()
  })
  return (
    <ul>
      {movies.forEach((movie) => (
        <li>
          {movie.title} ({movie.release_date})
        </li>
      ))}
    </ul>
  )
}
```

<br/>

## Get Started (Library Authors)

`react-streaming` enables you to suspend React rendering and await something to happen. (Usually data fetching.)
The novelty here is that it's isomorphic:

- It works on the client-side, as well as on the server-side (while Serve-Side Rendering).
- For hydration, data is passed from the server to the client. (So that data isn't loaded twice.)

You have the choice between three methods:

- `useAsync()`: Highest-level & easiest.
- `useSsrData()`: High-level & easy.
- `injectToStream()`: Low-level and highly flexible (both `useAsync()` and `useSsrData()` are based on it). Easy & recommended for injecting script and style tags. Complex for data fetching (if possible, use `useSsrData()` or `useAsync()` instead).

### `useAsync()`

For how to use `useAsync()`, see example [above](#bonus-useasync).

### `useSsrData()`

```jsx
import { useSsrData } from 'react-streaming'

function SomeComponent() {
  const key = 'some-unique-key'
  const someAsyncFunc = async function () {
    const value = 'someData'
    return value
  }
  // `useSsrData()` suspends rendering until the promise returned by `someAsyncFunc()` resolves.
  const value = useSsrData(key, someAsyncFunc)
  assert(value === 'someData')
}
```

If `<SomeComponent>` is rendered only on the client-side, then `useSsrData()` is essentially a
cache that never invalidates. (If you want to re-run `someAsyncFunc()`, then change the key.)

If `<SomeComponent>` is rendered on the server-side (SSR), it injects the
resolved value into the stream and the client-side picks up the injected value. (So that the
client-side doesn't call `someAsyncFunc()` but, instead, re-uses the value resolved on
the server-side.)

This is for example how `useAsync()` is implemented:

```jsx
import { useId } from 'react'
import { useSsrData } from 'react-streaming'

function useAsync(asyncFn) {
  const id = useId()
  return useSsrData(id, asyncFn)
}
```

### `injectToStream()`

`injectToStream(htmlChunk: string)` allows you to inject strings to the current stream.

There are two ways to access `injectToStream()`:
 1. With `renderToStream()`:
    ```jsx
    import { renderToStream } from 'react-streaming/server'
    const { injectToStream } = await renderToStream(<Page />)
    ```
 2. With `useStream()`:
    ```jsx
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
injectToStream('<script type="module" src="/main.js"></script>')

// Inject CSS (e.g. for CSS-in-JS)
injectToStream('<styles>.some-component { color: blue }</styles>')

// Pass data to client
injectToStream(`<script type="application/json">${JSON.stringify(someData)}</script>`)
```

For a full example of using `injectToStream()`, have a look at `useSsrData()`'s implementation.
