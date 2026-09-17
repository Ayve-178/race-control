export type DriverId = string

export type TyreCorner = 'fl' | 'fr' | 'rl' | 'rr'

export const TYRE_CORNERS: readonly TyreCorner[] = ['fl', 'fr', 'rl', 'rr']

export const TYRE_CORNER_NAMES: Record<TyreCorner, string> = {
  fl: 'Front left',
  fr: 'Front right',
  rl: 'Rear left',
  rr: 'Rear right',
}

export type PerCorner<T> = Record<TyreCorner, T>

export type Circuit = {
  name: string
  country: string
  totalLaps: number
}

// one car on the grid. rivals use the same shape as our cars, they just have no
// telemetry baseline, because we only track their position on track.
export type GridCar = {
  id: DriverId
  name: string
  shortName: string
  number: number
  isOurs: boolean
  startLap: number
  // where the car sits on the lap at the start, 0 to 1
  startProgress: number
  // the lap time this car is capable of, before fuel, tyres and flags
  paceMs: number
}

export type DriverBaseline = {
  topSpeedKmh: number
  bestLapMs: number
  heartRateBpm: number
  breathsPerMin: number
  stress: number
  engineTempC: number
  fuelPercent: number
  tyres: PerCorner<{ tempC: number; pressureBar: number }>
  brakes: PerCorner<{ tempC: number }>
}

// the pack drops us into lap 16 on part worn tyres and never says what they are or when they
// went on. the wear it does give implies about fourteen laps, so the stint is stated once here
// and the panel reads it rather than inventing numbers of its own.
export type Stint = {
  compound: string
  startedOnLap: number
  windowFromLap: number
  windowToLap: number
}

export type Weather = {
  airTempC: number
  cloudCoverPercent: number
  humidityPercent: number
  pressureMb: number
  windSpeedKmh: number
}

export type Seed = {
  circuit: Circuit
  grid: GridCar[]
  baselines: Record<DriverId, DriverBaseline>
  stint: Stint
  weather: Weather
}
