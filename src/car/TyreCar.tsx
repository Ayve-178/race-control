import { useState } from 'react'
import carImage from '../assets/f1-car.png'
import type { TyreSet } from '../sim/models/tyres'
import { TYRE_CORNER_NAMES, TYRE_CORNERS, type TyreCorner } from '../sim/types'
import { formatValue } from '../utils/format'
import { windowDelta } from './tyreWindow'

// height drives and the aspect ratio derives the width, never the other way round. the stage is
// sized so this can never be taller than the space it has, which is what stops the rear wing
// being clipped off the bottom, and it means the tyre regions below land on the wheels at every
// size without a single measurement changing.
//
// --art is the share of the stage the drawing takes, and it is the stage's to set: the two
// readout rows are sized from the same number so their centres land on the axles. see the
// arithmetic over .car-stage in app.css before touching it here.
const wrap = 'relative h-[var(--art,100%)] aspect-[640/1469] mx-auto'

const figure = '[grid-area:car] h-full min-h-0 m-0 flex items-center max-tablet:mb-6'

const image = 'w-full h-full object-contain'

// what is left when the schematic will not load. the tyre blocks sit on the box rather than on
// the picture, so all four stay exactly where they were.
const silhouette =
  'absolute inset-x-[16%] inset-y-0 border border-border-strong bg-white/4 ' +
  'rounded-[40%_40%_18%_18%/12%_12%_6%_6%]'

// measured off the source art: the fronts sit at 20.5% of its height and the rears at 85%,
// which is where these 13.4% tall blocks centre
const REGION = {
  fl: 'left-0 top-[13.9%]',
  fr: 'right-0 top-[13.9%]',
  rl: 'left-0 top-[78.4%]',
  rr: 'right-0 top-[78.4%]',
}

// the tyre is always painted, not only when it is in trouble. green is a reading too: an
// engineer glancing at the car should be able to say "all four are fine" without reading a
// single number, and an uncoloured tyre only tells them nobody has said otherwise yet.
//
// the fill gets stronger as the news gets worse, so "all four are fine" is a quiet car and one
// corner in trouble is the loudest thing on the screen. a flat opacity for all three states
// made a healthy car shout as loudly as a broken one.
const BAND_FILL = {
  ok: 'bg-zone-1/35 border-zone-1/70',
  warm: 'bg-zone-2/65 border-zone-2 shadow-(--glow-caution)',
  hot: 'bg-zone-3/80 border-zone-3 shadow-(--glow-critical) motion-safe:animate-tyre-alarm',
}

// the painted block is the wheel, and it is also the button. the hit area is a centred
// pseudo-element that is never smaller than 44px square: at tablet width the wheel itself is
// 26px wide, and a thumb cannot be asked to land on that.
const wheel =
  'absolute w-[19%] h-[13.4%] rounded-1 border cursor-pointer ' +
  "before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-1/2 " +
  'before:w-full before:h-full before:min-w-[44px] before:min-h-[44px] ' +
  // the same cyan the circuit gives the selected car and the picker gives the chosen driver, so
  // "this one" is one colour on this board
  'data-[shown=true]:border-2 data-[shown=true]:border-selected ' +
  // an outline rather than the board's box-shadow ring, because the band glow and the alarm
  // pulse are box-shadows too and would paint over it
  'focus-visible:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

type TyreCarProps = {
  tyres: TyreSet
  // the corner whose readout is lit: whatever is under the pointer or the focus ring, or the
  // pinned one when nothing is
  shown: TyreCorner | null
  pinned: TyreCorner | null
  onPreview: (corner: TyreCorner | null) => void
  onPin: (corner: TyreCorner | null) => void
}

// one signal per corner, and that signal is the tyre. hovering or focusing one lights its
// readout across the gap; a click or a tap pins it, so the readout stays lit while everything
// else keeps updating, which is what the brief asks a touch screen to be able to do. a brake
// marker was drawn here too and taken out: at 188 pixels wide it was thirteen pixels of colour
// that could not be told apart from the wheel beside it.
export function TyreCar({ tyres, shown, pinned, onPreview, onPin }: TyreCarProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <figure className={figure}>
      <div className={wrap}>
        {imageFailed ? (
          <span className={silhouette} aria-hidden="true" />
        ) : (
          <img
            className={image}
            src={carImage}
            alt="Apex Racing car, seen from above"
            onError={() => setImageFailed(true)}
          />
        )}

        {TYRE_CORNERS.map((at) => {
          const reading = tyres[at]

          return (
            <button
              key={at}
              type="button"
              className={`${wheel} ${REGION[at]} ${BAND_FILL[reading.band]}`}
              data-shown={shown === at}
              aria-pressed={pinned === at}
              aria-label={
                `${TYRE_CORNER_NAMES[at]} tyre, ${formatValue(reading.temp.value, 0)} degrees, ` +
                `${formatValue(reading.pressureBar, 2)} bar, ${windowDelta(reading.temp.value)}`
              }
              onClick={() => onPin(pinned === at ? null : at)}
              onPointerEnter={() => onPreview(at)}
              onPointerLeave={() => onPreview(null)}
              onFocus={() => onPreview(at)}
              onBlur={() => onPreview(null)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') onPin(null)
              }}
            />
          )
        })}
      </div>
    </figure>
  )
}
