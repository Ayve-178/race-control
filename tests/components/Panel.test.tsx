import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Panel } from '../../src/components/Panel'

describe('Panel', () => {
  it('is a labelled region, which is what makes it findable without sight', () => {
    render(
      <Panel title="Weather">
        <p>body</p>
      </Panel>,
    )
    expect(screen.getByRole('region', { name: 'Weather' })).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('shows the aside beside the title when there is one', () => {
    render(
      <Panel title="Circuit" aside="4.574 km">
        <p>map</p>
      </Panel>,
    )
    expect(screen.getByText('4.574 km')).toBeInTheDocument()
  })

  // the readouts inside a dense panel bring their own labels, so the head would be a second
  // one. it still has to be named, or the region stops being a region.
  it('keeps its name when dense, without drawing a head', () => {
    render(
      <Panel title="Power unit" density="dense">
        <p>meters</p>
      </Panel>,
    )
    const region = screen.getByRole('region', { name: 'Power unit' })
    expect(region).toBeInTheDocument()
    expect(screen.getByText('Power unit')).toHaveClass('sr-only')
  })
})
