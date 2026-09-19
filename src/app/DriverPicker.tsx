import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { DriverId, GridCar } from '../sim/types'
import { raceStore, useRace } from '../store/raceStore'
import { MISSING } from '../utils/format'

// no photographs were supplied with the pack, so the avatar is the driver's initials rather than
// a stock face standing in for somebody who does not exist. it still does an avatar's job: it is
// the fastest thing on the masthead to recognise without reading.
function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

const avatar =
  'grid place-items-center w-[28px] h-[28px] rounded-full flex-none ' +
  't-label-xs text-surface bg-brand'

const trigger =
  'flex items-center gap-4 pl-4 pr-3 h-[34px] max-phone:h-[44px] min-w-0 cursor-pointer rounded-1 ' +
  'border border-transparent transition-[background-color,border-color] ' +
  'hover:bg-accent-wash hover:border-border ' +
  'aria-expanded:bg-accent-wash aria-expanded:border-border ' +
  'focus-visible:outline-none focus-visible:shadow-(--focus-ring)'

const menu =
  'absolute right-0 top-[calc(100%+6px)] z-20 min-w-[212px] ' +
  'bg-surface border border-border-strong shadow-[0_16px_40px_rgb(0_0_0/0.55)]'

const option =
  'flex items-center gap-4 w-full py-3 px-4 text-left cursor-pointer min-h-11 ' +
  'border-l-2 border-transparent transition-[background-color] ' +
  // the same cyan the circuit gives the selected car, so "this one" is one colour on this board
  // rather than one per panel
  'hover:bg-accent-wash aria-checked:border-l-selected aria-checked:bg-accent-wash ' +
  'focus-visible:outline-none focus-visible:shadow-[inset_var(--focus-ring)]'

// the arrow keys walk the list and wrap at either end, which is what a menu owes a keyboard
function walk(event: ReactKeyboardEvent<HTMLDivElement>) {
  const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (!step) return

  event.preventDefault()
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
  const at = items.indexOf(document.activeElement as HTMLElement)
  items[(at + step + items.length) % items.length].focus()
}

type DriverPickerProps = {
  drivers: GridCar[]
}

export function DriverPicker({ drivers }: DriverPickerProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const selectedId = useRace((view) => view.selectedDriverId)

  // the order is what the list shows beside each name, and it is rebuilt every tick. read as a
  // string so this only wakes when the order actually changes.
  const order = useRace((view) =>
    view.race.field.standings.map((entry) => `${entry.id}:${entry.position}`).join(' '),
  )
  const positions = Object.fromEntries(order.split(' ').map((pair) => pair.split(':')))

  const selected = drivers.find((driver) => driver.id === selectedId) ?? drivers[0]

  // a menu that can only be closed by choosing something is a trap. these two are the whole
  // reason this is a menu rather than three buttons in a row.
  useEffect(() => {
    if (!open) return

    // focus lands on the driver already chosen, so the arrow keys start from somewhere sensible
    box.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()

    function onPointerDown(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // focus goes back to the button that opened the menu, so a keyboard user is not dropped on
  // the body when the list under them disappears
  function choose(id: DriverId) {
    raceStore.selectDriver(id)
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div className="relative flex-none" ref={box}>
      <button
        ref={button}
        type="button"
        className={trigger}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Driver: ${selected.name}. Choose another`}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="t-section text-primary whitespace-nowrap max-phone:hidden">
          {selected.shortName}
        </span>
        <span className="t-label-xs text-muted max-phone:hidden">{selected.number}</span>
        <span className={avatar} aria-hidden="true">
          {initialsOf(selected.name)}
        </span>
      </button>

      {open && (
        <div className={menu} role="menu" onKeyDown={walk}>
          {drivers.map((driver) => (
            <button
              key={driver.id}
              type="button"
              role="menuitemradio"
              aria-checked={driver.id === selectedId}
              className={option}
              onClick={() => choose(driver.id)}
            >
              <span className="t-readout-sm text-muted w-[14px]">{positions[driver.id] ?? MISSING}</span>
              <span className={avatar} aria-hidden="true">
                {initialsOf(driver.name)}
              </span>
              <span className="t-body text-primary truncate flex-1">{driver.name}</span>
              <span className="t-readout-sm text-muted">#{driver.number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
