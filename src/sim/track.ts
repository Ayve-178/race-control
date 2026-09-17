import { wrap01 } from '../utils/math'

// the lap broken into segments, so speed, rpm and tyre heat come from where the car
// actually is rather than from a random number.
//
// the shape follows the supplied hockenheim svg: a straight along the top, a long
// run down to a hairpin at the far corner, a fast return, then the tight stadium
// section before the start line. most corners turn right, which loads the left hand
// tyres. that is why the pack data already has the front left as the hottest corner,
// and it is what makes the tyre readings diverge for a physical reason.
export type TrackSegment = {
  name: string
  // progress where this segment ends, 0 at the start line, 1 back at it
  endsAt: number
  targetSpeedKmh: number
  // which side of the car carries the cornering load through here
  load: 'left' | 'right' | 'none'
  // how hard the brakes work here, 0 to 1. heats the fronts.
  braking: number
  // how hard the car puts power down here, 0 to 1. heats the rears.
  traction: number
  drsZone: boolean
}

export const SEGMENTS: readonly TrackSegment[] = [
  { name: 'Start straight', endsAt: 0.09, targetSpeedKmh: 298, load: 'none', braking: 0, traction: 0.5, drsZone: false },
  { name: 'Turn 1', endsAt: 0.14, targetSpeedKmh: 118, load: 'left', braking: 0.95, traction: 0.3, drsZone: false },
  { name: 'Parabolika', endsAt: 0.33, targetSpeedKmh: 322, load: 'none', braking: 0, traction: 0.7, drsZone: true },
  { name: 'Spitzkehre', endsAt: 0.39, targetSpeedKmh: 82, load: 'left', braking: 1, traction: 0.9, drsZone: false },
  { name: 'Mercedes straight', endsAt: 0.55, targetSpeedKmh: 308, load: 'none', braking: 0, traction: 0.6, drsZone: true },
  { name: 'Turn 6', endsAt: 0.62, targetSpeedKmh: 154, load: 'left', braking: 0.85, traction: 0.5, drsZone: false },
  { name: 'Sweeping right', endsAt: 0.72, targetSpeedKmh: 212, load: 'left', braking: 0.3, traction: 0.6, drsZone: false },
  { name: 'Stadium entry', endsAt: 0.81, targetSpeedKmh: 148, load: 'right', braking: 0.7, traction: 0.4, drsZone: false },
  { name: 'Arena complex', endsAt: 0.9, targetSpeedKmh: 112, load: 'left', braking: 0.6, traction: 0.8, drsZone: false },
  { name: 'Final corner', endsAt: 1, targetSpeedKmh: 196, load: 'left', braking: 0.45, traction: 0.9, drsZone: false },
]

// the speed a car would average if it hit every segment target exactly. worked out from the
// table above rather than written down and left to rot when a corner speed changes.
export const AVERAGE_SPEED_KMH = (() => {
  let start = 0
  let hours = 0
  for (const segment of SEGMENTS) {
    hours += (segment.endsAt - start) / segment.targetSpeedKmh
    start = segment.endsAt
  }
  return 1 / hours
})()

export function segmentAt(progress: number): TrackSegment {
  const p = wrap01(progress)
  for (const segment of SEGMENTS) {
    if (p < segment.endsAt) return segment
  }
  return SEGMENTS[SEGMENTS.length - 1]
}

// timing splits the lap into three. sector times are what produce personal best events.
export function sectorAt(progress: number): 1 | 2 | 3 {
  const p = wrap01(progress)
  if (p < 1 / 3) return 1
  if (p < 2 / 3) return 2
  return 3
}
