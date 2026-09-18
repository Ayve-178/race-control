import { useId, type ReactNode } from 'react'

// no radius, no shadow, no border of its own. panels are separated by the hairline rules the
// column draws between them, which is the whole reason this board reads as one surface.
const base = 'flex flex-col min-w-0 min-h-0 overflow-hidden'

const PADDING = {
  normal: 'p-(--pad-normal)',
  // the car gets more room than anything else, because it is the thing being looked at
  open: 'p-6 max-laptop:py-6 max-laptop:px-7',
  // the readouts inside bring their own padding, so the panel adds none
  dense: 'p-(--pad-dense)',
}

type PanelProps = {
  // the title is what makes the panel a named region for a screen reader, so there is no
  // panel without one
  title: string
  // the small right hand note: a distance, a compound, a window
  aside?: string
  density?: keyof typeof PADDING
  className?: string
  children: ReactNode
}

export function Panel({ title, aside, density = 'normal', className, children }: PanelProps) {
  const headingId = useId()

  return (
    <section
      className={[base, PADDING[density], className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      {density === 'dense' ? (
        <h2 id={headingId} className="sr-only">
          {title}
        </h2>
      ) : (
        <div className="flex items-baseline justify-between gap-4 mb-5 flex-none min-w-0">
          <h2 id={headingId} className="t-label text-muted truncate">
            {title}
          </h2>
          {aside && <span className="t-readout-xs text-muted whitespace-nowrap">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  )
}
