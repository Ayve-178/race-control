import { clamp } from '../utils/math'

type MeterProps = {
  label: string
  value: number
  min: number
  max: number
  // for channels where the bottom of the scale is the dangerous end: fuel, battery, margin
  reverse?: boolean
  valueText: string
}

// the whole operating range is the track, drawn green to amber to red and segmented like a
// physical bargraph. everything past the current value is dimmed back toward the ground, so the
// lit length is the reading and its colour falls out of where it lands rather than from a
// separate threshold rule. one component, no modifier classes for state.
export function Meter({ label, value, min, max, reverse, valueText }: MeterProps) {
  const share = clamp((value - min) / (max - min), 0, 1) * 100

  return (
    <div
      className={`meter ${reverse ? 'meter--reverse' : ''}`}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={valueText}
    >
      <i style={{ left: `${share}%` }} />
    </div>
  )
}
