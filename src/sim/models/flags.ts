export type Flag = 'green' | 'yellow' | 'vsc' | 'safetyCar' | 'chequered'

export type FlagsState = {
  flag: Flag
  // the sector a yellow is being shown in. null for everything else, because nothing else
  // is confined to one part of the circuit.
  sector: 1 | 2 | 3 | null
  remainingMs: number
  elapsedMs: number
}

type Incident = {
  flag: Flag
  sector: 1 | 2 | 3 | null
  startMs: number
  endMs: number
}

// the race is green unless something has happened, and these are the somethings. they are
// written down rather than rolled for, so the demo is the same every time it is opened and
// so a reviewer is guaranteed to see one inside the first two minutes rather than being
// asked to sit and hope.
const INCIDENTS: Incident[] = [
  { flag: 'yellow', sector: 2, startMs: 100_000, endMs: 142_000 },
  { flag: 'vsc', sector: null, startMs: 300_000, endMs: 352_000 },
  { flag: 'yellow', sector: 3, startMs: 470_000, endMs: 505_000 },
  { flag: 'safetyCar', sector: null, startMs: 640_000, endMs: 760_000 },
]

// after this the list starts again, so leaving the page open for half an hour does not end
// up watching a race where nothing can happen any more
const CYCLE_MS = 900_000

// how much each flag stretches a lap. a yellow is a lift and a wave through one sector; a
// virtual safety car holds everyone to a delta all the way round; behind the actual safety
// car the field is down to a crawl.
const YELLOW_SCALE = 1.35
const VSC_SCALE = 1.4
const SAFETY_CAR_SCALE = 1.6

export function createFlags(): FlagsState {
  return { flag: 'green', sector: null, remainingMs: 0, elapsedMs: 0 }
}

export function stepFlags(flags: FlagsState, dtMs: number, raceOver: boolean): FlagsState {
  if (dtMs <= 0) return flags

  const elapsedMs = flags.elapsedMs + dtMs

  // the chequered flag is the one that does not get taken back in
  if (raceOver || flags.flag === 'chequered') {
    return { flag: 'chequered', sector: null, remainingMs: 0, elapsedMs }
  }

  const at = elapsedMs % CYCLE_MS
  const incident = INCIDENTS.find((period) => at >= period.startMs && at < period.endMs)
  if (!incident) return { flag: 'green', sector: null, remainingMs: 0, elapsedMs }

  return {
    flag: incident.flag,
    sector: incident.sector,
    remainingMs: incident.endMs - at,
    elapsedMs,
  }
}

export function paceScaleFor(flags: FlagsState, sector: 1 | 2 | 3): number {
  if (flags.flag === 'yellow') return flags.sector === sector ? YELLOW_SCALE : 1
  if (flags.flag === 'vsc') return VSC_SCALE
  if (flags.flag === 'safetyCar') return SAFETY_CAR_SCALE
  return 1
}
