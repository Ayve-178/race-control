import { Component, type ErrorInfo, type ReactNode } from 'react'

// the one place a dashed edge earns its keep: this surface is not carrying data
const failed = 'flex flex-col gap-4 min-w-0 p-(--pad-normal) border border-dashed border-critical/40'

type ZoneBoundaryProps = {
  // the region being guarded, so the fallback can say what is missing rather than shrug
  zone: string
  // the cell the panel would have taken, so a failed one stays where it was
  className?: string
  children: ReactNode
}

type ZoneBoundaryState = {
  failed: boolean
}

// react still has no hook for catching a render error, so this is the one class in the project.
// one boundary per panel rather than one for the page: a chart that throws should cost you the
// chart, not the timing screen you were reading when it happened.
export class ZoneBoundary extends Component<ZoneBoundaryProps, ZoneBoundaryState> {
  state: ZoneBoundaryState = { failed: false }

  static getDerivedStateFromError(): ZoneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.zone} zone failed to render`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className={[failed, this.props.className].filter(Boolean).join(' ')} role="alert">
        <span className="t-label text-critical">{this.props.zone}</span>
        <p className="t-body text-secondary max-w-[42ch]">
          Telemetry unavailable. Everything else on this screen is still live.
        </p>
      </div>
    )
  }
}
