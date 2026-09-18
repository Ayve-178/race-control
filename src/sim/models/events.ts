import { formatLapTime, formatValue } from '../../utils/format'
import { TYRE_CORNER_NAMES, TYRE_CORNERS, type DriverId, type PerCorner } from '../types'
import type { Band } from './bands'
import type { CarState } from './car'
import type { Flag } from './flags'

export type Severity = 'info' | 'caution' | 'critical'

export type RaceEvent = {
  id: string
  atMs: number
  severity: Severity
  // the short tag shown at the head of the line, so the feed can be scanned down the left
  source: string
  message: string
  driverId: DriverId
}

// everything an event can be about. the tick function pulls these together for the driver
// being watched, which keeps this file from having to know what a whole race state looks like.
export type Readings = {
  atMs: number
  driverId: DriverId
  car: CarState
  position: number
  inPit: boolean
  tyreC: PerCorner<number>
  tyreBand: PerCorner<Band>
  engineTempC: number
  engineBand: Band
  fuelPercent: number
  ersPercent: number
  stress: number
  flag: Flag
}

const FUEL_LOW_PERCENT = 15
const FUEL_CRITICAL_PERCENT = 6
const BATTERY_FLAT_PERCENT = 8
const STRESS_HIGH = 80

// a band change is already latched, so this is only about what to call it
const BAND_EVENTS: Record<Band, { severity: Severity; kind: string; says: string }> = {
  hot: { severity: 'critical', kind: 'hot', says: 'over the limit' },
  warm: { severity: 'caution', kind: 'warm', says: 'running hot' },
  ok: { severity: 'info', kind: 'cool', says: 'back in range' },
}

const FLAG_EVENTS: Record<Flag, { severity: Severity; message: string }> = {
  green: { severity: 'info', message: 'Track clear, green flag' },
  yellow: { severity: 'caution', message: 'Yellow flag' },
  vsc: { severity: 'caution', message: 'Virtual safety car deployed' },
  safetyCar: { severity: 'critical', message: 'Safety car deployed' },
  chequered: { severity: 'info', message: 'Chequered flag' },
}

// an event fires on the way past a mark, not for as long as the reading sits beyond it. the
// readings that can hover on a mark carry a latched band instead, because firing on the crossing
// alone is not enough when the crossing happens six times a minute.
function crossedUp(before: number, now: number, threshold: number): boolean {
  return before < threshold && now >= threshold
}

function crossedDown(before: number, now: number, threshold: number): boolean {
  return before > threshold && now <= threshold
}

export function eventsBetween(before: Readings | null, now: Readings): RaceEvent[] {
  const events: RaceEvent[] = []

  function add(kind: string, severity: Severity, source: string, message: string) {
    events.push({
      id: now.atMs + '-' + now.driverId + '-' + kind,
      atMs: now.atMs,
      severity,
      source,
      message,
      driverId: now.driverId,
    })
  }

  if (now.car.completedLap) {
    add('lap', 'info', 'LAP', 'Lap ' + now.car.lap + ' under way')
    if (now.car.lastLapMs !== null && now.car.lastLapMs === now.car.bestLapMs) {
      add('best', 'info', 'BEST', 'Personal best ' + formatLapTime(now.car.lastLapMs))
    }
  }

  if (now.car.completedSector !== null) {
    const split = now.car.lastSectorMs[now.car.completedSector - 1]
    if (split !== null) {
      const seconds = formatValue(split / 1000, 3)
      add('sector', 'info', 'S' + now.car.completedSector, 'Sector ' + now.car.completedSector + ' ' + seconds)
    }
  }

  // everything below here needs something to compare against, so the first tick of a race
  // reports what happened rather than what changed
  if (!before) return events

  if (now.position < before.position) {
    add('gained', 'info', 'POS', 'Up to P' + now.position)
  }
  if (now.position > before.position) {
    add('lost', 'caution', 'POS', 'Down to P' + now.position)
  }

  if (now.inPit && !before.inPit) add('boxed', 'info', 'PIT', 'In the pit lane')
  if (!now.inPit && before.inPit) add('rejoined', 'info', 'PIT', 'Out of the pits, P' + now.position)

  if (now.flag !== before.flag) {
    const flag = FLAG_EVENTS[now.flag]
    add('flag-' + now.flag, flag.severity, 'FLAG', flag.message)
  }

  for (const corner of TYRE_CORNERS) {
    if (now.tyreBand[corner] === before.tyreBand[corner]) continue

    const band = BAND_EVENTS[now.tyreBand[corner]]
    const reading = TYRE_CORNER_NAMES[corner] + ' ' + formatValue(now.tyreC[corner], 0) + '°C'
    add('tyre-' + band.kind + '-' + corner, band.severity, 'TYRE', reading + ', ' + band.says)
  }

  if (now.engineBand !== before.engineBand) {
    const band = BAND_EVENTS[now.engineBand]
    const reading = 'Engine ' + formatValue(now.engineTempC, 0) + '°C'
    add('engine-' + band.kind, band.severity, 'PU', reading + ', ' + band.says)
  }

  if (crossedDown(before.fuelPercent, now.fuelPercent, FUEL_CRITICAL_PERCENT)) {
    add('fuel-critical', 'critical', 'FUEL', 'Fuel ' + formatValue(now.fuelPercent, 1) + '%, save now')
  } else if (crossedDown(before.fuelPercent, now.fuelPercent, FUEL_LOW_PERCENT)) {
    add('fuel-low', 'caution', 'FUEL', 'Fuel ' + formatValue(now.fuelPercent, 1) + '%, start lifting')
  }

  if (crossedDown(before.ersPercent, now.ersPercent, BATTERY_FLAT_PERCENT)) {
    add('ers-flat', 'info', 'ERS', 'Battery flat, no deployment')
  }

  if (crossedUp(before.stress, now.stress, STRESS_HIGH)) {
    add('stress', 'caution', 'BIO', 'Driver workload ' + formatValue(now.stress, 0))
  }

  return events
}
