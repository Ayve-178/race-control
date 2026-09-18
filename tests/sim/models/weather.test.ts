import { describe, expect, it } from 'vitest'
import { createRng } from '../../../src/sim/prng'
import { buildSeed } from '../../../src/sim/seed'
import { createWeather, stepWeather, type WeatherState } from '../../../src/sim/models/weather'

const pack = buildSeed().weather

function run(ms: number) {
  const rng = createRng(23)
  let weather = createWeather(pack)
  const seen: WeatherState[] = [weather]

  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    weather = stepWeather(weather, 500, rng)
    seen.push(weather)
  }

  return seen
}

describe('createWeather', () => {
  it('starts from the pack readings', () => {
    const weather = createWeather(pack)
    expect(weather.airTemp.value).toBe(pack.airTempC)
    expect(weather.cloudCover.value).toBe(pack.cloudCoverPercent)
    expect(weather.humidity.value).toBe(pack.humidityPercent)
    expect(weather.pressure.value).toBe(pack.pressureMb)
    expect(weather.windSpeed.value).toBe(pack.windSpeedKmh)
  })

  it('starts in clear air, with the front still to come', () => {
    expect(createWeather(pack).frontStrength).toBe(0)
  })

  it('stands still when no time passes', () => {
    const weather = createWeather(pack)
    expect(stepWeather(weather, 0, createRng(1))).toEqual(weather)
  })
})

describe('everything on the strip moves', () => {
  it('changes all five readings', () => {
    const seen = run(200_000)
    const spread = (pick: (w: WeatherState) => number) => {
      const values = seen.map(pick)
      return Math.max(...values) - Math.min(...values)
    }
    expect(spread((w) => w.airTemp.value)).toBeGreaterThan(0.4)
    expect(spread((w) => w.cloudCover.value)).toBeGreaterThan(10)
    expect(spread((w) => w.humidity.value)).toBeGreaterThan(2)
    expect(spread((w) => w.pressure.value)).toBeGreaterThan(1)
    expect(spread((w) => w.windSpeed.value)).toBeGreaterThan(1)
  })

  it('never jumps from one reading to the next', () => {
    const seen = run(200_000)
    for (let i = 1; i < seen.length; i++) {
      expect(Math.abs(seen[i].airTemp.value - seen[i - 1].airTemp.value)).toBeLessThan(0.2)
      expect(Math.abs(seen[i].cloudCover.value - seen[i - 1].cloudCover.value)).toBeLessThan(2)
      expect(Math.abs(seen[i].pressure.value - seen[i - 1].pressure.value)).toBeLessThan(0.3)
    }
  })
})

describe('the cloud front', () => {
  it('builds and then clears again', () => {
    const strengths = run(400_000).map((w) => w.frontStrength)
    expect(Math.max(...strengths)).toBeGreaterThan(0.9)
    expect(strengths[strengths.length - 1]).toBeLessThan(0.5)
  })

  it('brings the whole strip with it, the way real weather does', () => {
    const seen = run(180_000)
    const clear = seen[0]
    const thick = seen[seen.length - 1]

    expect(thick.frontStrength).toBeGreaterThan(0.9)
    expect(thick.cloudCover.value).toBeGreaterThan(clear.cloudCover.value + 20)
    expect(thick.airTemp.value).toBeLessThan(clear.airTemp.value)
    expect(thick.humidity.value).toBeGreaterThan(clear.humidity.value)
    expect(thick.pressure.value).toBeLessThan(clear.pressure.value)
    expect(thick.windSpeed.value).toBeGreaterThan(clear.windSpeed.value)
  })
})

describe('believable readings', () => {
  it('stays somewhere a summer afternoon in Germany could actually be', () => {
    for (const weather of run(600_000)) {
      expect(weather.airTemp.value).toBeGreaterThan(17)
      expect(weather.airTemp.value).toBeLessThan(30)
      expect(weather.cloudCover.value).toBeGreaterThanOrEqual(0)
      expect(weather.cloudCover.value).toBeLessThanOrEqual(100)
      expect(weather.humidity.value).toBeGreaterThan(50)
      expect(weather.humidity.value).toBeLessThan(100)
      expect(weather.pressure.value).toBeGreaterThan(995)
      expect(weather.pressure.value).toBeLessThan(1030)
      expect(weather.windSpeed.value).toBeGreaterThanOrEqual(0)
      expect(weather.windSpeed.value).toBeLessThan(40)
    }
  })
})
