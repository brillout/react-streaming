export { Page }

import React, { useState, Suspense } from 'react'
import { useAsync } from '../src/index'

function Page() {
  return (
    <>
      <h1>Welcome</h1>
      This page is:
      <ul>
        <li><Suspense fallback={<p>Loading...</p>}><LazyComponent /></Suspense></li>
        <li>Rendered to HTML.</li>
        <li>
          Interactive. <Counter />
        </li>
      </ul>
    </>
  )
}
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count}
    </button>
  )
}

function LazyComponent() {
  const val = useAsync(
    () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('Hello, I was lazy.'), 100)
      })
  )
  return <p>{val}</p>
}
