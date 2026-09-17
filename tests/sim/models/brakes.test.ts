import { describe, expect, it } from 'vitest'
import { createRng } from '../../../src/sim/prng'
import { buildSeed } from '../../../src/sim/seed'
import { TYRE_CORNERS } from '../../../src/sim/types'
import { createCar, stepCar, type CarState } from '../../../src/sim/models/car'
import { createBrakes, stepBrakes, type BrakeSet } from '../../../src/sim/models/brakes'

const baseline = buildSeed().baselines['nova-07']
const PACE = 83_600

function newCar(progress = 0) {
  return createCar({ id: 'nova-07', lap: 16, progress, bestLapMs: 83_050, topSpeedKmh: 287 })
}

// run a car and its brakes together, handing back every set they passed through
function run(ms: number, from = 0) {
  const rng = createRng(7)
  let car: CarState = newCar(from)
  let brakes = createBrakes(baseline)
  const seen = [brakes]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    brakes = stepBrakes(brakes, 500, rng, car)
    seen.push(brakes)
  }

  return seen
}

function tempsOf(brakes: BrakeSet) {
  return TYRE_CORNERS.map((corner) => brakes[corner].temp.value)
}

describe('createBrakes', () => {
  it('starts from the temperatures in the pack', () => {
    const brakes = createBrakes(baseline)
    expect(brakes.fl.temp.value).toBe(650)
    expect(brakes.fr.temp.value).toBe(640)
    expect(brakes.rl.temp.value).toBe(520)
    expect(brakes.rr.temp.value).toBe(515)
  })

  it('starts in range, because none of the pack numbers is a problem', () => {
    const brakes = createBrakes(baseline)
    for (const corner of TYRE_CORNERS) {
      expect(brakes[corner].band).toBe('ok')
    }
  })
})

describe('stepBrakes', () => {
  it('hands back the same set when no time has passed', () => {
    const brakes = createBrakes(baseline)
    expect(stepBrakes(brakes, 0, createRng(1), newCar())).toBe(brakes)
  })

  // the fronts do most of the stopping, which is where the pack's own two hundred degree split
  // between front and rear comes from, and it has to survive the model rather than be erased by it
  it('keeps the fronts hotter than the rears', () => {
    const brakes = run(120_000).at(-1)!
    expect(brakes.fl.temp.value).toBeGreaterThan(brakes.rl.temp.value)
    expect(brakes.fr.temp.value).toBeGreaterThan(brakes.rr.temp.value)
  })

  // a disc goes from glowing to cold in one straight. this is the whole reason brakes are worth
  // showing separately from tyres: they answer a different question on a different timescale.
  it('heats into a braking zone and sheds it again down the following straight', () => {
    // the hairpin at 0.39 is the heaviest braking on the circuit, the straight after it the fastest
    const intoTheHairpin = run(6000, 0.34).at(-1)!
    const downTheStraight = run(26_000, 0.34).at(-1)!

    expect(intoTheHairpin.fl.temp.value).toBeGreaterThan(650)
    expect(downTheStraight.fl.temp.value).toBeLessThan(intoTheHairpin.fl.temp.value)
  })

  it('moves every corner over a lap', () => {
    const seen = run(84_000)
    expect(tempsOf(seen.at(-1)!)).not.toEqual(tempsOf(seen[0]))
  })

  it('stays inside the range a carbon disc can physically reach', () => {
    for (const brakes of run(180_000)) {
      for (const corner of TYRE_CORNERS) {
        expect(brakes[corner].temp.value).toBeGreaterThanOrEqual(220)
        expect(brakes[corner].temp.value).toBeLessThanOrEqual(1100)
      }
    }
  })

  // the same latch the tyres and the engine use: a reading resting on a limit must not announce
  // and retract itself every few seconds
  it('holds its band until the reading has travelled the gap between the two lines', () => {
    const bands = run(180_000).map((brakes) => brakes.fl.band)
    let changes = 0
    for (let i = 1; i < bands.length; i++) {
      if (bands[i] !== bands[i - 1]) changes += 1
    }
    // three minutes is a little over two laps, and a lap has four real braking zones in it
    expect(changes).toBeLessThan(12)
  })
})
