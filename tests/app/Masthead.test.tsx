import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { Masthead } from '../../src/app/Masthead'

beforeEach(() => {
  raceStore.restart()
})

afterEach(() => {
  raceStore.stop()
  raceStore.restart()
  vi.useRealTimers()
})

describe('what the masthead says', () => {
  it('names the circuit as the one top level heading on the page', () => {
    render(<Masthead />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hockenheim')
  })

  it('names the country beside it', () => {
    render(<Masthead />)
    expect(screen.getByText('Germany')).toBeInTheDocument()
  })

  it('carries the team mark', () => {
    render(<Masthead />)
    expect(screen.getByRole('img', { name: 'Apex Racing' })).toBeInTheDocument()
  })

  it('shows a clock the event log can be read against', () => {
    render(<Masthead />)
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument()
  })

  it('moves that clock as the race runs', () => {
    vi.useFakeTimers()
    render(<Masthead />)
    const before = screen.getByText(/^\d{2}:\d{2}:\d{2}$/).textContent

    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/).textContent).not.toBe(before)
  })
})

describe('the link state', () => {
  it('says Live while the race is running', () => {
    render(<Masthead />)
    expect(screen.getByRole('status')).toHaveTextContent('Live')
  })

  it('says Held once the session is paused', () => {
    render(<Masthead />)
    act(() => {
      raceStore.togglePause()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Held')

    act(() => {
      raceStore.togglePause()
    })
  })
})

describe('the session controls', () => {
  it('offers hold and restart, both named for anyone who cannot see the icon', () => {
    render(<Masthead />)
    expect(screen.getByRole('button', { name: 'Hold the session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restart the session' })).toBeInTheDocument()
  })

  it('swaps hold for resume once the race is held', () => {
    render(<Masthead />)
    act(() => {
      screen.getByRole('button', { name: 'Hold the session' }).click()
    })

    expect(screen.getByRole('button', { name: 'Resume the session' })).toBeInTheDocument()
    expect(raceStore.getSnapshot().paused).toBe(true)

    act(() => {
      screen.getByRole('button', { name: 'Resume the session' }).click()
    })
  })

  it('puts the race back to the start when restart is pressed', () => {
    vi.useFakeTimers()
    render(<Masthead />)
    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    const ran = raceStore.getSnapshot().race.elapsedMs
    act(() => {
      screen.getByRole('button', { name: 'Restart the session' }).click()
    })

    expect(raceStore.getSnapshot().race.elapsedMs).toBeLessThan(ran)
  })
})
