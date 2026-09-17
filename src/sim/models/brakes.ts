import { bandFor, type Band, type BandLimits } from './bands'
import { createChannel, stepChannel, type Channel } from '../channel'
import type { Rng } from '../prng'
import { AVERAGE_SPEED_KMH, segmentAt } from '../track'
import type { DriverBaseline, PerCorner, TyreCorner } from '../types'
import type { CarState } from './car'

export type BrakeState = {
  temp: Channel
  band: Band
}

export type BrakeSet = PerCorner<BrakeState>

// a carbon disc goes from glowing to cold in one straight, which is why the pack's front and rear
// numbers are two hundred degrees apart and why this reacts far faster than a tyre carcass does
const THERMAL_TAU_MS = 5000
const TEMP_WANDER_C = 22

// how much heat a full braking zone puts into a disc, and how much the ducts take back out
const BRAKE_HEAT_C = 430
const AIRFLOW_COOLING_C = 170

// the fronts do most of the stopping, which is where the pack's own split comes from
const REAR_SHARE = 0.55

// carbon wants to live between 400 and 800. past 850 it is being cooked, past 950 it is fading,
// and it has to drop a long way back before either is taken back.
const TEMP_LIMITS: BandLimits = { warmAt: 850, coolAt: 790, hotAt: 950, offHotAt: 890 }

function isFront(corner: TyreCorner): boolean {
  return corner === 'fl' || corner === 'fr'
}

export function createBrakes(baseline: DriverBaseline): BrakeSet {
  function start(corner: TyreCorner): BrakeState {
    const pack = baseline.brakes[corner]

    return {
      temp: createChannel({
        baseline: pack.tempC,
        min: 220,
        max: 1100,
        tau: THERMAL_TAU_MS,
        drift: TEMP_WANDER_C,
      }),
      band: bandFor('ok', pack.tempC, TEMP_LIMITS),
    }
  }

  return { fl: start('fl'), fr: start('fr'), rl: start('rl'), rr: start('rr') }
}

export function stepBrakes(brakes: BrakeSet, dtMs: number, rng: Rng, car: CarState): BrakeSet {
  if (dtMs <= 0) return brakes

  const segment = segmentAt(car.progress)
  const airflow = (car.speedKmh / AVERAGE_SPEED_KMH) * AIRFLOW_COOLING_C

  function step(corner: TyreCorner): BrakeState {
    const share = isFront(corner) ? 1 : REAR_SHARE
    const offsetC = segment.braking * BRAKE_HEAT_C * share - airflow
    const temp = stepChannel(brakes[corner].temp, dtMs, rng, offsetC)

    return { temp, band: bandFor(brakes[corner].band, temp.value, TEMP_LIMITS) }
  }

  return { fl: step('fl'), fr: step('fr'), rl: step('rl'), rr: step('rr') }
}
