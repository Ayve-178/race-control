export type Rng = () => number

// mulberry32. small, fast, and good enough for a simulation.
// we need our own instead of Math.random so a seed always replays the same race,
// which is what makes the tests repeatable.
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// bell curve around 0 with a standard deviation of 1.
// adding twelve flat numbers and subtracting six is the cheap way to get one,
// and it avoids the log and sqrt of the textbook method.
export function gaussian(rng: Rng): number {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += rng()
  return sum - 6
}
