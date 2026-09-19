import { useId, type ReactNode } from 'react'
import { TRACE_LENGTH } from '../sim/models/trace'
import { clamp } from '../utils/math'
import { formatValue } from '../utils/format'

const VIEW_WIDTH = 240
const VIEW_HEIGHT = 40

// the reading column is sized to the widest thing that can land in it, "184bpm", at both type
// sizes. the plot is the column that can afford to give pixels up.
const row =
  'trace-row grid grid-cols-[112px_1fr_12px_84px] items-center gap-5 py-4 px-6 min-w-0 ' +
  'border-t border-border first:border-t-0 ' +
  'max-laptop:grid-cols-[96px_1fr_10px_76px] max-laptop:gap-3 max-laptop:py-3 max-laptop:px-5 ' +
  'max-phone:py-4 max-phone:px-5'

// the plot bed carries the zone bands, so a peak that reaches the top band is visibly in the
// red without any threshold logic or a second colour system. it is the meters' scale, stood on
// end. the bands and the rule grid are in app.css: layered gradients have no utility form.
const plot =
  'trace-plot relative h-[74px] min-w-0 bg-sunken border border-border overflow-hidden ' +
  'max-laptop:h-[58px] max-tablet:h-[58px] max-phone:h-[66px]'

// a vertical zone rail with a marker at the current reading. deliberately not a dial: a rail
// speaks the meters' language and shows how much headroom is left, which a circle does not.
const gauge =
  'trace-gauge relative w-[12px] h-[74px] max-laptop:h-[58px] max-tablet:h-[58px] max-phone:h-[66px]'

const value =
  't-readout-xl leading-none max-laptop:text-[26px] max-tablet:text-[24px] max-phone:text-[26px]'

type TraceProps = {
  label: string
  // which channel this is. app.css turns it into the tint the line, the fill and the icon take,
  // so three plots in one panel are told apart before a label is read.
  kind: 'heart' | 'breathing' | 'stress'
  icon: ReactNode
  // oldest first. a partly full trace draws from the right, because the newest sample is
  // always now and the window is always a minute wide.
  points: number[]
  min: number
  max: number
  // the unit printed after the current reading. stress is an index and has none.
  unit?: string
  // the scale in words, under the label. says what the plot's floor and ceiling actually are.
  range: string
  // the three clock times under the plot, oldest first
  axis: string[]
}

function shareOf(value: number, min: number, max: number) {
  return clamp((value - min) / (max - min), 0, 1)
}

function yOf(value: number, min: number, max: number) {
  return VIEW_HEIGHT - shareOf(value, min, max) * VIEW_HEIGHT
}

function xOf(index: number, count: number) {
  return VIEW_WIDTH - ((count - 1 - index) / (TRACE_LENGTH - 1)) * VIEW_WIDTH
}

export function Trace({ label, kind, icon, points, min, max, unit, range, axis }: TraceProps) {
  const fillId = useId()
  const latest = points[points.length - 1] ?? min
  const line = points.map((value, i) => `${xOf(i, points.length)},${yOf(value, min, max)}`).join(' ')
  // the area is the same line closed down to the floor at each end
  const area = `${xOf(0, points.length)},${VIEW_HEIGHT} ${line} ${VIEW_WIDTH},${VIEW_HEIGHT}`

  const lowest = Math.min(...points)
  const highest = Math.max(...points)
  const fromTop = `${(1 - shareOf(latest, min, max)) * 100}%`

  return (
    <div className={row} data-trace={kind}>
      <div className="flex flex-col gap-2 min-w-0">
        <span className="t-label flex items-center gap-3 text-secondary min-w-0">
          <span className="flex-none text-[color:var(--tint)]">{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className="t-readout-xs text-muted">{range}</span>
      </div>

      <div className="flex flex-col gap-2 min-w-0">
        <div className={plot}>
          <svg
            className="relative block w-full h-full text-[color:var(--tint)]"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${label}, now ${formatValue(latest)}${unit ? ' ' + unit : ''}, ranging from ${formatValue(lowest)} to ${formatValue(highest)} over the last minute`}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.26" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon fill={`url(#${fillId})`} points={area} />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              points={line}
            />
          </svg>
        </div>

        {/* only the newest tick survives the narrower plot: the window is already stated in the
            panel head, so the older ticks are redundant before they are cramped */}
        <div className="flex justify-between t-readout-xs text-muted max-laptop:justify-end">
          {axis.map((at, index) => (
            <span key={at} className={index < axis.length - 1 ? 'max-laptop:hidden' : undefined}>
              {at}
            </span>
          ))}
        </div>
      </div>

      <div className={gauge} aria-hidden="true">
        <b style={{ top: fromTop }} />
      </div>

      <div className="flex flex-col items-end gap-2">
        {/* no reserved field here, unlike the tyre and power unit readouts: heart rate is always
            three digits on its scale, breathing always two, and stress has no unit to push */}
        <span className={`${value} whitespace-nowrap`}>
          {formatValue(latest)}
          {unit && <span className="unit">{unit}</span>}
        </span>
        <span className="t-readout-xs text-muted">&#9650; {formatValue(highest)}</span>
        <span className="t-readout-xs text-muted">&#9660; {formatValue(lowest)}</span>
      </div>
    </div>
  )
}
