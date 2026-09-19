import { Panel } from '../components/Panel'
import { useRace } from '../store/raceStore'
import { formatValue, MISSING } from '../utils/format'
import { TrackMap } from './TrackMap'

// the circuit leads the column. it is the thing an engineer glances at most and the board's
// strongest single image, so it sits at the top rather than buried under a list.
const badge = 't-label absolute left-0 top-0 flex items-center gap-3 text-live'

const pip = 'w-[5px] h-[5px] rounded-full bg-live shadow-(--live-glow) motion-safe:animate-pulse-live'

// one compact row under the map, separated by rules only
const sectors = 'grid grid-cols-3 mt-4 pt-3 border-t border-border flex-none'

const sector =
  'flex items-baseline gap-3 min-w-0 ' +
  '[&+&]:border-l [&+&]:border-border [&+&]:pl-5'

// a split is only worth colouring when it is the one you are running or the one you are
// losing time in. a personal best just comes up to full brightness.
const SPLIT_TONE = {
  live: { id: 'text-live', time: 'text-primary' },
  best: { id: 'text-muted', time: 'text-primary' },
  slow: { id: 'text-muted', time: 'text-caution' },
  plain: { id: 'text-muted', time: 'text-secondary' },
}

// more than a hundredth off this car's own best for that sector is time being lost in it
const SLOW_MARGIN_MS = 10

function toneFor(live: boolean, last: number | null, best: number | null) {
  if (live) return 'live' as const
  if (last === null || best === null) return 'plain' as const
  if (last === best) return 'best' as const
  return last > best + SLOW_MARGIN_MS ? ('slow' as const) : ('plain' as const)
}

export function Circuit() {
  // the three things this panel prints, read one at a time. the car itself is a new object
  // every tick, and none of these change more than once a sector, so taking the whole car
  // would re-render the map beneath twice a second for nothing.
  const current = useRace((view) => view.race.field.cars[view.selectedDriverId]?.sector)
  const lastSectorMs = useRace((view) => view.race.field.cars[view.selectedDriverId]?.lastSectorMs)
  const bestSectorMs = useRace((view) => view.race.field.cars[view.selectedDriverId]?.bestSectorMs)
  if (!current || !lastSectorMs || !bestSectorMs) return null

  return (
    <Panel title="Circuit" aside="4.574 km" className="panel-circuit">
      <div className="relative flex-1 min-h-0 max-tablet:min-h-[190px] max-phone:min-h-[230px]">
        <span className={badge}>
          <i className={pip} aria-hidden="true" />
          Sector {current}
        </span>
        <TrackMap />
      </div>

      <div className={sectors}>
        {[0, 1, 2].map((index) => {
          const last = lastSectorMs[index]
          const tone = SPLIT_TONE[toneFor(current === index + 1, last, bestSectorMs[index])]

          return (
            <div key={index} className={sector}>
              <span className={`t-label-xs ${tone.id}`}>S{index + 1}</span>
              <span className={`t-readout-sm ${tone.time}`}>
                {last === null ? MISSING : formatValue(last / 1000, 3)}
              </span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
