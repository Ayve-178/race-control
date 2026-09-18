import { describe, expect, it } from 'vitest'
import { createFlags, paceScaleFor, stepFlags, type FlagsState } from '../../../src/sim/models/flags'

function run(ms: number, raceOver = false) {
  let flags = createFlags()
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    flags = stepFlags(flags, 500, raceOver)
  }
  return flags
}

function trace(ms: number) {
  const seen: FlagsState[] = []
  let flags = createFlags()
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    flags = stepFlags(flags, 500, false)
    seen.push(flags)
  }
  return seen
}

describe('createFlags', () => {
  it('starts the race green', () => {
    expect(createFlags().flag).toBe('green')
    expect(createFlags().sector).toBeNull()
  })

  it('stands still when no time passes', () => {
    const flags = createFlags()
    expect(stepFlags(flags, 0, false)).toEqual(flags)
  })
})

describe('the scripted incidents', () => {
  it('throws a yellow inside the first two minutes, so a reviewer sees one', () => {
    const flags = trace(120_000).filter((f) => f.flag !== 'green')
    expect(flags.length).toBeGreaterThan(0)
    expect(flags[0].flag).toBe('yellow')
  })

  it('puts the yellow in one sector rather than round the whole circuit', () => {
    const yellow = trace(140_000).find((f) => f.flag === 'yellow')
    expect(yellow?.sector).toBe(2)
  })

  it('clears it again', () => {
    expect(run(90_000).flag).toBe('green')
    expect(run(120_000).flag).toBe('yellow')
    expect(run(160_000).flag).toBe('green')
  })

  it('counts down how long is left', () => {
    const first = run(110_000)
    const later = run(130_000)
    expect(first.remainingMs).toBeGreaterThan(later.remainingMs)
    expect(later.remainingMs).toBeGreaterThan(0)
  })

  it('leaves nothing to count down when the race is green', () => {
    expect(run(90_000).remainingMs).toBe(0)
  })

  it('gets through more than one kind of incident', () => {
    const kinds = new Set(trace(800_000).map((f) => f.flag))
    expect(kinds).toContain('green')
    expect(kinds).toContain('yellow')
    expect(kinds).toContain('vsc')
    expect(kinds).toContain('safetyCar')
  })

  it('comes round again, so a long session keeps showing something', () => {
    const late: FlagsState = { ...createFlags(), elapsedMs: 999_000 }
    expect(stepFlags(late, 2000, false).flag).toBe('yellow')
  })
})

describe('the chequered flag', () => {
  it('falls when the race is run', () => {
    expect(run(30_000, true).flag).toBe('chequered')
  })

  it('stays out once it is out', () => {
    let flags = run(30_000, true)
    flags = stepFlags(flags, 500, false)
    expect(flags.flag).toBe('chequered')
  })
})

describe('what a flag does to the cars', () => {
  it('leaves a green race alone', () => {
    expect(paceScaleFor(run(90_000), 1)).toBe(1)
  })

  it('slows only the sector the yellow is in', () => {
    const yellow = run(120_000)
    expect(paceScaleFor(yellow, 2)).toBeGreaterThan(1)
    expect(paceScaleFor(yellow, 1)).toBe(1)
    expect(paceScaleFor(yellow, 3)).toBe(1)
  })

  it('slows the whole circuit under a virtual safety car', () => {
    const vsc = run(320_000)
    expect(vsc.flag).toBe('vsc')
    for (const sector of [1, 2, 3] as const) {
      expect(paceScaleFor(vsc, sector)).toBeGreaterThan(1)
    }
  })

  it('slows it more still behind the safety car', () => {
    const vsc = run(320_000)
    const safetyCar = run(700_000)
    expect(safetyCar.flag).toBe('safetyCar')
    expect(paceScaleFor(safetyCar, 1)).toBeGreaterThan(paceScaleFor(vsc, 1))
  })
})
