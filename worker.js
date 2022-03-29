function isWorkerEvent (event) {
  if (event instanceof MessageEvent && Object.hasOwn(event, 'data')) {
    return Object.hasOwn(event.data, "payload") && Object.hasOwn(event.data, "type")
  } else {
    return false
  }
}

// LRU sometime? or a network???
const cache = {}

async function getCached (moduleName) {
  if (cache[moduleName]) { return cache[moduleName] }

  const module = await import(moduleName)

  cache[moduleName] = module.default
  return cache[moduleName]
}

// we need to differentiate events since we could be handling multiple at the same time
self.addEventListener('message', async (event) => {
  if (!isWorkerEvent(event)) { return }
  const { payload, type, moduleName, id } = event.data
  switch (type) {
    case 'worker:run':
      const module = await getCached(moduleName)
      try {
        const result = await module(payload)
        self.postMessage({ type: 'worker:finished', result, id })
      } catch (error) {
        self.postMessage({ name: 'worker:error', result: null, error: error, id })
      }
      return
    default:
      console.log(`unknown message type`)
      return
  }
})
