import React from "react";

/**
 * bitPact monogram — text-free pixel SVG (Bracket Tree).
 *
 * Visualises a single-elimination bracket joining into a final block:
 *   ▣ ──┐
 *       ├── ▣▣    (two left seed cells funnel into a tall final cell)
 *   ▣ ──┘
 *
 * Per brand guideline: NO arrows, NO text. Pure pixel boxes connected by
 * straight 1-pixel lines.
 */
interface LogoMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const SIZE_PX: Record<NonNullable<LogoMarkProps["size"]>, number> = {
  sm: 20,
  md: 28,
  lg: 40,
};

export default function LogoMark({ size = "md", className, title = "bitPact" }: LogoMarkProps) {
  const px = SIZE_PX[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* Two left seed cells (primary) */}
      <rect x="2" y="4" width="5" height="5" fill="var(--bp-primary, #f5e85f)" />
      <rect x="2" y="15" width="5" height="5" fill="var(--bp-primary, #f5e85f)" />

      {/* Horizontal connectors out of each seed cell (info cyan) */}
      <rect x="7" y="6" width="6" height="1" fill="var(--bp-info, #4ce7ff)" />
      <rect x="7" y="17" width="6" height="1" fill="var(--bp-info, #4ce7ff)" />

      {/* Vertical join: from top connector down to bottom connector */}
      <rect x="12" y="6" width="1" height="12" fill="var(--bp-info, #4ce7ff)" />

      {/* Horizontal bus out of the join, into the final cell */}
      <rect x="13" y="11" width="3" height="1" fill="var(--bp-info, #4ce7ff)" />

      {/* Final (champion) cell — taller, primary accent with warning fill rim */}
      <rect x="16" y="7" width="6" height="9" fill="var(--bp-accent, #ff9e4f)" />
      <rect x="16" y="7" width="6" height="1" fill="var(--bp-primary, #f5e85f)" />
      <rect x="16" y="15" width="6" height="1" fill="var(--bp-primary, #f5e85f)" />
    </svg>
  );
}
