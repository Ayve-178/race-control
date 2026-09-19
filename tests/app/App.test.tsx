import { render, screen, within } from '@testing-library/react'
import { act, StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { App } from '../../src/app/App'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  raceStore.stop()
  vi.useRealTimers()
})

function elapsed() {
  return raceStore.getSnapshot().race.elapsedMs
}

function runFor(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('the board', () => {
  it('puts the masthead above the race status', () => {
    render(<App />)
    expect(screen.getByText('Hockenheim')).toBeInTheDocument()

    const band = screen.getByRole('region', { name: 'Race status' })
    const circuit = screen.getByRole('heading', { level: 1 })
    expect(circuit.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows every panel at once, because this board does not have tabs', () => {
    render(<App />)
    for (const name of [
      'Circuit',
      'Stint',
      'Weather',
      'Car — tyres and brakes',
      'Power unit',
      'Race control',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('region', { name: /^Driver — / })).toBeInTheDocument()
  })

  it('guards each panel on its own, so one failure cannot take the screen', () => {
    render(<App />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('the clock', () => {
  it('starts when the app mounts', () => {
    const before = elapsed()
    render(<App />)
    runFor(2000)
    expect(elapsed()).toBeGreaterThan(before)
  })

  it('stops when the app goes away', () => {
    const view = render(<App />)
    runFor(1000)
    view.unmount()

    const held = elapsed()
    runFor(5000)
    expect(elapsed()).toBe(held)
  })

  it('survives being mounted, thrown away and mounted again', () => {
    // react does exactly this in development, and an earlier version of the store tore its
    // subscriptions down on stop, which left the second mount running against a dead store
    render(<App />).unmount()
    render(<App />)

    const before = elapsed()
    runFor(2000)
    expect(elapsed()).toBeGreaterThan(before)
  })

  it('runs under StrictMode, which mounts every effect twice', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    const before = elapsed()
    runFor(2000)
    expect(elapsed()).toBeGreaterThan(before)
  })
})

describe('the numbers on screen', () => {
  it('move as the race runs', () => {
    render(<App />)
    const band = screen.getByRole('region', { name: 'Race status' })
    const before = band.textContent

    runFor(4000)
    expect(band.textContent).not.toBe(before)
  })

  it('stop moving while the race is held', () => {
    render(<App />)
    act(() => {
      raceStore.togglePause()
    })

    const band = screen.getByRole('region', { name: 'Race status' })
    const held = band.textContent

    runFor(4000)
    expect(band.textContent).toBe(held)

    act(() => {
      raceStore.togglePause()
    })
  })

  // held or finished, nothing is arriving any more, so nothing should still claim to be live.
  // one flag at the top rather than a prop threaded through every panel.
  it('marks the whole board held, which is what quiets every live indicator at once', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.board')).toHaveAttribute('data-held', 'false')

    act(() => {
      raceStore.togglePause()
    })
    expect(container.querySelector('.board')).toHaveAttribute('data-held', 'true')

    act(() => {
      raceStore.togglePause()
    })
  })
})

describe('finding a way around without a mouse', () => {
  it('puts the columns in a main landmark, so there is somewhere to skip to', () => {
    render(<App />)
    const main = screen.getByRole('main')
    expect(within(main).getByRole('region', { name: 'Car — tyres and brakes' })).toBeInTheDocument()
  })

  it('names the page with a single top level heading', () => {
    render(<App />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('Hockenheim')
  })

  // two polite regions on one screen talk over each other. the only one on this board is the
  // link state in the masthead, which changes when a person presses a button and not otherwise.
  it('keeps one polite live region on the page, not one per panel', () => {
    render(<App />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('keeps the masthead and the band out of the main landmark', () => {
    render(<App />)
    const main = screen.getByRole('main')
    const band = screen.getByRole('region', { name: 'Race status' })

    expect(main).not.toContainElement(band)
    expect(band.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
