import { describe, expect, it } from 'vitest'
import { createChannel, stepChannel } from '../../src/sim/channel'
import { createRng } from '../../src/sim/prng'

const still = () => 0.5 // a "random" source that never nudges anything

describe('createChannel', () => {
  it('starts at its baseline', () => {
    const c = createChannel({ baseline: 100, min: 0, max: 200, tau: 1000, drift: 5 })
    expect(c.value).toBe(100)
    expect(c.target).toBe(100)
  })

  it('can start somewhere other than the baseline', () => {
    const c = createChannel({ baseline: 100, value: 80, min: 0, max: 200, tau: 1000, drift: 5 })
    expect(c.value).toBe(80)
    expect(c.target).toBe(100)
  })
})

describe('stepChannel', () => {
  it('moves the value towards the target', () => {
    const c = { ...createChannel({ baseline: 100, min: 0, max: 200, tau: 1000, drift: 0 }), value: 50 }
    const next = stepChannel(c, 500, still)
    expect(next.value).toBeGreaterThan(50)
    expect(next.value).toBeLessThan(100)
  })

  it('never pushes the value outside its limits', () => {
    const rng = createRng(4)
    let c = createChannel({ baseline: 100, min: 90, max: 110, tau: 200, drift: 400 })
    for (let i = 0; i < 500; i++) {
      c = stepChannel(c, 500, rng)
      expect(c.value).toBeGreaterThanOrEqual(90)
      expect(c.value).toBeLessThanOrEqual(110)
    }
  })

  it('pulls the target back towards the baseline when it has wandered', () => {
    const c = { ...createChannel({ baseline: 100, min: 0, max: 200, tau: 1000, drift: 10 }), target: 140 }
    expect(stepChannel(c, 500, still).target).toBeLessThan(140)
  })

  it('aims at baseline plus offset while an offset is applied', () => {
    let c = createChannel({ baseline: 100, min: 0, max: 300, tau: 100, drift: 0 })
    for (let i = 0; i < 60; i++) c = stepChannel(c, 500, still, 40)
    expect(c.value).toBeGreaterThan(135)
    expect(c.value).toBeLessThanOrEqual(140)
  })

  it('returns to the baseline after the offset is removed', () => {
    let c = createChannel({ baseline: 100, min: 0, max: 300, tau: 100, drift: 0 })
    for (let i = 0; i < 60; i++) c = stepChannel(c, 500, still, 40)
    for (let i = 0; i < 60; i++) c = stepChannel(c, 500, still)
    expect(c.value).toBeCloseTo(100, 0)
  })

  it('leaves the channel alone when no time has passed', () => {
    const c = createChannel({ baseline: 100, min: 0, max: 200, tau: 1000, drift: 5 })
    expect(stepChannel(c, 0, createRng(1))).toEqual(c)
  })

  it('produces the same run for the same seed', () => {
    const run = (seed: number) => {
      const rng = createRng(seed)
      let c = createChannel({ baseline: 100, min: 0, max: 200, tau: 800, drift: 20 })
      for (let i = 0; i < 50; i++) c = stepChannel(c, 500, rng)
      return c.value
    }
    expect(run(99)).toBe(run(99))
  })
})
