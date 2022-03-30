/*
This might be an example of a contract that wraps http semantics
 */
import {wait} from "./util.js"

export default async function httpGreeter (input) {
  console.log('...', input)
  const name = input?.body?.name
  await wait()
  if (name === "explode") {
    return { body: `purposefully raising error`, status: 500 }
  }
  return {
    body: `Hello ${name}!`,
    status: 200
  }
}
