import { clamp } from '../../utils/math'
import { segmentAt, type TrackSegment } from '../track'
import type { CarState } from './car'

// harvesting takes energy out of the car slowing down; deploying puts it back in down the
// straights. the mode is shown on screen next to the charge, because a battery percentage on
// its own tells a viewer nothing about whether it is going up or down.
export type ErsMode = 'harvest' | 'balanced' | 'deploy'

export type ErsState = {
  chargePercent: number
  mode: ErsMode
}

const START_PERCENT = 60

// per second. harvesting is the slower of the two because the car spends more of the lap
// braking than it does flat out, and over a lap the two very nearly cancel.
const HARVEST_PER_SECOND = 1.7
const DEPLOY_PER_SECOND = 2.6

const HARVEST_ABOVE_BRAKING = 0.6
const DEPLOY_ABOVE_KMH = 250
const FLAT_BELOW_PERCENT = 5

export function createErs(): ErsState {
  return { chargePercent: START_PERCENT, mode: 'balanced' }
}

function modeFor(segment: TrackSegment, chargePercent: number): ErsMode {
  if (segment.braking >= HARVEST_ABOVE_BRAKING) return 'harvest'
  if (segment.targetSpeedKmh >= DEPLOY_ABOVE_KMH && chargePercent > FLAT_BELOW_PERCENT) {
    return 'deploy'
  }
  return 'balanced'
}

export function stepErs(ers: ErsState, dtMs: number, car: CarState): ErsState {
  if (dtMs <= 0) return ers

  const mode = modeFor(segmentAt(car.progress), ers.chargePercent)
  const seconds = dtMs / 1000
  const change =
    mode === 'harvest' ? HARVEST_PER_SECOND * seconds : mode === 'deploy' ? -DEPLOY_PER_SECOND * seconds : 0

  return { chargePercent: clamp(ers.chargePercent + change, 0, 100), mode }
}
