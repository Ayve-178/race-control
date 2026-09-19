import { Meter } from '../components/Meter'
import { Panel } from '../components/Panel'
import type { ReactNode } from 'react'
import { BoltIcon, EngineIcon, FuelIcon, RpmIcon } from '../components/icons'
import type { ErsMode } from '../sim/models/ers'
import { useRace } from '../store/raceStore'
import { formatValue } from '../utils/format'

const grid = 'telem grid grid-cols-2 flex-1 min-h-0'

const cell = 'flex flex-col justify-center gap-3 py-5 px-6 min-w-0'

// a battery percentage on its own does not say whether it is going up or down, and that is the
// half a driver cares about coming onto a straight
const ERS_MODES: Record<ErsMode, string> = {
  harvest: 'Harvesting',
  balanced: 'Balanced',
  deploy: 'Deploying',
}

type CellProps = {
  icon: ReactNode
  label: string
  note?: string
  children: ReactNode
}

function Cell({ icon, label, note, children }: CellProps) {
  return (
    <div className={cell}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted opacity-60 flex-none">{icon}</span>
        <span className="t-label text-muted truncate">{label}</span>
        {note && <span className="t-label-xs text-muted ml-auto whitespace-nowrap">{note}</span>}
      </div>
      {children}
    </div>
  )
}

export function PowerUnit() {
  const car = useRace((view) => view.race.field.cars[view.selectedDriverId])
  const driver = useRace((view) => view.race.telemetry[view.selectedDriverId])
  if (!car || !driver) return null

  const engineC = driver.engineTemp.value
  const fuel = driver.fuelPercent
  const ers = driver.ers.chargePercent

  return (
    <Panel title="Power unit" density="dense" className="panel-power">
      <div className={grid}>
        <Cell icon={<RpmIcon />} label="RPM">
          <span className="t-readout-lg">{formatValue(car.rpm, 0, { group: true })}</span>
          <Meter
            label="Revs"
            value={car.rpm}
            min={4000}
            max={12_500}
            valueText={`${formatValue(car.rpm, 0)} rpm`}
          />
        </Cell>

        <Cell icon={<EngineIcon />} label="Engine temp">
          <span className="t-readout-lg">
            {formatValue(engineC, 0)}
            <span className="unit">&deg;C</span>
          </span>
          <Meter
            label="Engine temperature"
            value={engineC}
            min={95}
            max={140}
            valueText={`${formatValue(engineC, 1)} degrees`}
          />
        </Cell>

        <Cell icon={<FuelIcon />} label="Fuel">
          <span className="t-readout-lg">
            {formatValue(fuel, 0)}
            <span className="unit">%</span>
          </span>
          <Meter
            label="Fuel"
            value={fuel}
            min={0}
            max={100}
            reverse
            valueText={`${formatValue(fuel, 1)} per cent`}
          />
        </Cell>

        <Cell icon={<BoltIcon />} label="Battery" note={ERS_MODES[driver.ers.mode]}>
          <span className="t-readout-lg">
            {formatValue(ers, 0)}
            <span className="unit">%</span>
          </span>
          <Meter
            label="Battery"
            value={ers}
            min={0}
            max={100}
            reverse
            valueText={`${formatValue(ers, 0)} per cent, ${ERS_MODES[driver.ers.mode].toLowerCase()}`}
          />
        </Cell>
      </div>
    </Panel>
  )
}
