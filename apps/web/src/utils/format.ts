/**
 * 通用格式化工具
 */

/**
 * 格式化数量：最多 3 位小数，去除末尾零
 */
export function formatQuantity(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

/**
 * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
