import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { WeatherPanel } from '../../src/race/WeatherPanel'

beforeEach(() => {
  raceStore.restart()
})

afterEach(() => {
  raceStore.stop()
  vi.useRealTimers()
})

describe('the weather panel', () => {
  it('shows the five readings the pack provides', () => {
    render(<WeatherPanel />)
    for (const label of ['Air', 'Cloud', 'Humid', 'Press', 'Wind']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('gives every reading its unit, because a bare number is not a reading', () => {
    render(<WeatherPanel />)
    expect(screen.getByText('°C')).toBeInTheDocument()
    expect(screen.getAllByText('%')).toHaveLength(2)
    expect(screen.getByText('mb')).toBeInTheDocument()
    expect(screen.getByText('km/h')).toBeInTheDocument()
  })

  // the one group on the board where colour identifies a thing rather than grading it: none of
  // these five is ever good or bad, so the tint is keyed off what the reading is
  it('gives each reading a box of its own, keyed to what it measures', () => {
    const { container } = render(<WeatherPanel />)
    const boxes = [...container.querySelectorAll('.weather-box')]

    expect(boxes).toHaveLength(5)
    expect(boxes.map((box) => box.getAttribute('data-kind'))).toEqual([
      'air',
      'cloud',
      'humidity',
      'pressure',
      'wind',
    ])
  })

  // one cloud front rolls across the circuit and everything moves the way it actually moves
  // when that happens, so all five drift together rather than wobbling on their own
  it('drifts as the race runs', () => {
    vi.useFakeTimers()
    const { container } = render(<WeatherPanel />)
    const before = container.textContent

    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(container.textContent).not.toBe(before)
  })
})
