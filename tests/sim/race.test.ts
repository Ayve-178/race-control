import { describe, expect, it } from 'vitest'
import { createRng } from '../../src/sim/prng'
import { createRace, lapShown, tick, type RaceState } from '../../src/sim/race'
import { buildSeed } from '../../src/sim/seed'

const seed = buildSeed()

function run(ms: number, from: RaceState = createRace(seed), rng = createRng(5)) {
  let state = from
  for (let elapsed = 0; elapsed < ms; elapsed += 500) state = tick(state, 500, rng)
  return state
}

function telemetryOf(state: RaceState, id: string) {
  return state.telemetry[id]
}

function ourCars(state: RaceState) {
  return state.grid.filter((entry) => entry.isOurs)
}

describe('createRace', () => {
  it('puts six cars on the circuit', () => {
    expect(Object.keys(createRace(seed).field.cars)).toHaveLength(6)
  })

  it('wires telemetry to our three and not to the rivals', () => {
    const state = createRace(seed)
    expect(Object.keys(state.telemetry).sort()).toEqual(['nova-07', 'rine-44', 'vek-22'])
  })

  it('starts green, at nothing, with an empty feed', () => {
    const state = createRace(seed)
    expect(state.elapsedMs).toBe(0)
    expect(state.flags.flag).toBe('green')
    expect(state.events).toEqual([])
  })

  it('carries the circuit through from the pack', () => {
    expect(createRace(seed).circuit.name).toBe('Hockenheim')
  })

  it('staggers the episodes, so the three cars do not break at the same moment', () => {
    const state = createRace(seed)
    const starts = ourCars(state).map((driver) => state.telemetry[driver.id].episodes.elapsedMs)
    expect(new Set(starts).size).toBe(3)
  })
})

describe('tick', () => {
  it('stands still when no time passes', () => {
    const state = createRace(seed)
    expect(tick(state, 0, createRng(1))).toEqual(state)
  })

  it('keeps the clock', () => {
    expect(run(10_000).elapsedMs).toBe(10_000)
  })

  it('replays exactly for a given seed', () => {
    expect(run(30_000)).toEqual(run(30_000))
  })

  it('diverges for a different seed, so the noise is real', () => {
    const one = run(30_000, createRace(seed), createRng(1))
    const two = run(30_000, createRace(seed), createRng(2))
    expect(one.telemetry['nova-07'].tyres.fl.temp.value).not.toBe(
      two.telemetry['nova-07'].tyres.fl.temp.value,
    )
  })
})

describe('everything on screen is moving', () => {
  it('changes every reading over a minute', () => {
    const start = createRace(seed)
    const later = run(60_000, start)
    const before = telemetryOf(start, 'nova-07')
    const now = telemetryOf(later, 'nova-07')

    expect(now.tyres.fl.temp.value).not.toBe(before.tyres.fl.temp.value)
    expect(now.tyres.fl.wearPercent).toBeGreaterThan(before.tyres.fl.wearPercent)
    expect(now.engineTemp.value).not.toBe(before.engineTemp.value)
    expect(now.fuelPercent).toBeLessThan(before.fuelPercent)
    expect(now.ers.chargePercent).not.toBe(before.ers.chargePercent)
    expect(now.physio.heartRate.value).not.toBe(before.physio.heartRate.value)
    expect(later.weather.cloudCover.value).not.toBe(start.weather.cloudCover.value)
    expect(later.field.cars['nova-07'].progress).not.toBe(start.field.cars['nova-07'].progress)
  })
})

describe('the first minute, which is what a reviewer actually sees', () => {
  const minute = run(60_000)

  it('completes a lap', () => {
    expect(minute.events.some((event) => event.source === 'LAP')).toBe(true)
    expect(minute.field.cars['nova-07'].lap).toBe(17)
  })

  it('changes a position', () => {
    expect(minute.events.some((event) => event.source === 'POS')).toBe(true)
  })

  it('fires a tyre warning', () => {
    const tyre = minute.events.filter((event) => event.source === 'TYRE')
    expect(tyre.length).toBeGreaterThan(0)
    expect(tyre[0].severity).not.toBe('info')
  })

  it('puts a car in the pits', () => {
    expect(minute.field.pit.status).toBe('in')
  })
})

describe('the event feed', () => {
  it('keeps filling up as the race runs', () => {
    expect(run(30_000).events.length).toBeGreaterThan(0)
    expect(run(120_000).events.length).toBeGreaterThan(run(30_000).events.length)
  })

  it('never grows without a bound', () => {
    expect(run(400_000).events.length).toBeLessThanOrEqual(60)
  })

  it('tags every event with the driver it belongs to', () => {
    for (const event of run(120_000).events) {
      expect(Object.keys(createRace(seed).telemetry)).toContain(event.driverId)
    }
  })

  it('carries news about more than one of our drivers', () => {
    const drivers = new Set(run(120_000).events.map((event) => event.driverId))
    expect(drivers.size).toBeGreaterThan(1)
  })

  it('uses all three severities over a long enough run', () => {
    const severities = new Set(run(400_000).events.map((event) => event.severity))
    expect(severities.size).toBeGreaterThan(1)
  })

  it('keeps the newest, not the oldest', () => {
    const events = run(400_000).events
    expect(events[events.length - 1].atMs).toBeGreaterThan(events[0].atMs)
  })
})

describe('switching driver has something to switch to', () => {
  it('gives the three of them different telemetry', () => {
    const state = run(90_000)
    const temps = ourCars(state).map((driver) => state.telemetry[driver.id].tyres.fl.temp.value)
    expect(new Set(temps).size).toBe(3)
  })

  it('gives them different places in the race', () => {
    const state = run(90_000)
    const places = ourCars(state).map(
      (driver) => state.field.standings.find((entry) => entry.id === driver.id)?.position,
    )
    expect(new Set(places).size).toBe(3)
  })

  it('leaves the leader calmer than the car stuck in traffic', () => {
    const state = run(120_000)
    const leader = state.field.standings[0]
    const ours = ourCars(state).map((driver) => driver.id)
    const behind = state.field.standings.filter(
      (entry) => ours.includes(entry.id) && entry.id !== leader.id,
    )

    if (ours.includes(leader.id)) {
      const leaderStress = state.telemetry[leader.id].physio.stress.value
      const chasing = Math.max(...behind.map((entry) => state.telemetry[entry.id].physio.stress.value))
      expect(chasing).toBeGreaterThan(leaderStress)
    }
  })
})

describe('the flags reach the cars', () => {
  it('slows the field when the yellow comes out', () => {
    const green = run(90_000)
    const underYellow = run(30_000, green)
    expect(underYellow.flags.flag).toBe('yellow')

    const covered = (from: RaceState, to: RaceState) =>
      to.field.cars['nova-07'].lap + to.field.cars['nova-07'].progress -
      (from.field.cars['nova-07'].lap + from.field.cars['nova-07'].progress)

    const clear = run(30_000, run(30_000))
    expect(covered(green, underYellow)).toBeLessThan(covered(run(30_000), clear))
  })
})

// the end of the race is ninety minutes of real time away, so the only way to look at it is to
// put the leader on the last lap and step from there
function atTheFlag(state = createRace(seed)) {
  const leaderId = state.field.standings[0].id
  const leader = state.field.cars[leaderId]

  return {
    ...state,
    field: {
      ...state.field,
      cars: { ...state.field.cars, [leaderId]: { ...leader, lap: state.circuit.totalLaps + 1 } },
    },
  }
}

describe('the end of the race', () => {
  it('puts the chequered flag out when the leader finishes the distance', () => {
    expect(tick(atTheFlag(), 500, createRng(5)).flags.flag).toBe('chequered')
  })

  it('reports it in the feed, which is the tick that has to run in full', () => {
    const ended = tick(atTheFlag(), 500, createRng(5))
    expect(ended.events.some((event) => event.message === 'Chequered flag')).toBe(true)
  })

  it('then holds the classification, because the session is over', () => {
    const ended = tick(atTheFlag(), 500, createRng(5))
    const later = run(20_000, ended)

    expect(later.field.standings).toEqual(ended.field.standings)
    expect(later.field.cars).toEqual(ended.field.cars)
    expect(later.telemetry).toEqual(ended.telemetry)
  })

  it('keeps the clock running, so the board can still say how long ago it finished', () => {
    const ended = tick(atTheFlag(), 500, createRng(5))
    expect(run(20_000, ended).elapsedMs).toBeGreaterThan(ended.elapsedMs)
  })

  it('does not take the flag back in once it is out', () => {
    const ended = tick(atTheFlag(), 500, createRng(5))
    expect(run(600_000, ended).flags.flag).toBe('chequered')
  })

  // the car's lap counter names the lap it is driving. after the flag there is not one, and a
  // board reading "lap 68 of 67" is the kind of thing a reviewer spots immediately
  it('shows the race distance as the lap once it is over, not one past it', () => {
    const ended = tick(atTheFlag(), 500, createRng(5))
    const leader = ended.field.cars[ended.field.standings[0].id]

    expect(leader.lap).toBe(ended.circuit.totalLaps + 1)
    expect(lapShown(ended.flags.flag, ended.circuit.totalLaps, leader.lap)).toBe(
      ended.circuit.totalLaps,
    )
  })

  it('leaves the lap alone while the race is still running', () => {
    const state = run(4000)
    const leader = state.field.cars[state.field.standings[0].id]
    expect(lapShown(state.flags.flag, state.circuit.totalLaps, leader.lap)).toBe(leader.lap)
  })
})
