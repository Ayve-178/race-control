import { approach, clamp } from '../utils/math'
import { gaussian, type Rng } from './prng'

// a channel is one live number: a tyre temperature, a heart rate, the wind speed.
//
// two things happen every step:
//   1. the target wanders a little, but is always pulled back towards the baseline
//   2. the value chases the target
//
// that is what makes readings look intentional. they drift, they settle, they come back.
// pure noise would jump around a fixed number instead, which reads as fake.
export type Channel = {
  value: number
  target: number
  baseline: number
  min: number
  max: number
  // how quickly the value catches the target, in ms. bigger = more sluggish.
  tau: number
  // how far the target is allowed to wander from the baseline
  drift: number
}

type ChannelOptions = {
  baseline: number
  min: number
  max: number
  tau: number
  drift: number
  value?: number
}

export function createChannel(options: ChannelOptions): Channel {
  const { baseline, min, max, tau, drift, value } = options
  return {
    value: value ?? baseline,
    target: baseline,
    baseline,
    min,
    max,
    tau,
    drift,
  }
}

// how strongly the target is pulled home. a quarter of the drift per second
// keeps it moving without letting it stick to an extreme.
const PULL_PER_MS = 0.00025

// offset is what episodes use: "run this corner 15 degrees hotter for a while".
// it shifts the target, so the value climbs and then recovers on its own once
// the episode ends and the offset goes back to zero.
export function stepChannel(channel: Channel, dtMs: number, rng: Rng, offset = 0): Channel {
  if (dtMs <= 0) return channel

  const aim = channel.baseline + offset
  const wander = gaussian(rng) * channel.drift * 0.02
  const pullHome = (aim - channel.target) * PULL_PER_MS * dtMs

  const target = clamp(channel.target + pullHome + wander, aim - channel.drift, aim + channel.drift)
  const value = clamp(approach(channel.value, target, dtMs, channel.tau), channel.min, channel.max)

  return { ...channel, target, value }
}
