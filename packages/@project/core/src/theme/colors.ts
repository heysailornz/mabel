// Theme color constants for use with components that need explicit color values
// (e.g., lucide-react-native icons that can't use CSS variables)
// Keep in sync with global.css in web and mobile apps

export const COLORS = {
  // Brand colors
  accent: "#f97316", // orange-500

  // Semantic colors
  destructive: "#ef4444", // red-500

  // Neutral colors (light mode)
  foreground: "#09090b",
  mutedForeground: "#71717a",

  // Icon colors
  icon: {
    default: "#374151", // gray-700
    muted: "#71717a", // gray-500
    accent: "#f97316", // orange-500
    destructive: "#ef4444", // red-500
    success: "#16a34a", // green-600
    white: "#ffffff",
  },
} as const;

export type ThemeColors = typeof COLORS;
