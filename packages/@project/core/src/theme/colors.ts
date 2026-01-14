// Theme color constants for use with components that need explicit color values
// (e.g., lucide-react-native icons that can't use CSS variables)
// Keep in sync with global.css in web and mobile apps

export const COLORS = {
  accent: "#f97316", // orange-500
} as const;

export type ThemeColors = typeof COLORS;
