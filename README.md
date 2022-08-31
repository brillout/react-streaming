<p align="center">
  <a href="/../../#readme">
    <img src="https://raw.githubusercontent.com/brillout/react-streaming/master/images/logo.svg" height="145" alt="React Streaming"/>
  </a>
</p>

# `react-streaming`

> React 18 Streaming. Full-fledged & Easy.

> Unfamiliar with React Streaming? Check out [Dan's article about SSR and Streaming](https://github.com/reactwg/react-18/discussions/37).

Follow: [Twitter > @brillout](https://twitter.com/brillout)
<br/>
Chat: <a href="https://discord.com/invite/H23tjRxFvx">Discord > Vike<img src="/images/hash.svg" height="17" width="23" valign="text-bottom" alt="hash"/>react-streaming</a>

<b>Contents</b>

- [Intro](#intro)
- [Why Streaming](#why-streaming)
- [Get Started](#get-started)
  - [Options](#options)
  - [Error Handling](#error-handling)
  - [`useAsync()`](#useasync)
- [Get Started (Library Authors)](#get-started-library-authors)
  - [`useAsync()` (Library Authors)](#useasync-library-authors)
  - [`injectToStream()`](#injecttostream)

## Intro

Features (for React users):

- Unlocks `<Suspense>` for SSR apps.
- `useAsync()`: easily fetch data for SSR apps.
- Two SEO strategies: `conservative` or `google-speed`.
- Seamless support for Node.js (serverless) platforms (Vercel, AWS EC2, ...) and Edge platforms (Cloudflare Workers, Deno Deploy, Netlify Edge, Vercel Edge, ...).
- Easy error handling.

Features (for library authors):

- `useAsync()`: add data fetching capabilities to your library. High-level and easy to use.
- `injectToStream()`: inject chunks to the stream for your library. Low-level and difficult to use, but highly flexible.

Easy:

```jsx
import { renderToStream } from 'react-streaming/server'
const {
  pipe, // Node.js (Vercel, AWS EC2, ...)
  readable // Edge (Coudflare Workers, Deno Deploy, Netlify Edge, Vercel Edge, ...)
} = await renderToStream(<Page />)
```

> ⚠️
> While `react-streaming` is stable in itself (it's used in production and has good CI test coverage), note that React's SSR streaming support is still early and that the React team is working on high-level APIs that may make parts of `react-streaming` obsolete, see [React RFC injectToStream - @sebmarkbage comment](https://github.com/reactjs/rfcs/pull/219#issuecomment-1115398084).

<br/>

## Why Streaming

React 18's new SSR streaming architecture unlocks many capabilities:

- Easily fetch data for SSR apps.
- Fundamentally improved mobile performance. (Mobile users can progressively load the page as data is fetched, before even a single line of JavaScript is loaded. Especially important for users with a low-end device and users with a poor internet connection.)
- Progressive Hydration. (Page is interactive before even the page has finished loading.)

The problem: the current React 18 Streaming architecture is low-level and difficult to use.

The solution: `react-streaming`.

> `react-streaming` makes it easy to build the libraries of tomorrow, for example:
>  - Use [Telefunc](https://telefunc.com/) to easily fetch data for your Next.js app or your [Vite + `vite-plugin-ssr`](https://vite-plugin-ssr.com/) app. (Replacing Next.js's `getServerSideProps()` and `vite-plugin-ssr`'s `onBeforeRender()`.)
>  - Better GraphQL tools, e.g. [Vilay](https://github.com/XiNiHa/vilay).

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
> This means that errros occuring during the stream are handled by React and there is nothing for you to do on the server-side. That said, you may want to gracefully handle the error on the client-side e.g. with [`react-error-boundary`](https://www.npmjs.com/package/react-error-boundary).
>
> You can use `options.onBoundaryError()` for error tracking purposes.

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

// This component is isomorphic: it works on both the client-side and server-side.
// The data fetched while SSR is automatically passed and re-used on the client for hydration.
function Movie({ id }) {
  const movie = useAsync(
    async () => {
      const response = await fetch(`https://star-wars.brillout.com/api/films/${id}.json`)
      return response.json()
    },
    'star-wars-movies', // You need to provide a unique key
    [id] // Only re-run if `id` changes
  )
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

<br/>


## Get Started (Library Authors)

`react-streaming` enables you to suspend React rendering and await something to happen. (Usually data fetching.)
The novelty here is that it's isomorphic:

- It works on the client-side, as well as on the server-side (while Serve-Side Rendering).
- For hydration, data is passed from the server to the client. (So that data isn't loaded twice.)

You have the choice between three methods:

- `useAsync()`: High-level and easy.
- `injectToStream()`: Low-level and highly flexible (`useAsync()` is based on it). Easy & recommended for injecting script and style tags. Complex for data fetching (if possible, use `useAsync()` instead).

### `useAsync()` (Library Authors)

> This section is a low-level description of `useAsync()`. For a high-levl description, see [`useAsync()`](#useasync) instead.

```jsx
import { useAsync } from 'react-streaming'

function SomeComponent() {
  const someAsyncFunc = async function () {
    const value = 'someData'
    return value
  }
  const key = 'some-unique-key'
  const deps = ['some-cache-invalidating-values']
  // `useAsync()` suspends rendering until the promise returned by `someAsyncFunc()` resolves.
  const value = useAsync(
    someAsyncFunc,
    key, // Required, and should be unique for each component.
    deps // Optional: array of values.
  )
  assert(value === 'someData')
}
```

When `<SomeComponent>` is rendered on the server-side (SSR), it injects the
resolved value into the stream and the client-side picks up the injected value. This means that the
client-side doesn't call `someAsyncFunc()`: instead, the client-side re-uses the value resolved on
the server-side.

If you want to re-run `someAsyncFunc()`, then change `deps`. This is similar to the `deps` argument of React's `useEffect(fn, deps)`.

If `<SomeComponent>` is rendered only on the client-side, then `useAsync()` is essentially just a cache.


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

For a full example of using `injectToStream()`, have a look at `useAsync()`'s implementation.
