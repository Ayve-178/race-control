import { AVERAGE_SPEED_KMH } from '../track'
import type { CarState } from './car'

// the pack starts us on 78% at lap 16 of 67. that is 51 laps left on 78% of a tank, so a
// lap costs about one and a half per cent, and the seed data turns out to be consistent
// with a car that started the race with exactly enough and no more.
const PER_MINUTE_PERCENT = 1.07

export function stepFuel(percent: number, dtMs: number, car: CarState): number {
  if (dtMs <= 0) return percent

  // the engine burns more when it is working harder, which on this circuit means the long
  // straights. scaling by speed against the lap average averages out to exactly one over a
  // lap, because the lap average is by definition distance over time.
  const working = 0.5 + 0.5 * (car.speedKmh / AVERAGE_SPEED_KMH)
  const burnt = PER_MINUTE_PERCENT * (dtMs / 60_000) * working

  return Math.max(0, percent - burnt)
}
