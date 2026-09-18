type BrandMarkProps = {
  className?: string
}

// the roundel and the wordmark as one drawing, the way the design's masthead has it. APEX keeps
// its own light grey and RACING takes currentColor, so the brand colour lands on one word.
//
// `xMinYMid slice` is what lets one element be both marks. slice scales the drawing to cover the
// box and crops whatever will not fit, anchored left, so at 132 wide the whole lockup shows, and
// at 22 wide the box is exactly the roundel and the wordmark is simply outside it. the
// alternative was rendering the mark twice and hiding one, which puts two identical images in the
// accessibility tree at every width.
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 48"
      preserveAspectRatio="xMinYMid slice"
      role="img"
      aria-label="Apex Racing"
    >
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 8 L36 34 H30 L27 26 H21 L18 34 H12 Z M22.5 22 H25.5 L24 18 Z" fill="currentColor" />
      <path d="M14 38 H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <text
        x="56"
        y="22"
        fontFamily="var(--font-ui)"
        fontSize="16"
        fontWeight="700"
        letterSpacing="3"
        fill="var(--text-primary)"
      >
        APEX
      </text>
      <text
        x="56"
        y="38"
        fontFamily="var(--font-ui)"
        fontSize="11"
        fontWeight="600"
        letterSpacing="4"
        fill="currentColor"
      >
        RACING
      </text>
    </svg>
  )
}
