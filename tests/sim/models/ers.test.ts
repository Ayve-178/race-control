import { describe, expect, it } from 'vitest'
import { createCar, stepCar } from '../../../src/sim/models/car'
import { createErs, stepErs, type ErsState } from '../../../src/sim/models/ers'

const PACE = 83_600

function run(ms: number, from = 0, start = createErs()) {
  let car = createCar({ id: 'nova-07', lap: 16, progress: from, bestLapMs: 83_050, topSpeedKmh: 287 })
  let ers = start
  const seen: ErsState[] = [ers]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    ers = stepErs(ers, 500, car)
    seen.push(ers)
  }

  return seen
}

describe('createErs', () => {
  it('starts part charged, with something left to spend', () => {
    const ers = createErs()
    expect(ers.chargePercent).toBeGreaterThan(20)
    expect(ers.chargePercent).toBeLessThan(90)
  })

  it('stands still when no time passes', () => {
    const ers = createErs()
    const car = createCar({ id: 'x', lap: 1, progress: 0, bestLapMs: 1, topSpeedKmh: 1 })
    expect(stepErs(ers, 0, car)).toEqual(ers)
  })
})

describe('what the battery is doing', () => {
  it('harvests under braking', () => {
    const seen = run(4000, 0.34)
    expect(seen.at(-1)!.mode).toBe('harvest')
    expect(seen.at(-1)!.chargePercent).toBeGreaterThan(seen[0].chargePercent)
  })

  it('spends it down the long straight', () => {
    const seen = run(4000, 0.2)
    expect(seen.at(-1)!.mode).toBe('deploy')
    expect(seen.at(-1)!.chargePercent).toBeLessThan(seen[0].chargePercent)
  })

  it('stops deploying once the battery is flat', () => {
    const flat = { chargePercent: 2, mode: 'deploy' as const }
    const seen = run(4000, 0.2, flat)
    expect(seen.at(-1)!.chargePercent).toBeGreaterThanOrEqual(0)
    expect(seen.at(-1)!.mode).not.toBe('deploy')
  })
})

describe('over a lap', () => {
  it('fills and empties rather than settling at one number', () => {
    const charge = run(90_000).map((ers) => ers.chargePercent)
    expect(Math.max(...charge) - Math.min(...charge)).toBeGreaterThan(20)
  })

  it('never leaves the battery', () => {
    for (const ers of run(240_000)) {
      expect(ers.chargePercent).toBeGreaterThanOrEqual(0)
      expect(ers.chargePercent).toBeLessThanOrEqual(100)
    }
  })

  it('ends the lap roughly where it started, so it is a cycle and not a drain', () => {
    const charge = run(PACE).map((ers) => ers.chargePercent)
    expect(Math.abs(charge[charge.length - 1] - charge[0])).toBeLessThan(30)
  })

  it('uses all three modes', () => {
    const modes = new Set(run(90_000).map((ers) => ers.mode))
    expect(modes).toEqual(new Set(['harvest', 'balanced', 'deploy']))
  })
})
