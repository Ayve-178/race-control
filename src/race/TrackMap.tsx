import { useEffect, useRef } from 'react'
import { TICK_MS } from '../sim/simulator'
import type { DriverId } from '../sim/types'
import { raceStore, useRace } from '../store/raceStore'
import { PATH_LENGTH, TRACK_OUTLINE } from './trackPath'

const SECTOR_LENGTH = PATH_LENGTH / 3

type Placement = { from: number; to: number }

// no well, no border, no grid: the circuit sits directly on the panel with nothing drawn
// around it. absolutely positioned so the drawing resolves against the panel rather than
// against an auto sized row, which is what was clipping it.
const map = 'absolute inset-0 w-full h-full overflow-visible'

export function TrackMap() {
  const lineRef = useRef<SVGPathElement>(null)
  const markerRefs = useRef(new Map<DriverId, SVGGElement>())

  const cars = useRace((view) => view.race.grid)
  const selectedId = useRace((view) => view.selectedDriverId)
  const yellowSector = useRace((view) =>
    view.race.flags.flag === 'yellow' ? view.race.flags.sector : null,
  )

  useEffect(() => {
    const line = lineRef.current
    if (!line) return

    const total = line.getTotalLength()
    const places = new Map<DriverId, Placement>()
    let tickAt = performance.now()
    // true once every marker has finished its slide, so a held board is not rewriting six
    // transforms a frame to move nothing
    let settled = false

    // the simulation moves twice a second and the eye wants sixty, so the loop remembers where
    // each car was at the last two ticks and slides between them over one tick. if a tick is
    // late the marker finishes its slide and waits, which reads better than guessing where the
    // car went and then correcting. interpolating rather than predicting keeps the physics in
    // the simulator: this only ever draws positions the race has actually been in.
    function sample() {
      const cars = raceStore.getSnapshot().race.field.cars
      for (const [id, car] of Object.entries(cars)) {
        const previous = places.get(id)
        places.set(id, { from: previous ? previous.to : car.progress, to: car.progress })
      }
      tickAt = performance.now()
      settled = false
    }

    sample()
    const stopListening = raceStore.subscribe(sample)

    let frame = requestAnimationFrame(function draw() {
      frame = requestAnimationFrame(draw)
      if (settled) return

      const through = Math.min(1, (performance.now() - tickAt) / TICK_MS)

      for (const [id, node] of markerRefs.current) {
        const place = places.get(id)
        if (!place) continue

        // a car that crossed the line went from 0.99 to 0.01, and lerping that runs it
        // backwards round the whole circuit. carrying the wrap keeps it going forwards.
        const to = place.to < place.from ? place.to + 1 : place.to
        const at = (place.from + (to - place.from) * through) % 1
        const point = line.getPointAtLength(at * total)
        node.setAttribute('transform', `translate(${point.x} ${point.y})`)
      }

      settled = through === 1
    })

    return () => {
      cancelAnimationFrame(frame)
      stopListening()
    }
  }, [])

  return (
    <svg className={map} viewBox="12 8 276 224" role="img" aria-label="Circuit map">
      <defs>
        <filter id="track-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path className="track-underlay" d={TRACK_OUTLINE} filter="url(#track-glow)" />

      {/* a yellow does not recolour the circuit, it lays a band over the third of it that is
          actually under the flag, so it reads as a condition on the track */}
      {yellowSector !== null && (
        <path
          className="track-yellow"
          d={TRACK_OUTLINE}
          pathLength={PATH_LENGTH}
          strokeDasharray={`${SECTOR_LENGTH} ${PATH_LENGTH - SECTOR_LENGTH}`}
          strokeDashoffset={-SECTOR_LENGTH * (yellowSector - 1)}
          data-sector={yellowSector}
        />
      )}

      <path
        ref={lineRef}
        className="track-line"
        d={TRACK_OUTLINE}
        pathLength={PATH_LENGTH}
        filter="url(#track-glow)"
      />

      {/* the start line, drawn as a single dash at zero rather than as a separate shape */}
      <path
        className="track-start"
        d={TRACK_OUTLINE}
        pathLength={PATH_LENGTH}
        strokeDasharray={`4 ${PATH_LENGTH - 4}`}
      />

      <g>
        {cars.map((car) => (
          <g
            key={car.id}
            ref={(node) => {
              if (node) markerRefs.current.set(car.id, node)
              else markerRefs.current.delete(car.id)
            }}
            className="track-marker"
            data-ours={car.isOurs}
            data-selected={car.id === selectedId}
          >
            <circle className="track-halo" r={car.isOurs ? 7 : 5} />
            <circle className="track-dot" r={car.isOurs ? 4 : 2.8} />
            {car.isOurs && (
              <text className="track-number" y={-8}>
                {car.number}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  )
}
