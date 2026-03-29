export function formatNumber(value: unknown, digits = 3) {
  if (value === null || value === undefined || value === '') return '-'
  const n = Number(value)
  if (Number.isNaN(n)) return '-'
  return n.toFixed(digits)
}

export function parseNumber(value: unknown) {
  return Number(value ?? 0)
}
