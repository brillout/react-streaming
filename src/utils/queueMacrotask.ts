export { queueMacrotask }

// Node.js delays `setTimeout(fn, 0)` by at least 1ms, whereas `setImmediate(fn)` has no minimum delay
function queueMacrotask(fn: () => void) {
  if (typeof setImmediate === 'function') {
    setImmediate(fn)
  } else {
    setTimeout(fn, 0)
  }
}
