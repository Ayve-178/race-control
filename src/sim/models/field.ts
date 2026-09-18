import type { DriverId, Seed } from '../types'
import { paceScaleFor, type FlagsState } from './flags'
import { createCar, stepCar, type CarState } from './car'
import { lapTimeFraction } from './lapClock'

export type Standing = {
  id: DriverId
  position: number
  gapAheadMs: number
  gapToLeaderMs: number
  inPit: boolean
}

export type PitState = {
  id: DriverId
  afterLap: number
  status: 'due' | 'in' | 'done'
  remainingMs: number
}

export type FieldState = {
  cars: Record<DriverId, CarState>
  // leader first
  standings: Standing[]
  paces: Record<DriverId, number>
  pit: PitState
}

// one scripted stop. the grid is seeded in pace order, so left alone nothing would change
// hands for several laps and a reviewer would be watching a running order that never moves.
export const SCHEDULED_STOP = { id: 'rask-03', afterLap: 16 }

// what a stop costs, pit lane in and out included
export const PIT_LANE_MS = 24_000

// a car in the pit lane has not left the circuit, it is just doing a fraction of the speed.
// stretching its pace is enough to model that: it creeps past the pit boxes on the track map
// and its out lap comes out slow, without anything having to know about a second piece of road.
const PIT_LANE_PACE_SCALE = 18

// rivals are invented, so the pack has no telemetry for them to start from
const RIVAL_TOP_SPEED_KMH = 291

function raceDistance(car: CarState): number {
  return car.lap + car.progress
}

// how far through the race a car is, counted in laps of time rather than laps of tarmac.
// a gap is a number of seconds, and the same stretch of road is worth very different amounts
// of time depending on where it is, so the two scales are not interchangeable.
function raceTime(car: CarState): number {
  return car.lap + lapTimeFraction(car.progress)
}

function standingsFor(field: Omit<FieldState, 'standings'>): Standing[] {
  const order = Object.values(field.cars).sort((a, b) => raceDistance(b) - raceDistance(a))

  return order.map((car, index) => {
    // a gap is the time this car still needs to make the ground up, so it is its own pace
    // that converts it, not the pace of whoever is in front
    const ahead = index === 0 ? car : order[index - 1]
    const pace = field.paces[car.id]

    const here = raceTime(car)

    return {
      id: car.id,
      position: index + 1,
      gapAheadMs: (raceTime(ahead) - here) * pace,
      gapToLeaderMs: (raceTime(order[0]) - here) * pace,
      inPit: field.pit.status === 'in' && field.pit.id === car.id,
    }
  })
}

export function createField(seed: Seed): FieldState {
  const cars: Record<DriverId, CarState> = {}
  const paces: Record<DriverId, number> = {}

  for (const entry of seed.grid) {
    const baseline = entry.isOurs ? seed.baselines[entry.id] : null
    const car = createCar({
      id: entry.id,
      lap: entry.startLap,
      progress: entry.startProgress,
      bestLapMs: baseline ? baseline.bestLapMs : entry.paceMs,
      topSpeedKmh: baseline ? baseline.topSpeedKmh : RIVAL_TOP_SPEED_KMH,
    })

    // a car on its own has no idea how long it has been on its lap, and starting every clock
    // at zero would show the whole field dead level until the first car reached the line
    cars[entry.id] = { ...car, currentLapMs: lapTimeFraction(entry.startProgress) * entry.paceMs }
    paces[entry.id] = entry.paceMs
  }

  const pit: PitState = { ...SCHEDULED_STOP, status: 'due', remainingMs: PIT_LANE_MS }

  return { cars, paces, pit, standings: standingsFor({ cars, paces, pit }) }
}

function stepPit(pit: PitState, car: CarState, dtMs: number): PitState {
  if (pit.status === 'due' && car.completedLap && car.lap > pit.afterLap) {
    return { ...pit, status: 'in' }
  }

  if (pit.status === 'in') {
    const remainingMs = pit.remainingMs - dtMs
    return remainingMs > 0 ? { ...pit, remainingMs } : { ...pit, status: 'done', remainingMs: 0 }
  }

  return pit
}

export function stepField(field: FieldState, dtMs: number, flags: FlagsState): FieldState {
  if (dtMs <= 0) return field

  const cars: Record<DriverId, CarState> = {}
  for (const car of Object.values(field.cars)) {
    const inPitLane = field.pit.status === 'in' && field.pit.id === car.id
    // a yellow only slows the cars actually in that sector, which is why the order can change
    // under one, so the flag penalty is worked out per car rather than once for the field
    const pace = field.paces[car.id] * paceScaleFor(flags, car.sector) * (inPitLane ? PIT_LANE_PACE_SCALE : 1)
    cars[car.id] = stepCar(car, dtMs, pace)
  }

  // the pit is read after the cars have moved, so the car is still racing on the tick that
  // takes it over the line and only starts crawling from the next one
  const pit = stepPit(field.pit, cars[field.pit.id], dtMs)

  return { ...field, cars, pit, standings: standingsFor({ ...field, cars, pit }) }
}
