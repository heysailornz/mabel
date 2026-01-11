/**
 * Shared shadow tokens for web and mobile
 *
 * Shadows work differently across platforms:
 * - Web: box-shadow CSS property
 * - iOS: shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Android: elevation (single number, 0-24)
 */

export type IOSShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
};

export type AndroidShadow = {
  elevation: number;
};

export type WebShadow = string;

export type ShadowToken = {
  ios: IOSShadow;
  android: AndroidShadow;
  web: WebShadow;
};

/**
 * Shadow presets for common UI patterns
 */
export const shadows = {
  /** Subtle shadow for inline elements */
  sm: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 2 },
    web: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },

  /** Default shadow for cards and containers */
  md: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    web: "0 2px 8px rgba(0, 0, 0, 0.08)",
  },

  /** Elevated shadow for floating elements */
  lg: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    web: "0 4px 16px rgba(0, 0, 0, 0.1)",
  },

  /** Strong shadow for modals and prominent cards */
  xl: {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
    web: "0 8px 24px rgba(0, 0, 0, 0.15)",
  },

  /** Maximum elevation for popovers and dropdowns */
  "2xl": {
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
    },
    android: { elevation: 16 },
    web: "0 12px 32px rgba(0, 0, 0, 0.2)",
  },

  /** No shadow */
  none: {
    ios: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    android: { elevation: 0 },
    web: "none",
  },
} as const;

export type ShadowLevel = keyof typeof shadows;

/**
 * Helper to get native shadow styles (combines iOS + Android)
 * Use this in React Native StyleSheet or inline styles
 */
export function getNativeShadow(level: ShadowLevel) {
  const shadow = shadows[level];
  return {
    ...shadow.ios,
    ...shadow.android,
  };
}

/**
 * Helper to get web shadow value
 * Use this for CSS-in-JS or inline styles on web
 */
export function getWebShadow(level: ShadowLevel): string {
  return shadows[level].web;
}
