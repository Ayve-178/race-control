import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Meter } from '../../src/components/Meter'

function lit() {
  // the dimming overlay starts where the reading ends, so its left edge is the lit length
  return (screen.getByRole('meter').firstElementChild as HTMLElement).style.left
}

describe('Meter', () => {
  it('reports the reading and its scale to a screen reader', () => {
    render(<Meter label="Fuel" value={78} min={0} max={100} valueText="78 per cent" />)
    const meter = screen.getByRole('meter', { name: 'Fuel' })

    expect(meter).toHaveAttribute('aria-valuenow', '78')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
    expect(meter).toHaveAttribute('aria-valuetext', '78 per cent')
  })

  it('lights the share of the track the reading has reached', () => {
    render(<Meter label="Revs" value={8250} min={4000} max={12500} valueText="8,250 rpm" />)
    expect(lit()).toBe('50%')
  })

  it('stays inside the scale when the reading runs past the end of it', () => {
    render(<Meter label="Revs" value={99_999} min={4000} max={12500} valueText="over" />)
    expect(lit()).toBe('100%')
  })

  it('stays inside the scale when the reading is below the start of it', () => {
    render(<Meter label="Revs" value={0} min={4000} max={12500} valueText="under" />)
    expect(lit()).toBe('0%')
  })

  // fuel and the battery run the other way: it is the bottom of the scale that is the problem,
  // so the red end is flipped rather than the reading being inverted
  it('flips the scale for channels where low is the dangerous end', () => {
    const { container } = render(
      <Meter label="Fuel" value={50} min={0} max={100} reverse valueText="50 per cent" />,
    )
    expect(container.querySelector('.meter')).toHaveClass('meter--reverse')
  })
})
