import { useState } from 'react'
import { Panel } from '../components/Panel'
import { TYRE_CORNERS, TYRE_CORNER_NAMES, type TyreCorner } from '../sim/types'
import { useRace } from '../store/raceStore'
import { formatValue } from '../utils/format'
import { TyreCar } from './TyreCar'
import { windowDelta, WINDOW_HIGH_C, WINDOW_LOW_C } from './tyreWindow'

// the stage is the room the panel has left under its heading, and the car is drawn at a share of
// it. that share is what keeps the four readouts on their own axles: the two readout rows are
// derived from it, so a smaller car is a taller row rather than a moved wheel. app.css has the
// arithmetic and it is the only place the three numbers agree.
const stage = 'car-stage grid items-center gap-x-6 w-full m-auto max-tablet:gap-x-0'

// tight gaps on purpose: six lines have to fit the shorter of the two rows, and the brake is
// the last of them
const corner = 'relative flex flex-col gap-1 min-w-0 py-2'

// the two left readouts run right to left, so their numbers sit against the car rather than
// against the edge of the panel. below 1024 the four stop flanking the car and become a 2x2
// block under it, and they all read left to right again.
const SIDE = {
  fl: '[grid-area:fl] items-end text-right max-tablet:items-start max-tablet:text-left',
  fr: '[grid-area:fr] items-start',
  rl: '[grid-area:rl] items-end text-right max-tablet:items-start max-tablet:text-left',
  rr: '[grid-area:rr] items-start',
}

// the brake, given a ground and a rail of its own so it stops reading as a sixth tyre line.
// full width and justified apart rather than shrink-wrapped, so the four chips are the same
// shape at all four corners whichever way their text is aligned.
// two pixels of padding go back at 1279, where the column is 92 wide and a four figure disc
// needs 94 of it
const brakeChip =
  'brake-chip flex items-baseline justify-between gap-3 w-full mt-2 py-2 px-3 max-laptop:px-2 text-left'

const tone = 'data-[band=warm]:text-caution data-[band=hot]:text-critical'

// a hairline across the column gap, ending at the tyre it belongs to. the gap is the only thing
// between the readout and the wheel, so the line is exactly as long as it needs to be and can
// never point at empty space.
const LEAD = {
  fl: 'car-lead car-lead--right',
  fr: 'car-lead car-lead--left',
  rl: 'car-lead car-lead--right',
  rr: 'car-lead car-lead--left',
}

export function CarZone() {
  const tyres = useRace((view) => view.race.telemetry[view.selectedDriverId]?.tyres)
  const brakes = useRace((view) => view.race.telemetry[view.selectedDriverId]?.brakes)
  const compound = useRace((view) => view.race.stint.compound)

  // a corner can be pinned, so its readout stays lit while everything else keeps updating,
  // which is what a tap on a touch screen leaves behind. hovering or focusing a tyre previews
  // one on top of that and lets go when the pointer does. the corner is what is pinned, not the
  // tyre, so changing driver lands on the same corner of the other car.
  const [pinned, setPinned] = useState<TyreCorner | null>(null)
  const [previewed, setPreviewed] = useState<TyreCorner | null>(null)
  const shown = previewed ?? pinned

  if (!tyres || !brakes) return null

  return (
    <Panel
      title="Car — tyres and brakes"
      aside={`${compound} · window ${WINDOW_LOW_C}–${WINDOW_HIGH_C}°C`}
      density="open"
      className="panel-tyres"
    >
      <div className={stage}>
        {TYRE_CORNERS.map((at) => {
          const tyre = tyres[at]
          const disc = brakes[at]
          const lit = shown === at

          return (
            <div key={at} className={`${corner} ${SIDE[at]}`} data-shown={lit}>
              {/* the lead line and the corner name take the selection colour together, so the
                  lit readout reads as "this one" from across the gap and not only up close */}
              <span
                className={`${LEAD[at]} max-tablet:hidden`}
                data-band={tyre.band}
                data-shown={lit}
                aria-hidden="true"
              />

              <span className={`t-label ${lit ? 'text-selected' : 'text-muted'}`}>
                {TYRE_CORNER_NAMES[at]}
              </span>

              {/* one reading per line, with three characters reserved for the temperature: tabular figures
                  stop digits jittering but do nothing about a number gaining one, and a tyre cools
                  through 100 several times a stint. 18px rather than the scale's 22, because four
                  readouts around a drawing should not be louder than the drawing. */}
              <span className={`t-readout-lg text-[18px] ${tone}`} data-band={tyre.band}>
                <span className="inline-block min-w-[3ch]">{formatValue(tyre.temp.value, 0)}</span>
                <span className="unit">&deg;C</span>
              </span>

              <span className={`t-readout-xs text-secondary ${tone}`} data-band={tyre.band}>
                {windowDelta(tyre.temp.value)}
              </span>

              <span className="t-readout-sm text-secondary">
                {formatValue(tyre.pressureBar, 2)}
                <span className="unit">bar</span>
              </span>

              <span className="t-readout-xs text-muted">
                {formatValue(tyre.wearPercent, 0)}
                <span className="unit">% worn</span>
              </span>

              {/* the brakes are a different question on a different timescale: a disc goes from
                  glowing to cold in one straight, where a tyre carcass takes half a lap. that is
                  the whole reason it gets a box: stacked as a sixth line under five tyre lines it
                  was read as a sixth tyre line. */}
              <span className={brakeChip} data-brake={at} data-band={disc.band}>
                {/* the block is already headed "Front left", so the word alone */}
                <span className="t-label-xs text-muted whitespace-nowrap">Brake</span>
                {/* no reserved field: the two ends are pinned, so a fourth digit eats the gap
                    between them instead of moving anything */}
                <span className={`t-readout-sm text-secondary ${tone}`} data-band={disc.band}>
                  {formatValue(disc.temp.value, 0)}
                  <span className="unit">&deg;C</span>
                </span>
              </span>
            </div>
          )
        })}

        <TyreCar
          tyres={tyres}
          shown={shown}
          pinned={pinned}
          onPreview={setPreviewed}
          onPin={setPinned}
        />
      </div>
    </Panel>
  )
}
