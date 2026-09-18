import { createRng } from './prng'
import { createRace, tick, type RaceState } from './race'
import { buildSeed } from './seed'

// half a second. fast enough that the numbers are alive, slow enough that a tick is cheap
// and that a reading can be read before it changes.
export const TICK_MS = 500

// a browser stops firing timers in a hidden tab and then fires one very late. without a
// ceiling the race would jump forward by however long the tab was away, and a minute in
// another window would teleport the field half a lap up the road. so a gap of any length
// costs the simulation two seconds and no more.
const MAX_STEP_MS = 2000

// the race is already running before anyone looks at it. thirty seconds is chosen rather than
// guessed: it is long enough for every car to reach the speed its own part of the circuit calls
// for, and it puts the reviewer six seconds away from the leader crossing the line and nine from
// a rival pitting, so the first quarter minute has a lap, a position change and a tyre warning
// in it. warming up for a whole lap instead would spend the scripted tyre episode before anyone
// could see it.
const WARM_UP_MS = 30_000

// fixed, so the same race replays every time the page is opened and a walkthrough video can
// be recorded twice and match
const DEFAULT_SEED = 20260913

export type Simulator = {
  getState(): RaceState
  subscribe(listener: () => void): () => void
  start(): void
  stop(): void
  setPaused(paused: boolean): void
  isPaused(): boolean
  restart(): void
}

export function createSimulator(seedNumber = DEFAULT_SEED): Simulator {
  const seed = buildSeed()
  const listeners = new Set<() => void>()

  let rng = createRng(seedNumber)
  let timer: ReturnType<typeof setInterval> | null = null
  let paused = false
  let lastAt = Date.now()

  function warmedUp(): RaceState {
    let warming = createRace(seed)
    for (let elapsed = 0; elapsed < WARM_UP_MS; elapsed += TICK_MS) {
      warming = tick(warming, TICK_MS, rng)
    }
    return warming
  }

  let state = warmedUp()

  function emit() {
    for (const listener of listeners) listener()
  }

  // the step is taken from the wall clock rather than from the interval, so a lap takes as
  // long as a lap takes even when the browser is late with a timer
  function step() {
    const now = Date.now()
    const dtMs = Math.min(MAX_STEP_MS, now - lastAt)
    lastAt = now

    if (paused || dtMs <= 0) return

    state = tick(state, dtMs, rng)
    emit()
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    start() {
      if (timer !== null) return
      lastAt = Date.now()
      timer = setInterval(step, TICK_MS)
    },

    stop() {
      if (timer === null) return
      clearInterval(timer)
      timer = null
    },

    setPaused(next) {
      paused = next
      lastAt = Date.now()
      emit()
    },

    isPaused: () => paused,

    restart() {
      rng = createRng(seedNumber)
      state = warmedUp()
      lastAt = Date.now()
      emit()
    },
  }
}
