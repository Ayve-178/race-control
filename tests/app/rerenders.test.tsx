import { render, screen } from '@testing-library/react'
import { act, Profiler, StrictMode, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CarZone } from '../../src/car/CarZone'
import { StintPanel } from '../../src/race/StintPanel'
import { raceStore } from '../../src/store/raceStore'
import { DriverPicker } from '../../src/app/DriverPicker'
import { UrgencyBand } from '../../src/app/UrgencyBand'

// C6 says a tick must not re-render the whole app. that is a claim about the store's selectors
// doing their job at every leaf, and the only way to hold it still is to count. the Profiler
// reports a commit for its subtree, and a subtree where nothing re-rendered does not commit.
function countingRenders(children: ReactNode) {
  const updates = { count: 0 }
  render(
    <Profiler
      id="watched"
      onRender={(_id, phase) => {
        if (phase === 'update') updates.count += 1
      }}
    >
      {children}
    </Profiler>,
  )
  return updates
}

beforeEach(() => {
  vi.useFakeTimers()
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  vi.useRealTimers()
})

const OURS = raceStore.getSnapshot().race.grid.filter((entry) => entry.isOurs)

function runFor(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('what a tick re-renders', () => {
  it('leaves the driver picker alone, because nothing it shows changes twice a second', () => {
    const updates = countingRenders(<DriverPicker drivers={OURS} />)
    raceStore.start()

    runFor(4000)
    expect(updates.count).toBe(0)
  })

  it('leaves the stint panel alone until the car actually completes a lap', () => {
    const updates = countingRenders(<StintPanel />)
    raceStore.start()

    runFor(4000)
    expect(updates.count).toBe(0)
  })

  it('leaves the car zone alone until a reading it draws actually moves', () => {
    const updates = countingRenders(<CarZone />)
    raceStore.start()

    // one tick. the tyre readings are drifting, so this is not zero, but it has to be small:
    // the point is that it is the panels whose numbers moved and not the tree above them.
    runFor(500)
    expect(updates.count).toBeLessThanOrEqual(2)
  })

  it('does re-render the urgency band, because the lap clock is on it', () => {
    const updates = countingRenders(<UrgencyBand />)
    raceStore.start()

    runFor(2000)
    expect(updates.count).toBeGreaterThan(0)
  })

  it('wakes the driver picker when the driver changes, which is a thing it shows', () => {
    const updates = countingRenders(<DriverPicker drivers={OURS} />)

    act(() => {
      raceStore.selectDriver('vek-22')
    })
    expect(updates.count).toBeGreaterThan(0)
  })

  it('counts the same under StrictMode, which renders everything twice', () => {
    const updates = { count: 0 }
    render(
      <StrictMode>
        <Profiler
          id="strict"
          onRender={(_id, phase) => {
            if (phase === 'update') updates.count += 1
          }}
        >
          <DriverPicker drivers={OURS} />
        </Profiler>
      </StrictMode>,
    )
    raceStore.start()

    runFor(4000)
    expect(updates.count).toBe(0)
    expect(screen.getAllByText('A. NOVA').length).toBeGreaterThan(0)
  })
})
