import { describe, expect, it } from 'vitest'
import { buildSeed } from '../../src/sim/seed'

const seed = buildSeed()

describe('circuit', () => {
  it('comes from the pack data', () => {
    expect(seed.circuit).toEqual({ name: 'Hockenheim', country: 'Germany', totalLaps: 67 })
  })
})

describe('grid', () => {
  it('has six cars', () => {
    expect(seed.grid).toHaveLength(6)
  })

  it('is three apex cars and three rivals', () => {
    expect(seed.grid.filter((car) => car.isOurs)).toHaveLength(3)
    expect(seed.grid.filter((car) => !car.isOurs)).toHaveLength(3)
  })

  it('gives every car a unique id and number', () => {
    expect(new Set(seed.grid.map((car) => car.id)).size).toBe(6)
    expect(new Set(seed.grid.map((car) => car.number)).size).toBe(6)
  })

  it('keeps the apex drivers from the pack data', () => {
    const ours = seed.grid.filter((car) => car.isOurs).map((car) => car.name)
    expect(ours).toEqual(['Aria Nova', 'Kai Veldor', 'Soren Hale'])
  })

  it('starts everyone on the same lap so the field is racing together', () => {
    const laps = new Set(seed.grid.map((car) => car.startLap))
    expect(laps.size).toBe(1)
  })

  it('orders the grid by track position, our drivers in their seeded places', () => {
    const order = [...seed.grid].sort((a, b) => b.startProgress - a.startProgress)
    expect(order.map((car) => car.shortName)).toEqual([
      'A. NOVA',
      'M. RASK',
      'K. VELDOR',
      'T. OKONKWO',
      'S. HALE',
      'J. BRENNER',
    ])
  })

  it('keeps the field close enough to fight', () => {
    const progress = seed.grid.map((car) => car.startProgress).sort((a, b) => b - a)
    const lapMs = 83_000
    const gapsSeconds = progress.slice(1).map((p, i) => ((progress[i] - p) * lapMs) / 1000)
    for (const gap of gapsSeconds) {
      expect(gap).toBeGreaterThan(0.2)
      expect(gap).toBeLessThan(2)
    }
  })

  it('gives every car a lap pace in a believable range', () => {
    for (const car of seed.grid) {
      expect(car.paceMs).toBeGreaterThan(80_000)
      expect(car.paceMs).toBeLessThan(90_000)
    }
  })
})

describe('apex baselines', () => {
  const nova = seed.baselines['nova-07']

  it('parses the best lap string into milliseconds', () => {
    expect(nova.bestLapMs).toBe(83_050)
  })

  it('keeps the pack telemetry values', () => {
    expect(nova.engineTempC).toBe(112)
    expect(nova.fuelPercent).toBe(78)
    expect(nova.topSpeedKmh).toBe(287)
  })

  it('starts the tyres already uneven', () => {
    const temps = Object.values(nova.tyres).map((tyre) => tyre.tempC)
    expect(new Set(temps).size).toBeGreaterThan(1)
    expect(nova.tyres.fl.tempC).toBeGreaterThan(nova.tyres.rl.tempC)
  })

  it('carries a brake temperature for each corner', () => {
    expect(nova.brakes.fl.tempC).toBe(650)
    expect(nova.brakes.rr.tempC).toBe(515)
  })

  it('raises the resting heart rate to a racing one', () => {
    expect(nova.heartRateBpm).toBeGreaterThan(120)
    expect(nova.heartRateBpm).toBeLessThan(190)
  })

  it('has a baseline for each apex driver only', () => {
    expect(Object.keys(seed.baselines).sort()).toEqual(['nova-07', 'rine-44', 'vek-22'])
  })
})

describe('weather', () => {
  it('comes from the pack data', () => {
    expect(seed.weather).toEqual({
      airTempC: 23.4,
      cloudCoverPercent: 13,
      humidityPercent: 75,
      pressureMb: 1012,
      windSpeedKmh: 7,
    })
  })
})
