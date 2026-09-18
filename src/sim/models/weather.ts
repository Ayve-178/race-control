import { createChannel, stepChannel, type Channel } from '../channel'
import type { Rng } from '../prng'
import type { Weather } from '../types'

export type WeatherState = {
  airTemp: Channel
  cloudCover: Channel
  humidity: Channel
  pressure: Channel
  windSpeed: Channel
  elapsedMs: number
  // 0 in clear air, 1 at the thickest part of the front
  frontStrength: number
}

// five readings that each wandered on their own would be five unrelated wobbles, and a
// reviewer who knows any weather at all would see through it immediately. so there is one
// cause underneath them: a cloud front rolls across the circuit, and everything moves the
// way it actually moves when that happens. cloud thickens, the sun comes off the track and
// the air cools, humidity climbs, the barometer falls and the wind gets up.
const FRONT_PERIOD_MS = 360_000

const CLOUD_SWING_PERCENT = 55
const AIR_TEMP_SWING_C = -2.5
const HUMIDITY_SWING_PERCENT = 12
const PRESSURE_SWING_MB = -4
const WIND_SWING_KMH = 6

// a raised cosine: nothing at the edges, everything in the middle, and smooth all the way
// through, so the front builds and clears rather than switching on
function frontAt(elapsedMs: number): number {
  const phase = (elapsedMs % FRONT_PERIOD_MS) / FRONT_PERIOD_MS
  return (1 - Math.cos(phase * 2 * Math.PI)) / 2
}

export function createWeather(pack: Weather): WeatherState {
  return {
    airTemp: createChannel({ baseline: pack.airTempC, min: 15, max: 32, tau: 30_000, drift: 0.4 }),
    cloudCover: createChannel({
      baseline: pack.cloudCoverPercent,
      min: 0,
      max: 100,
      tau: 20_000,
      drift: 4,
    }),
    humidity: createChannel({
      baseline: pack.humidityPercent,
      min: 55,
      max: 99,
      tau: 25_000,
      drift: 2,
    }),
    pressure: createChannel({
      baseline: pack.pressureMb,
      min: 996,
      max: 1028,
      tau: 40_000,
      drift: 1.2,
    }),
    // wind is the gusty one, so it has the shortest time constant of the five
    windSpeed: createChannel({ baseline: pack.windSpeedKmh, min: 0, max: 38, tau: 8000, drift: 2.5 }),
    elapsedMs: 0,
    frontStrength: 0,
  }
}

export function stepWeather(weather: WeatherState, dtMs: number, rng: Rng): WeatherState {
  if (dtMs <= 0) return weather

  const elapsedMs = weather.elapsedMs + dtMs
  const front = frontAt(elapsedMs)

  return {
    airTemp: stepChannel(weather.airTemp, dtMs, rng, front * AIR_TEMP_SWING_C),
    cloudCover: stepChannel(weather.cloudCover, dtMs, rng, front * CLOUD_SWING_PERCENT),
    humidity: stepChannel(weather.humidity, dtMs, rng, front * HUMIDITY_SWING_PERCENT),
    pressure: stepChannel(weather.pressure, dtMs, rng, front * PRESSURE_SWING_MB),
    windSpeed: stepChannel(weather.windSpeed, dtMs, rng, front * WIND_SWING_KMH),
    elapsedMs,
    frontStrength: front,
  }
}
