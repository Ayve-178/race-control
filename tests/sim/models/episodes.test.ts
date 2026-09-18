import { describe, expect, it } from 'vitest'
import { TYRE_CORNERS } from '../../../src/sim/types'
import { createEpisodes, stepEpisodes, type EpisodeState } from '../../../src/sim/models/episodes'

function at(ms: number) {
  let state = createEpisodes()
  for (let elapsed = 0; elapsed < ms; elapsed += 500) state = stepEpisodes(state, 500)
  return state
}

function trace(ms: number) {
  const seen: EpisodeState[] = []
  let state = createEpisodes()
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    state = stepEpisodes(state, 500)
    seen.push(state)
  }
  return seen
}

// nothing being pushed on any channel
function idle(state: EpisodeState) {
  return (
    state.engineC === 0 &&
    state.stress === 0 &&
    TYRE_CORNERS.every((corner) => state.tyreC[corner] === 0)
  )
}

describe('createEpisodes', () => {
  it('starts with nothing happening', () => {
    expect(idle(createEpisodes())).toBe(true)
  })

  it('stands still when no time passes', () => {
    const state = createEpisodes()
    expect(stepEpisodes(state, 0)).toEqual(state)
  })
})

describe('the tyre that overheats in the first minute', () => {
  it('has not started yet at twenty seconds', () => {
    expect(at(20_000).tyreC.fl).toBe(0)
  })

  it('is building by forty', () => {
    const offset = at(40_000).tyreC.fl
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(14)
  })

  it('is at full strength by fifty', () => {
    expect(at(50_000).tyreC.fl).toBe(14)
  })

  it('is easing off by seventy five', () => {
    const offset = at(75_000).tyreC.fl
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(at(70_000).tyreC.fl)
  })

  it('is over and forgotten by ninety', () => {
    expect(at(90_000).tyreC.fl).toBe(0)
  })

  it('touches only the corner it is about', () => {
    const state = at(50_000)
    expect(state.tyreC.fl).toBeGreaterThan(10)
    expect(state.tyreC.fr).toBe(0)
    expect(state.tyreC.rl).toBe(0)
    expect(state.tyreC.rr).toBe(0)
  })

  it('leaves everything else alone', () => {
    const state = at(50_000)
    expect(state.engineC).toBe(0)
    expect(state.stress).toBe(0)
  })
})

describe('the shape of an episode', () => {
  it('climbs, sits, and comes back to nothing', () => {
    const offsets = trace(100_000).map((state) => state.tyreC.fl)
    expect(offsets[0]).toBe(0)
    expect(Math.max(...offsets)).toBeGreaterThan(13)
    expect(offsets[offsets.length - 1]).toBe(0)
  })

  it('never steps, at either end', () => {
    // the steepest a smoothstep gets is one and a half times its average, so over a twelve
    // second build the most a tick can move fourteen degrees of offset is about 0.9. the
    // reading itself moves far less than that again, because the tyre is on a twelve second
    // time constant and only covers four per cent of the gap per tick.
    const offsets = trace(100_000).map((state) => state.tyreC.fl)
    for (let i = 1; i < offsets.length; i++) {
      expect(Math.abs(offsets[i] - offsets[i - 1])).toBeLessThan(1)
    }
  })
})

describe('the rest of the schedule', () => {
  it('works the engine over later on', () => {
    expect(at(200_000).engineC).toBeGreaterThan(5)
  })

  it('puts the driver under it later still', () => {
    expect(at(270_000).stress).toBeGreaterThan(15)
  })

  it('takes the other tyre later again', () => {
    const state = at(375_000)
    expect(state.tyreC.rr).toBeGreaterThan(10)
    expect(state.tyreC.fl).toBe(0)
  })

  it('leaves quiet stretches in between, which is what the cooldown is', () => {
    const seen = trace(480_000)
    const quiet = seen.filter(idle)
    expect(quiet.length).toBeGreaterThan(seen.length / 2)
  })

  it('comes round again', () => {
    const late: EpisodeState = { ...createEpisodes(), elapsedMs: 480_000 + 44_000 }
    expect(stepEpisodes(late, 500).tyreC.fl).toBeGreaterThan(0)
  })
})
