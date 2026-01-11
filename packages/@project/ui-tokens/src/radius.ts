/**
 * Shared border radius tokens
 */
export const radius = {
  base: "0.625rem", // 10px - the base radius value
  sm: "calc(var(--radius) - 4px)",
  md: "calc(var(--radius) - 2px)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) + 4px)",
  "2xl": "calc(var(--radius) + 8px)",
  "3xl": "calc(var(--radius) + 14px)", // 24px for very rounded cards
} as const;

// Raw pixel values for contexts that don't support calc()
export const radiusRaw = {
  base: 10,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  "2xl": 18,
  "3xl": 24,
} as const;

export type RadiusToken = keyof typeof radius;
