import { clamp } from '../../utils/math'
import type { PerCorner, TyreCorner } from '../types'

export type EpisodeState = {
  elapsedMs: number
  // what to add to each channel's target while the episode runs. the channels do the rest:
  // the value climbs towards the raised target and finds its own way home once the offset
  // goes back to zero, so nothing anywhere has to write recovery logic.
  tyreC: PerCorner<number>
  engineC: number
  stress: number
}

type Scheduled = {
  kind: 'tyreOverheat' | 'engineOverheat' | 'driverSpike'
  corner: TyreCorner | null
  startMs: number
  buildMs: number
  holdMs: number
  easeMs: number
}

// the gaps between these are the cooldowns. nothing fires twice in a row because the next
// chance for it is a whole cycle away, which is simpler than keeping a timer per episode
// and comes to the same thing.
const SCHEDULE: Scheduled[] = [
  { kind: 'tyreOverheat', corner: 'fl', startMs: 30_000, buildMs: 12_000, holdMs: 24_000, easeMs: 20_000 },
  { kind: 'engineOverheat', corner: null, startMs: 165_000, buildMs: 20_000, holdMs: 30_000, easeMs: 25_000 },
  { kind: 'driverSpike', corner: null, startMs: 255_000, buildMs: 8000, holdMs: 14_000, easeMs: 20_000 },
  { kind: 'tyreOverheat', corner: 'rr', startMs: 350_000, buildMs: 12_000, holdMs: 20_000, easeMs: 18_000 },
]

const CYCLE_MS = 480_000

// how far each episode pushes the reading it acts on
const TYRE_C = 14
const ENGINE_C = 9
const STRESS = 22

// eases in and out rather than starting and stopping, so there is no kink in the trace at
// either end of an episode
function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

// how hard the episode is pushing at this moment, 0 to 1. zero outside its window.
function strengthAt(episode: Scheduled, at: number): number {
  const since = at - episode.startMs
  if (since < 0) return 0
  if (since < episode.buildMs) return smoothstep(since / episode.buildMs)

  const held = since - episode.buildMs
  if (held < episode.holdMs) return 1

  const easing = held - episode.holdMs
  if (easing < episode.easeMs) return 1 - smoothstep(easing / episode.easeMs)

  return 0
}

// the three cars share one schedule but start at different points in it, so they do not
// all cook the same corner at the same moment
export function createEpisodes(startMs = 0): EpisodeState {
  return { elapsedMs: startMs, tyreC: { fl: 0, fr: 0, rl: 0, rr: 0 }, engineC: 0, stress: 0 }
}

export function stepEpisodes(state: EpisodeState, dtMs: number): EpisodeState {
  if (dtMs <= 0) return state

  const elapsedMs = state.elapsedMs + dtMs
  const at = elapsedMs % CYCLE_MS

  const tyreC: PerCorner<number> = { fl: 0, fr: 0, rl: 0, rr: 0 }
  let engineC = 0
  let stress = 0

  for (const scheduled of SCHEDULE) {
    const strength = strengthAt(scheduled, at)
    if (strength === 0) continue

    if (scheduled.kind === 'tyreOverheat' && scheduled.corner) {
      tyreC[scheduled.corner] += strength * TYRE_C
    }
    if (scheduled.kind === 'engineOverheat') engineC += strength * ENGINE_C
    if (scheduled.kind === 'driverSpike') stress += strength * STRESS
  }

  return { elapsedMs, tyreC, engineC, stress }
}
