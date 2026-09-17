import { parseLapTime } from '../utils/format'
import packData from './data/sample-drivers.json'
import type { DriverBaseline, GridCar, PerCorner, Seed } from './types'

// the pack gives us three apex drivers sitting p1, p3 and p5, so three other cars
// have to exist for those positions to mean anything. these are ours, invented.
const RIVALS = [
  { id: 'rask-03', name: 'Milo Rask', shortName: 'M. RASK', number: 3 },
  { id: 'okon-11', name: 'Tunde Okonkwo', shortName: 'T. OKONKWO', number: 11 },
  { id: 'bren-19', name: 'Jonas Brenner', shortName: 'J. BRENNER', number: 19 },
]

// the pack has everyone on lap 15 or 16, which would mean one car is a full lap down.
// for a six car battle that makes no sense, so the whole field starts on the same lap
// and the running order comes from how far around that lap each car is.
const START_LAP = 16
const LEADER_PROGRESS = 0.62

// running order at the start, with the gap in seconds back to the car ahead.
// small gaps on purpose: the reviewer should see an overtake without waiting.
const START_ORDER: { id: string; gapToCarAheadSeconds: number; paceMs: number }[] = [
  { id: 'nova-07', gapToCarAheadSeconds: 0, paceMs: 83_600 },
  { id: 'rask-03', gapToCarAheadSeconds: 0.8, paceMs: 83_800 },
  { id: 'vek-22', gapToCarAheadSeconds: 1.1, paceMs: 84_000 },
  { id: 'okon-11', gapToCarAheadSeconds: 0.6, paceMs: 84_200 },
  { id: 'rine-44', gapToCarAheadSeconds: 1.4, paceMs: 84_500 },
  { id: 'bren-19', gapToCarAheadSeconds: 0.9, paceMs: 84_800 },
]

// a lap is about this long, so a one second gap is roughly 1/83 of a lap
const NOMINAL_LAP_MS = 83_000

// the pack's heart rate and breathing numbers are resting values. a driver mid race
// sits far higher, so we treat the pack number as the driver's own baseline and add
// the load of actually racing on top.
const RACING_HEART_RATE = 78
const RACING_BREATHING = 14

type PackDriver = (typeof packData.drivers)[number]

function toBaseline(driver: PackDriver): DriverBaseline {
  const base = driver.baseline
  return {
    topSpeedKmh: base.topSpeedKmh,
    bestLapMs: parseLapTime(base.bestLap) ?? NOMINAL_LAP_MS,
    heartRateBpm: base.heartRateBpm + RACING_HEART_RATE,
    breathsPerMin: base.breathsPerMin + RACING_BREATHING,
    stress: base.stress,
    engineTempC: base.engineTempC,
    fuelPercent: base.fuelPercent,
    tyres: base.tyres as PerCorner<{ tempC: number; pressureBar: number }>,
    brakes: base.brakes as PerCorner<{ tempC: number }>,
  }
}

export function buildSeed(): Seed {
  const baselines: Record<string, DriverBaseline> = {}
  for (const driver of packData.drivers) {
    baselines[driver.id] = toBaseline(driver)
  }

  // walk the order from the leader backwards, turning each gap into lap progress
  let gapFromLeaderSeconds = 0
  const grid: GridCar[] = START_ORDER.map(({ id, gapToCarAheadSeconds, paceMs }) => {
    gapFromLeaderSeconds += gapToCarAheadSeconds
    const ours = packData.drivers.find((driver) => driver.id === id)
    const rival = RIVALS.find((driver) => driver.id === id)
    const details = ours ?? rival
    if (!details) throw new Error(`no driver details for ${id}`)

    return {
      id,
      name: details.name,
      shortName: details.shortName,
      number: details.number,
      isOurs: Boolean(ours),
      startLap: START_LAP,
      startProgress: LEADER_PROGRESS - (gapFromLeaderSeconds * 1000) / NOMINAL_LAP_MS,
      paceMs,
    }
  })

  return {
    circuit: packData.circuit,
    grid,
    baselines,
    // 34% worn at 2.3% a minute is about fourteen laps, so the set went on at lap 2
    stint: { compound: 'Medium', startedOnLap: 2, windowFromLap: 18, windowToLap: 24 },
    weather: {
      airTempC: packData.weatherBaseline.airTempC,
      cloudCoverPercent: packData.weatherBaseline.cloudCoverPercent,
      humidityPercent: packData.weatherBaseline.humidityPercent,
      pressureMb: packData.weatherBaseline.pressureMb,
      windSpeedKmh: packData.weatherBaseline.windSpeedKmh,
    },
  }
}
