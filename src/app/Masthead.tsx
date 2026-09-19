import { BrandMark } from '../components/BrandMark'
import { GermanyFlag, PauseIcon, PlayIcon, RestartIcon } from '../components/icons'
import { raceStore, useRace } from '../store/raceStore'
import { formatClock } from '../utils/format'
import { DriverPicker } from './DriverPicker'

// 44px of chrome and nothing in it moves except the clock and the pulse, which is the point:
// the bar can sit still while everything under it changes twice a second.
const bar = 'flex items-center gap-6 px-6 border-b border-border-strong min-w-0 max-phone:gap-3 max-phone:px-5'

// at phone width every item is given somewhere to give before a longer circuit name than
// "Hockenheim" becomes a collision: the wordmark goes, the country and the clock go, LIVE drops
// to its dot, the driver drops to an avatar, and only then does the name truncate.
const mark =
  'text-brand block flex-none w-[132px] h-[23px] max-phone:w-[22px] max-phone:h-[22px]'

const rule = 'w-px h-[20px] bg-border max-phone:hidden'

const circuit = 'flex items-center gap-4 min-w-0 max-phone:flex-1'

const live = 't-label flex items-center gap-3 text-live flex-none'

// the one thing on this board that glows without being a warning, and it glows because it is what
// says the numbers beside it are still arriving. --live-glow rather than --glow-soft so the held
// board can switch it off with the rest of the live signals.
const dot = 'w-3 h-3 rounded-full bg-live shadow-(--live-glow) motion-safe:animate-pulse-live'

const clock = 't-readout-sm text-secondary max-phone:hidden'

// 32 is the design's size and it is a pointer target. on a phone it is a thumb target, and the
// masthead is 44 tall, so there it takes the whole height rather than a third of it.
const button =
  'w-[32px] h-[32px] max-phone:w-[44px] max-phone:h-[44px] ' +
  'grid place-items-center rounded-1 border border-transparent text-muted cursor-pointer ' +
  'transition-[color,border-color] ' +
  'hover:text-primary hover:border-border active:text-accent active:border-accent-dim ' +
  'focus-visible:outline-none focus-visible:shadow-(--focus-ring) ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:border-transparent'

// the clock is the only thing in the bar that changes on a tick, so it is the only thing that
// subscribes to one. with it in the masthead itself, the mark, the flag, the buttons and the
// driver picker were all being re-rendered twice a second to move eight digits.
function Clock() {
  const elapsedMs = useRace((view) => view.race.elapsedMs)
  return <span className={clock}>{formatClock(elapsedMs)}</span>
}

export function Masthead() {
  const circuitInfo = useRace((view) => view.race.circuit)
  const paused = useRace((view) => view.paused)
  const finished = useRace((view) => view.race.flags.flag === 'chequered')
  const ours = useRace((view) => view.race.grid).filter((entry) => entry.isOurs)

  const state = finished ? 'Ended' : paused ? 'Held' : 'Live'

  return (
    <header className={bar}>
      {/* the wordmark is the first thing in the masthead worth giving up. below 768 the box
          narrows to the roundel and the drawing crops itself. */}
      <BrandMark className={mark} />
      <span className={rule} />

      <div className={circuit}>
        <GermanyFlag className="flex-none" />
        {/* the one h1 on the page. the board is a view of a race, and the race is the circuit. */}
        <h1 className="t-section truncate">{circuitInfo.name}</h1>
        <span className="t-label text-muted whitespace-nowrap max-phone:hidden">
          {circuitInfo.country}
        </span>
      </div>

      <span className="ml-auto" />

      <span className={live} role="status">
        <i className={dot} aria-hidden="true" />
        <span className="max-phone:sr-only">{state}</span>
      </span>

      <Clock />

      {/* the design puts one settings button here. this board has two things worth a button and
          nothing worth a settings panel, so the slot carries the session controls instead. */}
      <button
        type="button"
        className={button}
        aria-label={paused ? 'Resume the session' : 'Hold the session'}
        onClick={() => raceStore.togglePause()}
        disabled={finished}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <button
        type="button"
        className={button}
        aria-label="Restart the session"
        onClick={() => raceStore.restart()}
      >
        <RestartIcon />
      </button>

      {/* who the whole board is pointed at, in the corner the reference puts it in. it is the
          one control here that changes what every panel below is showing, so it gets the
          strongest position and the only avatar on the screen. */}
      <span className={rule} />
      <DriverPicker drivers={ours} />
    </header>
  )
}
