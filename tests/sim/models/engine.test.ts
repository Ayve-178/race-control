import { describe, expect, it } from 'vitest'
import { createRng } from '../../../src/sim/prng'
import { buildSeed } from '../../../src/sim/seed'
import { createCar, stepCar } from '../../../src/sim/models/car'
import { createEngineTemp, stepEngineTemp } from '../../../src/sim/models/engine'

const baseline = buildSeed().baselines['nova-07']
const PACE = 83_600

// run a car and its engine together from a point on the lap
function run(ms: number, from = 0) {
  const rng = createRng(3)
  let car = createCar({ id: 'nova-07', lap: 16, progress: from, bestLapMs: 83_050, topSpeedKmh: 287 })
  let temp = createEngineTemp(baseline)
  const seen = [temp.value]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    temp = stepEngineTemp(temp, 500, rng, car, 0)
    seen.push(temp.value)
  }

  return seen
}

describe('createEngineTemp', () => {
  it('starts at the temperature the pack gave us', () => {
    expect(createEngineTemp(baseline).value).toBe(112)
  })

  it('stands still when no time passes', () => {
    const temp = createEngineTemp(baseline)
    expect(stepEngineTemp(temp, 0, createRng(1), createCar({ id: 'x', lap: 1, progress: 0, bestLapMs: 1, topSpeedKmh: 1 }), 0)).toEqual(temp)
  })
})

describe('engine temperature', () => {
  it('climbs through the slow sections, where there is no air going through it', () => {
    const stadium = run(25_000, 0.81).at(-1)!
    const straights = run(25_000, 0.14).at(-1)!
    expect(stadium).toBeGreaterThan(straights)
  })

  it('trends rather than jitters', () => {
    const seen = run(90_000)
    for (let i = 1; i < seen.length; i++) {
      expect(Math.abs(seen[i] - seen[i - 1])).toBeLessThan(0.5)
    }
  })

  it('moves enough over a lap to be worth showing', () => {
    const seen = run(90_000)
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(2)
  })

  it('stays in the range a race engine actually runs at', () => {
    for (const value of run(240_000)) {
      expect(value).toBeGreaterThan(95)
      expect(value).toBeLessThan(135)
    }
  })
})
