// the design loads these through <img>, then has to invert them, because an svg in its own
// document resolves currentColor to black. its own note says to inline them in the react build
// instead, so that is what these are: one component each, inheriting the colour of the text
// beside them. one for each thing the board shows and none spare.

import type { ReactNode } from 'react'

type IconProps = { className?: string }

// every line icon is drawn in the same 24 box with the same weight, so a row of them reads as
// one set rather than as a pile of drawings
function Line({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function TemperatureIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z" />
      <path d="M12 9v6" />
    </Line>
  )
}

export function CloudIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.5 3.5 0 0 0 7 18Z" />
    </Line>
  )
}

export function HumidityIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M12 3.5c3.3 4 5 6.8 5 9a5 5 0 0 1-10 0c0-2.2 1.7-5 5-9Z" />
    </Line>
  )
}

export function PressureIcon(props: IconProps) {
  return (
    <Line {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5" />
    </Line>
  )
}

export function WindIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M3 8h10a3 3 0 1 0-3-3" />
      <path d="M3 12h14a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </Line>
  )
}

export function RpmIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
      <path d="M12 13.5 16 9" />
      <circle cx="12" cy="15" r="1.4" />
    </Line>
  )
}

export function EngineIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M6 9h4l2-2h4v3h3v5h-3v3h-6l-2-2H6z" />
      <path d="M9 5h5" />
    </Line>
  )
}

export function FuelIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M5 20V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v15" />
      <path d="M4 20h10" />
      <path d="M13 9h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
    </Line>
  )
}

export function BoltIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M13 3 5 13.5h6L11 21l8-10.5h-6Z" />
    </Line>
  )
}

export function HeartRateIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M3 12h3.5l2-5 3 10 2.5-6 1.5 3H21" />
    </Line>
  )
}

export function BreathingIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4 14a4 4 0 1 1 4 4h-.5" />
      <path d="M4 18h8" />
      <path d="M12 10a4 4 0 1 1 4 4H4" />
    </Line>
  )
}

export function StressIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3Z" />
      <path d="M10 22h4" />
      <path d="M12 8v4" />
    </Line>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M9 5v14M15 5v14" />
    </Line>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M8 5.5v13l11-6.5z" />
    </Line>
  )
}

export function RestartIcon(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M20 12a8 8 0 1 1-2.8-6.1" />
      <path d="M20 4v5h-5" />
    </Line>
  )
}

// the one icon on the board with colours of its own, so it is not drawn in currentColor and it
// is not part of the line set
export function GermanyFlag({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 13" width="18" height="13" aria-hidden="true" focusable="false">
      <rect width="18" height="13" fill="#0e0e0e" />
      <rect y="4.34" width="18" height="4.33" fill="#d7231f" />
      <rect y="8.67" width="18" height="4.33" fill="#f0c318" />
    </svg>
  )
}
