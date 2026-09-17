import { approach, clamp, lerp, wrap01 } from '../../utils/math'
import { AVERAGE_SPEED_KMH, sectorAt, segmentAt } from '../track'
import type { DriverId } from '../types'

export type SectorTimes = [number | null, number | null, number | null]

export type CarState = {
  id: DriverId
  lap: number
  // where the car is on the lap, 0 at the line and 1 back at it
  progress: number
  speedKmh: number
  gear: number
  rpm: number
  currentLapMs: number
  lastLapMs: number | null
  bestLapMs: number
  // which lap the best was set on. null until one is set in this session, because the pack
  // hands over a best lap time and never says when it happened.
  bestLapLap: number | null
  topSpeedKmh: number
  // where the top speed was reached, so the readout can say more than a bare number
  topSpeedLap: number
  topSpeedSector: 1 | 2 | 3
  sector: 1 | 2 | 3
  sectorMs: number
  lastSectorMs: SectorTimes
  // the quickest this car has run each sector, so the split beside it can be called best or
  // slow rather than just printed
  bestSectorMs: SectorTimes
  // true only on the tick that crossed, so the rest of the simulation reacts once
  completedLap: boolean
  completedSector: 1 | 2 | 3 | null
  // a car dropped onto the track mid lap has no lap time to report the first time it
  // reaches the line, so the clock only counts once it has started a lap properly
  timingFromLine: boolean
}

type CarSetup = {
  id: DriverId
  lap: number
  progress: number
  bestLapMs: number
  topSpeedKmh: number
}

// a car sheds speed much faster than it picks it up. keeping the two apart is what makes
// a braking zone read as a braking zone when you watch the marker go round.
const THROTTLE_TAU_MS = 2500
const BRAKING_TAU_MS = 700

// top speed of each of the eight gears
const GEAR_TOPS = [72, 112, 152, 192, 232, 268, 302, 340]
const REV_FLOOR = 7600
const REV_LIMIT = 12_300

const SECTOR_ENDS = [1 / 3, 2 / 3, 1]

// revs come from how far into the current gear the car is, so the needle sweeps up
// through a gear and falls back on the shift instead of tracking speed in a straight line.
function gearAt(speedKmh: number) {
  const found = GEAR_TOPS.findIndex((top) => speedKmh < top)
  const index = found === -1 ? GEAR_TOPS.length - 1 : found
  const bottom = index === 0 ? 0 : GEAR_TOPS[index - 1]
  const through = clamp((speedKmh - bottom) / (GEAR_TOPS[index] - bottom), 0, 1)

  return { gear: index + 1, rpm: Math.round(lerp(REV_FLOOR, REV_LIMIT, through)) }
}

export function createCar(setup: CarSetup): CarState {
  const speedKmh = AVERAGE_SPEED_KMH

  return {
    id: setup.id,
    lap: setup.lap,
    progress: setup.progress,
    speedKmh,
    ...gearAt(speedKmh),
    currentLapMs: 0,
    lastLapMs: null,
    bestLapMs: setup.bestLapMs,
    bestLapLap: null,
    topSpeedKmh: setup.topSpeedKmh,
    topSpeedLap: setup.lap,
    topSpeedSector: sectorAt(setup.progress),
    sector: sectorAt(setup.progress),
    sectorMs: 0,
    lastSectorMs: [null, null, null],
    bestSectorMs: [null, null, null],
    completedLap: false,
    completedSector: null,
    timingFromLine: setup.progress === 0,
  }
}

export function stepCar(car: CarState, dtMs: number, paceMs: number): CarState {
  if (dtMs <= 0) return car

  const segment = segmentAt(car.progress)
  const braking = segment.targetSpeedKmh < car.speedKmh
  const speedKmh = approach(
    car.speedKmh,
    segment.targetSpeedKmh,
    dtMs,
    braking ? BRAKING_TAU_MS : THROTTLE_TAU_MS,
  )

  // speed times time is distance. dividing by the lap average turns that back into a share
  // of the lap, so a car running its own pace gets round in exactly that pace.
  const covered = (car.speedKmh + speedKmh) / 2 / AVERAGE_SPEED_KMH
  const advance = (dtMs / paceMs) * covered
  const reached = car.progress + advance

  // the tick is split at the sector line so the sector that just ended gets only its share
  const boundary = SECTOR_ENDS[car.sector - 1]
  const crossed = reached >= boundary
  const beforeBoundary = crossed ? dtMs * ((boundary - car.progress) / advance) : dtMs

  // a sector time is only real if the car ran the whole sector. a car dropped onto the track
  // two thirds of the way through one would otherwise post a three second sector, which is the
  // same mistake as the partial first lap and looks just as obviously wrong on a timing screen.
  // copied only on the tick that crosses, so a panel reading the splits sees the same array
  // until there is a new split in it
  let lastSectorMs = car.lastSectorMs
  let bestSectorMs = car.bestSectorMs
  if (crossed && car.timingFromLine) {
    const split = Math.round(car.sectorMs + beforeBoundary)
    const previousBest = bestSectorMs[car.sector - 1]
    lastSectorMs = [...lastSectorMs]
    lastSectorMs[car.sector - 1] = split
    if (previousBest === null || split < previousBest) {
      bestSectorMs = [...bestSectorMs]
      bestSectorMs[car.sector - 1] = split
    }
  }

  const completedLap = crossed && car.sector === 3
  const lapMs = Math.round(car.currentLapMs + beforeBoundary)
  const timed = completedLap && car.timingFromLine
  const progress = wrap01(reached)
  const beatBest = timed && lapMs < car.bestLapMs
  const beatTopSpeed = speedKmh > car.topSpeedKmh

  return {
    ...car,
    lap: completedLap ? car.lap + 1 : car.lap,
    progress,
    speedKmh,
    ...gearAt(speedKmh),
    currentLapMs: completedLap ? dtMs - beforeBoundary : car.currentLapMs + dtMs,
    lastLapMs: timed ? lapMs : car.lastLapMs,
    bestLapMs: beatBest ? lapMs : car.bestLapMs,
    // the lap that has just ended, not the one starting, which is what car.lap has become
    bestLapLap: beatBest ? car.lap : car.bestLapLap,
    topSpeedKmh: beatTopSpeed ? speedKmh : car.topSpeedKmh,
    topSpeedLap: beatTopSpeed ? car.lap : car.topSpeedLap,
    topSpeedSector: beatTopSpeed ? car.sector : car.topSpeedSector,
    sector: sectorAt(progress),
    sectorMs: crossed ? dtMs - beforeBoundary : car.sectorMs + dtMs,
    lastSectorMs,
    bestSectorMs,
    completedLap,
    completedSector: crossed ? car.sector : null,
    timingFromLine: completedLap ? true : car.timingFromLine,
  }
}
