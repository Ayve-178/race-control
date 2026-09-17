import { createChannel, stepChannel, type Channel } from '../channel'
import type { Rng } from '../prng'
import { AVERAGE_SPEED_KMH, segmentAt } from '../track'
import type { DriverBaseline } from '../types'
import type { CarState } from './car'

// an engine makes heat when it is pushing and loses it to the air going through the
// sidepods. both happen at once, and which one wins depends on where the car is: the
// stadium section is slow enough that there is very little air, so the temperature climbs
// there and comes back down on the straights. that is the opposite of what people expect,
// and it is what a real water temperature trace does.
const HEAT_C = 9
const COOLING_C = 9

// the engine is never idle at racing speed, so there is a floor under the load
const BASE_LOAD = 0.5

// a block of metal and a few litres of water take a long time to change temperature
const THERMAL_TAU_MS = 20_000
const WANDER_C = 1.5

export function createEngineTemp(baseline: DriverBaseline): Channel {
  return createChannel({
    baseline: baseline.engineTempC,
    min: 95,
    max: 135,
    tau: THERMAL_TAU_MS,
    drift: WANDER_C,
  })
}

export function stepEngineTemp(
  temp: Channel,
  dtMs: number,
  rng: Rng,
  car: CarState,
  episodeC: number,
): Channel {
  const segment = segmentAt(car.progress)
  const airflow = car.speedKmh / AVERAGE_SPEED_KMH
  const offsetC = (BASE_LOAD + segment.traction) * HEAT_C - airflow * COOLING_C

  return stepChannel(temp, dtMs, rng, offsetC + episodeC)
}
