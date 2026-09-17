import { describe, expect, it } from 'vitest'
import { AVERAGE_SPEED_KMH, SEGMENTS, sectorAt, segmentAt } from '../../src/sim/track'

describe('segments', () => {
  it('covers the whole lap with no gaps', () => {
    let previous = 0
    for (const segment of SEGMENTS) {
      expect(segment.endsAt).toBeGreaterThan(previous)
      previous = segment.endsAt
    }
    expect(previous).toBe(1)
  })

  it('keeps every target speed in a believable range', () => {
    for (const segment of SEGMENTS) {
      expect(segment.targetSpeedKmh).toBeGreaterThan(60)
      expect(segment.targetSpeedKmh).toBeLessThan(340)
    }
  })

  it('has at least one flat out straight and one slow corner', () => {
    const speeds = SEGMENTS.map((s) => s.targetSpeedKmh)
    expect(Math.max(...speeds)).toBeGreaterThan(300)
    expect(Math.min(...speeds)).toBeLessThan(120)
  })

  it('marks the drs straights', () => {
    expect(SEGMENTS.filter((s) => s.drsZone).length).toBeGreaterThanOrEqual(1)
  })

  it('loads the left tyres more than the right, because the lap turns mostly right', () => {
    const lapShareOf = (side: 'left' | 'right') =>
      SEGMENTS.reduce((total, segment, index) => {
        if (segment.load !== side) return total
        const startsAt = index === 0 ? 0 : SEGMENTS[index - 1].endsAt
        return total + (segment.endsAt - startsAt)
      }, 0)

    expect(lapShareOf('left')).toBeGreaterThan(lapShareOf('right'))
  })

  it('spends more of the lap braking or accelerating than coasting', () => {
    const working = SEGMENTS.filter((s) => s.braking > 0.2 || s.traction > 0.2)
    expect(working.length).toBeGreaterThan(SEGMENTS.length / 2)
  })
})

describe('segmentAt', () => {
  it('returns the first segment at the start line', () => {
    expect(segmentAt(0)).toBe(SEGMENTS[0])
  })

  it('returns the last segment just before the line', () => {
    expect(segmentAt(0.999)).toBe(SEGMENTS[SEGMENTS.length - 1])
  })

  it('picks the segment whose range contains the progress', () => {
    const target = SEGMENTS[2]
    const start = SEGMENTS[1].endsAt
    const middle = (start + target.endsAt) / 2
    expect(segmentAt(middle)).toBe(target)
  })

  it('wraps progress outside zero to one', () => {
    expect(segmentAt(1.25)).toBe(segmentAt(0.25))
    expect(segmentAt(-0.25)).toBe(segmentAt(0.75))
  })
})

describe('sectorAt', () => {
  it('splits the lap into three', () => {
    expect(sectorAt(0.1)).toBe(1)
    expect(sectorAt(0.5)).toBe(2)
    expect(sectorAt(0.9)).toBe(3)
  })

  it('starts sector one on the line', () => {
    expect(sectorAt(0)).toBe(1)
  })

  it('wraps like segmentAt does', () => {
    expect(sectorAt(1.1)).toBe(1)
  })
})

describe('AVERAGE_SPEED_KMH', () => {
  it('sits between the slowest and the fastest part of the circuit', () => {
    const targets = SEGMENTS.map((segment) => segment.targetSpeedKmh)
    expect(AVERAGE_SPEED_KMH).toBeGreaterThan(Math.min(...targets))
    expect(AVERAGE_SPEED_KMH).toBeLessThan(Math.max(...targets))
  })

  it('is dragged down by the corners rather than sitting midway', () => {
    const midway = (Math.min(...SEGMENTS.map((s) => s.targetSpeedKmh)) +
      Math.max(...SEGMENTS.map((s) => s.targetSpeedKmh))) / 2
    expect(AVERAGE_SPEED_KMH).toBeLessThan(midway)
  })
})
