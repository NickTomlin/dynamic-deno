import { serve } from "https://deno.land/x/sift@0.4.3/mod.ts";
import { v4 } from "https://deno.land/std@0.132.0/uuid/mod.ts";

function buildWorker () {
  return new Worker(new URL("./worker.js", import.meta.url), {
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
}

class Pool {
  #workers = []
  #queue = {}
  constructor({ maxThreads = 4 } = {}) {
    for (let i = 0; i < maxThreads; i++) {
      this.#workers.push(buildWorker())
    }
  }

  selectWorker () {
    const idx = 0
    const id = v4.generate()
    if (!this.#queue[idx]) {
      this.#queue[idx] = { work: 1, id }
    } else {
      this.#queue[idx] = {...this.#queue[idx], work: this.#queue[idx].work + 1, id }
    }
    return [id, this.#workers[idx]]
  }

  async run (input, options = { moduleName: "", timeout: 5000}) {
    const { moduleName } = options
    const [id, worker] = this.selectWorker()
    // TODO... handle timeouts or aborts somehow
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
// maybe we just don't do this?
const registered = new Map([
  ["adder", "./programs/adder.js"],
  ["greeter", "./programs/greeter.js"],
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
      return new Response(JSON.stringify(response))
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify( {
        status: 500
      }))
    }
  }
})
