// a fixed length window of recent samples, oldest first.
//
// it lives in the race state rather than inside a chart component, and that is the whole point:
// all three of our cars are simulated the whole time, so switching driver has to land on that
// driver's last minute. a chart that kept its own history would start again every time you
// looked away, which is exactly the lie the driver selector is supposed not to tell.

// a hundred and twenty samples at two a second is the last minute of racing
export const TRACE_LENGTH = 120

export function startTrace(value: number): number[] {
  return [value]
}

export function recordTrace(trace: number[], value: number): number[] {
  if (trace.length < TRACE_LENGTH) return [...trace, value]
  return [...trace.slice(trace.length - TRACE_LENGTH + 1), value]
}
