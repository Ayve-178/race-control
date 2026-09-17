import { describe, expect, it } from 'vitest'
import { lapTimeFraction } from '../../../src/sim/models/lapClock'

describe('lapTimeFraction', () => {
  it('runs from nothing at the line to a whole lap back at it', () => {
    expect(lapTimeFraction(0)).toBe(0)
    expect(lapTimeFraction(0.9999)).toBeGreaterThan(0.99)
  })

  it('only ever moves forward', () => {
    let previous = -1
    for (let p = 0; p < 1; p += 0.001) {
      const now = lapTimeFraction(p)
      expect(now).toBeGreaterThan(previous)
      previous = now
    }
  })

  it('spends longer in the stadium than its share of the tarmac', () => {
    // the arena complex is nine per cent of the lap by distance and the slowest part of it
    expect(lapTimeFraction(0.9) - lapTimeFraction(0.81)).toBeGreaterThan(0.09)
  })

  it('spends less time on the Parabolika than its share of the tarmac', () => {
    // nineteen per cent of the lap by distance, and the fastest part of it
    expect(lapTimeFraction(0.33) - lapTimeFraction(0.14)).toBeLessThan(0.19)
  })

  it('wraps round instead of running off the end', () => {
    expect(lapTimeFraction(1.25)).toBeCloseTo(lapTimeFraction(0.25), 5)
  })
})
