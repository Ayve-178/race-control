import { describe, expect, it } from 'vitest'
import { buildSeed } from '../../../src/sim/seed'
import { createCar, stepCar } from '../../../src/sim/models/car'
import { stepFuel } from '../../../src/sim/models/fuel'

const baseline = buildSeed().baselines['nova-07']
const PACE = 83_600

function run(ms: number, from = 0, startPercent = baseline.fuelPercent) {
  let car = createCar({ id: 'nova-07', lap: 16, progress: from, bestLapMs: 83_050, topSpeedKmh: 287 })
  let percent = startPercent
  const seen = [percent]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    percent = stepFuel(percent, 500, car)
    seen.push(percent)
  }

  return seen
}

describe('fuel', () => {
  it('stands still when no time passes', () => {
    const car = createCar({ id: 'x', lap: 1, progress: 0, bestLapMs: 1, topSpeedKmh: 1 })
    expect(stepFuel(78, 0, car)).toBe(78)
  })

  it('only ever goes down', () => {
    const seen = run(120_000)
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeLessThan(seen[i - 1])
    }
  })

  it('uses about a lap and a half of a per cent per lap', () => {
    const seen = run(PACE)
    const used = seen[0] - seen[seen.length - 1]
    expect(used).toBeGreaterThan(1)
    expect(used).toBeLessThan(2.2)
  })

  it('leaves enough in the tank to finish the race', () => {
    // 51 laps still to run from lap 16 of 67
    const seen = run(PACE * 51)
    expect(seen[seen.length - 1]).toBeGreaterThan(0)
  })

  it('burns faster down the Parabolika than through the hairpin', () => {
    const straight = run(6000, 0.2)
    const hairpin = run(6000, 0.35)
    expect(straight[0] - straight[straight.length - 1]).toBeGreaterThan(
      hairpin[0] - hairpin[hairpin.length - 1],
    )
  })

  it('never runs past empty', () => {
    const seen = run(PACE * 80, 0, 2)
    expect(seen[seen.length - 1]).toBe(0)
  })
})
