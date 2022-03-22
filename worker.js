function isDiploEvent (event) {
  if (event instanceof MessageEvent && Object.hasOwn(event, 'data')) {
    return Object.hasOwn(event.data, "payload") && Object.hasOwn(event.data, "type")
  } else {
    return false
  }
}

const registered = new Map([
  ["adder", "./programs/adder.js"],
  ["greeter", "./programs/greeter.js"],
])

self.addEventListener('message', async (event) => {
  if (!isDiploEvent(event)) { return }
  const { payload, type, moduleName } = event.data
  console.log('---Worker', event.data)
  switch (type) {
    case 'worker:run':
      if (!registered.has(moduleName)) {
        self.postMessage({ name: 'worker:error', result: null, error: `Invalid program ${moduleName}` })
        return
      }
      const module = await import(registered.get(moduleName))
      try {
        const result = await module.default(payload)
        self.postMessage({ type: 'worker:finished', result })
      } catch (error) {
        self.postMessage({ name: 'worker:error', result: null, error: error })
      }
      return
    default:
      console.log('unknown type')
      return
  }
})
