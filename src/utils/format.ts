// shown whenever a value is missing, so we never print NaN
export const MISSING = '—'

function pad(n: number, width: number) {
  return String(n).padStart(width, '0')
}

// 83050 -> "1:23.050"
export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return MISSING
  const total = Math.round(ms)
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const millis = total % 1000
  return `${minutes}:${pad(seconds, 2)}.${pad(millis, 3)}`
}

// the session is treated as starting at ten in the morning, so the masthead clock and the times
// down the left of the event log are the same clock and can be read against each other
const SESSION_START_MS = 10 * 3_600_000

// 923_000 -> "10:15:23"
export function formatClock(elapsedMs: number): string {
  const total = Math.floor((SESSION_START_MS + elapsedMs) / 1000)
  const hours = Math.floor(total / 3600) % 24
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`
}

// "1:23.05" (seed file) or "1:23.050" -> 83050
export function parseLapTime(text: string): number | undefined {
  const match = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(text.trim())
  if (!match) return undefined
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  const millis = match[3] ? Number(match[3].padEnd(3, '0')) : 0
  return minutes * 60000 + seconds * 1000 + millis
}

export function formatValue(
  value: number | null | undefined,
  digits = 0,
  options: { group?: boolean } = {},
): string {
  if (value == null || !Number.isFinite(value)) return MISSING
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: options.group ?? false,
  })
}
