const port = 9009;

const handler = async (request) => {
  const url = new URL(request.url)
  const path = url.pathname
  if (path === "/") {
    return new Response("Hi")
  }
  console.log(request.url, request.method)

  if (path.startsWith("/run") && request.method === "POST") {
    if (request.body === null) { return new Response("Must be json") }
    const [moduleName] = path.split("/").slice(-1)
    if (!moduleName) { return new Response("No module name supplied") }
    const input = await request.json()

    const result = await new Promise((resolve, reject) => {
      // probably bad to instantiate on a per request basis
      // how can we bench this?
      const worker = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
        deno:{
          namespace: false,
          permissions: {
            read: [
              new URL("./programs", import.meta.url)
            ],
            write: false
          }
        }
      })
      worker.postMessage({ type: "worker:run", payload: input, moduleName: moduleName })

      worker.addEventListener('message', (event) => {
        console.log('reply  -----', event.data)
        if (event?.data?.type === "worker:finished") {
          resolve(new Response(JSON.stringify({ result: event.data.result})))
        } else {
          resolve(new Response(JSON.stringify({ result: null, message: "invalid response"} )), {
            status: 500
          })
        }
      })

      worker.addEventListener('error', (error) => {
        reject(error.error)
      })
    })

    return result
  }

  return new Response("Not found", { status: 404 })
};

console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
Deno.serve({ port }, handler);