import { useSyncExternalStore } from 'react'
import type { RaceState } from '../sim/race'
import { createSimulator } from '../sim/simulator'
import type { DriverId } from '../sim/types'

// which driver the screen is pointed at is not part of the race. all three of our cars are
// simulated the whole time, so switching is a change of view rather than a change of subject,
// and nothing has to be warmed up when it happens.
export type RaceView = {
  race: RaceState
  selectedDriverId: DriverId
  paused: boolean
}

export function createRaceStore(simulator = createSimulator()) {
  const listeners = new Set<() => void>()
  const ours = simulator.getState().grid.filter((entry) => entry.isOurs)

  let selectedDriverId: DriverId = ours[0].id

  // useSyncExternalStore compares snapshots by identity, so this has to be one object that
  // is replaced when something changes rather than rebuilt on every read. a fresh object per
  // read would re-render everything on every frame, for ever.
  let view: RaceView = { race: simulator.getState(), selectedDriverId, paused: false }

  function publish() {
    view = { race: simulator.getState(), selectedDriverId, paused: simulator.isPaused() }
    for (const listener of listeners) listener()
  }

  simulator.subscribe(publish)

  return {
    getSnapshot: () => view,

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    start: () => simulator.start(),

    // only the clock stops. tearing the subscriptions down here would break the store the
    // first time React ran an effect twice, which in development it always does.
    stop: () => simulator.stop(),

    selectDriver(id: DriverId) {
      if (id === selectedDriverId) return
      selectedDriverId = id
      publish()
    },

    togglePause() {
      simulator.setPaused(!simulator.isPaused())
    },

    restart: () => simulator.restart(),
  }
}

export const raceStore = createRaceStore()

// the selector is what keeps a tick from re-rendering the whole screen: a panel asks for the
// one number it shows, and React only wakes it when that number changes. it has to return
// something comparable by identity, so read a value out of the state rather than building a
// new object from it.
export function useRace<T>(select: (view: RaceView) => T): T {
  return useSyncExternalStore(raceStore.subscribe, () => select(raceStore.getSnapshot()))
}
