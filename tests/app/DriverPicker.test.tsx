import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { raceStore } from '../../src/store/raceStore'
import { DriverPicker } from '../../src/app/DriverPicker'

const OURS = raceStore.getSnapshot().race.grid.filter((entry) => entry.isOurs)

beforeEach(() => {
  raceStore.restart()
  raceStore.selectDriver('nova-07')
})

afterEach(() => {
  raceStore.stop()
  raceStore.selectDriver('nova-07')
})

function open() {
  return screen.getByRole('button', { name: /Choose another/ })
}

describe('what it shows when closed', () => {
  it('names the driver the whole board is pointed at', () => {
    render(<DriverPicker drivers={OURS} />)
    expect(screen.getByText('A. NOVA')).toBeInTheDocument()
    expect(open()).toHaveAccessibleName(/Aria Nova/)
  })

  it('shows one entry, not a list, until it is asked for one', () => {
    render(<DriverPicker drivers={OURS} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByText('Kai Veldor')).not.toBeInTheDocument()
  })
})

describe('choosing another driver', () => {
  it('opens a list of all three', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3)
  })

  it('marks the one currently being watched', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    expect(screen.getByRole('menuitemradio', { name: /Aria Nova/ })).toBeChecked()
    expect(screen.getByRole('menuitemradio', { name: /Kai Veldor/ })).not.toBeChecked()
  })

  it('points the whole board at whoever is chosen, and closes', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    await user.click(screen.getByRole('menuitemradio', { name: /Soren Hale/ }))

    expect(raceStore.getSnapshot().selectedDriverId).toBe('rine-44')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows where each driver is running, so the choice is informed', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    expect(screen.getByRole('menuitemradio', { name: /Aria Nova/ })).toHaveTextContent(/[1-6]/)
  })
})

// a menu that can only be closed by choosing something is a trap, and these two are the whole
// reason this is a menu rather than three buttons in a row
describe('getting out of it without choosing', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(raceStore.getSnapshot().selectedDriverId).toBe('nova-07')
  })

  it('closes when something else is clicked', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DriverPicker drivers={OURS} />
        <button type="button">elsewhere</button>
      </>,
    )

    await user.click(open())
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('reaching it without a mouse', () => {
  it('says whether it is open', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    expect(open()).toHaveAttribute('aria-expanded', 'false')
    await user.click(open())
    expect(open()).toHaveAttribute('aria-expanded', 'true')
  })

  it('can be opened and used from the keyboard', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: /Aria Nova/ })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')
    expect(raceStore.getSnapshot().selectedDriverId).toBe('vek-22')
  })

  it('wraps round at either end of the list', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitemradio', { name: /Soren Hale/ })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: /Aria Nova/ })).toHaveFocus()
  })

  it('hands focus back to the button when the menu goes away', async () => {
    const user = userEvent.setup()
    render(<DriverPicker drivers={OURS} />)

    await user.click(open())
    await user.keyboard('{Escape}')
    expect(open()).toHaveFocus()

    await user.click(open())
    await user.click(screen.getByRole('menuitemradio', { name: /Kai Veldor/ }))
    expect(open()).toHaveFocus()
  })
})
