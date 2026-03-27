export function formatCompactPlayCount(value: number): string {
  const normalizedValue = Math.max(0, value)

  if (normalizedValue >= 100000000) {
    return `${(normalizedValue / 100000000).toFixed(1).replace(/\.0$/, '')}亿`
  }

  if (normalizedValue >= 10000) {
    return `${(normalizedValue / 10000).toFixed(1).replace(/\.0$/, '')}万`
  }

  return String(Math.floor(normalizedValue))
}

export function formatPlayCount(value?: number | string): string {
  if (value == null || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return formatCompactPlayCount(value)
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return ''
  }

  const normalizedNumericValue = trimmedValue.replace(/,/g, '').replace(/\s+/g, '')
  if (/[万亿]/.test(normalizedNumericValue)) {
    return normalizedNumericValue
  }

  if (/^\d+(?:\.\d+)?$/.test(normalizedNumericValue)) {
    return formatCompactPlayCount(Number(normalizedNumericValue))
  }

  return trimmedValue
}
