import { describe, expect, it } from 'vitest'
import { buildSeed } from '../../../src/sim/seed'
import { createField, PIT_LANE_MS, SCHEDULED_STOP, stepField, type FieldState } from '../../../src/sim/models/field'
import { createFlags } from '../../../src/sim/models/flags'

const seed = buildSeed()

// the field is tested on its own, so the race stays green throughout
const GREEN = createFlags()

function run(field: FieldState, ms: number) {
  let current = field
  for (let elapsed = 0; elapsed < ms; elapsed += 500) current = stepField(current, 500, GREEN)
  return current
}

// how far through the race a car is, laps plus the part lap it is on
function distanceOf(field: FieldState, id: string) {
  return field.cars[id].lap + field.cars[id].progress
}

function standingOf(field: FieldState, id: string) {
  const entry = field.standings.find((standing) => standing.id === id)
  if (!entry) throw new Error(id + ' is not in the standings')
  return entry
}

describe('createField', () => {
  it('puts the whole grid on track', () => {
    const field = createField(seed)
    expect(Object.keys(field.cars)).toHaveLength(6)
    expect(field.standings).toHaveLength(6)
  })

  it('starts each car where the seed put it', () => {
    const field = createField(seed)
    for (const car of seed.grid) {
      expect(field.cars[car.id].lap).toBe(car.startLap)
      expect(field.cars[car.id].progress).toBe(car.startProgress)
    }
  })

  it('orders the field by how far round the lap each car is', () => {
    const field = createField(seed)
    expect(field.standings.map((standing) => standing.id)).toEqual([
      'nova-07',
      'rask-03',
      'vek-22',
      'okon-11',
      'rine-44',
      'bren-19',
    ])
    expect(field.standings.map((standing) => standing.position)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('gives our drivers their pack best lap', () => {
    const field = createField(seed)
    expect(field.cars['nova-07'].bestLapMs).toBe(seed.baselines['nova-07'].bestLapMs)
    expect(field.cars['nova-07'].topSpeedKmh).toBe(seed.baselines['nova-07'].topSpeedKmh)
  })

  it('falls back to their own pace for rivals, who have no pack telemetry', () => {
    const field = createField(seed)
    const rask = seed.grid.find((car) => car.id === 'rask-03')
    expect(field.cars['rask-03'].bestLapMs).toBe(rask?.paceMs)
  })
})

describe('gaps', () => {
  it('leaves the leader with no gap', () => {
    const field = createField(seed)
    expect(field.standings[0].gapAheadMs).toBe(0)
    expect(field.standings[0].gapToLeaderMs).toBe(0)
  })

  it('starts the field close enough to fight', () => {
    // the seed spaces the cars by track position, and a gap is a time, so these come out a
    // little wider than the seconds written into seed.ts: that stretch of the lap is slower
    // than the lap average, which makes the same piece of tarmac worth more time
    const gaps = createField(seed).standings.slice(1).map((standing) => standing.gapAheadMs)
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(400)
      expect(gap).toBeLessThan(2000)
    }
    expect(createField(seed).standings.at(-1)?.gapToLeaderMs).toBeLessThan(8000)
  })

  it('holds an interval steady while the pair sweep round the lap', () => {
    // two cars on the same piece of road stay the same distance apart, but that distance is
    // worth very different amounts of time depending on where it is. an interval worked out
    // from raw track position swings by half a second between the straights and the stadium,
    // which reads as a broken instrument rather than as racing.
    const seen: number[] = []
    let field = createField(seed)
    for (let elapsed = 0; elapsed < 35_000; elapsed += 500) {
      field = stepField(field, 500, GREEN)
      seen.push(standingOf(field, 'vek-22').gapAheadMs)
    }

    // the two are not on identical pace, so take the straight line out and look at what is
    // left, which is the wobble
    const perTick = (seen[seen.length - 1] - seen[0]) / (seen.length - 1)
    const wobble = seen.map((gap, tick) => gap - perTick * tick)
    expect(Math.max(...wobble) - Math.min(...wobble)).toBeLessThan(200)
  })

  it('grows the gap to the leader all the way down the order', () => {
    const field = run(createField(seed), 20_000)
    const toLeader = field.standings.map((standing) => standing.gapToLeaderMs)
    for (let i = 1; i < toLeader.length; i++) {
      expect(toLeader[i]).toBeGreaterThan(toLeader[i - 1])
    }
  })

  it('keeps the order and the race distances agreeing', () => {
    const field = run(createField(seed), 45_000)
    const distances = field.standings.map((standing) => distanceOf(field, standing.id))
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeLessThan(distances[i - 1])
    }
  })
})

describe('stepField', () => {
  it('stands still when no time passes', () => {
    const field = createField(seed)
    expect(stepField(field, 0, GREEN)).toEqual(field)
  })

  it('moves every car', () => {
    const field = createField(seed)
    const next = stepField(field, 500, GREEN)
    for (const car of seed.grid) {
      expect(distanceOf(next, car.id)).toBeGreaterThan(distanceOf(field, car.id))
    }
  })

  it('gets the leader onto a new lap inside the first minute', () => {
    const field = run(createField(seed), 40_000)
    expect(field.cars['nova-07'].lap).toBe(17)
  })
})

describe('the pit stop', () => {
  const stopping = SCHEDULED_STOP.id

  it('has nobody in the pits at the start', () => {
    const field = createField(seed)
    expect(field.pit.status).toBe('due')
    expect(field.standings.every((standing) => !standing.inPit)).toBe(true)
  })

  it('brings the car in once it has finished its lap', () => {
    const field = run(createField(seed), 45_000)
    expect(field.pit.status).toBe('in')
    expect(field.cars[stopping].lap).toBe(SCHEDULED_STOP.afterLap + 1)
    expect(standingOf(field, stopping).inPit).toBe(true)
  })

  it('shows the time bleeding away while the car is still in there', () => {
    const field = run(createField(seed), 45_000)
    const later = run(field, 10_000)
    expect(field.pit.status).toBe('in')
    expect(later.pit.status).toBe('in')
    const bled = standingOf(later, stopping).gapToLeaderMs - standingOf(field, stopping).gapToLeaderMs
    expect(bled).toBeGreaterThan(8000)
  })

  it('crawls it through the pit lane rather than freezing it', () => {
    const during = run(createField(seed), 45_000)
    const next = stepField(during, 500, GREEN)
    const crawled = distanceOf(next, stopping) - distanceOf(during, stopping)
    expect(crawled).toBeGreaterThan(0)
    expect(crawled).toBeLessThan(0.001)
  })

  it('drops it to the back of the field while it is in there', () => {
    expect(standingOf(run(createField(seed), 25_000), stopping).position).toBe(2)
    expect(standingOf(run(createField(seed), 50_000), stopping).position).toBe(6)
  })

  it('leaves everyone else racing', () => {
    const field = run(createField(seed), 50_000)
    for (const standing of field.standings) {
      if (standing.id !== stopping) expect(standing.inPit).toBe(false)
    }
  })

  it('sends it back out and lets it race again', () => {
    const field = run(createField(seed), 90_000)
    expect(field.pit.status).toBe('done')
    expect(field.standings.every((standing) => !standing.inPit)).toBe(true)

    const next = stepField(field, 500, GREEN)
    expect(distanceOf(next, stopping) - distanceOf(field, stopping)).toBeGreaterThan(0.002)
  })

  it('costs it roughly the time a stop should cost', () => {
    const before = run(createField(seed), 25_000)
    const after = run(createField(seed), 90_000)
    const lost = standingOf(after, stopping).gapToLeaderMs - standingOf(before, stopping).gapToLeaderMs
    expect(lost).toBeGreaterThan(PIT_LANE_MS * 0.75)
    expect(lost).toBeLessThan(PIT_LANE_MS * 1.4)
  })

  it('only stops once', () => {
    const field = run(createField(seed), 200_000)
    expect(field.pit.status).toBe('done')
    expect(field.cars[stopping].lap).toBeGreaterThan(SCHEDULED_STOP.afterLap + 1)
  })

  it('changes the running order inside the first minute', () => {
    const start = createField(seed)
    const minute = run(start, 60_000)
    expect(minute.standings.map((standing) => standing.id)).not.toEqual(
      start.standings.map((standing) => standing.id),
    )
  })
})
