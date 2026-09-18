import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandMark } from '../../src/components/BrandMark'

describe('BrandMark', () => {
  it('has the team name as its accessible name', () => {
    render(<BrandMark />)
    expect(screen.getByRole('img', { name: 'Apex Racing' })).toBeInTheDocument()
  })

  it('draws the wordmark as part of the mark, so the two cannot drift apart', () => {
    render(<BrandMark />)
    const mark = screen.getByRole('img', { name: 'Apex Racing' })
    expect(mark).toHaveTextContent('APEX')
    expect(mark).toHaveTextContent('RACING')
  })
})
