import { clamp } from '../../utils/math'
import { bandFor, type Band, type BandLimits } from './bands'
import { createChannel, stepChannel, type Channel } from '../channel'
import type { Rng } from '../prng'
import { AVERAGE_SPEED_KMH, segmentAt, type TrackSegment } from '../track'
import { TYRE_CORNERS, type DriverBaseline, type PerCorner, type TyreCorner } from '../types'
import type { CarState } from './car'

export type TyreState = {
  temp: Channel
  pressureBar: number
  // what this corner reads sitting at its baseline temperature
  basePressureBar: number
  wearPercent: number
  // which side of the warning lines this corner is latched to. the gauges colour from it and
  // the event feed fires when it changes, so both agree by construction.
  band: Band
}

export type TyreSet = PerCorner<TyreState>

// how much heat each way of working a tyre puts into it, in degrees above its baseline
const BRAKE_HEAT_C = 14
const TRACTION_HEAT_C = 12
const CORNER_LOAD_HEAT_C = 10

// airflow takes heat back out, and there is more of it the faster the car is going
const AIRFLOW_COOLING_C = 9

// a tyre carcass takes its time. this is the reason the readings trend across half a lap
// instead of following the corner by corner offsets, and it is what makes them look real.
const THERMAL_TAU_MS = 12_000
const TEMP_WANDER_C = 3

// the air inside the tyre expands as it heats, which is why a race engineer reads pressure
// to work out what the core temperature is doing
const BAR_PER_DEGREE = 0.0035

// the pack drops us into lap 16 with no stint history, so the tyres start part worn: far
// enough in that the wear readings mean something, not so far that a stop is imminent.
const START_WEAR_PERCENT = 34
const WEAR_PER_MINUTE_PERCENT = 2.3
const WEAR_HEAT_THRESHOLD_C = 105

// a working tyre lives near 100. above 118 it is going off, above 128 it is being destroyed,
// and it has to come back six degrees before either of those is taken back.
const TEMP_LIMITS: BandLimits = { warmAt: 118, coolAt: 112, hotAt: 128, offHotAt: 122 }

function isFront(corner: TyreCorner): boolean {
  return corner === 'fl' || corner === 'fr'
}

// the three ways a corner of the car gets worked: stopping it, driving it out of the turn,
// and holding it through the turn. which corner takes each load is the whole reason the four
// readings come apart, and it comes from the shape of the circuit rather than from noise.
function loadsOn(corner: TyreCorner, segment: TrackSegment) {
  const front = isFront(corner)
  const side = corner === 'fl' || corner === 'rl' ? 'left' : 'right'

  return {
    braking: segment.braking * (front ? 1 : 0.3),
    traction: segment.traction * (front ? 0.25 : 1),
    cornering: segment.load === side ? 1 : 0,
  }
}

export function createTyres(baseline: DriverBaseline): TyreSet {
  // sixteen laps in, the corners have not been working equally, and the pack's own
  // temperatures say which have had the worst of it. the starting wear follows them.
  const hottest = Math.max(...TYRE_CORNERS.map((corner) => baseline.tyres[corner].tempC))

  function start(corner: TyreCorner): TyreState {
    const pack = baseline.tyres[corner]

    return {
      temp: createChannel({
        baseline: pack.tempC,
        min: 60,
        max: 150,
        tau: THERMAL_TAU_MS,
        drift: TEMP_WANDER_C,
      }),
      pressureBar: pack.pressureBar,
      basePressureBar: pack.pressureBar,
      wearPercent: START_WEAR_PERCENT - (hottest - pack.tempC) * 0.8,
      band: bandFor('ok', pack.tempC, TEMP_LIMITS),
    }
  }

  return { fl: start('fl'), fr: start('fr'), rl: start('rl'), rr: start('rr') }
}

function stepCorner(
  tyre: TyreState,
  corner: TyreCorner,
  dtMs: number,
  rng: Rng,
  segment: TrackSegment,
  speedKmh: number,
  episodeC: number,
): TyreState {
  const load = loadsOn(corner, segment)
  const airflow = (speedKmh / AVERAGE_SPEED_KMH) * AIRFLOW_COOLING_C
  const offsetC =
    load.braking * BRAKE_HEAT_C +
    load.traction * TRACTION_HEAT_C +
    load.cornering * CORNER_LOAD_HEAT_C -
    airflow

  // an episode does not write a temperature, it leans on the target. the tyre climbs towards
  // the raised number and finds its own way home when the episode lets go.
  const temp = stepChannel(tyre.temp, dtMs, rng, offsetC + episodeC)

  // rubber goes off faster once the tyre is over temperature, which is what turns a hot
  // corner into a problem rather than a reading
  const working = (load.braking + load.traction + load.cornering) / 3
  const overheating = clamp((temp.value - WEAR_HEAT_THRESHOLD_C) / 20, 0, 1.5)
  const used = WEAR_PER_MINUTE_PERCENT * (dtMs / 60_000) * (0.5 + working + overheating)

  return {
    temp,
    basePressureBar: tyre.basePressureBar,
    pressureBar: tyre.basePressureBar + (temp.value - temp.baseline) * BAR_PER_DEGREE,
    wearPercent: Math.min(100, tyre.wearPercent + used),
    band: bandFor(tyre.band, temp.value, TEMP_LIMITS),
  }
}

export function stepTyres(
  tyres: TyreSet,
  dtMs: number,
  rng: Rng,
  car: CarState,
  episodeC: PerCorner<number>,
): TyreSet {
  if (dtMs <= 0) return tyres

  const segment = segmentAt(car.progress)
  const speed = car.speedKmh

  return {
    fl: stepCorner(tyres.fl, 'fl', dtMs, rng, segment, speed, episodeC.fl),
    fr: stepCorner(tyres.fr, 'fr', dtMs, rng, segment, speed, episodeC.fr),
    rl: stepCorner(tyres.rl, 'rl', dtMs, rng, segment, speed, episodeC.rl),
    rr: stepCorner(tyres.rr, 'rr', dtMs, rng, segment, speed, episodeC.rr),
  }
}
