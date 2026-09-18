import { describe, expect, it } from 'vitest'
import { recordTrace, startTrace, TRACE_LENGTH } from '../../../src/sim/models/trace'

function fill(count: number) {
  let trace = startTrace(0)
  for (let i = 1; i < count; i++) trace = recordTrace(trace, i)
  return trace
}

describe('starting one', () => {
  it('begins with the reading it was given and nothing invented around it', () => {
    expect(startTrace(143)).toEqual([143])
  })
})

describe('while it is filling', () => {
  it('keeps every sample, oldest first', () => {
    expect(fill(4)).toEqual([0, 1, 2, 3])
  })

  it('grows up to the window and no further', () => {
    expect(fill(TRACE_LENGTH)).toHaveLength(TRACE_LENGTH)
    expect(recordTrace(fill(TRACE_LENGTH), 999)).toHaveLength(TRACE_LENGTH)
  })
})

describe('once it is full', () => {
  it('drops the oldest sample to make room', () => {
    const full = fill(TRACE_LENGTH)
    const next = recordTrace(full, 999)

    expect(next[TRACE_LENGTH - 1]).toBe(999)
    expect(next[0]).toBe(full[1])
  })

  it('keeps them in order, so the chart is not drawn backwards', () => {
    let trace = fill(TRACE_LENGTH)
    for (let i = 0; i < 30; i++) trace = recordTrace(trace, TRACE_LENGTH + i)

    for (let i = 1; i < trace.length; i++) {
      expect(trace[i]).toBeGreaterThan(trace[i - 1])
    }
  })

  it('leaves the one it was given alone, because the state is replaced and not edited', () => {
    const full = fill(TRACE_LENGTH)
    const copy = [...full]
    recordTrace(full, 999)
    expect(full).toEqual(copy)
  })
})
