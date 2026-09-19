import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { CarZone } from '../../src/car/CarZone'

beforeEach(() => {
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  raceStore.restart()
  raceStore.selectDriver('nova-07')
  vi.useRealTimers()
})

// the readout for a corner is the block headed by that corner's name
function corner(name: string) {
  return screen.getByText(name).parentElement as HTMLElement
}

// the wheel on the schematic, which is the button for that corner
function tyre(name: string) {
  return screen.getByRole('button', { name: new RegExp('^' + name + ' tyre') })
}

describe('the four corners', () => {
  it('gives every corner its own readout', () => {
    render(<CarZone />)
    for (const name of ['Front left', 'Front right', 'Rear left', 'Rear right']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('shows the tyre temperature, the window verdict, the pressure and the wear', () => {
    render(<CarZone />)
    const block = corner('Front left')

    // two of them: the tyre and the brake behind it
    expect(within(block).getAllByText('°C')).toHaveLength(2)
    expect(within(block).getByText('bar')).toBeInTheDocument()
    expect(within(block).getByText('% worn')).toBeInTheDocument()
    expect(within(block).getByText(/in window|\+\d+ over|\d+ under/)).toBeInTheDocument()
  })

  // the pack ships a brake temperature per corner that nothing was reading. a disc answers a
  // different question from the tyre wrapped around it, and on a different timescale.
  it('shows a brake temperature beside every tyre', () => {
    const { container } = render(<CarZone />)
    const rows = [...container.querySelectorAll('[data-brake]')]
    expect(rows.map((row) => row.getAttribute('data-brake'))).toEqual(['fl', 'fr', 'rl', 'rr'])

    // a disc sits in the hundreds where a tyre sits near a hundred, which is the fastest way to
    // tell at a glance that these two numbers are not the same kind of reading.
    // the corner is in the attribute rather than the label: the block is already headed "Front
    // left", so the chip inside it says only what it is.
    for (const row of rows) {
      expect(row).toHaveTextContent(/^Brake\d{3,4}°C$/)
    }
  })

  // colour is never the only signal, so the chip that carries the band also carries it as data
  it('bands the brake chip separately from the tyre around it', () => {
    const { container } = render(<CarZone />)
    for (const row of container.querySelectorAll('[data-brake]')) {
      expect(row.getAttribute('data-band')).toMatch(/ok|warm|hot/)
    }
  })

  // front and rear discs run two hundred degrees apart, which is physics rather than decoration
  // and is the reason all four are shown rather than one number for the car
  it('reports the fronts hotter than the rears', () => {
    const { container } = render(<CarZone />)
    const readingOf = (corner: string) =>
      Number(
        container.querySelector('[data-brake="' + corner + '"]')?.textContent?.replace(/\D/g, ''),
      )

    expect(readingOf('fl')).toBeGreaterThan(readingOf('rl'))
    expect(readingOf('fr')).toBeGreaterThan(readingOf('rr'))
  })

  // the window is the same pair of numbers the band latch uses, so the panel and the event feed
  // cannot disagree about what "running hot" means
  it('states the window it is judging the tyre against', () => {
    render(<CarZone />)
    expect(screen.getByText(/window 90–118°C/)).toBeInTheDocument()
  })
})

// the brief asks for all four tyres to be interactive, with hit regions of our own, and for a
// chosen tyre to stay chosen on a touch screen while the rest of the board keeps updating
describe('touching a tyre', () => {
  it('makes every wheel a button, named for its corner and carrying its reading', () => {
    render(<CarZone />)
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(tyre('Front left')).toHaveAccessibleName(/\d+ degrees, \d\.\d\d bar/)
    expect(tyre('Rear right')).toHaveAccessibleName(/in window|\+\d+ over|\d+ under/)
  })

  it('lights the readout of the tyre under the pointer, and lets it go', async () => {
    const user = userEvent.setup()
    render(<CarZone />)

    await user.hover(tyre('Front left'))
    expect(corner('Front left')).toHaveAttribute('data-shown', 'true')
    expect(corner('Front right')).toHaveAttribute('data-shown', 'false')

    await user.unhover(tyre('Front left'))
    expect(corner('Front left')).toHaveAttribute('data-shown', 'false')
  })

  it('pins a tyre on click, so its readout stays lit after the pointer has left', async () => {
    const user = userEvent.setup()
    render(<CarZone />)

    await user.click(tyre('Rear right'))
    await user.unhover(tyre('Rear right'))

    expect(tyre('Rear right')).toHaveAttribute('aria-pressed', 'true')
    expect(corner('Rear right')).toHaveAttribute('data-shown', 'true')
  })

  it('lets a pin go on a second click, or on Escape', async () => {
    const user = userEvent.setup()
    render(<CarZone />)

    await user.click(tyre('Rear left'))
    await user.click(tyre('Rear left'))
    expect(tyre('Rear left')).toHaveAttribute('aria-pressed', 'false')

    await user.click(tyre('Rear left'))
    await user.keyboard('{Escape}')
    expect(tyre('Rear left')).toHaveAttribute('aria-pressed', 'false')
  })

  it('moves the pin to whichever tyre is chosen next, one at a time', async () => {
    const user = userEvent.setup()
    render(<CarZone />)

    await user.click(tyre('Front left'))
    await user.click(tyre('Front right'))

    expect(tyre('Front left')).toHaveAttribute('aria-pressed', 'false')
    expect(tyre('Front right')).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the pin through ticks and through a change of driver', () => {
    vi.useFakeTimers()
    render(<CarZone />)
    act(() => {
      tyre('Front left').click()
    })

    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(tyre('Front left')).toHaveAttribute('aria-pressed', 'true')

    act(() => {
      raceStore.selectDriver('vek-22')
    })
    expect(tyre('Front left')).toHaveAttribute('aria-pressed', 'true')
    expect(corner('Front left')).toHaveAttribute('data-shown', 'true')
  })

  it('can be reached, previewed and pinned from the keyboard', async () => {
    const user = userEvent.setup()
    render(<CarZone />)

    await user.tab()
    expect(tyre('Front left')).toHaveFocus()
    expect(corner('Front left')).toHaveAttribute('data-shown', 'true')

    await user.keyboard('{Enter}')
    expect(tyre('Front left')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('the band a corner is in', () => {
  it('carries the band as an attribute, so colour is never the only signal', () => {
    const { container } = render(<CarZone />)
    const bands = [...container.querySelectorAll('[data-band]')]
    expect(bands.length).toBeGreaterThan(0)
    for (const node of bands) {
      expect(node.getAttribute('data-band')).toMatch(/ok|warm|hot/)
    }
  })

  // a lead line per corner, taking that corner's own colour, so the line reads as a label
  // pointing at a wheel rather than as a rule in the gap
  it('draws a lead line from each readout to its wheel', () => {
    const { container } = render(<CarZone />)
    expect(container.querySelectorAll('.car-lead')).toHaveLength(4)
  })
})

describe('as the race runs', () => {
  it('keeps every reading moving', () => {
    vi.useFakeTimers()
    const { container } = render(<CarZone />)
    const before = container.textContent

    raceStore.start()
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(container.textContent).not.toBe(before)
  })

  it('remaps to another car when the driver changes', () => {
    const { rerender, container } = render(<CarZone />)
    const before = container.textContent

    act(() => {
      raceStore.selectDriver('rine-44')
    })
    rerender(<CarZone />)

    expect(container.textContent).not.toBe(before)
  })
})

describe('when the schematic will not load', () => {
  it('falls back to a silhouette with all four tyres still there', () => {
    render(<CarZone />)
    const image = screen.getByAltText('Apex Racing car, seen from above')
    act(() => {
      image.dispatchEvent(new Event('error'))
    })

    expect(screen.queryByAltText('Apex Racing car, seen from above')).not.toBeInTheDocument()
    expect(screen.getByText('Front left')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(document.querySelectorAll('[data-brake]')).toHaveLength(4)
  })
})
