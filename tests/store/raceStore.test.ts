import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSimulator, TICK_MS } from '../../src/sim/simulator'
import { createRaceStore, raceStore, useRace } from '../../src/store/raceStore'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function newStore() {
  return createRaceStore(createSimulator(99))
}

describe('the snapshot', () => {
  it('holds the race, the chosen driver and whether it is paused', () => {
    const store = newStore()
    const view = store.getSnapshot()

    expect(view.race.circuit.name).toBe('Hockenheim')
    expect(view.selectedDriverId).toBe('nova-07')
    expect(view.paused).toBe(false)
    store.stop()
  })

  it('is the same object until something changes, so React can compare it', () => {
    const store = newStore()
    expect(store.getSnapshot()).toBe(store.getSnapshot())
    store.stop()
  })

  it('is a new object once the race has moved', () => {
    const store = newStore()
    const before = store.getSnapshot()
    store.start()
    vi.advanceTimersByTime(TICK_MS)

    expect(store.getSnapshot()).not.toBe(before)
    expect(store.getSnapshot().race.elapsedMs).toBeGreaterThan(before.race.elapsedMs)
    store.stop()
  })
})

describe('subscribing', () => {
  it('tells a listener on every tick', () => {
    const store = newStore()
    const heard = vi.fn()
    store.subscribe(heard)
    store.start()

    vi.advanceTimersByTime(TICK_MS * 3)
    expect(heard).toHaveBeenCalledTimes(3)
    store.stop()
  })

  it('lets a listener leave', () => {
    const store = newStore()
    const heard = vi.fn()
    const leave = store.subscribe(heard)
    store.start()

    vi.advanceTimersByTime(TICK_MS)
    leave()
    vi.advanceTimersByTime(TICK_MS * 3)

    expect(heard).toHaveBeenCalledTimes(1)
    store.stop()
  })
})

describe('choosing a driver', () => {
  it('changes who the screen is pointed at', () => {
    const store = newStore()
    store.selectDriver('vek-22')
    expect(store.getSnapshot().selectedDriverId).toBe('vek-22')
    store.stop()
  })

  it('tells everyone, so the panels remap', () => {
    const store = newStore()
    const heard = vi.fn()
    store.subscribe(heard)

    store.selectDriver('rine-44')
    expect(heard).toHaveBeenCalledTimes(1)
    store.stop()
  })

  it('says nothing when the same driver is chosen again', () => {
    const store = newStore()
    const heard = vi.fn()
    store.subscribe(heard)

    store.selectDriver('nova-07')
    expect(heard).not.toHaveBeenCalled()
    store.stop()
  })

  it('finds a driver who has been racing all along, not one starting from cold', () => {
    const store = newStore()
    const atTheStart = store.getSnapshot().race.telemetry['rine-44']

    store.start()
    vi.advanceTimersByTime(30_000)
    store.selectDriver('rine-44')

    // the driver we were not watching has been burning fuel and wearing tyres the whole time,
    // so switching lands on a car mid race rather than on one that begins when you look at it
    const now = store.getSnapshot().race.telemetry['rine-44']
    expect(now.fuelPercent).toBeLessThan(atTheStart.fuelPercent)
    expect(now.tyres.fl.wearPercent).toBeGreaterThan(atTheStart.tyres.fl.wearPercent)
    expect(now.physio.heartRate.value).not.toBe(atTheStart.physio.heartRate.value)
    store.stop()
  })
})

describe('pausing and restarting', () => {
  it('holds the race and says so', () => {
    const store = newStore()
    store.start()
    store.togglePause()

    expect(store.getSnapshot().paused).toBe(true)
    const held = store.getSnapshot().race.elapsedMs
    vi.advanceTimersByTime(TICK_MS * 4)
    expect(store.getSnapshot().race.elapsedMs).toBe(held)
    store.stop()
  })

  it('lets it go again', () => {
    const store = newStore()
    store.start()
    store.togglePause()
    store.togglePause()

    expect(store.getSnapshot().paused).toBe(false)
    const before = store.getSnapshot().race.elapsedMs
    vi.advanceTimersByTime(TICK_MS)
    expect(store.getSnapshot().race.elapsedMs).toBeGreaterThan(before)
    store.stop()
  })

  it('puts the race back to the start', () => {
    const store = newStore()
    const opening = store.getSnapshot().race.elapsedMs
    store.start()
    vi.advanceTimersByTime(20_000)
    store.restart()

    expect(store.getSnapshot().race.elapsedMs).toBe(opening)
    store.stop()
  })

  it('keeps the chosen driver across a restart', () => {
    const store = newStore()
    store.selectDriver('vek-22')
    store.restart()
    expect(store.getSnapshot().selectedDriverId).toBe('vek-22')
    store.stop()
  })
})

describe('useRace', () => {
  afterEach(() => {
    raceStore.selectDriver('nova-07')
  })

  it('hands a component the one value it asked for', () => {
    const { result } = renderHook(() => useRace((view) => view.race.circuit.name))
    expect(result.current).toBe('Hockenheim')
  })

  it('leaves a component alone when the value it reads has not moved', () => {
    let renders = 0
    renderHook(() => {
      renders++
      return useRace((view) => view.race.circuit.totalLaps)
    })

    const before = renders
    act(() => {
      raceStore.selectDriver('vek-22')
    })

    // this is the whole reason for the selector, and it is acceptance criterion C6: the state
    // changed, but the number this component shows did not, so React has nothing to do
    expect(renders).toBe(before)
  })

  it('wakes a component when the value it reads does move', () => {
    let renders = 0
    renderHook(() => {
      renders++
      return useRace((view) => view.selectedDriverId)
    })

    const before = renders
    act(() => {
      raceStore.selectDriver('vek-22')
    })

    expect(renders).toBeGreaterThan(before)
  })
})
