import { describe, expect, it } from 'vitest'
import { approach, clamp, lerp, wrap01 } from '../../src/utils/math'

describe('clamp', () => {
  it('limits a value to the inclusive range', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })
})

describe('lerp', () => {
  it('interpolates linearly between two values', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5)
    expect(lerp(10, 0, 1)).toBe(0)
  })
})

describe('wrap01', () => {
  it('wraps any number into [0, 1)', () => {
    expect(wrap01(1.25)).toBeCloseTo(0.25)
    expect(wrap01(-0.25)).toBeCloseTo(0.75)
    expect(wrap01(1)).toBe(0)
    expect(wrap01(0.5)).toBe(0.5)
  })
})

describe('approach', () => {
  it('moves 63% of the way to the target after one time constant', () => {
    expect(approach(0, 100, 1000, 1000)).toBeCloseTo(63.21, 1)
  })

  it('does not move when dt is zero', () => {
    expect(approach(10, 100, 0, 1000)).toBe(10)
  })

  it('stays put when already at the target', () => {
    expect(approach(42, 42, 500, 1000)).toBe(42)
  })

  it('never overshoots the target', () => {
    expect(approach(0, 100, 100000, 1000)).toBeLessThanOrEqual(100)
  })
})
