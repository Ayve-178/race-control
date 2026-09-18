import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSimulator, TICK_MS } from '../../src/sim/simulator'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('before it is started', () => {
  it('already has a race going, rather than one sitting on the grid', () => {
    const state = createSimulator().getState()
    expect(state.elapsedMs).toBeGreaterThan(0)
    expect(Object.keys(state.field.cars)).toHaveLength(6)
  })

  it('has every car up to the speed its own part of the circuit calls for', () => {
    const cars = Object.values(createSimulator().getState().field.cars)
    const speeds = cars.map((car) => Math.round(car.speedKmh))
    expect(new Set(speeds).size).toBeGreaterThan(1)
  })

  it('does not move on its own', () => {
    const simulator = createSimulator()
    const before = simulator.getState().elapsedMs
    vi.advanceTimersByTime(5000)
    expect(simulator.getState().elapsedMs).toBe(before)
  })
})

describe('running', () => {
  it('ticks twice a second once started', () => {
    const simulator = createSimulator()
    simulator.start()
    const before = simulator.getState().elapsedMs

    vi.advanceTimersByTime(TICK_MS * 4)
    expect(simulator.getState().elapsedMs).toBe(before + TICK_MS * 4)
    simulator.stop()
  })

  it('tells anyone listening', () => {
    const simulator = createSimulator()
    const heard = vi.fn()
    simulator.subscribe(heard)
    simulator.start()

    vi.advanceTimersByTime(TICK_MS * 3)
    expect(heard).toHaveBeenCalledTimes(3)
    simulator.stop()
  })

  it('stops telling anyone who has unsubscribed', () => {
    const simulator = createSimulator()
    const heard = vi.fn()
    const stopListening = simulator.subscribe(heard)
    simulator.start()

    vi.advanceTimersByTime(TICK_MS)
    stopListening()
    vi.advanceTimersByTime(TICK_MS * 3)

    expect(heard).toHaveBeenCalledTimes(1)
    simulator.stop()
  })

  it('stops when it is told to', () => {
    const simulator = createSimulator()
    simulator.start()
    vi.advanceTimersByTime(TICK_MS * 2)
    simulator.stop()

    const afterStop = simulator.getState().elapsedMs
    vi.advanceTimersByTime(TICK_MS * 10)
    expect(simulator.getState().elapsedMs).toBe(afterStop)
  })

  it('does not start twice', () => {
    const simulator = createSimulator()
    const before = simulator.getState().elapsedMs

    simulator.start()
    simulator.start()

    vi.advanceTimersByTime(TICK_MS * 2)
    expect(simulator.getState().elapsedMs).toBe(before + TICK_MS * 2)
    simulator.stop()
  })
})

describe('a tab that was left in the background', () => {
  it('costs the race two seconds, however long it was away', () => {
    const simulator = createSimulator()
    simulator.start()
    const before = simulator.getState().elapsedMs

    // a hidden tab is a clock that keeps moving while the timer does not fire, and then one
    // very late tick when it comes back. that is not the same as running for a minute and a
    // half, which is why the wall clock alone cannot be trusted.
    vi.setSystemTime(Date.now() + 90_000)
    vi.advanceTimersByTime(TICK_MS)
    simulator.stop()

    expect(simulator.getState().elapsedMs - before).toBe(2000)
  })
})

describe('pausing', () => {
  it('holds the race still', () => {
    const simulator = createSimulator()
    simulator.start()
    simulator.setPaused(true)

    const held = simulator.getState().elapsedMs
    vi.advanceTimersByTime(TICK_MS * 6)
    expect(simulator.getState().elapsedMs).toBe(held)
    simulator.stop()
  })

  it('says so', () => {
    const simulator = createSimulator()
    expect(simulator.isPaused()).toBe(false)
    simulator.setPaused(true)
    expect(simulator.isPaused()).toBe(true)
  })

  it('tells anyone listening straight away, without waiting for a tick', () => {
    const simulator = createSimulator()
    const heard = vi.fn()
    simulator.subscribe(heard)
    simulator.setPaused(true)
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('picks up where it left off rather than catching up', () => {
    const simulator = createSimulator()
    simulator.start()
    simulator.setPaused(true)
    const held = simulator.getState().elapsedMs

    vi.advanceTimersByTime(60_000)
    simulator.setPaused(false)
    vi.advanceTimersByTime(TICK_MS)

    expect(simulator.getState().elapsedMs).toBe(held + TICK_MS)
    simulator.stop()
  })
})

describe('restarting', () => {
  it('puts the race back where it began', () => {
    const simulator = createSimulator()
    const opening = simulator.getState()

    simulator.start()
    vi.advanceTimersByTime(30_000)
    simulator.stop()
    expect(simulator.getState().elapsedMs).toBeGreaterThan(opening.elapsedMs)

    simulator.restart()
    expect(simulator.getState().elapsedMs).toBe(opening.elapsedMs)
    expect(simulator.getState().field.cars['nova-07'].lap).toBe(opening.field.cars['nova-07'].lap)
  })

  it('replays the same race, not a different one', () => {
    const simulator = createSimulator()
    simulator.start()
    vi.advanceTimersByTime(20_000)
    const first = simulator.getState()

    simulator.restart()
    vi.advanceTimersByTime(20_000)
    simulator.stop()

    expect(simulator.getState().telemetry['nova-07'].tyres.fl.temp.value).toBe(
      first.telemetry['nova-07'].tyres.fl.temp.value,
    )
  })

  it('tells anyone listening', () => {
    const simulator = createSimulator()
    const heard = vi.fn()
    simulator.subscribe(heard)
    simulator.restart()
    expect(heard).toHaveBeenCalledTimes(1)
  })
})

describe('two simulators on different seeds', () => {
  it('run different races', () => {
    const one = createSimulator(1)
    const two = createSimulator(2)
    expect(one.getState().telemetry['nova-07'].tyres.fl.temp.value).not.toBe(
      two.getState().telemetry['nova-07'].tyres.fl.temp.value,
    )
  })
})
