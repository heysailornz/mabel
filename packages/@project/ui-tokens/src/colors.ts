/**
 * Shared color tokens for web and mobile
 * Using oklch color space for consistency
 */
export const colors = {
  background: { light: "oklch(1 0 0)", dark: "oklch(0.145 0 0)" },
  foreground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  card: { light: "oklch(1 0 0)", dark: "oklch(0.205 0 0)" },
  cardForeground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  popover: { light: "oklch(1 0 0)", dark: "oklch(0.205 0 0)" },
  popoverForeground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  primary: { light: "oklch(0.205 0 0)", dark: "oklch(0.922 0 0)" },
  primaryForeground: { light: "oklch(0.985 0 0)", dark: "oklch(0.205 0 0)" },
  secondary: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  secondaryForeground: { light: "oklch(0.205 0 0)", dark: "oklch(0.985 0 0)" },
  muted: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  mutedForeground: { light: "oklch(0.556 0 0)", dark: "oklch(0.708 0 0)" },
  accent: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  accentForeground: { light: "oklch(0.205 0 0)", dark: "oklch(0.985 0 0)" },
  destructive: { light: "oklch(0.577 0.245 27.325)", dark: "oklch(0.704 0.191 22.216)" },
  border: { light: "oklch(0.922 0 0)", dark: "oklch(1 0 0 / 10%)" },
  input: { light: "oklch(0.922 0 0)", dark: "oklch(1 0 0 / 15%)" },
  ring: { light: "oklch(0.708 0 0)", dark: "oklch(0.556 0 0)" },
} as const;

// Chart colors (optional, mainly for web dashboards)
export const chartColors = {
  chart1: { light: "oklch(0.646 0.222 41.116)", dark: "oklch(0.488 0.243 264.376)" },
  chart2: { light: "oklch(0.6 0.118 184.704)", dark: "oklch(0.696 0.17 162.48)" },
  chart3: { light: "oklch(0.398 0.07 227.392)", dark: "oklch(0.769 0.188 70.08)" },
  chart4: { light: "oklch(0.828 0.189 84.429)", dark: "oklch(0.627 0.265 303.9)" },
  chart5: { light: "oklch(0.769 0.188 70.08)", dark: "oklch(0.645 0.246 16.439)" },
} as const;

// Sidebar colors (optional, mainly for web)
export const sidebarColors = {
  sidebar: { light: "oklch(0.985 0 0)", dark: "oklch(0.205 0 0)" },
  sidebarForeground: { light: "oklch(0.145 0 0)", dark: "oklch(0.985 0 0)" },
  sidebarPrimary: { light: "oklch(0.205 0 0)", dark: "oklch(0.488 0.243 264.376)" },
  sidebarPrimaryForeground: { light: "oklch(0.985 0 0)", dark: "oklch(0.985 0 0)" },
  sidebarAccent: { light: "oklch(0.97 0 0)", dark: "oklch(0.269 0 0)" },
  sidebarAccentForeground: { light: "oklch(0.205 0 0)", dark: "oklch(0.985 0 0)" },
  sidebarBorder: { light: "oklch(0.922 0 0)", dark: "oklch(1 0 0 / 10%)" },
  sidebarRing: { light: "oklch(0.708 0 0)", dark: "oklch(0.556 0 0)" },
} as const;

export type ColorToken = keyof typeof colors;
export type ChartColorToken = keyof typeof chartColors;
export type SidebarColorToken = keyof typeof sidebarColors;
