import trackSvg from '../assets/track-hockenheim.svg?raw'

// the circuit outline is read out of the supplied asset rather than copied into a string
// here, so the svg file stays the one place the shape lives. everything else in that file is
// re-authored in the map component: it ships four markers with hard coded colours and this
// race has six cars whose colours have to mean something.
function outlineFrom(svg: string): string {
  const match = /\sd="(M[^"]+)"/.exec(svg)
  if (!match) throw new Error('track-hockenheim.svg has no path data in it')
  return match[1]
}

export const TRACK_OUTLINE = outlineFrom(trackSvg)

// the path carries pathLength="1000" in the asset, and the map keeps that. it means a sector
// is a third of this number rather than a third of some arbitrary user-unit length.
export const PATH_LENGTH = 1000
