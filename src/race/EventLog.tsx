import { Panel } from '../components/Panel'
import { useRace } from '../store/raceStore'
import { formatClock } from '../utils/format'

// the log is the one panel that genuinely runs out of room rather than holding a fixed set of
// readings, so it scrolls and says so. a region that scrolls has to be reachable by keyboard or
// its content is readable only with a pointer, and min-h-[44px] rather than 0 stops an empty log
// collapsing to a tab stop that is hard to see and hard to hit.
const list =
  'scroll-subtle flex-1 min-h-[44px] overflow-y-auto overscroll-contain bg-sunken border border-border ' +
  'focus-visible:outline-none focus-visible:shadow-[inset_var(--focus-ring)] ' +
  'max-tablet:max-h-[320px] max-phone:max-h-[60vh]'

// the severity rail down the left is what lets the log be scanned without being read
const row =
  'grid grid-cols-[82px_1fr] gap-5 items-baseline py-3 pr-5 pl-4 ' +
  'border-l-2 border-transparent border-t border-t-border first:border-t-0 ' +
  'data-[severity=caution]:border-l-caution data-[severity=caution]:bg-caution-wash ' +
  'data-[severity=critical]:border-l-critical data-[severity=critical]:bg-critical-wash'

const message =
  't-body-sm text-secondary flex items-baseline gap-3 min-w-0 ' +
  'group-data-[severity=caution]:text-caution group-data-[severity=critical]:text-critical'

// two lines and then it clamps. a log line that wraps to four is a paragraph, and this is a log.
const clamp = 'overflow-hidden text-ellipsis line-clamp-2'

export function EventLog() {
  // the selector hands back the stored array and the filtering happens during render. filtering
  // inside the selector would build a new array on every read, and useSyncExternalStore compares
  // snapshots by identity, so it would decide the store had changed every time it looked.
  const all = useRace((view) => view.race.events)
  const selectedId = useRace((view) => view.selectedDriverId)

  // the log follows the driver picker, which is "everything remaps" applied to the one panel
  // where it would be easiest to quietly skip
  const events = all.filter((event) => event.driverId === selectedId)

  return (
    <Panel title="Race control" aside="Newest first" className="panel-log">
      <div className={list} role="log" aria-label="Race events" tabIndex={0}>
        {events.length === 0 ? (
          <p className="t-body-sm text-muted p-4">Nothing to report on this car yet.</p>
        ) : (
          events
            .toReversed()
            .map((event) => (
              <div key={event.id} className={`group ${row}`} data-severity={event.severity}>
                <span className="t-readout-xs text-muted">{formatClock(event.atMs)}</span>
                <span className={message}>
                  <span className={clamp}>{event.message}</span>
                </span>
              </div>
            ))
        )}
      </div>
    </Panel>
  )
}
