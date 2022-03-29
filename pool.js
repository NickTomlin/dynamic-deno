/*
threads = number of actual threads.
stats = # of workers, response time?
 */

export class NaiveWorkerPool {
  #workers = []

  constructor(options = { numberOfWorkers: 4}) {
    for (let i = 0; i < options.numberOfWorkers; i++) {
      this.#workers.push( new Worker())
    }
  }

  addWorker (worker) {
    this.#workers.push(worker)
  }

  async work (input, options = { timeout: 5000}) {
    setTimeout(() => {

    }, options.timeout)
  }
}
