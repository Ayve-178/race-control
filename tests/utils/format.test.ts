import { describe, expect, it } from 'vitest'
import { MISSING, formatLapTime, formatValue, parseLapTime } from '../../src/utils/format'

describe('formatLapTime', () => {
  it('formats milliseconds as m:ss.mmm', () => {
    expect(formatLapTime(83050)).toBe('1:23.050')
  })

  it('pads seconds and milliseconds', () => {
    expect(formatLapTime(61005)).toBe('1:01.005')
  })

  it('keeps working past ten minutes', () => {
    expect(formatLapTime(600000)).toBe('10:00.000')
  })

  it('renders a dash for missing or invalid input', () => {
    expect(formatLapTime(undefined)).toBe(MISSING)
    expect(formatLapTime(null)).toBe(MISSING)
    expect(formatLapTime(Number.NaN)).toBe(MISSING)
    expect(formatLapTime(-1)).toBe(MISSING)
  })
})

describe('parseLapTime', () => {
  it('parses m:ss.hh (seed format) into milliseconds', () => {
    expect(parseLapTime('1:23.05')).toBe(83050)
  })

  it('parses m:ss.mmm into milliseconds', () => {
    expect(parseLapTime('1:23.050')).toBe(83050)
  })

  it('parses whole seconds', () => {
    expect(parseLapTime('1:23')).toBe(83000)
  })

  it('returns undefined for garbage', () => {
    expect(parseLapTime('fast')).toBeUndefined()
    expect(parseLapTime('')).toBeUndefined()
  })
})

describe('formatValue', () => {
  it('rounds to the requested number of decimals', () => {
    expect(formatValue(1.2, 2)).toBe('1.20')
    expect(formatValue(104.46, 0)).toBe('104')
  })

  it('groups thousands only when asked', () => {
    expect(formatValue(9800)).toBe('9800')
    expect(formatValue(9800, 0, { group: true })).toBe('9,800')
  })

  it('renders a dash for missing or non-finite input', () => {
    expect(formatValue(undefined)).toBe(MISSING)
    expect(formatValue(Number.POSITIVE_INFINITY)).toBe(MISSING)
  })
})
