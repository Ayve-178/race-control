import { describe, expect, it } from 'vitest'
import { createRng } from '../../../src/sim/prng'
import { buildSeed } from '../../../src/sim/seed'
import { TYRE_CORNERS, type TyreCorner } from '../../../src/sim/types'
import { createCar, stepCar, type CarState } from '../../../src/sim/models/car'
import { createTyres, stepTyres, type TyreSet } from '../../../src/sim/models/tyres'

const baseline = buildSeed().baselines['nova-07']
const PACE = 83_600

// the tyre model is tested on its own here, so nothing is leaning on the targets
const NO_EPISODE = { fl: 0, fr: 0, rl: 0, rr: 0 }

function newCar(progress = 0) {
  return createCar({ id: 'nova-07', lap: 16, progress, bestLapMs: 83_050, topSpeedKmh: 287 })
}

// run a car and its tyres together, handing back every set they passed through
function run(ms: number, from = 0) {
  const rng = createRng(7)
  let car: CarState = newCar(from)
  let tyres = createTyres(baseline)
  const seen = [tyres]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    car = stepCar(car, 500, PACE)
    tyres = stepTyres(tyres, 500, rng, car, NO_EPISODE)
    seen.push(tyres)
  }

  return seen
}

function tempsOf(tyres: TyreSet) {
  return TYRE_CORNERS.map((corner) => tyres[corner].temp.value)
}

describe('createTyres', () => {
  it('starts from the temperatures in the pack', () => {
    const tyres = createTyres(baseline)
    expect(tyres.fl.temp.value).toBe(104)
    expect(tyres.fr.temp.value).toBe(101)
    expect(tyres.rl.temp.value).toBe(98)
    expect(tyres.rr.temp.value).toBe(99)
  })

  it('starts from the pressures in the pack', () => {
    const tyres = createTyres(baseline)
    expect(tyres.fl.pressureBar).toBe(1.2)
    expect(tyres.rr.pressureBar).toBe(1.19)
  })

  it('puts some life into the tyres already, since the race is on lap 16', () => {
    for (const corner of TYRE_CORNERS) {
      const wear = createTyres(baseline)[corner].wearPercent
      expect(wear).toBeGreaterThan(10)
      expect(wear).toBeLessThan(60)
    }
  })
})

describe('stepTyres', () => {
  it('stands still when no time passes', () => {
    const tyres = createTyres(baseline)
    expect(stepTyres(tyres, 0, createRng(1), newCar(), NO_EPISODE)).toEqual(tyres)
  })

  it('is repeatable for a given seed', () => {
    expect(run(20_000).at(-1)).toEqual(run(20_000).at(-1))
  })
})

describe('the four corners come apart', () => {
  it('no longer reads the same after a minute', () => {
    const temps = tempsOf(run(60_000).at(-1)!)
    expect(new Set(temps.map((t) => t.toFixed(1))).size).toBe(4)
  })

  it('keeps the left front the hardest worked corner', () => {
    // the circuit turns right nine times out of ten, which throws the weight onto the left
    // hand tyres, and braking loads the fronts
    const end = run(90_000).at(-1)!
    expect(end.fl.temp.value).toBeGreaterThan(end.rr.temp.value)
    expect(end.fl.wearPercent).toBeGreaterThan(end.rr.wearPercent)
  })

  it('holds every corner in a believable band', () => {
    for (const tyres of run(180_000)) {
      for (const corner of TYRE_CORNERS) {
        expect(tyres[corner].temp.value).toBeGreaterThan(70)
        expect(tyres[corner].temp.value).toBeLessThan(145)
      }
    }
  })
})

describe('temperature trends rather than jitters', () => {
  it('builds heat and sheds it again round a lap', () => {
    const temps = run(90_000).map((tyres) => tyres.fl.temp.value)
    expect(Math.max(...temps) - Math.min(...temps)).toBeGreaterThan(3)
  })

  it('never jumps from one reading to the next', () => {
    const temps = run(90_000).map((tyres) => tyres.fl.temp.value)
    for (let i = 1; i < temps.length; i++) {
      expect(Math.abs(temps[i] - temps[i - 1])).toBeLessThan(1.5)
    }
  })

  it('runs hotter through the stadium than down the Parabolika', () => {
    const stadium = run(12_000, 0.81).at(-1)!.fl.temp.value
    const straight = run(12_000, 0.15).at(-1)!.fl.temp.value
    expect(stadium).toBeGreaterThan(straight)
  })
})

describe('pressure follows temperature', () => {
  it('rises when the corner heats up and falls when it cools', () => {
    const hot = run(12_000, 0.81).at(-1)!.fl
    const cool = run(12_000, 0.15).at(-1)!.fl
    expect(hot.temp.value).toBeGreaterThan(cool.temp.value)
    expect(hot.pressureBar).toBeGreaterThan(cool.pressureBar)
  })

  it('stays in the range a race tyre actually runs at', () => {
    for (const tyres of run(180_000)) {
      for (const corner of TYRE_CORNERS) {
        expect(tyres[corner].pressureBar).toBeGreaterThan(1)
        expect(tyres[corner].pressureBar).toBeLessThan(1.6)
      }
    }
  })
})

describe('wear', () => {
  it('only ever goes one way', () => {
    const seen = run(120_000)
    for (const corner of TYRE_CORNERS) {
      for (let i = 1; i < seen.length; i++) {
        expect(seen[i][corner].wearPercent).toBeGreaterThanOrEqual(seen[i - 1][corner].wearPercent)
      }
    }
  })

  it('uses up roughly a stint over a stint, not a lap', () => {
    const start = run(1000)[0]
    const afterALap = run(84_000).at(-1)!
    const used = afterALap.fl.wearPercent - start.fl.wearPercent
    expect(used).toBeGreaterThan(1)
    expect(used).toBeLessThan(6)
  })

  it('never runs past the end of the tyre', () => {
    const corners: TyreCorner[] = [...TYRE_CORNERS]
    for (const corner of corners) {
      expect(run(600_000).at(-1)![corner].wearPercent).toBeLessThanOrEqual(100)
    }
  })
})
