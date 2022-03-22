export default function adder (input) {
  return Object.values(input).reduce((accum, item) => accum + item, 0)
}
