import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { StintPanel } from '../../src/race/StintPanel'

beforeEach(() => {
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  raceStore.selectDriver('nova-07')
})

describe('the stint panel', () => {
  it('names the compound beside the title', () => {
    render(<StintPanel />)
    expect(screen.getByRole('region', { name: 'Stint' })).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  // the pack drops us into lap 16 on 34% worn tyres, which at the sim's own wear rate is about
  // fourteen laps. the panel reads the stint out of the seed rather than inventing a number.
  it('counts the laps this set has done', () => {
    render(<StintPanel />)
    const car = raceStore.getSnapshot().race.field.cars['nova-07']
    const stint = raceStore.getSnapshot().race.stint
    expect(screen.getByText(String(car.lap - stint.startedOnLap))).toBeInTheDocument()
  })

  it('states the pit window as a range of laps', () => {
    render(<StintPanel />)
    expect(screen.getByText('L18–L24')).toBeInTheDocument()
  })

  // below 1024 the urgency band sheds these two. they are rendered here at every width and
  // hidden by css above it, so neither reading is ever actually lost.
  it('carries the best lap and the top speed for the widths the band cannot', () => {
    render(<StintPanel />)
    expect(screen.getByText('Best lap')).toBeInTheDocument()
    expect(screen.getByText('Top speed')).toBeInTheDocument()
  })
})
