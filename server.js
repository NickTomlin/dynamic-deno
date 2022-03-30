import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";
import { v4 } from "https://deno.land/std@0.132.0/uuid/mod.ts";

function buildWorker () {
  /*
  Workers are the most atomic unit I know of to provide sandboxing. There are costs: the overhead of
  postMessage passing and serialization/deserialization and the lack of fine grained control over work inside worker
   (e.g. one task just `do while(true)`ing). I think these costs are worth it if this enables a domain specific
   runtime with decent performance.
   */
  return new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
    deno:{
      namespace: false,
      permissions: {
        read: [
          // or NET to a service / database?
          new URL("./programs", import.meta.url)
        ],
        write: false
      }
    }
  })
}

class Pool {
  #workers = []
  // TODO: consider a promise pool?
  // and moving events outside each promise?
  #queue = new Map()
  constructor({ maxThreads = 4 } = {}) {
    for (let i = 0; i < maxThreads; i++) {
      this.#workers.push(buildWorker())
    }
  }

  selectWorker () {
    const id = v4.generate()
    // TODO: better work balancing algo :)
    const workerNum = Math.floor(Math.random() * this.#workers.length - 1) + 1

    if (!this.#queue.has(id)) {
      this.#queue.set(id, { work: 1, id })
    } else {
      this.#queue.set(id, {...this.#queue.get(id), id })
    }
    return [id, this.#workers[workerNum]]
  }


  /*
  For timeouts, not sure how to handle this. We really need to know when a worker is spinning out of control.
  We could drain and isolate the worker and then kill it. That would have the least effect on other jobs but could lead to
  its own special form of build up.
   */
  async run (input, options = { moduleName: "", timeout: 5000}) {
    const { moduleName } = options
    const [id, worker] = this.selectWorker()
    // TODO(noisy neighbors): handle timeouts or aborts somehow
    // TODO(cleanup): move event handlers out to top level class and use promise map
    // that way we aren't duplicating listeners
    return new Promise((resolve, reject) => {
      worker.postMessage({ type: "worker:run", payload: input, moduleName, id})

      worker.addEventListener('message', (event) => {
        console.log('reply  -----', event.data)
        if (event?.data?.type === "worker:finished") {
          resolve({ result: event.data.result, error: null})
        } else {
          resolve({ result: null, error: null, message: "invalid response"})
        }
      })

      worker.addEventListener('error', (error) => {
        console.error(error)
        reject(Pool.#processError(error))
      })
    })
  }

  static async #processError (error) {
    return {
      result: null,
      error: error.error
    }
  }
}

const pool = new Pool()

// maybe in a DB somewhere?
// maybe we just don't do this
// and let file system reads be our router
const registered = new Map([
  ["adder", "./programs/adder.js"],
  ["greeter", "./programs/greeter.js"],
  ["http", "./programs/http.js"]
])

serve({
  "/": () => new Response("Hi"),
  "/run/:moduleName": async (request, params) => {
    if (request.method !== "POST") { return new Response("Must be json") }
    if (!params.moduleName) { return new Response("No module name supplied") }
    if (!registered.has(params.moduleName)) { return new Response(`Invalid module name: ${params.moduleName}`)}

    const input = await request.json()

    try {
      const response = await pool.run(input, { moduleName: registered.get(params.moduleName) })
      // example of "special" contract
      // this should be in a middleware of some sort eventually
      if (params.moduleName === "http") {
        console.log('something', response.result.status)
        return new Response(JSON.stringify(response.result.body), { status: response?.result?.status ?? 200, headers: {
             'Content-Type': response.contentType ?? "application/json"
          }})
      } else {
        return new Response(JSON.stringify(response))
      }
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify( {
        status: 500
      }))
    }
  }
})
