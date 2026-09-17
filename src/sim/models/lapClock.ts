import { lerp, wrap01 } from '../../utils/math'
import { createCar, stepCar } from './car'

// how much of a lap's time a car has used by the moment it reaches a given point.
//
// this could be read straight off the segment table, but only by assuming the car does the
// target speed everywhere, and it does not: it eases into every target, so for the first
// seconds of a straight it is well short of one. a gap measured against that assumption
// wanders by a quarter of a second as the pair sweep round the lap, which is the kind of
// jitter the brief says to keep out of the readings.
//
// so the scale is measured rather than assumed. one car is run round at a nominal pace and
// its position recorded against the clock. every car obeys the same speed model, so that
// single lap describes the whole field.

const SAMPLES = 360
const REFERENCE_PACE_MS = 84_000
const STEP_MS = 25

function measure(): number[] {
  let car = createCar({
    id: 'reference',
    lap: 0,
    progress: 0,
    bestLapMs: REFERENCE_PACE_MS,
    topSpeedKmh: 0,
  })

  // a car built at the line starts at the lap average rather than at racing speed, so the
  // first lap is thrown away and the second one is the one that gets measured
  let settling = 0
  while (!car.completedLap && settling < REFERENCE_PACE_MS * 2) {
    car = stepCar(car, STEP_MS, REFERENCE_PACE_MS)
    settling += STEP_MS
  }

  const elapsedAt = [0]
  let elapsed = 0
  do {
    car = stepCar(car, STEP_MS, REFERENCE_PACE_MS)
    elapsed += STEP_MS
    while (elapsedAt.length < SAMPLES && car.progress >= elapsedAt.length / SAMPLES) {
      elapsedAt.push(elapsed)
    }
  } while (!car.completedLap && elapsed < REFERENCE_PACE_MS * 2)
  elapsedAt.push(elapsed)

  return elapsedAt.map((ms) => ms / elapsed)
}

const CLOCK = measure()

export function lapTimeFraction(progress: number): number {
  const at = wrap01(progress) * SAMPLES
  const index = Math.floor(at)
  return lerp(CLOCK[index], CLOCK[index + 1], at - index)
}
