export default function scoreFormatter(value) {
  const first = value.toString().split('.')[0]
  let fractions = value.toString().split('.')[1]
  if (!fractions) {
    fractions = '00'
  }
  if (fractions.length == 1) {
    fractions += '0'
  }
  return `${first}<span class="score-num-fractional">.${fractions}</span>`
}
