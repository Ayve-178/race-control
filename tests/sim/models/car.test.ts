import { describe, expect, it } from 'vitest'
import { createCar, stepCar } from '../../../src/sim/models/car'
import { SEGMENTS, segmentAt } from '../../../src/sim/track'

const PACE = 84_000

function newCar(progress = 0) {
  return createCar({ id: 'nova-07', lap: 16, progress, bestLapMs: 83_050, topSpeedKmh: 287 })
}

// run the car forward and hand back every state it passed through
function run(car: ReturnType<typeof newCar>, ticks: number, dtMs = 100) {
  const seen = [car]
  let current = car
  for (let i = 0; i < ticks; i++) {
    current = stepCar(current, dtMs, PACE)
    seen.push(current)
  }
  return seen
}

function progressOfSegment(name: string) {
  const index = SEGMENTS.findIndex((s) => s.name === name)
  const start = index === 0 ? 0 : SEGMENTS[index - 1].endsAt
  return (start + SEGMENTS[index].endsAt) / 2
}

describe('createCar', () => {
  it('starts where it was put on the grid', () => {
    const car = newCar(0.62)
    expect(car.lap).toBe(16)
    expect(car.progress).toBe(0.62)
  })

  it('carries the driver best lap and top speed through', () => {
    const car = newCar()
    expect(car.bestLapMs).toBe(83_050)
    expect(car.topSpeedKmh).toBe(287)
  })

  it('has not completed anything yet', () => {
    const car = newCar()
    expect(car.lastLapMs).toBeNull()
    expect(car.completedLap).toBe(false)
    expect(car.completedSector).toBeNull()
  })
})

describe('moving round the lap', () => {
  it('advances progress', () => {
    const [, next] = run(newCar(0.2), 1)
    expect(next.progress).toBeGreaterThan(0.2)
  })

  it('stands still when no time passes', () => {
    const car = newCar(0.2)
    expect(stepCar(car, 0, PACE)).toEqual(car)
  })

  it('starts a new lap when it crosses the line', () => {
    const before = newCar(0.999)
    const after = stepCar(before, 500, PACE)
    expect(after.lap).toBe(17)
    expect(after.progress).toBeLessThan(0.5)
    expect(after.completedLap).toBe(true)
  })

  it('only flags the lap on the tick that crossed', () => {
    const crossed = stepCar(newCar(0.999), 500, PACE)
    expect(stepCar(crossed, 500, PACE).completedLap).toBe(false)
  })

  it('takes roughly its pace to get round', () => {
    let car = newCar(0)
    let elapsed = 0
    while (!car.completedLap && elapsed < PACE * 2) {
      car = stepCar(car, 100, PACE)
      elapsed += 100
    }
    expect(car.completedLap).toBe(true)
    expect(elapsed).toBeGreaterThan(PACE * 0.85)
    expect(elapsed).toBeLessThan(PACE * 1.15)
  })
})

describe('speed follows the circuit', () => {
  it('runs fast on the long straight and slow through the hairpin', () => {
    const straight = run(newCar(progressOfSegment('Parabolika')), 40)
    const hairpin = run(newCar(progressOfSegment('Spitzkehre')), 40)
    expect(straight.at(-1)!.speedKmh).toBeGreaterThan(hairpin.at(-1)!.speedKmh + 100)
  })

  it('eases towards the target rather than jumping to it', () => {
    const car = newCar(progressOfSegment('Parabolika'))
    const next = stepCar(car, 100, PACE)
    const target = segmentAt(car.progress).targetSpeedKmh
    expect(next.speedKmh).toBeGreaterThan(car.speedKmh)
    expect(next.speedKmh).toBeLessThan(target)
  })

  it('never goes backwards or past a plausible top speed', () => {
    for (const car of run(newCar(0), 900)) {
      expect(car.speedKmh).toBeGreaterThanOrEqual(0)
      expect(car.speedKmh).toBeLessThan(340)
    }
  })
})

describe('gear and rpm', () => {
  it('is in a higher gear on the straight than in the hairpin', () => {
    const straight = run(newCar(progressOfSegment('Parabolika')), 40).at(-1)!
    const hairpin = run(newCar(progressOfSegment('Spitzkehre')), 40).at(-1)!
    expect(straight.gear).toBeGreaterThan(hairpin.gear)
  })

  it('keeps rpm inside the engine range', () => {
    for (const car of run(newCar(0), 900)) {
      expect(car.rpm).toBeGreaterThanOrEqual(4000)
      expect(car.rpm).toBeLessThanOrEqual(12_500)
    }
  })

  it('drops the revs on an upshift', () => {
    const states = run(newCar(progressOfSegment('Spitzkehre')), 300)
    const upshift = states.findIndex((car, i) => i > 0 && car.gear > states[i - 1].gear)
    expect(upshift).toBeGreaterThan(0)
    expect(states[upshift].rpm).toBeLessThan(states[upshift - 1].rpm)
  })

  it('stays within the eight gears', () => {
    for (const car of run(newCar(0), 900)) {
      expect(car.gear).toBeGreaterThanOrEqual(1)
      expect(car.gear).toBeLessThanOrEqual(8)
    }
  })
})

describe('lap and sector timing', () => {
  it('counts up through the lap and resets at the line', () => {
    const car = newCar(0.5)
    const later = run(car, 10).at(-1)!
    expect(later.currentLapMs).toBe(1000)
    const crossed = stepCar(newCar(0.999), 500, PACE)
    expect(crossed.currentLapMs).toBeLessThan(500)
  })

  it('records the lap it just finished', () => {
    let car = newCar(0)
    while (!car.completedLap) car = stepCar(car, 100, PACE)
    expect(car.lastLapMs).toBeGreaterThan(PACE * 0.85)
    expect(car.lastLapMs).toBeLessThan(PACE * 1.15)
  })

  it('improves the best lap only when the lap was quicker', () => {
    let car = createCar({ id: 'x', lap: 1, progress: 0, bestLapMs: 200_000, topSpeedKmh: 200 })
    while (!car.completedLap) car = stepCar(car, 100, PACE)
    expect(car.bestLapMs).toBe(car.lastLapMs)

    const quick = car.bestLapMs
    while (!stepCar(car, 100, PACE).completedLap) car = stepCar(car, 100, PACE)
    car = stepCar(car, 100, PACE)
    expect(car.bestLapMs).toBeLessThanOrEqual(quick)
  })

  it('reports which sector the car is in', () => {
    expect(newCar(0.1).sector).toBe(1)
    expect(newCar(0.5).sector).toBe(2)
    expect(newCar(0.8).sector).toBe(3)
  })

  it('calls the sector it crossed into, wherever it joined from', () => {
    let car = newCar(0.3)
    while (!car.completedSector) car = stepCar(car, 100, PACE)
    expect(car.completedSector).toBe(1)
  })

  it('refuses to post a time for a sector it only joined halfway through', () => {
    let car = newCar(0.3)
    while (!car.completedSector) car = stepCar(car, 100, PACE)
    expect(car.lastSectorMs[0]).toBeNull()
  })

  it('posts one once it has run a whole sector from the line', () => {
    let car = newCar(0)
    while (car.completedSector !== 1) car = stepCar(car, 100, PACE)

    // a third of the lap, and the first third of this one is the quick third
    expect(car.lastSectorMs[0]).toBeGreaterThan(PACE * 0.15)
    expect(car.lastSectorMs[0]).toBeLessThan(PACE * 0.45)
  })

  it('keeps the same split arrays between sector lines, so a panel is not woken for nothing', () => {
    const car = newCar(0.1)
    const later = stepCar(car, 100, PACE)
    expect(later.completedSector).toBeNull()
    expect(later.lastSectorMs).toBe(car.lastSectorMs)
    expect(later.bestSectorMs).toBe(car.bestSectorMs)
  })
})

describe('top speed', () => {
  it('rises to the fastest the car has gone and never falls', () => {
    const states = run(newCar(0), 900)
    for (let i = 1; i < states.length; i++) {
      expect(states[i].topSpeedKmh).toBeGreaterThanOrEqual(states[i - 1].topSpeedKmh)
    }
    expect(states.at(-1)!.topSpeedKmh).toBeGreaterThan(287)
  })
})
