import { describe, expect, it } from 'vitest'
import type { Band } from '../../../src/sim/models/bands'
import { createCar, type CarState } from '../../../src/sim/models/car'
import { eventsBetween, type Readings } from '../../../src/sim/models/events'

const ALL_OK: Record<string, Band> = { fl: 'ok', fr: 'ok', rl: 'ok', rr: 'ok' }

function readings(overrides: Partial<Readings> = {}, car: Partial<CarState> = {}): Readings {
  const base = createCar({ id: 'nova-07', lap: 16, progress: 0.4, bestLapMs: 83_050, topSpeedKmh: 287 })

  return {
    atMs: 10_000,
    driverId: 'nova-07',
    car: { ...base, ...car },
    position: 1,
    inPit: false,
    tyreC: { fl: 104, fr: 101, rl: 98, rr: 99 },
    tyreBand: { ...ALL_OK } as Readings['tyreBand'],
    engineTempC: 112,
    engineBand: 'ok',
    fuelPercent: 78,
    ersPercent: 60,
    stress: 51,
    flag: 'green',
    ...overrides,
  }
}

describe('the first tick of a race', () => {
  it('has nothing to compare against, so it only reports what just happened', () => {
    expect(eventsBetween(null, readings())).toEqual([])
  })

  it('still calls a lap that finished on that very tick', () => {
    const events = eventsBetween(null, readings({}, { completedLap: true, lap: 17 }))
    expect(events).toHaveLength(1)
    expect(events[0].message).toBe('Lap 17 under way')
    expect(events[0].severity).toBe('info')
  })
})

describe('timing', () => {
  it('announces a lap and a personal best together when one is set', () => {
    const events = eventsBetween(
      readings(),
      readings({}, { completedLap: true, lap: 17, lastLapMs: 82_940, bestLapMs: 82_940 }),
    )
    expect(events.map((event) => event.source)).toEqual(['LAP', 'BEST'])
    expect(events[1].message).toBe('Personal best 1:22.940')
  })

  it('leaves the best alone when the lap was slower', () => {
    const events = eventsBetween(
      readings(),
      readings({}, { completedLap: true, lap: 17, lastLapMs: 84_200, bestLapMs: 83_050 }),
    )
    expect(events.map((event) => event.source)).toEqual(['LAP'])
  })

  it('calls a sector as it is crossed', () => {
    const events = eventsBetween(
      readings(),
      readings({}, { completedSector: 2, lastSectorMs: [21_906, 29_081, null] }),
    )
    expect(events[0].source).toBe('S2')
    expect(events[0].message).toBe('Sector 2 29.081')
  })

  it('says nothing about a sector the car has no time for', () => {
    const events = eventsBetween(
      readings(),
      readings({}, { completedSector: 1, lastSectorMs: [null, null, null] }),
    )
    expect(events).toEqual([])
  })
})

describe('position', () => {
  it('is good news going up', () => {
    const events = eventsBetween(readings({ position: 3 }), readings({ position: 2 }))
    expect(events[0].severity).toBe('info')
    expect(events[0].message).toBe('Up to P2')
  })

  it('is a caution going down', () => {
    const events = eventsBetween(readings({ position: 2 }), readings({ position: 4 }))
    expect(events[0].severity).toBe('caution')
    expect(events[0].message).toBe('Down to P4')
  })

  it('says nothing when it has not moved', () => {
    expect(eventsBetween(readings({ position: 2 }), readings({ position: 2 }))).toEqual([])
  })
})

describe('tyres', () => {
  const warmFl = { fl: 'warm', fr: 'ok', rl: 'ok', rr: 'ok' } as Readings['tyreBand']
  const hotFl = { fl: 'hot', fr: 'ok', rl: 'ok', rr: 'ok' } as Readings['tyreBand']

  it('warns when a corner goes into the warm band', () => {
    const events = eventsBetween(
      readings(),
      readings({ tyreBand: warmFl, tyreC: { fl: 120, fr: 101, rl: 98, rr: 99 } }),
    )
    expect(events).toHaveLength(1)
    expect(events[0].severity).toBe('caution')
    expect(events[0].message).toBe('Front left 120°C, running hot')
  })

  it('does not say it again while the corner stays there', () => {
    const at120 = readings({ tyreBand: warmFl, tyreC: { fl: 120, fr: 101, rl: 98, rr: 99 } })
    const at124 = readings({ tyreBand: warmFl, tyreC: { fl: 124, fr: 101, rl: 98, rr: 99 } })
    expect(eventsBetween(at120, at124)).toEqual([])
  })

  it('goes critical when it goes past the limit', () => {
    const events = eventsBetween(
      readings({ tyreBand: warmFl }),
      readings({ tyreBand: hotFl, tyreC: { fl: 130, fr: 101, rl: 98, rr: 99 } }),
    )
    expect(events[0].severity).toBe('critical')
    expect(events[0].message).toBe('Front left 130°C, over the limit')
  })

  it('says so when it comes back into range', () => {
    const events = eventsBetween(
      readings({ tyreBand: warmFl }),
      readings({ tyreC: { fl: 110, fr: 101, rl: 98, rr: 99 } }),
    )
    expect(events[0].severity).toBe('info')
    expect(events[0].message).toBe('Front left 110°C, back in range')
  })

  it('names the corner it is actually about', () => {
    const events = eventsBetween(
      readings(),
      readings({ tyreBand: { fl: 'ok', fr: 'ok', rl: 'ok', rr: 'warm' } as Readings['tyreBand'] }),
    )
    expect(events[0].message).toContain('Rear right')
  })

  it('reports each corner separately when two of them go', () => {
    const events = eventsBetween(
      readings(),
      readings({ tyreBand: { fl: 'warm', fr: 'ok', rl: 'ok', rr: 'warm' } as Readings['tyreBand'] }),
    )
    expect(events).toHaveLength(2)
  })
})

describe('the power unit', () => {
  it('warns and then goes critical', () => {
    expect(
      eventsBetween(readings(), readings({ engineBand: 'warm', engineTempC: 120 }))[0].severity,
    ).toBe('caution')
    expect(
      eventsBetween(
        readings({ engineBand: 'warm' }),
        readings({ engineBand: 'hot', engineTempC: 127 }),
      )[0].severity,
    ).toBe('critical')
  })

  it('stays quiet while the temperature sits in the band it is already in', () => {
    const warm = readings({ engineBand: 'warm', engineTempC: 119 })
    const warmer = readings({ engineBand: 'warm', engineTempC: 123 })
    expect(eventsBetween(warm, warmer)).toEqual([])
  })

  it('calls the fuel down on the way past each mark', () => {
    expect(eventsBetween(readings(), readings({ fuelPercent: 14 }))[0].severity).toBe('caution')
    expect(
      eventsBetween(readings({ fuelPercent: 14 }), readings({ fuelPercent: 5 }))[0].severity,
    ).toBe('critical')
  })

  it('says when the battery has nothing left to give', () => {
    const events = eventsBetween(readings({ ersPercent: 20 }), readings({ ersPercent: 5 }))
    expect(events[0].source).toBe('ERS')
    expect(events[0].message).toBe('Battery flat, no deployment')
  })
})

describe('flags and the pit lane', () => {
  it('raises a caution for a yellow and a critical for the safety car', () => {
    expect(eventsBetween(readings(), readings({ flag: 'yellow' }))[0].severity).toBe('caution')
    expect(eventsBetween(readings(), readings({ flag: 'safetyCar' }))[0].severity).toBe('critical')
  })

  it('says so when the track goes green again', () => {
    const events = eventsBetween(readings({ flag: 'yellow' }), readings({ flag: 'green' }))
    expect(events[0].message).toBe('Track clear, green flag')
  })

  it('calls the car in and out of the pits', () => {
    expect(eventsBetween(readings(), readings({ inPit: true }))[0].message).toBe('In the pit lane')

    // a car leaving the pits has usually dropped places doing it, so both things are called.
    // that is what a real timing feed does rather than choosing one of them to report.
    const out = eventsBetween(readings({ inPit: true, position: 2 }), readings({ position: 6 }))
    expect(out.map((event) => event.message)).toEqual(['Down to P6', 'Out of the pits, P6'])
  })
})

describe('the driver', () => {
  it('flags the workload when it gets high', () => {
    const events = eventsBetween(readings(), readings({ stress: 84 }))
    expect(events[0].source).toBe('BIO')
    expect(events[0].severity).toBe('caution')
  })
})

describe('every event', () => {
  it('carries an id that is unique within the tick', () => {
    const before = readings()
    const after = readings({
      position: 2,
      flag: 'yellow',
      tyreBand: { fl: 'warm', fr: 'ok', rl: 'ok', rr: 'warm' } as Readings['tyreBand'],
      engineBand: 'warm',
      engineTempC: 120,
    })
    const events = eventsBetween(before, after)
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
    expect(events.some((event) => event.id.endsWith('tyre-warm-fl'))).toBe(true)
  })

  it('is tagged with the driver it belongs to', () => {
    const events = eventsBetween(readings(), readings({ position: 2 }))
    expect(events[0].driverId).toBe('nova-07')
  })

  it('uses only the three severities the brief allows', () => {
    const before = readings()
    const after = readings({ position: 4, flag: 'safetyCar', engineBand: 'hot', engineTempC: 127 })
    for (const event of eventsBetween(before, after)) {
      expect(['info', 'caution', 'critical']).toContain(event.severity)
    }
  })
})
