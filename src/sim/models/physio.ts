import { clamp } from '../../utils/math'
import { createChannel, stepChannel, type Channel } from '../channel'
import type { Rng } from '../prng'
import { segmentAt, type TrackSegment } from '../track'
import type { DriverBaseline } from '../types'
import type { CarState } from './car'

export type PhysioState = {
  heartRate: Channel
  breathing: Channel
  stress: Channel
}

// breathing reacts first, the heart rate follows it, and stress is the slowest of the three
// to build and the slowest to let go. that ordering is what makes the three traces read as
// one person rather than three unrelated lines.
const BREATHING_TAU_MS = 5000
const HEART_TAU_MS = 9000
const STRESS_TAU_MS = 14_000

// how far each reading moves when the driver is working flat out
const HEART_EFFORT_BPM = 22
const BREATHING_EFFORT = 10
const STRESS_EFFORT = 10

// and how far it moves when there is a car close enough in front to be a problem
const HEART_PRESSURE_BPM = 12
const BREATHING_PRESSURE = 4
const STRESS_PRESSURE = 25

// past this the car ahead is far enough away to be somebody else's problem
const CLEAN_AIR_MS = 2500

export function createPhysio(baseline: DriverBaseline): PhysioState {
  return {
    heartRate: createChannel({
      baseline: baseline.heartRateBpm,
      min: 120,
      max: 200,
      tau: HEART_TAU_MS,
      drift: 3,
    }),
    breathing: createChannel({
      baseline: baseline.breathsPerMin,
      min: 10,
      max: 50,
      tau: BREATHING_TAU_MS,
      drift: 1.5,
    }),
    stress: createChannel({
      baseline: baseline.stress,
      min: 0,
      max: 100,
      tau: STRESS_TAU_MS,
      drift: 2,
    }),
  }
}

// how hard the driver is physically working, 0 to 1. braking and holding a corner are what
// actually tire someone out; a straight is where they get a moment back.
function effortOf(segment: TrackSegment): number {
  return clamp(segment.braking * 0.6 + (segment.load === 'none' ? 0 : 0.4), 0, 1)
}

// and how hard they are being made to think about it. a driver sitting in somebody's
// gearbox is working far harder than the same driver in clean air, which is why the leader
// reads calmer than the car running fifth.
function pressureOf(gapAheadMs: number | null): number {
  if (gapAheadMs === null) return 0
  return clamp(1 - gapAheadMs / CLEAN_AIR_MS, 0, 1)
}

export function stepPhysio(
  physio: PhysioState,
  dtMs: number,
  rng: Rng,
  car: CarState,
  gapAheadMs: number | null,
  episodeStress: number,
): PhysioState {
  if (dtMs <= 0) return physio

  const effort = effortOf(segmentAt(car.progress))
  const pressure = pressureOf(gapAheadMs)

  return {
    heartRate: stepChannel(
      physio.heartRate,
      dtMs,
      rng,
      effort * HEART_EFFORT_BPM + pressure * HEART_PRESSURE_BPM,
    ),
    breathing: stepChannel(
      physio.breathing,
      dtMs,
      rng,
      effort * BREATHING_EFFORT + pressure * BREATHING_PRESSURE,
    ),
    stress: stepChannel(
      physio.stress,
      dtMs,
      rng,
      effort * STRESS_EFFORT + pressure * STRESS_PRESSURE + episodeStress,
    ),
  }
}
