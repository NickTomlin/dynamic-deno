import {wait} from "./util.js"

export default async function greeter ({ name }) {
  await wait()
  return `Hello ${name}!`
}
