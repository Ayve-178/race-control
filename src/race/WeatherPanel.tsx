import type { ReactNode } from 'react'
import { Panel } from '../components/Panel'
import {
  CloudIcon,
  HumidityIcon,
  PressureIcon,
  TemperatureIcon,
  WindIcon,
} from '../components/icons'
import type { Channel } from '../sim/channel'
import { useRace } from '../store/raceStore'
import { formatValue } from '../utils/format'

// five boxes in a row rather than a list of rows. the tint is in app.css, keyed off the kind,
// because a colour per reading is a lookup and not a state.
const strip = 'grid grid-cols-5 gap-2 max-laptop:grid-cols-3 max-phone:grid-cols-5'

const box =
  'weather-box flex flex-col gap-2 min-w-0 py-3 px-3 ' +
  'border border-[color-mix(in_srgb,var(--tint)_22%,transparent)] ' +
  'bg-[color-mix(in_srgb,var(--tint)_7%,transparent)]'

type Reading = {
  kind: string
  label: string
  icon: ReactNode
  channel: Channel
  digits: number
  unit: string
}

export function WeatherPanel() {
  const weather = useRace((view) => view.race.weather)

  const readings: Reading[] = [
    { kind: 'air', label: 'Air', icon: <TemperatureIcon />, channel: weather.airTemp, digits: 1, unit: '°C' },
    { kind: 'cloud', label: 'Cloud', icon: <CloudIcon />, channel: weather.cloudCover, digits: 0, unit: '%' },
    { kind: 'humidity', label: 'Humid', icon: <HumidityIcon />, channel: weather.humidity, digits: 0, unit: '%' },
    { kind: 'pressure', label: 'Press', icon: <PressureIcon />, channel: weather.pressure, digits: 0, unit: 'mb' },
    { kind: 'wind', label: 'Wind', icon: <WindIcon />, channel: weather.windSpeed, digits: 1, unit: 'km/h' },
  ]

  return (
    <Panel title="Weather" aside="Dry" className="panel-weather">
      <div className={strip}>
        {readings.map((reading) => (
          <div key={reading.kind} className={box} data-kind={reading.kind}>
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[var(--tint)] flex-none">{reading.icon}</span>
              <span className="t-label-xs text-muted truncate">{reading.label}</span>
            </span>
            <span className="t-readout-sm text-primary truncate">
              {formatValue(reading.channel.value, reading.digits)}
              <span className="unit">{reading.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
