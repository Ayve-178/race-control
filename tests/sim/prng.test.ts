import { describe, expect, it } from 'vitest'
import { createRng, gaussian } from '../../src/sim/prng'

function take(rng: () => number, count: number) {
  return Array.from({ length: count }, () => rng())
}

describe('createRng', () => {
  it('replays the same sequence for the same seed', () => {
    expect(take(createRng(42), 5)).toEqual(take(createRng(42), 5))
  })

  it('gives a different sequence for a different seed', () => {
    expect(take(createRng(1), 5)).not.toEqual(take(createRng(2), 5))
  })

  it('stays inside [0, 1)', () => {
    const rng = createRng(7)
    for (const n of take(rng, 500)) {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it('does not repeat itself immediately', () => {
    const values = take(createRng(3), 100)
    expect(new Set(values).size).toBe(100)
  })
})

describe('gaussian', () => {
  it('averages near zero', () => {
    const rng = createRng(5)
    let sum = 0
    for (let i = 0; i < 2000; i++) sum += gaussian(rng)
    expect(Math.abs(sum / 2000)).toBeLessThan(0.1)
  })

  it('mostly lands within three standard deviations', () => {
    const rng = createRng(9)
    const outliers = Array.from({ length: 1000 }, () => gaussian(rng)).filter((n) => Math.abs(n) > 3)
    expect(outliers.length).toBeLessThan(20)
  })
})
