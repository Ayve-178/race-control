// the same upper line the band latch uses, so the panel, the gauge colours and the event feed
// cannot disagree about what "in the window" means
export const WINDOW_LOW_C = 90
export const WINDOW_HIGH_C = 118

// what the reading is doing relative to its window, in the fewest words that still say it
export function windowDelta(tempC: number): string {
  if (tempC > WINDOW_HIGH_C) return `+${Math.round(tempC - WINDOW_HIGH_C)} over`
  if (tempC < WINDOW_LOW_C) return `${Math.round(WINDOW_LOW_C - tempC)} under`
  return 'in window'
}
