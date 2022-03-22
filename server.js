import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";

serve({
  "/": () => new Response("Hi"),
  "/run/:moduleName": async (request, params) => {
    if (request.method !== "POST") { return new Response("Must be json") }
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
})
