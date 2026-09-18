import { describe, expect, it } from 'vitest'
import { createRng } from '../../../src/sim/prng'
import { buildSeed } from '../../../src/sim/seed'
import { createCar, stepCar } from '../../../src/sim/models/car'
import { createPhysio, stepPhysio, type PhysioState } from '../../../src/sim/models/physio'

const baseline = buildSeed().baselines['nova-07']
const PACE = 83_600

const CLEAN_AIR = null
const RIGHT_BEHIND = 400

function run(ms: number, from = 0, gapAheadMs: number | null = CLEAN_AIR) {
  const rng = createRng(11)
  let car = createCar({ id: 'nova-07', lap: 16, progress: from, bestLapMs: 83_050, topSpeedKmh: 287 })
  let physio = createPhysio(baseline)
  const seen: PhysioState[] = [physio]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    physio = stepPhysio(physio, 500, rng, car, gapAheadMs, 0)
    seen.push(physio)
  }

  return seen
}

describe('createPhysio', () => {
  it('starts from the racing baselines the seed worked out', () => {
    const physio = createPhysio(baseline)
    expect(physio.heartRate.value).toBe(baseline.heartRateBpm)
    expect(physio.breathing.value).toBe(baseline.breathsPerMin)
    expect(physio.stress.value).toBe(baseline.stress)
  })

  it('stands still when no time passes', () => {
    const physio = createPhysio(baseline)
    const car = createCar({ id: 'x', lap: 1, progress: 0, bestLapMs: 1, topSpeedKmh: 1 })
    expect(stepPhysio(physio, 0, createRng(1), car, null, 0)).toEqual(physio)
  })
})

describe('all three are alive', () => {
  it('moves every reading over a lap', () => {
    const seen = run(90_000)
    const spread = (pick: (p: PhysioState) => number) => {
      const values = seen.map(pick)
      return Math.max(...values) - Math.min(...values)
    }
    expect(spread((p) => p.heartRate.value)).toBeGreaterThan(4)
    expect(spread((p) => p.breathing.value)).toBeGreaterThan(2)
    expect(spread((p) => p.stress.value)).toBeGreaterThan(3)
  })

  it('never jumps from one reading to the next', () => {
    const seen = run(90_000, 0, RIGHT_BEHIND)
    for (let i = 1; i < seen.length; i++) {
      expect(Math.abs(seen[i].heartRate.value - seen[i - 1].heartRate.value)).toBeLessThan(2)
      expect(Math.abs(seen[i].breathing.value - seen[i - 1].breathing.value)).toBeLessThan(1.5)
      expect(Math.abs(seen[i].stress.value - seen[i - 1].stress.value)).toBeLessThan(1.5)
    }
  })

  it('keeps every reading where a human being would actually be', () => {
    for (const physio of run(240_000, 0, RIGHT_BEHIND)) {
      expect(physio.heartRate.value).toBeGreaterThan(120)
      expect(physio.heartRate.value).toBeLessThan(200)
      expect(physio.breathing.value).toBeGreaterThan(10)
      expect(physio.breathing.value).toBeLessThan(50)
      expect(physio.stress.value).toBeGreaterThanOrEqual(0)
      expect(physio.stress.value).toBeLessThanOrEqual(100)
    }
  })
})

describe('what the driver is reacting to', () => {
  it('works harder through the stadium than down the Parabolika', () => {
    const stadium = run(10_000, 0.78).at(-1)!
    const straight = run(10_000, 0.14).at(-1)!
    expect(stadium.heartRate.value).toBeGreaterThan(straight.heartRate.value)
    expect(stadium.breathing.value).toBeGreaterThan(straight.breathing.value)
  })

  it('runs hotter sitting behind someone than it does in clean air', () => {
    const traffic = run(40_000, 0, RIGHT_BEHIND).at(-1)!
    const alone = run(40_000, 0, CLEAN_AIR).at(-1)!
    expect(traffic.heartRate.value).toBeGreaterThan(alone.heartRate.value)
    expect(traffic.stress.value).toBeGreaterThan(alone.stress.value)
  })

  it('treats a car three seconds up the road as clean air', () => {
    const distant = run(40_000, 0, 3200).at(-1)!
    const alone = run(40_000, 0, CLEAN_AIR).at(-1)!
    expect(distant.stress.value).toBeCloseTo(alone.stress.value, 1)
  })

  it('comes back down again once the effort stops', () => {
    const seen = run(90_000, 0, RIGHT_BEHIND).map((p) => p.heartRate.value)
    const peak = Math.max(...seen)
    const afterPeak = seen.slice(seen.indexOf(peak))
    expect(Math.min(...afterPeak)).toBeLessThan(peak - 3)
  })
})
