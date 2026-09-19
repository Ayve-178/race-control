import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { EventLog } from '../../src/race/EventLog'

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

function runFor(ms: number) {
  vi.useFakeTimers()
  raceStore.start()
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function log() {
  return screen.getByRole('log', { name: 'Race events' })
}

describe('the event log', () => {
  it('is a labelled log region, so a screen reader can find it', () => {
    render(<EventLog />)
    expect(log()).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Race control' })).toBeInTheDocument()
  })

  it('says so plainly when there is nothing to report yet', () => {
    render(<EventLog />)
    expect(screen.getByText(/Nothing to report/)).toBeInTheDocument()
  })

  it('fills up as the race produces events', () => {
    render(<EventLog />)
    runFor(90_000)
    expect(within(log()).getAllByText(/^\d{2}:\d{2}:\d{2}$/).length).toBeGreaterThan(0)
  })

  // the clock down the left is the same clock the masthead shows, so the two can be read
  // against each other rather than being two unrelated time bases
  it('stamps every line with a time of day', () => {
    render(<EventLog />)
    runFor(90_000)
    expect(within(log()).getAllByText(/^10:\d{2}:\d{2}$/).length).toBeGreaterThan(0)
  })

  it('carries the severity on the row, so it is never colour alone', () => {
    const { container } = render(<EventLog />)
    runFor(90_000)
    expect(container.querySelectorAll('[data-severity]').length).toBeGreaterThan(0)
  })

  it('puts the newest line at the top', () => {
    const { container } = render(<EventLog />)
    runFor(120_000)

    const times = [...container.querySelectorAll('[data-severity] > span:first-child')].map(
      (node) => node.textContent ?? '',
    )
    expect(times.length).toBeGreaterThan(1)
    expect([...times].sort().reverse()).toEqual(times)
  })

  // "everything remaps" applied to the one panel where it would be easiest to quietly skip
  it('follows the driver selector', () => {
    render(<EventLog />)
    runFor(90_000)
    const before = log().textContent

    act(() => {
      raceStore.selectDriver('vek-22')
    })
    expect(log().textContent).not.toBe(before)
  })

  it('can be reached by keyboard, because it is a region that scrolls', () => {
    render(<EventLog />)
    expect(log()).toHaveAttribute('tabindex', '0')
  })
})
