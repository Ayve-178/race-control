import { Panel } from '../components/Panel'
import { BreathingIcon, HeartRateIcon, StressIcon } from '../components/icons'
import { TRACE_LENGTH } from '../sim/models/trace'
import { TICK_MS } from '../sim/simulator'
import { useRace } from '../store/raceStore'
import { formatClock } from '../utils/format'
import { Trace } from './Trace'

// the window each reading is plotted against. these are the channel's own limits, so the zone
// bands behind the trace are the thresholds rather than a second set of numbers to keep in step.
const HEART = { min: 120, max: 200 }
const BREATHING = { min: 10, max: 50 }
const STRESS = { min: 0, max: 100 }

const WINDOW_MS = TRACE_LENGTH * TICK_MS

// the three clock times under every plot: the start of the window, its middle, and now
function axisFor(elapsedMs: number): string[] {
  return [
    formatClock(elapsedMs - WINDOW_MS),
    formatClock(elapsedMs - WINDOW_MS / 2),
    formatClock(elapsedMs),
  ]
}

export function DriverZone() {
  const driver = useRace((view) => view.race.grid.find((car) => car.id === view.selectedDriverId))
  const telemetry = useRace((view) => view.race.telemetry[view.selectedDriverId])
  const elapsedMs = useRace((view) => view.race.elapsedMs)
  if (!driver || !telemetry) return null

  const axis = axisFor(elapsedMs)
  const samples = telemetry.traces.heartRate.length

  return (
    <Panel
      title={`Driver — ${driver.name}`}
      aside={`Last minute · ${samples} samples`}
      className="panel-physio"
    >
      <div className="grid grid-rows-3 flex-1 min-h-0 max-tablet:grid-rows-[repeat(3,auto)]">
        <Trace
          label="Heart rate"
          kind="heart"
          icon={<HeartRateIcon />}
          points={telemetry.traces.heartRate}
          min={HEART.min}
          max={HEART.max}
          unit="bpm"
          range="120–200 bpm"
          axis={axis}
        />
        <Trace
          label="Breathing"
          kind="breathing"
          icon={<BreathingIcon />}
          points={telemetry.traces.breathing}
          min={BREATHING.min}
          max={BREATHING.max}
          unit="/min"
          range="10–50 / min"
          axis={axis}
        />
        <Trace
          label="Stress"
          kind="stress"
          icon={<StressIcon />}
          points={telemetry.traces.stress}
          min={STRESS.min}
          max={STRESS.max}
          range="0–100 index"
          axis={axis}
        />
      </div>
    </Panel>
  )
}
