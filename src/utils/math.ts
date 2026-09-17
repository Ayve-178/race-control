export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// keeps a number inside [0, 1), used for lap progress
export function wrap01(x: number): number {
  const r = x % 1
  return r < 0 ? r + 1 : r
}

// moves value towards target. after one "tau" it has covered about 63% of the gap.
// works the same no matter how big dt is, and never goes past the target.
export function approach(value: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return value
  if (tauMs <= 0) return target
  return value + (target - value) * (1 - Math.exp(-dtMs / tauMs))
}
