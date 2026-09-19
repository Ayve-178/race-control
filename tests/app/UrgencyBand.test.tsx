import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { formatLapTime } from '../../src/utils/format'
import { UrgencyBand } from '../../src/app/UrgencyBand'

beforeEach(() => {
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  raceStore.restart()
  raceStore.selectDriver('nova-07')
  vi.useRealTimers()
})

function cell(label: string) {
  return screen.getByText(label).parentElement as HTMLElement
}

describe('the five readings', () => {
  it('is a named region, because it is the thing an engineer looks at first', () => {
    render(<UrgencyBand />)
    expect(screen.getByRole('region', { name: 'Race status' })).toBeInTheDocument()
  })

  it('shows position, lap, current lap, best lap and top speed', () => {
    render(<UrgencyBand />)
    for (const label of ['Position', 'Lap', 'Current lap', 'Best lap', 'Top speed']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('writes the position as a place rather than a bare number', () => {
    render(<UrgencyBand />)
    expect(cell('Position')).toHaveTextContent(/P[1-6]/)
  })

  it('shows the lap against the distance, so a number has something to mean', () => {
    render(<UrgencyBand />)
    expect(cell('Lap')).toHaveTextContent('/ 67')
  })

  it('draws the lap as a progress line as well as a figure', () => {
    render(<UrgencyBand />)
    expect(screen.getByRole('img', { name: /Lap \d+ of 67/ })).toBeInTheDocument()
  })

  it('shows the current lap as a lap time', () => {
    render(<UrgencyBand />)
    expect(cell('Current lap')).toHaveTextContent(/\d+:\d{2}\.\d{3}/)
  })
})

describe('the delta under the current lap', () => {
  // a part finished lap compared against a whole one reads as a minute up all the way round.
  // the comparison is taken at the point of the lap the car has actually reached.
  it('reports a signed gap to the best, with a direction', () => {
    render(<UrgencyBand />)
    expect(cell('Current lap')).toHaveTextContent(/[▲▼] \d+\.\d{3} to best/)
  })
})

describe('the best lap', () => {
  // this driver's own, because it is the number the delta beside it is measured against
  it("is the selected driver's own best", () => {
    render(<UrgencyBand />)
    const car = raceStore.getSnapshot().race.field.cars['nova-07']
    expect(cell('Best lap')).toHaveTextContent(formatLapTime(car.bestLapMs))
  })

  // nova holds the quickest lap in the pack, so watching hale names nova underneath
  it('names the teammate holding the team best when it is somebody else', () => {
    raceStore.selectDriver('rine-44')
    render(<UrgencyBand />)
    expect(cell('Best lap')).toHaveTextContent(/Team best \d:\d\d\.\d{3} · A\. NOVA/)
  })

  it('says so when this driver holds it', () => {
    render(<UrgencyBand />)
    expect(cell('Best lap')).toHaveTextContent(/team best$/i)
    expect(cell('Best lap')).not.toHaveTextContent(/K\. VELDOR|S\. HALE/)
  })
})

describe('the top speed', () => {
  it('says where on the circuit it was reached', () => {
    render(<UrgencyBand />)
    expect(cell('Top speed')).toHaveTextContent(/Sector [123] · lap \d+/)
    expect(cell('Top speed')).toHaveTextContent('km/h')
  })
})

describe('as the race runs', () => {
  it('moves, because every reading on it is live', () => {
    vi.useFakeTimers()
    const { container } = render(<UrgencyBand />)
    const before = container.textContent

    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(container.textContent).not.toBe(before)
  })

  it('follows the driver selector', () => {
    const { rerender, container } = render(<UrgencyBand />)
    const before = container.textContent

    act(() => {
      raceStore.selectDriver('rine-44')
    })
    rerender(<UrgencyBand />)

    expect(container.textContent).not.toBe(before)
  })
})
