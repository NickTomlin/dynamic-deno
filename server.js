const port = 9009;

const handler = async (request) => {
  const body = `Your user-agent is:\n\n${
    request.headers.get("user-agent") ?? "Unknown"
  }`;

  if (request.url === "/") {
    return new Response("Hi")
  }

  if (request.url.startsWith("/run") && request.method === "POST") {
    if (request.body === null) { return new Response("Must be json") }
    const params = await request.json()
    if (!params.moduleName) { return new Response("No module name supplied") }
    const input = await request.json()
    return new Promise((resolve, reject) => {
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
      worker.postMessage({ type: "worker:run", payload: input, moduleName: params?.moduleName })

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
  }
  request.url.startsWith("/run") && console.log("run route")

  return new Response(body, { status: 200 });
};

console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
Deno.serve({ port }, handler);