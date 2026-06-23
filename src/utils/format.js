/**
 * 价格格式化：统一保留两位小数
 */
export function formatPrice(value) {
  if (value == null || value === '') return ''
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return num.toFixed(2)
}
