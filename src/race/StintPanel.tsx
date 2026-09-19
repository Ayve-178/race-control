import { KvRow } from '../components/KvRow'
import { Panel } from '../components/Panel'
import { useRace } from '../store/raceStore'
import { formatLapTime, formatValue } from '../utils/format'

// two up while the column is wide enough, one up below 1280 where two columns truncated the
// longer labels
const list = 'grid grid-cols-2 gap-x-6 max-laptop:grid-cols-1'

// the first row of each column has the rule above it removed, so the list is divided rather
// than boxed in
const first = '[&:nth-child(-n+2)]:border-t-0 max-laptop:[&:nth-child(2)]:border-t'

// below 1024 the band sheds best lap and top speed. they land here, so neither is ever
// actually lost, and they are hidden again the moment the band can carry them.
const demoted = 'hidden max-tablet:grid'

export function StintPanel() {
  const stint = useRace((view) => view.race.stint)
  // three numbers rather than the car. a car state object is new on every tick, and none of
  // what this panel shows changes more than once a lap, so taking the whole thing would wake
  // it a hundred and twenty times for every time it had something new to say.
  const lap = useRace((view) => view.race.field.cars[view.selectedDriverId]?.lap)
  const bestLapMs = useRace((view) => view.race.field.cars[view.selectedDriverId]?.bestLapMs)
  const topSpeedKmh = useRace((view) => view.race.field.cars[view.selectedDriverId]?.topSpeedKmh)
  if (lap === undefined) return null

  return (
    <Panel title="Stint" aside={stint.compound} className="panel-stint">
      <div className={list}>
        <KvRow label="Laps on set" className={first}>
          {lap - stint.startedOnLap}
        </KvRow>
        <KvRow label="Pit window" className={first}>
          L{stint.windowFromLap}&ndash;L{stint.windowToLap}
        </KvRow>
        <KvRow label="Best lap" className={demoted}>
          {formatLapTime(bestLapMs)}
        </KvRow>
        <KvRow label="Top speed" className={demoted}>
          {formatValue(topSpeedKmh, 0)}
          <span className="unit">km/h</span>
        </KvRow>
      </div>
    </Panel>
  )
}
