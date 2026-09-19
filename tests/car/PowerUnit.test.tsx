import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { PowerUnit } from '../../src/car/PowerUnit'

beforeEach(() => {
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  raceStore.selectDriver('nova-07')
  vi.useRealTimers()
})

function cell(label: string) {
  return screen.getByText(label).closest('div')?.parentElement as HTMLElement
}

describe('the four car metrics the assignment asks for', () => {
  it('shows revs, engine temperature, fuel and the battery', () => {
    render(<PowerUnit />)
    for (const label of ['RPM', 'Engine temp', 'Fuel', 'Battery']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('gives each of them a real reading rather than a bar on its own', () => {
    render(<PowerUnit />)
    for (const meter of screen.getAllByRole('meter')) {
      expect(meter).toHaveAttribute('aria-valuenow')
    }
    expect(screen.getAllByRole('meter')).toHaveLength(4)
  })

  // the meter draws a scale, not a state. what it says out loud has to be the reading in words,
  // because the colour it lands on is not available to a screen reader.
  it('reads each meter out as a value and a unit', () => {
    render(<PowerUnit />)
    expect(screen.getByRole('meter', { name: 'Fuel' })).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('per cent'),
    )
  })

  // A8 asks for a fourth metric with its meaning written on screen. a battery percentage does
  // not say whether it is filling or emptying, and that is the half that matters.
  it('says what the battery is doing, not only how full it is', () => {
    render(<PowerUnit />)
    expect(screen.getByText(/Harvesting|Balanced|Deploying/)).toBeInTheDocument()
  })

  it('remaps to another car when the driver changes', () => {
    const { rerender } = render(<PowerUnit />)
    const before = cell('RPM').textContent

    act(() => {
      raceStore.selectDriver('vek-22')
    })
    rerender(<PowerUnit />)

    expect(cell('RPM').textContent).not.toBe(before)
  })

  it('keeps moving while the race runs', () => {
    vi.useFakeTimers()
    raceStore.restart()
    render(<PowerUnit />)
    raceStore.start()

    const before = screen.getAllByRole('meter').map((m) => m.getAttribute('aria-valuenow'))
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    const after = screen.getAllByRole('meter').map((m) => m.getAttribute('aria-valuenow'))

    expect(after).not.toEqual(before)
  })
})
