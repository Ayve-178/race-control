// a band is which side of a warning line a reading is currently latched to.
//
// the naive version compares the reading against a threshold every tick, and a reading sitting
// on that threshold then announces itself, retracts, and announces itself again every few
// seconds. that is how a feed turns into noise, and it is also how an engineer learns to stop
// reading it.
//
// so every band has two lines: one to cross going in and a lower one to cross coming back out.
// the reading has to travel the gap between them before anything changes, which is what real
// telemetry does and why a warning light stays on rather than flickering.

export type Band = 'ok' | 'warm' | 'hot'

export type BandLimits = {
  warmAt: number
  coolAt: number
  hotAt: number
  offHotAt: number
}

export function bandFor(was: Band, value: number, limits: BandLimits): Band {
  if (value >= limits.hotAt) return 'hot'
  if (was === 'hot') return value > limits.offHotAt ? 'hot' : 'warm'
  if (value >= limits.warmAt) return 'warm'
  if (was === 'warm') return value > limits.coolAt ? 'warm' : 'ok'
  return 'ok'
}
