import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { Circuit } from '../../src/race/Circuit'

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

describe('the circuit panel', () => {
  it('is a labelled region with the lap distance beside its name', () => {
    render(<Circuit />)
    expect(screen.getByRole('region', { name: 'Circuit' })).toBeInTheDocument()
    expect(screen.getByText('4.574 km')).toBeInTheDocument()
  })

  it('draws the map', () => {
    render(<Circuit />)
    expect(screen.getByRole('img', { name: 'Circuit map' })).toBeInTheDocument()
  })

  // a pip on its own is a decoration. the badge names the sector, so the live marker on the
  // map can be placed without counting thirds of the lap by eye.
  it('names the sector the car is actually in', () => {
    render(<Circuit />)
    const car = raceStore.getSnapshot().race.field.cars['nova-07']
    expect(screen.getByText(`Sector ${car.sector}`)).toBeInTheDocument()
  })

  it('shows the three sector splits', () => {
    render(<Circuit />)
    expect(screen.getByText('S1')).toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()
    expect(screen.getByText('S3')).toBeInTheDocument()
  })

  // the car is dropped onto the track mid lap, so it has run no complete sector yet. a dash is
  // the honest answer, not a number invented from a partial one.
  it('shows a dash for a sector this car has not finished yet', () => {
    render(<Circuit />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('fills the splits in once sectors have been run', () => {
    vi.useFakeTimers()
    render(<Circuit />)
    raceStore.start()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getAllByText(/^\d+\.\d{3}$/).length).toBeGreaterThan(0)
  })

  // at the moment the board opens all three cars are within a second and a half of each other
  // and none has completed a sector, so they genuinely read the same. the splits are what tell
  // them apart, and those need a lap to exist.
  it('follows the driver selector once the cars have splits of their own', () => {
    vi.useFakeTimers()
    const { rerender, container } = render(<Circuit />)
    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    const before = container.textContent

    act(() => {
      raceStore.selectDriver('rine-44')
    })
    rerender(<Circuit />)

    expect(container.textContent).not.toBe(before)
  })
})
