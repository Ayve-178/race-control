import type { ReactNode } from 'react'
import { lapShown } from '../sim/race'
import { lapTimeFraction } from '../sim/models/lapClock'
import { useRace } from '../store/raceStore'
import { formatLapTime, formatValue } from '../utils/format'

// 96 pixels the eye lands on first. five readings, no panel around them, divided by hairlines.
// below 1024 the page starts scrolling, so this is the one thing pinned to the top of it.
const band =
  'grid grid-cols-[196px_1fr_1fr_1fr_1fr] border-b border-border-strong ' +
  'max-laptop:grid-cols-[150px_1fr_1fr_1fr_1fr] ' +
  'max-tablet:sticky max-tablet:top-0 max-tablet:z-5 max-tablet:bg-surface ' +
  'max-tablet:grid-cols-[116px_1fr_1fr] ' +
  'max-phone:grid-cols-[84px_1fr_1fr]'

const cell =
  'flex flex-col justify-center gap-2 min-w-0 py-4 px-6 ' +
  'border-l border-border first:border-l-0 max-phone:py-3 max-phone:px-5'

// best lap and top speed are the two the band sheds first, because they are history rather than
// now. they reappear in the stint panel at the same width, so neither is actually lost.
const shed = 'max-tablet:hidden'

const cellLabel = 't-label text-muted truncate'
const readout = 't-readout-xl whitespace-nowrap max-laptop:text-[26px] max-tablet:text-[24px] max-phone:text-[20px]'
const note = 't-readout-xs text-muted truncate max-phone:hidden'

type CellProps = {
  label: string
  className?: string
  children: ReactNode
}

function Cell({ label, className, children }: CellProps) {
  return (
    <div className={[cell, className].filter(Boolean).join(' ')}>
      <span className={cellLabel}>{label}</span>
      {children}
    </div>
  )
}

// the live delta against this driver's own best, taken at the point of the lap the car has
// actually reached. comparing a part finished lap against a whole one would read as three
// seconds up all the way round and mean nothing.
function deltaToBest(currentLapMs: number, bestLapMs: number, progress: number): number {
  return currentLapMs - lapTimeFraction(progress) * bestLapMs
}

export function UrgencyBand() {
  const standing = useRace((view) =>
    view.race.field.standings.find((entry) => entry.id === view.selectedDriverId),
  )
  const car = useRace((view) => view.race.field.cars[view.selectedDriverId])
  const grid = useRace((view) => view.race.grid)
  const cars = useRace((view) => view.race.field.cars)
  const totalLaps = useRace((view) => view.race.circuit.totalLaps)
  const flag = useRace((view) => view.race.flags.flag)

  if (!standing || !car) return null

  const lap = lapShown(flag, totalLaps, car.lap)
  const delta = deltaToBest(car.currentLapMs, car.bestLapMs, car.progress)
  const losing = delta > 0

  // the quickest of our three cars, so the note under this driver's best can say when a
  // teammate is holding the team's
  const teamBest = grid
    .filter((entry) => entry.isOurs)
    .map((entry) => ({ entry, car: cars[entry.id] }))
    .filter((pair) => pair.car)
    .sort((a, b) => a.car.bestLapMs - b.car.bestLapMs)[0]

  const bestNote =
    teamBest && teamBest.entry.id !== car.id
      ? `Team best ${formatLapTime(teamBest.car.bestLapMs)} · ${teamBest.entry.shortName}`
      : car.bestLapLap
        ? `Lap ${car.bestLapLap} · team best`
        : 'Team best'

  return (
    <section className={band} aria-label="Race status">
      <Cell label="Position">
        <span className="t-display text-accent leading-[0.86] max-laptop:text-[44px] max-tablet:text-[40px] max-phone:text-[32px]">
          P{standing.position}
        </span>
      </Cell>

      <Cell label="Lap">
        <span className={readout}>
          {lap}
          <span className="unit">/ {totalLaps}</span>
        </span>
        <div className="h-[2px] bg-border mt-2" role="img" aria-label={`Lap ${lap} of ${totalLaps}`}>
          <i className="block h-full bg-brand" style={{ width: `${(lap / totalLaps) * 100}%` }} />
        </div>
      </Cell>

      <Cell label="Current lap">
        <span className={readout}>{formatLapTime(car.currentLapMs)}</span>
        {/* faster is nominal and stays uncoloured. only losing time earns a colour. */}
        <span className={`${note} ${losing ? 'text-caution' : 'text-primary'}`}>
          {losing ? '▲' : '▼'} {formatValue(Math.abs(delta) / 1000, 3)} to best
        </span>
      </Cell>

      {/* this driver's own, because it is the number the delta above is measured against. the
          note names a teammate only when one has gone quicker. */}
      <Cell label="Best lap" className={shed}>
        <span className={readout}>{formatLapTime(car.bestLapMs)}</span>
        <span className={note}>{bestNote}</span>
      </Cell>

      <Cell label="Top speed" className={shed}>
        <span className={readout}>
          {formatValue(car.topSpeedKmh, 0)}
          <span className="unit">km/h</span>
        </span>
        <span className={note}>
          Sector {car.topSpeedSector} · lap {car.topSpeedLap}
        </span>
      </Cell>
    </section>
  )
}
