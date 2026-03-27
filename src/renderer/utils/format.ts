export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function parseDuration(durationText: string): number {
  if (!durationText) return 0

  const parts = durationText
    .trim()
    .split(':')
    .map((part) => Number.parseInt(part, 10))

  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return 0
  }

  return parts.reduce((total, part) => total * 60 + part, 0)
}
