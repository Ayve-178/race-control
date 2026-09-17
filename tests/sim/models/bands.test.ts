import { describe, expect, it } from 'vitest'
import { bandFor, type Band, type BandLimits } from '../../../src/sim/models/bands'

const LIMITS: BandLimits = { warmAt: 118, coolAt: 112, hotAt: 128, offHotAt: 122 }

// walk a reading through a sequence of values and hand back the band it ended in
function walk(start: Band, values: number[]): Band {
  return values.reduce((band, value) => bandFor(band, value, LIMITS), start)
}

describe('going up', () => {
  it('stays ok below the warning line', () => {
    expect(bandFor('ok', 117.9, LIMITS)).toBe('ok')
  })

  it('goes warm on the line', () => {
    expect(bandFor('ok', 118, LIMITS)).toBe('warm')
  })

  it('goes hot at the limit, whatever it was before', () => {
    expect(bandFor('ok', 128, LIMITS)).toBe('hot')
    expect(bandFor('warm', 130, LIMITS)).toBe('hot')
  })
})

describe('coming back down', () => {
  it('will not leave warm until the reading has really cooled', () => {
    expect(bandFor('warm', 117, LIMITS)).toBe('warm')
    expect(bandFor('warm', 113, LIMITS)).toBe('warm')
    expect(bandFor('warm', 112, LIMITS)).toBe('ok')
  })

  it('drops out of hot into warm rather than straight to ok', () => {
    expect(bandFor('hot', 127, LIMITS)).toBe('hot')
    expect(bandFor('hot', 122, LIMITS)).toBe('warm')
  })
})

describe('the thing this exists for', () => {
  it('does not flap when a reading sits on the warning line', () => {
    // this is the real trace that caused it: a tyre easing off an episode, wobbling either side
    // of 118 as the circuit works it. thresholds alone announce and retract it six times.
    const wobble = [117, 119, 118, 117, 119, 116, 118, 119, 117]

    let band: Band = 'ok'
    const changes: Band[] = []
    for (const value of wobble) {
      const next = bandFor(band, value, LIMITS)
      if (next !== band) changes.push(next)
      band = next
    }

    expect(changes).toEqual(['warm'])
  })

  it('still reports a reading that genuinely recovers', () => {
    expect(walk('ok', [119, 117, 118, 110])).toBe('ok')
  })

  it('still reports one that genuinely gets worse', () => {
    expect(walk('ok', [119, 117, 124, 129])).toBe('hot')
  })
})
