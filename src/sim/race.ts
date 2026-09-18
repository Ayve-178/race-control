import type { Channel } from './channel'
import { bandFor, type Band, type BandLimits } from './models/bands'
import { createBrakes, stepBrakes, type BrakeSet } from './models/brakes'
import { createEngineTemp, stepEngineTemp } from './models/engine'
import { createEpisodes, stepEpisodes, type EpisodeState } from './models/episodes'
import { createErs, stepErs, type ErsState } from './models/ers'
import { eventsBetween, type RaceEvent, type Readings } from './models/events'
import { createField, stepField, type FieldState } from './models/field'
import { createFlags, stepFlags, type Flag, type FlagsState } from './models/flags'
import { stepFuel } from './models/fuel'
import { createPhysio, stepPhysio, type PhysioState } from './models/physio'
import { recordTrace, startTrace } from './models/trace'
import { createTyres, stepTyres, type TyreSet } from './models/tyres'
import { createWeather, stepWeather, type WeatherState } from './models/weather'
import type { Rng } from './prng'
import type { Circuit, DriverId, GridCar, Seed, Stint } from './types'

export type DriverTelemetry = {
  tyres: TyreSet
  brakes: BrakeSet
  engineTemp: Channel
  // latched the same way the tyres are, so a water temperature hovering on its limit does not
  // announce and retract itself every few seconds
  engineBand: Band
  fuelPercent: number
  ers: ErsState
  physio: PhysioState
  episodes: EpisodeState
  // the last minute of the three driver readings, kept here so switching driver lands on that
  // driver's history rather than on a chart that starts again
  traces: {
    heartRate: number[]
    breathing: number[]
    stress: number[]
  }
}

export type RaceState = {
  elapsedMs: number
  circuit: Circuit
  grid: GridCar[]
  stint: Stint
  field: FieldState
  weather: WeatherState
  flags: FlagsState
  // only our own three cars are wired for telemetry. a rival is a marker on the map and a
  // name in the running order, which is all a real pit wall would have of them either.
  telemetry: Record<DriverId, DriverTelemetry>
  events: RaceEvent[]
}

// all three of our cars run the same episode schedule, started at different points in it, so
// they do not all cook the same corner at the same moment
const EPISODE_STAGGER_MS = 160_000

// the feed is a feed, not a log. this is about two minutes of traffic across three cars.
const MAX_EVENTS = 60

// a race engine runs near 110. past 118 it is being asked too much, past 125 it is a problem,
// and it has to drop four degrees before either is taken back.
const ENGINE_LIMITS: BandLimits = { warmAt: 118, coolAt: 114, hotAt: 125, offHotAt: 121 }

export function createRace(seed: Seed): RaceState {
  const telemetry: Record<DriverId, DriverTelemetry> = {}
  let stagger = 0

  for (const entry of seed.grid) {
    if (!entry.isOurs) continue
    const baseline = seed.baselines[entry.id]

    telemetry[entry.id] = {
      tyres: createTyres(baseline),
      brakes: createBrakes(baseline),
      engineTemp: createEngineTemp(baseline),
      engineBand: bandFor('ok', baseline.engineTempC, ENGINE_LIMITS),
      fuelPercent: baseline.fuelPercent,
      ers: createErs(),
      physio: createPhysio(baseline),
      episodes: createEpisodes(stagger),
      traces: {
        heartRate: startTrace(baseline.heartRateBpm),
        breathing: startTrace(baseline.breathsPerMin),
        stress: startTrace(baseline.stress),
      },
    }
    stagger += EPISODE_STAGGER_MS
  }

  return {
    elapsedMs: 0,
    circuit: seed.circuit,
    grid: seed.grid,
    stint: seed.stint,
    field: createField(seed),
    weather: createWeather(seed.weather),
    flags: createFlags(),
    telemetry,
    events: [],
  }
}

// the handful of numbers the event feed watches, gathered for one driver. pulling them out
// like this is what lets the event rules be written without knowing what a race state is.
function readingsFor(state: RaceState, id: DriverId): Readings | null {
  const car = state.field.cars[id]
  const driver = state.telemetry[id]
  const standing = state.field.standings.find((entry) => entry.id === id)
  if (!car || !driver || !standing) return null

  return {
    atMs: state.elapsedMs,
    driverId: id,
    car,
    position: standing.position,
    inPit: standing.inPit,
    tyreC: {
      fl: driver.tyres.fl.temp.value,
      fr: driver.tyres.fr.temp.value,
      rl: driver.tyres.rl.temp.value,
      rr: driver.tyres.rr.temp.value,
    },
    engineTempC: driver.engineTemp.value,
    engineBand: driver.engineBand,
    tyreBand: {
      fl: driver.tyres.fl.band,
      fr: driver.tyres.fr.band,
      rl: driver.tyres.rl.band,
      rr: driver.tyres.rr.band,
    },
    fuelPercent: driver.fuelPercent,
    ersPercent: driver.ers.chargePercent,
    stress: driver.physio.stress.value,
    flag: state.flags.flag,
  }
}

export function tick(state: RaceState, dtMs: number, rng: Rng): RaceState {
  if (dtMs <= 0) return state

  // the chequered flag ends the session rather than being one more condition on it, so once it
  // is out the board holds the final classification and only the clock moves on. this reads the
  // flag as it was, not as it is about to be, which lets the tick that puts the flag out run in
  // full: that is the tick that gets it into the feed.
  if (state.flags.flag === 'chequered') {
    return { ...state, elapsedMs: state.elapsedMs + dtMs }
  }

  const leader = state.field.cars[state.field.standings[0].id]
  const flags = stepFlags(state.flags, dtMs, leader.lap > state.circuit.totalLaps)
  const field = stepField(state.field, dtMs, flags)

  const telemetry: Record<DriverId, DriverTelemetry> = {}
  for (const [id, driver] of Object.entries(state.telemetry)) {
    const car = field.cars[id]
    const standing = field.standings.find((entry) => entry.id === id)
    const episodes = stepEpisodes(driver.episodes, dtMs)

    // the leader has nobody to chase, and a gap of zero would otherwise read as a car
    // sitting right in front of them
    const gapAheadMs = !standing || standing.position === 1 ? null : standing.gapAheadMs

    const engineTemp = stepEngineTemp(driver.engineTemp, dtMs, rng, car, episodes.engineC)

    const physio = stepPhysio(driver.physio, dtMs, rng, car, gapAheadMs, episodes.stress)

    telemetry[id] = {
      tyres: stepTyres(driver.tyres, dtMs, rng, car, episodes.tyreC),
      brakes: stepBrakes(driver.brakes, dtMs, rng, car),
      engineTemp,
      engineBand: bandFor(driver.engineBand, engineTemp.value, ENGINE_LIMITS),
      fuelPercent: stepFuel(driver.fuelPercent, dtMs, car),
      ers: stepErs(driver.ers, dtMs, car),
      physio,
      episodes,
      traces: {
        heartRate: recordTrace(driver.traces.heartRate, physio.heartRate.value),
        breathing: recordTrace(driver.traces.breathing, physio.breathing.value),
        stress: recordTrace(driver.traces.stress, physio.stress.value),
      },
    }
  }

  const stepped: RaceState = {
    ...state,
    elapsedMs: state.elapsedMs + dtMs,
    field,
    flags,
    weather: stepWeather(state.weather, dtMs, rng),
    telemetry,
  }

  const fresh: RaceEvent[] = []
  for (const id of Object.keys(telemetry)) {
    const now = readingsFor(stepped, id)
    if (now) fresh.push(...eventsBetween(readingsFor(state, id), now))
  }

  // most ticks report nothing, and handing back the same array on those means a feed panel is
  // only woken when there is actually something new in it
  const events = fresh.length === 0 ? state.events : [...state.events, ...fresh].slice(-MAX_EVENTS)

  return { ...stepped, events }
}

// a car's lap counter names the lap it is driving. after the chequered flag there is not one,
// and the counter has already moved on to a lap that will never be run, so the number worth
// showing is the distance itself. takes the three values rather than the race, so a panel can
// subscribe to those three and not be woken by every tick.
export function lapShown(flag: Flag, totalLaps: number, lap: number): number {
  return flag === 'chequered' ? totalLaps : lap
}

