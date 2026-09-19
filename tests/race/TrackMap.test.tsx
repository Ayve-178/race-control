import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { TrackMap } from '../../src/race/TrackMap'
import { PATH_LENGTH, TRACK_OUTLINE } from '../../src/race/trackPath'

// the svg geometry jsdom does not have is stubbed once, in tests/setup.ts. that stub maps
// distance along the path straight onto x, which is what lets these tests check where a marker
// was put rather than only that it was put somewhere.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  raceStore.stop()
  raceStore.restart()
  raceStore.selectDriver('nova-07')
  vi.useRealTimers()
})

function markerFor(number: number) {
  return screen.getByText(String(number)).closest('g')
}

// the rivals carry no number, so their markers are found by position in the grid instead
function markerOf(container: HTMLElement, id: string) {
  const grid = raceStore.getSnapshot().race.grid
  return container.querySelectorAll('g[data-ours]')[grid.findIndex((car) => car.id === id)]
}

function xOf(marker: Element | null | undefined) {
  return Number(/translate\(([-\d.]+)/.exec(marker?.getAttribute('transform') ?? '')?.[1])
}

describe('the circuit', () => {
  it('draws the outline that came with the asset pack', () => {
    const { container } = render(<TrackMap />)
    expect(container.querySelectorAll(`path[d="${TRACK_OUTLINE}"]`).length).toBeGreaterThan(1)
  })

  it('keeps the path length the asset declared, so a sector is a third of it', () => {
    expect(PATH_LENGTH).toBe(1000)
  })

  it('names itself for anyone who cannot see it', () => {
    render(<TrackMap />)
    expect(screen.getByRole('img', { name: 'Circuit map' })).toBeInTheDocument()
  })
})

describe('the markers', () => {
  it('puts one on the circuit for every car in the race', () => {
    const { container } = render(<TrackMap />)
    expect(container.querySelectorAll('g[data-ours]')).toHaveLength(6)
  })

  it('numbers our cars on the map itself', () => {
    render(<TrackMap />)
    for (const car of raceStore.getSnapshot().race.grid.filter((entry) => entry.isOurs)) {
      expect(screen.getByText(String(car.number))).toBeInTheDocument()
    }
  })

  it('leaves the rivals unnumbered, so the three numbers that matter stay readable', () => {
    // six numbers on a field covering five seconds of circuit is an unreadable pile. the rivals
    // are still told apart by shape, outlined against our filled markers.
    render(<TrackMap />)
    for (const car of raceStore.getSnapshot().race.grid.filter((entry) => !entry.isOurs)) {
      expect(screen.queryByText(String(car.number))).not.toBeInTheDocument()
    }
  })

  it('tells our cars apart from the rivals', () => {
    const { container } = render(<TrackMap />)
    expect(container.querySelectorAll('g[data-ours="true"]')).toHaveLength(3)
    expect(container.querySelectorAll('g[data-ours="false"]')).toHaveLength(3)
  })

  it('marks the one being watched', () => {
    render(<TrackMap />)
    expect(markerFor(7)).toHaveAttribute('data-selected', 'true')
    expect(markerFor(22)).toHaveAttribute('data-selected', 'false')
  })

  it('follows the driver selector', () => {
    const { rerender } = render(<TrackMap />)
    act(() => {
      raceStore.selectDriver('vek-22')
    })
    rerender(<TrackMap />)

    expect(markerFor(22)).toHaveAttribute('data-selected', 'true')
    expect(markerFor(7)).toHaveAttribute('data-selected', 'false')
  })

  it('places every marker somewhere on the path rather than at the origin', () => {
    const { container } = render(<TrackMap />)
    act(() => {
      vi.advanceTimersByTime(32)
    })

    for (const car of raceStore.getSnapshot().race.grid) {
      expect(markerOf(container, car.id)?.getAttribute('transform')).toMatch(/^translate\(/)
    }
  })

  it('puts them where the cars actually are, in running order round the lap', () => {
    const { container } = render(<TrackMap />)
    act(() => {
      vi.advanceTimersByTime(32)
    })

    // the stub maps distance along the path onto x, so a car further round the lap sits further
    // right. that makes the marker order checkable without laying out a real circuit.
    const standings = raceStore.getSnapshot().race.field.standings
    const placed = standings.map((standing) => xOf(markerOf(container, standing.id)))

    for (let i = 1; i < placed.length; i++) {
      expect(placed[i]).toBeLessThan(placed[i - 1])
    }
  })
})

describe('a yellow flag', () => {
  it('shows nothing extra while the race is green', () => {
    const { container } = render(<TrackMap />)
    expect(raceStore.getSnapshot().race.flags.flag).toBe('green')
    expect(container.querySelector('[data-sector]')).toBeNull()
  })

  it('lights the sector it is in, and only that sector', () => {
    raceStore.start()
    act(() => {
      for (let waited = 0; waited < 300_000; waited += 500) {
        vi.advanceTimersByTime(500)
        if (raceStore.getSnapshot().race.flags.flag === 'yellow') break
      }
    })

    const flags = raceStore.getSnapshot().race.flags
    expect(flags.flag).toBe('yellow')

    const { container } = render(<TrackMap />)
    const band = container.querySelector('[data-sector]')
    expect(band).not.toBeNull()
    expect(band).toHaveAttribute('data-sector', String(flags.sector))

    // a third of the circuit drawn, two thirds skipped, offset to the sector it belongs to
    const [drawn, skipped] = (band?.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number)
    expect(drawn).toBeCloseTo(PATH_LENGTH / 3, 1)
    expect(skipped).toBeCloseTo((PATH_LENGTH * 2) / 3, 1)
    expect(Number(band?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      (-PATH_LENGTH / 3) * ((flags.sector ?? 1) - 1),
      1,
    )
  })
})
