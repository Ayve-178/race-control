import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { DriverZone } from '../../src/driver/DriverZone'

afterEach(() => {
  raceStore.stop()
  raceStore.restart()
  raceStore.selectDriver('nova-07')
  vi.useRealTimers()
})

function runFor(ms: number) {
  raceStore.start()
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function trace(label: string) {
  return screen.getByRole('img', { name: new RegExp('^' + label) })
}

function pointsOf(label: string) {
  return trace(label).querySelector('polyline')?.getAttribute('points') ?? ''
}

describe('who is being watched', () => {
  it('names the driver in the panel title, so the panel says whose readings these are', () => {
    render(<DriverZone />)
    expect(screen.getByRole('region', { name: 'Driver — Aria Nova' })).toBeInTheDocument()
  })

  it('follows the driver selector', () => {
    const { rerender } = render(<DriverZone />)
    act(() => {
      raceStore.selectDriver('rine-44')
    })
    rerender(<DriverZone />)

    expect(screen.getByRole('region', { name: 'Driver — Soren Hale' })).toBeInTheDocument()
  })
})

describe('the three traces', () => {
  it('shows all three the assignment asks for', () => {
    render(<DriverZone />)
    expect(screen.getByText('Heart rate')).toBeInTheDocument()
    expect(screen.getByText('Breathing')).toBeInTheDocument()
    expect(screen.getByText('Stress')).toBeInTheDocument()
  })

  it('draws a line for each, not just a number', () => {
    const { container } = render(<DriverZone />)
    expect(container.querySelectorAll('polyline')).toHaveLength(3)
  })

  // three plots stacked in one panel and drawn in one colour are told apart only by reading
  // their labels. the row names its channel and the stylesheet turns that into the tint.
  it('names the channel on each row, which is what gives it its colour', () => {
    const { container } = render(<DriverZone />)
    const rows = [...container.querySelectorAll('[data-trace]')]
    expect(rows.map((row) => row.getAttribute('data-trace'))).toEqual([
      'heart',
      'breathing',
      'stress',
    ])
  })

  it('puts the current value beside the line, because a line has no value on it', () => {
    render(<DriverZone />)
    const physio = raceStore.getSnapshot().race.telemetry['nova-07'].physio
    expect(screen.getByText(Math.round(physio.heartRate.value).toString())).toBeInTheDocument()
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  // the scale is what makes a peak mean something, and the zone bands behind the trace are
  // drawn from these same two numbers
  it('states the range each trace is plotted against', () => {
    render(<DriverZone />)
    expect(screen.getByText('120–200 bpm')).toBeInTheDocument()
    expect(screen.getByText('10–50 / min')).toBeInTheDocument()
    expect(screen.getByText('0–100 index')).toBeInTheDocument()
  })

  it('reports the high and the low of the window beside the current reading', () => {
    render(<DriverZone />)
    expect(screen.getAllByText(/▲ \d+/)).toHaveLength(3)
    expect(screen.getAllByText(/▼ \d+/)).toHaveLength(3)
  })

  it('moves all three as the race runs', () => {
    vi.useFakeTimers()
    render(<DriverZone />)

    const before = ['Heart rate', 'Breathing', 'Stress'].map(pointsOf)
    runFor(20_000)
    const after = ['Heart rate', 'Breathing', 'Stress'].map(pointsOf)

    for (let i = 0; i < 3; i++) {
      expect(after[i]).not.toBe(before[i])
    }
  })

  it('grows the trace as samples arrive rather than redrawing from nothing', () => {
    vi.useFakeTimers()
    render(<DriverZone />)

    const before = pointsOf('Heart rate').split(' ').length
    runFor(10_000)
    expect(pointsOf('Heart rate').split(' ').length).toBeGreaterThan(before)
  })

  it('marks the newest sample at the right hand edge', () => {
    render(<DriverZone />)
    const points = pointsOf('Heart rate').split(' ')
    const lastX = Number(points[points.length - 1].split(',')[0])
    expect(lastX).toBeCloseTo(240, 1)
  })
})

describe('switching driver', () => {
  it("shows that driver's own last minute, not a chart starting again", () => {
    vi.useFakeTimers()
    runFor(30_000)

    const { rerender } = render(<DriverZone />)
    const novaPoints = pointsOf('Heart rate')

    act(() => {
      raceStore.selectDriver('vek-22')
    })
    rerender(<DriverZone />)

    const veldorPoints = pointsOf('Heart rate')
    expect(veldorPoints).not.toBe(novaPoints)
    // both have been running the whole time, so both have the same amount of history
    expect(veldorPoints.split(' ').length).toBe(novaPoints.split(' ').length)
  })
})

describe('reading it without seeing it', () => {
  it('describes each trace in words, with its range', () => {
    render(<DriverZone />)
    expect(trace('Heart rate')).toHaveAccessibleName(/now \d+ bpm, ranging from \d+ to \d+/)
  })

  it('says how wide the window is and how many samples are in it', () => {
    render(<DriverZone />)
    expect(screen.getByText(/Last minute · \d+ samples/)).toBeInTheDocument()
  })
})
