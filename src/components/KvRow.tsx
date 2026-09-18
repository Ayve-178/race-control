import type { ReactNode } from 'react'

// the stint and the weather are both a short list of name/reading pairs, separated by hairlines
// and nothing else. the row is shared; how many columns they run in is each panel's own call.
const row = 'grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 min-w-0 border-t border-border'

type KvRowProps = {
  label: string
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function KvRow({ label, icon, className, children }: KvRowProps) {
  return (
    <div className={[row, className].filter(Boolean).join(' ')}>
      <span className="t-label flex items-center gap-3 min-w-0 text-secondary">
        {icon && <span className="flex-none text-muted opacity-60">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      <span className="t-readout-sm text-right whitespace-nowrap">{children}</span>
    </div>
  )
}
