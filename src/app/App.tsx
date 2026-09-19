import { useEffect } from 'react'
import { CarZone } from '../car/CarZone'
import { PowerUnit } from '../car/PowerUnit'
import { ZoneBoundary } from '../components/ZoneBoundary'
import { DriverZone } from '../driver/DriverZone'
import { Circuit } from '../race/Circuit'
import { EventLog } from '../race/EventLog'
import { StintPanel } from '../race/StintPanel'
import { WeatherPanel } from '../race/WeatherPanel'
import { raceStore, useRace } from '../store/raceStore'
import { Masthead } from './Masthead'
import { UrgencyBand } from './UrgencyBand'

// the columns are: context, the car, then the driver and the log. the arrangement inside each
// one is in app.css, because grid-template-areas is a quoted multi-line value and the named
// areas are what make these layouts readable at all.
export function App() {
  // one boolean rather than the race, so this only re-renders when the board actually changes
  // between running and not, and never on a tick
  const held = useRace((view) => view.paused || view.race.flags.flag === 'chequered')

  // the only place the clock is touched. everything below reads the store and never knows
  // that a timer exists.
  useEffect(() => {
    raceStore.start()
    return () => raceStore.stop()
  }, [])

  return (
    <div className="board" data-held={held}>
      <ZoneBoundary zone="Masthead">
        <Masthead />
      </ZoneBoundary>

      <ZoneBoundary zone="Race status">
        <UrgencyBand />
      </ZoneBoundary>

      {/* the masthead is a banner and the columns are the document. without this the whole
          board is unlabelled top level content, and there is nothing to skip the header to. */}
      <main className="board-grid">
        {/* the dom order is the reading order: who am I watching, where are they, what is on
            the car, what is the weather doing. the column decides what the eye gets first. */}
        <div className="col col--left">
          <ZoneBoundary zone="Circuit" className="panel-circuit">
            <Circuit />
          </ZoneBoundary>
          <ZoneBoundary zone="Stint" className="panel-stint">
            <StintPanel />
          </ZoneBoundary>
          <ZoneBoundary zone="Weather" className="panel-weather">
            <WeatherPanel />
          </ZoneBoundary>
        </div>

        <div className="col col--center">
          <ZoneBoundary zone="Tyres" className="panel-tyres">
            <CarZone />
          </ZoneBoundary>
          <ZoneBoundary zone="Power unit" className="panel-power">
            <PowerUnit />
          </ZoneBoundary>
        </div>

        <div className="col col--right">
          <ZoneBoundary zone="Driver" className="panel-physio">
            <DriverZone />
          </ZoneBoundary>
          <ZoneBoundary zone="Race control" className="panel-log">
            <EventLog />
          </ZoneBoundary>
        </div>
      </main>
    </div>
  )
}
