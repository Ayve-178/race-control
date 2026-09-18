import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZoneBoundary } from '../../src/components/ZoneBoundary'

function Broken(): never {
  throw new Error('telemetry link lost')
}

// react prints the caught error to the console on purpose. that is noise here, not a failure.
function quietly(run: () => void) {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  run()
  spy.mockRestore()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('when nothing is wrong', () => {
  it('renders what it is given and adds nothing', () => {
    render(
      <ZoneBoundary zone="Car">
        <p>Front left 104°C</p>
      </ZoneBoundary>,
    )
    expect(screen.getByText('Front left 104°C')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('when a zone throws', () => {
  it('says so instead of taking the page down', () => {
    quietly(() => {
      render(
        <ZoneBoundary zone="Car">
          <Broken />
        </ZoneBoundary>,
      )
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('names the zone that went, so the message is not a shrug', () => {
    quietly(() => {
      render(
        <ZoneBoundary zone="Driver">
          <Broken />
        </ZoneBoundary>,
      )
    })
    expect(screen.getByText('Driver')).toBeInTheDocument()
  })

  it('leaves the zones either side of it alone', () => {
    quietly(() => {
      render(
        <>
          <ZoneBoundary zone="Race">
            <p>P1</p>
          </ZoneBoundary>
          <ZoneBoundary zone="Car">
            <Broken />
          </ZoneBoundary>
          <ZoneBoundary zone="Driver">
            <p>148 bpm</p>
          </ZoneBoundary>
        </>,
      )
    })

    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByText('148 bpm')).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('writes the failure somewhere a developer will find it', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ZoneBoundary zone="Car">
        <Broken />
      </ZoneBoundary>,
    )
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
